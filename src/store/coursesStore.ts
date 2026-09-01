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
import { isDemoMode } from '../services/demoMode';
import { DEMO_COURSES } from '../services/demoData';
import type { Course, CourseDay } from '../domain/types';

const demo = isDemoMode();

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
  /** B8: 템플릿 저장/인스턴스화 등, 이미 완성된 Course 데이터를 그대로 새 문서로 만듭니다. */
  createFromObject: (uid: string, data: Omit<Course, 'id'>) => Promise<string>;
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  loading: true,

  subscribe: (uid) => {
    if (demo) {
      set({ courses: DEMO_COURSES, loading: false });
      return () => {};
    }
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
    if (demo) {
      const id = newId();
      set({ courses: [...get().courses, { ...course, id }] });
      return id;
    }
    const ref = await addDoc(coursesCol(uid), course as Course);
    return ref.id;
  },

  saveCourse: async (uid, course) => {
    if (demo) {
      const updated = { ...course, updatedAt: new Date().toISOString() };
      set({
        courses: get().courses.some((c) => c.id === course.id)
          ? get().courses.map((c) => (c.id === course.id ? updated : c))
          : [...get().courses, updated],
      });
      return;
    }
    await setDoc(doc(coursesCol(uid), course.id), {
      ...course,
      updatedAt: new Date().toISOString(),
    });
  },

  deleteCourse: async (uid, courseId) => {
    if (demo) {
      set({ courses: get().courses.filter((c) => c.id !== courseId) });
      return;
    }
    await deleteDoc(doc(coursesCol(uid), courseId));
  },

  createFromObject: async (uid, data) => {
    if (demo) {
      const id = newId();
      set({ courses: [...get().courses, { ...data, id }] });
      return id;
    }
    const ref = await addDoc(coursesCol(uid), data as Course);
    return ref.id;
  },
}));
