import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore, type ThemeMode } from '../../store/settingsStore';
import { exportAllData, importAllData, downloadTextFile, type BackupData } from '../../services/backup';
import { placesToCsv, visitsToCsv } from '../../domain/csv';
import styles from './MyPage.module.css';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export function MyPage() {
  const { user, status } = useAuthStore();
  const uid = user?.uid;
  const theme = useSettingsStore((s) => s.theme);
  const subscribeSettings = useSettingsStore((s) => s.subscribe);
  const updateSettings = useSettingsStore((s) => s.update);

  useEffect(() => {
    if (!uid) return;
    return subscribeSettings(uid);
  }, [uid, subscribeSettings]);

  return (
    <>
      <PageHeader title="마이" />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>화면 테마</div>
        <div className={styles.row}>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.themeButton} ${theme === opt.value ? styles.themeButtonActive : ''}`}
              onClick={() => uid && void updateSettings(uid, { theme: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>이동 이상 감지 임계값 (B2)</div>
        <ThresholdInput uid={uid} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>데이터 내보내기 · 가져오기</div>
        <BackupSection uid={uid} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>계정</div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          {status === 'ready' && user ? `로그인 완료 · ${user.uid.slice(0, 8)}` : '로그인 준비 중…'}
        </div>
      </div>
    </>
  );
}

function BackupSection({ uid }: { uid?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExportJson() {
    if (!uid) return;
    setBusy('export');
    try {
      const data = await exportAllData(uid);
      downloadTextFile(JSON.stringify(data, null, 2), 'trip-backup.json', 'application/json');
    } finally {
      setBusy(null);
    }
  }

  async function handleExportCsv() {
    if (!uid) return;
    setBusy('csv');
    try {
      const data = await exportAllData(uid);
      downloadTextFile(placesToCsv(data.places), 'places.csv', 'text/csv');
      downloadTextFile(visitsToCsv(data.visits), 'visits.csv', 'text/csv');
    } finally {
      setBusy(null);
    }
  }

  async function handleImportFile(file: File) {
    if (!uid) return;
    if (
      !window.confirm(
        '가져오면 같은 id의 장소·방문·코스가 지금 파일 내용으로 덮어써집니다. 계속할까요?',
      )
    ) {
      return;
    }
    setBusy('import');
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      await importAllData(uid, data);
      window.alert('가져오기를 완료했습니다.');
    } catch (err) {
      window.alert(`가져오기에 실패했습니다: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className={styles.row}>
        <button className={styles.linkButton} onClick={handleExportJson} disabled={busy !== null}>
          {busy === 'export' ? '내보내는 중…' : '전체 백업 (JSON)'}
        </button>
        <button className={styles.linkButton} onClick={handleExportCsv} disabled={busy !== null}>
          {busy === 'csv' ? '내보내는 중…' : '장소·방문 CSV'}
        </button>
        <button
          className={styles.linkButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === 'import' ? '가져오는 중…' : 'JSON 가져오기'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />
      </div>
      <div className={styles.desc}>JSON 백업은 가져오기로 그대로 되돌릴 수 있습니다.</div>
    </div>
  );
}

function ThresholdInput({ uid }: { uid?: string }) {
  const value = useSettingsStore((s) => s.longTransferThresholdMin);
  const update = useSettingsStore((s) => s.update);
  return (
    <div>
      <input
        type="number"
        min={5}
        step={5}
        value={value}
        onChange={(e) => uid && void update(uid, { longTransferThresholdMin: Number(e.target.value) })}
        style={{
          width: 64,
          border: '1px solid var(--line)',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 13,
        }}
      />
      <span className={styles.desc} style={{ display: 'inline', marginLeft: 8 }}>
        분 이상 이동이면 &ldquo;이동 김&rdquo; 경고
      </span>
    </div>
  );
}
