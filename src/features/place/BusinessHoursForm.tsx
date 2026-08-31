import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BusinessHours } from '../../domain/types';
import styles from './BusinessHoursForm.module.css';

const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

const dayHoursSchema = z.object({
  closed: z.boolean(),
  open: z.string().optional(),
  close: z.string().optional(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
});

const formSchema = z.object({
  weekly: z.array(dayHoursSchema).length(7),
  lastOrderMin: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function defaultWeekly(): FormValues['weekly'] {
  return Array.from({ length: 7 }, () => ({ closed: false, open: '', close: '' }));
}

interface BusinessHoursFormProps {
  initial?: BusinessHours;
  onSave: (hours: BusinessHours) => void;
}

/** B1: 요일별 영업시간 입력 폼. 영업시간 API가 없으므로 전량 수동 입력입니다. */
export function BusinessHoursForm({ initial, onSave }: BusinessHoursFormProps) {
  const { register, handleSubmit, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weekly: initial?.weekly.map((d) => ({
        closed: d.closed,
        open: d.open ?? '',
        close: d.close ?? '',
        breakStart: d.breakStart ?? '',
        breakEnd: d.breakEnd ?? '',
      })) ?? defaultWeekly(),
      lastOrderMin: initial?.lastOrderMin != null ? String(initial.lastOrderMin) : '',
      note: initial?.note ?? '',
    },
  });

  function submit(values: FormValues) {
    const hours: BusinessHours = {
      weekly: values.weekly.map((d) => ({
        closed: d.closed,
        open: d.closed ? undefined : d.open || undefined,
        close: d.closed ? undefined : d.close || undefined,
        breakStart: d.closed ? undefined : d.breakStart || undefined,
        breakEnd: d.closed ? undefined : d.breakEnd || undefined,
      })),
      lastOrderMin: values.lastOrderMin ? Number(values.lastOrderMin) : undefined,
      note: values.note || undefined,
    };
    onSave(hours);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(submit)}>
      {DAY_LABEL.map((label, i) => {
        const closed = watch(`weekly.${i}.closed`);
        return (
          <div className={styles.dayRow} key={i}>
            <div className={styles.dayLabel}>{label}</div>
            <div className={styles.fields}>
              <label className={styles.closedLabel}>
                <input type="checkbox" {...register(`weekly.${i}.closed`)} />
                휴무
              </label>
              {!closed && (
                <>
                  <input type="time" className={styles.timeInput} {...register(`weekly.${i}.open`)} />
                  <span className={styles.sep}>~</span>
                  <input type="time" className={styles.timeInput} {...register(`weekly.${i}.close`)} />
                  <span className={styles.sep}>브레이크</span>
                  <input
                    type="time"
                    className={styles.timeInput}
                    {...register(`weekly.${i}.breakStart`)}
                  />
                  <span className={styles.sep}>~</span>
                  <input
                    type="time"
                    className={styles.timeInput}
                    {...register(`weekly.${i}.breakEnd`)}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className={styles.metaRow}>
        <label className={styles.metaLabel}>
          라스트오더(마감 몇 분 전)
          <input
            type="number"
            min={0}
            className={styles.timeInput}
            {...register('lastOrderMin')}
          />
        </label>
      </div>
      <input
        className={styles.noteInput}
        placeholder="예: 매월 2·4주 화요일 휴무"
        {...register('note')}
      />

      <button className={styles.saveButton} type="submit">
        영업시간 저장
      </button>
    </form>
  );
}
