import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fetchSharedSnapshot } from '../../services/share';
import { addReaction, getOrCreateVisitorId, getReactedBlockIds, markBlockReacted } from '../../services/reactions';
import { isValidCommentText } from '../../domain/reactions';
import type { SharedSnapshot } from '../../domain/share';
import { KakaoMapView, type MapMarkerSpec } from '../../components/map/KakaoMapView';
import { CATEGORY_COLOR_VAR } from '../../domain/category';
import { buildKakaoWebDirectionsUrl, buildKakaoWebMapUrl } from '../../services/deeplink';
import styles from './SharePage.module.css';

/** F1: 앱 없이 보는 공유 링크. 로그인 불필요, 탭바 없이 단독 렌더링됩니다. */
export function SharePage() {
  const { token } = useParams();
  const [snapshot, setSnapshot] = useState<SharedSnapshot | null | 'loading' | 'expired'>(
    'loading',
  );
  const [dayIndex, setDayIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetchSharedSnapshot(token)
      .then((snap) => {
        if (!snap) {
          setSnapshot(null);
          return;
        }
        if (new Date(snap.expiresAt) < new Date()) {
          setSnapshot('expired');
          return;
        }
        setSnapshot(snap);
      })
      .catch(() => setSnapshot(null));
  }, [token]);

  if (snapshot === 'loading') {
    return <div className={styles.centerMsg}>불러오는 중…</div>;
  }
  if (snapshot === null) {
    return (
      <div className={styles.centerMsg}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          존재하지 않는 링크입니다
        </div>
        <p>공유한 사람이 링크를 해제했거나 잘못된 주소입니다</p>
      </div>
    );
  }
  if (snapshot === 'expired') {
    return (
      <div className={styles.centerMsg}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          링크가 만료되었습니다
        </div>
        <p>공유 링크는 생성 후 90일간만 유효합니다</p>
      </div>
    );
  }

  const day = snapshot.days[dayIndex] ?? snapshot.days[0];
  const placeBlocks = (day?.blocks ?? []).filter((b) => b.type === 'place' && b.lat != null);

  const markers: MapMarkerSpec[] = placeBlocks.map((b, i) => ({
    id: `${i}-${b.name}`,
    lat: b.lat as number,
    lng: b.lng as number,
    color: b.category ? CATEGORY_COLOR_VAR[b.category] : 'var(--cat-etc)',
    label: String(i + 1),
  }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>{snapshot.title}</div>
        <div className={styles.sub}>{snapshot.startDate} 시작 · 총 {snapshot.days.length}일</div>
      </div>

      <div className={styles.mapWrap}>
        <KakaoMapView markers={markers} />
      </div>

      {snapshot.days.length > 1 && (
        <div className={styles.dayTabs}>
          {snapshot.days.map((d, i) => (
            <button
              key={d.date}
              className={`${styles.dayTab} ${i === dayIndex ? styles.dayTabActive : ''}`}
              onClick={() => setDayIndex(i)}
            >
              {i + 1}일차 · {d.date}
            </button>
          ))}
        </div>
      )}

      <div className={styles.list}>
        {(day?.blocks ?? []).map((b, i) => (
          <div className={styles.row} key={i}>
            <div className={`${styles.time} num`}>{format(new Date(b.arriveAt), 'HH:mm')}</div>
            <div className={styles.body}>
              <div className={styles.name}>{b.name}</div>
              <div className={styles.meta}>
                체류 {b.stayMin}분
                {b.legDurationMin != null ? ` · 다음까지 ${b.legDurationMin}분` : ''}
                {b.legTransitSummary ? ` · ${b.legTransitSummary}` : ''}
              </div>
              {b.type === 'place' && b.lat != null && b.lng != null && (
                <div className={styles.links}>
                  <a
                    className={styles.linkButton}
                    href={buildKakaoWebMapUrl({ name: b.name, lat: b.lat, lng: b.lng })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    지도에서 보기
                  </a>
                  <a
                    className={styles.linkButton}
                    href={buildKakaoWebDirectionsUrl({ name: b.name, lat: b.lat, lng: b.lng })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    길찾기
                  </a>
                  {b.placeUrl && (
                    <a className={styles.linkButton} href={b.placeUrl} target="_blank" rel="noreferrer">
                      플레이스
                    </a>
                  )}
                </div>
              )}
              {token && <BlockReactionForm token={token} blockId={b.blockId} />}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>여행 코스 · 기록 앱에서 공유되었습니다</div>
    </div>
  );
}

/** F4: 로그인 없이 남기는 익명 반응(👍 또는 30자 코멘트). 한 블록당 이 브라우저에서 한 번만. */
function BlockReactionForm({ token, blockId }: { token: string; blockId: string }) {
  const [reacted, setReacted] = useState(() => getReactedBlockIds(token).has(blockId));
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(kind: 'like' | 'comment') {
    if (busy || reacted) return;
    if (kind === 'comment' && !isValidCommentText(comment)) return;
    setBusy(true);
    try {
      await addReaction(token, {
        blockId,
        kind,
        text: kind === 'comment' ? comment.trim() : undefined,
        visitorId: getOrCreateVisitorId(),
        createdAt: new Date().toISOString(),
      });
      markBlockReacted(token, blockId);
      setReacted(true);
    } finally {
      setBusy(false);
    }
  }

  if (reacted) {
    return <div className={styles.reactedNote}>반응을 남겼어요, 감사합니다 🙌</div>;
  }

  return (
    <div className={styles.reactionRow}>
      <button
        type="button"
        className={styles.likeButton}
        disabled={busy}
        onClick={() => void submit('like')}
      >
        👍
      </button>
      <input
        className={styles.commentInput}
        value={comment}
        maxLength={30}
        placeholder="한마디 남기기 (30자)"
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        type="button"
        className={styles.commentSubmit}
        disabled={busy || !isValidCommentText(comment)}
        onClick={() => void submit('comment')}
      >
        남기기
      </button>
    </div>
  );
}
