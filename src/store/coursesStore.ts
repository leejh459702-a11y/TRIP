import {
  type DocumentData,
  type FirestoreDataConverter,
  type Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../services/firebase';
import type { Course, CourseDay } from '../domain/types';

const courseConverter: FirestoreDataConverter<Course> = {
  toFirestore: (course: Course): DocumentData => {
    const { id: _id, ...rest } = course;
    return rest;
  },
  fromFirestore: (snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Omit<Course, 'id'>) }),
};

function coursesCol(uid: string) {
  return collection(db, 'users', uid, 'courses').withConverter(courseConverter);
}

function newId(): string {
  return crypto.randomUUID();
}

interface CoursesState {
  courses: Course[];
  loading: boolean;
  error?: string;
  subscribe: (uid: string) => Unsubscribe;
  createCourse: (
    uid: string,
    input: { title: string; startDate: string; partySize: number },
  ) => Promise<string>;
  saveCourse: (uid: string, course: Course) => Promise<void>;
  deleteCourse: (uid: string, courseId: string) => Promise<void>;
}

export const useCoursesStore = create<CoursesState>((set) => ({
  courses: [],
  loading: true,

  subscribe: (uid) => {
    set({ loading: true });
    const q = query(coursesCol(uid), orderBy('startDate', 'desc'));
    return onSnapshot(
      q,
      (snap) => set({ courses: snap.docs.map((d) => d.data()), loading: false }),
      (err) => set({ error: err.message, loading: false }),
    );
  },

  createCourse: async (uid, input) => {
    const now = new Date().toISOString();
    const firstDay: CourseDay = {
      id: newId(),
      date: input.startDate,
      startTime: '09:00',
      blocks: [],
    };
    const course: Omit<Course, 'id'> = {
      title: input.title,
      startDate: input.startDate,
      partySize: input.partySize,
      days: [firstDay],
      isTemplate: false,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(coursesCol(uid), course as Course);
    return ref.id;
  },

  saveCourse: async (uid, course) => {
    await setDoc(doc(coursesCol(uid), course.id), {
      ...course,
      updatedAt: new Date().toISOString(),
    });
  },

  deleteCourse: async (uid, courseId) => {
    await deleteDoc(doc(coursesCol(uid), courseId));
  },
}));
