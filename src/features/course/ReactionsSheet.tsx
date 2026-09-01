import { summarizeReactionsByBlock, type BlockReaction } from '../../domain/reactions';
import styles from './ReactionsSheet.module.css';

interface ReactionsSheetProps {
  reactions: BlockReaction[];
  blockNameById: ReadonlyMap<string, string>;
  onClose: () => void;
}

/** F4: 공유 링크에서 달린 익명 반응을 소유자에게만 보여줍니다. */
export function ReactionsSheet({ reactions, blockNameById, onClose }: ReactionsSheetProps) {
  const summary = summarizeReactionsByBlock(reactions);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>동행자 반응</div>

        {summary.size === 0 ? (
          <div className={styles.empty}>아직 반응이 없습니다</div>
        ) : (
          Array.from(summary.entries()).map(([blockId, s]) => (
            <div key={blockId} className={styles.blockCard}>
              <div className={styles.blockName}>{blockNameById.get(blockId) ?? '(삭제된 블록)'}</div>
              {s.likeCount > 0 && <div className={styles.likeCount}>👍 {s.likeCount}</div>}
              {s.comments.map((c, i) => (
                <div key={i} className={styles.comment}>
                  {c.text}
                </div>
              ))}
            </div>
          ))
        )}

        <button className={styles.closeButton} type="button" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
