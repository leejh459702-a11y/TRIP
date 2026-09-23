/**
 * AI 파라미터 변형끼리 10판씩 대전시켜 승/패/시간초과를 비교하는 실험 도구.
 * 실행: [REF=normal] [REFV=변형명] [W=레인폭] npx vite-node scripts/matchup.ts [변형1,변형2]
 */
import { AI_PARAMS, type AIParams } from '../src/config/ai';
import { BALANCE } from '../src/config/balance';
const W = Number(process.env.W ?? BALANCE.world.width);
Object.assign(BALANCE.world, { width: W, baseX: [120, W - 120] });
import { EnemyAI } from '../src/systems/EnemyAI';
import { GameWorld } from '../src/systems/GameWorld';
const variants: Record<string, Partial<AIParams>> = {
  hardP: AI_PARAMS.hard, easyP: AI_PARAMS.easy, normalP: AI_PARAMS.normal,
  base: {},
  noTurret: { turretSpareGold: 1e9 },
  def13: { defensiveRatio: 1.3 },
  def07: { defensiveRatio: 0.7 },
  noRanged: { roleWeight: { melee: 1, ranged: 0, heavy: 1 }, wave: { melee: 4, ranged: 0, heavy: 1 }, wavePerEra: { melee: 1, ranged: 0, heavy: 0 } },
  delay2: { reactionDelay: 2 },
  income13: { incomeMult: 1.3 },
  heavySpam: { richGold: 0 },
  heavyBig: { richGold: 0, wave: { melee: 5, ranged: 3, heavy: 2 } },
  mixBig: { wave: { melee: 5, ranged: 4, heavy: 2 }, wavePerEra: { melee: 1, ranged: 1, heavy: 1 } },
  heavyMix: { wave: { melee: 3, ranged: 3, heavy: 3 }, wavePerEra: { melee: 0, ranged: 1, heavy: 0 }, richGold: 200, defensiveRatio: 1.1 },
  heavyMix2: { wave: { melee: 2, ranged: 4, heavy: 3 }, wavePerEra: { melee: 0, ranged: 1, heavy: 1 }, richGold: 250, defensiveRatio: 1.1 },
  bigWave: { wave: { melee: 5, ranged: 3, heavy: 2 } },
};
const only = process.argv[2];
const ref0 = AI_PARAMS[(process.env.REF as 'normal') ?? 'normal'];
const ref: AIParams = process.env.REFV ? { ...ref0, ...variants[process.env.REFV] } : ref0;
for (const [name, v] of Object.entries(variants)) {
  if (only && !only.split(',').includes(name)) continue;
  const p: AIParams = { ...ref, ...v };
  const res = [0, 0, 0];
  let t = 0;
  for (let g = 0; g < 10; g++) {
    const w = new GameWorld({ seed: 500 + g * 31, incomeMult: [p.incomeMult, ref.incomeMult] });
    const a = new EnemyAI(w, g % 2 === 0 ? 0 : 1, p);
    const b = new EnemyAI(w, g % 2 === 0 ? 1 : 0, ref);
    if (g % 2 === 1) (w.sides[0].incomeMult = ref.incomeMult), (w.sides[1].incomeMult = p.incomeMult);
    const dt = 1 / 60;
    while (!w.isOver && w.time < 25 * 60) { w.step(dt); a.update(dt); b.update(dt); w.drainEvents(); }
    t += w.time;
    const variantSide = g % 2 === 0 ? 0 : 1;
    res[w.winner === null ? 2 : w.winner === variantSide ? 0 : 1]++;
  }
  console.log(`${name.padEnd(10)} W${res[0]} L${res[1]} T${res[2]} avg ${(t / 600).toFixed(1)}m`);
}
