import type { Block, Place, TravelMode } from './types';

function newId(): string {
  return crypto.randomUUID();
}

export function createPlaceBlock(place: Place): Block {
  return {
    id: newId(),
    type: 'place',
    placeId: place.id,
    stayMin: place.defaultStayMin,
    modeToNext: 'car',
  };
}

export function createFreeBlock(label: string, stayMin = 60): Block {
  return {
    id: newId(),
    type: 'free',
    label,
    stayMin,
  };
}

/** 블록을 fromIndex에서 toIndex로 옮긴 새 배열을 반환합니다 (불변). */
export function reorderBlocks(blocks: Block[], fromIndex: number, toIndex: number): Block[] {
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return blocks;
  next.splice(toIndex, 0, moved);
  return next;
}

export function removeBlockById(blocks: Block[], blockId: string): Block[] {
  return blocks.filter((b) => b.id !== blockId);
}

export function updateBlock(blocks: Block[], blockId: string, patch: Partial<Block>): Block[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
}

export function updateBlockStayMin(blocks: Block[], blockId: string, stayMin: number): Block[] {
  return updateBlock(blocks, blockId, { stayMin: Math.max(0, stayMin) });
}

export function updateBlockMode(blocks: Block[], blockId: string, mode: TravelMode): Block[] {
  return updateBlock(blocks, blockId, { modeToNext: mode });
}
