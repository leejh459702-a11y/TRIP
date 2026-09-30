/**
 * 스토리 난이도 곡선 점검: 플레이어 대역(보통 AI)이 각 스테이지를 이기는 비율.
 * 강화 없음 / 그 스테이지까지 첫 클리어 포인트를 고르게 투자한 경우를 비교한다.
 * 실행: npx vite-node scripts/story-sim.ts [판수=6]
 */
import { AI_PARAMS } from '../src/config/ai';
import { emptyLevels, getStage, STAGE_COUNT, UPGRADES, upgradeCost, upgradeMods } from '../src/config/story';
import { EnemyAI } from '../src/systems/EnemyAI';
import { GameWorld } from '../src/systems/GameWorld';

const GAMES = Number(process.argv[2] ?? 6);

/** 스테이지 s 직전까지 첫 클리어 포인트를 5개 강화에 번갈아 투자 */
function expectedLevels(s: number) {
  let pts = 0;
  for (let i = 0; i < s; i++) pts += getStage(i).firstClearPoints;
  const lv = emptyLevels();
  let k = 0;
  for (;;) {
    const u = UPGRADES[k % UPGRADES.length];
    const c = upgradeCost(lv[u.key]);
    if (lv[u.key] >= u.maxLevel || c > pts) break;
    pts -= c;
    lv[u.key] += 1;
    k++;
  }
  return lv;
}

function play(s: number, upgraded: boolean): [number, number] {
  const st = getStage(s);
  const mods = upgraded ? upgradeMods(expectedLevels(s)) : undefined;
  let win = 0;
  let t = 0;
  for (let g = 0; g < GAMES; g++) {
    const w = new GameWorld({ seed: 900 + g * 17 + s * 101, incomeMult: [1, st.enemyIncomeMult], mods: [mods, st.enemyMods] });
    const a = new EnemyAI(w, 0, AI_PARAMS.normal);
    const b = new EnemyAI(w, 1, st.ai);
    const dt = 1 / 60;
    while (!w.isOver && w.time < 25 * 60) { w.step(dt); a.update(dt); b.update(dt); w.drainEvents(); }
    if (w.winner === 0) win++;
    t += w.time;
  }
  return [win, t / GAMES / 60];
}

const only = process.env.STAGES?.split(',').map(Number);
for (let s = 0; s < STAGE_COUNT; s++) {
  if (only && !only.includes(s)) continue;
  const [w0, t0] = play(s, false);
  const [w1, t1] = play(s, true);
  const lv = expectedLevels(s);
  console.log(`${getStage(s).label}  강화없음 ${w0}/${GAMES} (${t0.toFixed(1)}분)  강화(${Object.values(lv).join('/')}) ${w1}/${GAMES} (${t1.toFixed(1)}분)`);
}
