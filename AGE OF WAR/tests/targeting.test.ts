import { describe, expect, it } from 'vitest';
import { selectTarget } from '../src/systems/CombatSystem';
import { makeWorld, place } from './helpers';

describe('타겟팅 규칙', () => {
  it('근접은 사거리 내 적 중 최전방(가장 많이 전진한) 적을 노린다', () => {
    const w = makeWorld();
    const me = place(w, 0, 'heavy', 1000); // 폭 52, 사거리 30
    // 적(오른쪽→왼쪽 진행). x가 작을수록 더 전진함
    const a = place(w, 1, 'melee', 1050);
    const b = place(w, 1, 'melee', 1060);
    const t = selectTarget(me, [b, a], w.side(1).base);
    expect(t).toEqual({ kind: 'unit', unit: a });
  });

  it('적 진영 근접 유닛도 대칭으로 최전방을 노린다', () => {
    const w = makeWorld();
    const me = place(w, 1, 'heavy', 1000);
    const a = place(w, 0, 'melee', 950);
    const b = place(w, 0, 'melee', 940);
    const t = selectTarget(me, [b, a], w.side(0).base);
    expect(t).toEqual({ kind: 'unit', unit: a });
  });

  it('원거리는 아군 뒤에서도 사거리 내 가장 가까운 적을 노린다', () => {
    const w = makeWorld();
    const archer = place(w, 0, 'ranged', 900);
    place(w, 0, 'melee', 960); // 앞의 아군
    const near = place(w, 1, 'melee', 1000);
    const far = place(w, 1, 'heavy', 1050);
    const t = selectTarget(archer, [far, near], w.side(1).base);
    expect(t).toEqual({ kind: 'unit', unit: near });
  });

  it('사거리 밖의 적은 무시한다', () => {
    const w = makeWorld();
    const me = place(w, 0, 'melee', 500);
    const e = place(w, 1, 'melee', 700);
    expect(selectTarget(me, [e], w.side(1).base)).toBeNull();
  });

  it('사거리 내 적 유닛이 없고 적 기지가 사거리 내면 기지를 공격한다', () => {
    const w = makeWorld();
    const base = w.side(1).base;
    const me = place(w, 0, 'melee', base.frontX - 13 - 20);
    expect(selectTarget(me, [], base)).toEqual({ kind: 'base' });
    // 적 유닛이 사거리 안에 있으면 유닛 우선
    const e = place(w, 1, 'melee', me.x + 40);
    expect(selectTarget(me, [e], base)).toEqual({ kind: 'unit', unit: e });
  });

  it('기지가 사거리 밖이면 대상 없음', () => {
    const w = makeWorld();
    const base = w.side(1).base;
    const me = place(w, 0, 'melee', base.frontX - 13 - 60);
    expect(selectTarget(me, [], base)).toBeNull();
  });
});
