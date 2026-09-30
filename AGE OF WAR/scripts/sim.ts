/**
 * 헤드리스 밸런스 시뮬레이터: AI vs AI 대전을 돌려 경기 시간/시대 진행을 출력한다.
 * 실행: npx vite-node scripts/sim.ts [플레이어난이도] [적난이도] [판수]
 */
import { AI_PARAMS, type Difficulty } from '../src/config/ai';
import { BALANCE } from '../src/config/balance';
import { EnemyAI } from '../src/systems/EnemyAI';
import { GameWorld } from '../src/systems/GameWorld';

const [pd = 'normal', ed = 'normal', nStr = '6'] = process.argv.slice(2) as [Difficulty?, Difficulty?, string?];
const games = Number(nStr);
const limit = Number(process.env.LIMIT ?? 40) * 60;
const dt = BALANCE.sim.fixedDt;

let totalTime = 0;
const wins = [0, 0, 0];
for (let g = 0; g < games; g++) {
  const w = new GameWorld({ seed: 1000 + g * 77, incomeMult: [AI_PARAMS[ed].playerIncomeMult, AI_PARAMS[ed].incomeMult] });
  const a = new EnemyAI(w, 0, process.env.PBOT === 'strong' ? { ...AI_PARAMS.hard, incomeMult: AI_PARAMS[ed].playerIncomeMult } : pd);
  const b = new EnemyAI(w, 1, ed);
  const eraAt: string[] = [];
  let lastEras = [0, 0];
  while (!w.isOver && w.time < limit) {
    w.step(dt);
    a.update(dt);
    b.update(dt);
    const eras = [w.side(0).era, w.side(1).era];
    for (const s of [0, 1]) if (eras[s] !== lastEras[s]) eraAt.push(`${s === 0 ? 'P' : 'E'}${eras[s] + 1}@${(w.time / 60).toFixed(1)}m`);
    lastEras = eras;
    w.drainEvents();
  }
  totalTime += w.time;
  wins[w.winner === null ? 2 : w.winner]++;
  const s0 = w.side(0), s1 = w.side(1);
  console.log(
    `game ${g}: ${(w.time / 60).toFixed(1)}min winner=${w.winner ?? 'none'} ` +
      `P(era${s0.era + 1} kills${s0.stats.kills} gold${Math.floor(s0.gold)} base${Math.floor(s0.base.hp)}) ` +
      `E(era${s1.era + 1} kills${s1.stats.kills} gold${Math.floor(s1.gold)} base${Math.floor(s1.base.hp)}) ` +
      eraAt.join(' '),
  );
}
console.log(`avg ${(totalTime / games / 60).toFixed(1)}min  P wins ${wins[0]}  E wins ${wins[1]}  timeouts ${wins[2]}`);
