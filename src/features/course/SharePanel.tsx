import { useState } from 'react';
import styles from './SharePanel.module.css';

interface SharePanelProps {
  shareToken?: string;
  onCreate: () => Promise<void>;
  onRevoke: () => Promise<void>;
}

/** F1: 앱 없이 보는 공유 링크 생성/해제. */
export function SharePanel({ shareToken, onCreate, onRevoke }: SharePanelProps) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = shareToken ? `${window.location.origin}/s/${shareToken}` : null;

  async function handleCreate() {
    setBusy(true);
    try {
      await onCreate();
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setBusy(true);
    try {
      await onRevoke();
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 조용히 무시 — 링크는 화면에 이미 보입니다.
    }
  }

  if (!url) {
    return (
      <div className={styles.wrap}>
        <button className={styles.button} onClick={handleCreate} disabled={busy}>
          {busy ? '만드는 중…' : '공유 링크 만들기'}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.linkBox}>
        <span className={styles.linkText}>{url}</span>
        <button className={styles.button} onClick={handleCopy}>
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <button className={styles.button} onClick={handleRevoke} disabled={busy}>
        {busy ? '해제 중…' : '즉시 해제'}
      </button>
    </div>
  );
}
