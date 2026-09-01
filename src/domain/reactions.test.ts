import { describe, expect, it } from 'vitest';
import { isValidCommentText, summarizeReactionsByBlock, type BlockReaction } from './reactions';

describe('isValidCommentText', () => {
  it('빈 문자열은 무효', () => {
    expect(isValidCommentText('')).toBe(false);
    expect(isValidCommentText('   ')).toBe(false);
  });

  it('30자 이내면 유효', () => {
    expect(isValidCommentText('좋았어요')).toBe(true);
    expect(isValidCommentText('a'.repeat(30))).toBe(true);
  });

  it('30자를 넘으면 무효', () => {
    expect(isValidCommentText('a'.repeat(31))).toBe(false);
  });
});

describe('summarizeReactionsByBlock', () => {
  it('블록별로 좋아요 수와 코멘트를 묶는다', () => {
    const reactions: BlockReaction[] = [
      { id: '1', blockId: 'b1', kind: 'like', visitorId: 'v1', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', blockId: 'b1', kind: 'like', visitorId: 'v2', createdAt: '2026-01-01T00:00:00.000Z' },
      {
        id: '3',
        blockId: 'b1',
        kind: 'comment',
        text: '웨이팅 있었어요',
        visitorId: 'v3',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      { id: '4', blockId: 'b2', kind: 'like', visitorId: 'v1', createdAt: '2026-01-01T00:00:00.000Z' },
    ];

    const summary = summarizeReactionsByBlock(reactions);

    expect(summary.get('b1')?.likeCount).toBe(2);
    expect(summary.get('b1')?.comments).toEqual([{ text: '웨이팅 있었어요', createdAt: '2026-01-01T00:00:00.000Z' }]);
    expect(summary.get('b2')?.likeCount).toBe(1);
    expect(summary.get('b2')?.comments).toEqual([]);
  });
});
