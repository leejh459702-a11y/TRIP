/** F4: 공유 링크에서 남기는 익명 반응. 원본 소유자에게만 보입니다. */
export interface BlockReaction {
  id: string;
  blockId: string;
  kind: 'like' | 'comment';
  text?: string; // kind === 'comment'일 때만, 30자 이내
  visitorId: string; // 브라우저 로컬 식별자 (중복 방지용)
  createdAt: string;
}

export const COMMENT_MAX_LEN = 30;

export function isValidCommentText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= COMMENT_MAX_LEN;
}

export interface BlockReactionSummary {
  likeCount: number;
  comments: { text: string; createdAt: string }[];
}

/** 블록 id별로 반응을 묶어, 소유자 화면에서 바로 렌더링할 수 있는 요약을 만듭니다. */
export function summarizeReactionsByBlock(
  reactions: readonly BlockReaction[],
): Map<string, BlockReactionSummary> {
  const map = new Map<string, BlockReactionSummary>();
  for (const r of reactions) {
    const entry = map.get(r.blockId) ?? { likeCount: 0, comments: [] };
    if (r.kind === 'like') {
      entry.likeCount += 1;
    } else if (r.text) {
      entry.comments.push({ text: r.text, createdAt: r.createdAt });
    }
    map.set(r.blockId, entry);
  }
  return map;
}
