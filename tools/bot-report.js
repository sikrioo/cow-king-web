// 봇 보고서 (npm run bot:report): 화면 없이 직업 × 시드마다 봇을 정해진 시간 돌리고 표로 보여 줌 (npm test에는 안 들어감)
//   새 몬스터·밸런스를 바꾼 뒤 "몇 웨이브까지 가는지, 몇 번 죽는지"를 비교하는 용도. 시간·시드는 아래 숫자로
import { it, vi } from 'vitest';
import { installBrowserEnv } from '../tests/helpers/browserEnv.js';

const CLASSES = ['warrior', 'sorc'];
const SEEDS = [1, 2, 3];
const SECONDS = 300;

async function run(cls, seed) {
  const env = installBrowserEnv({ seed });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const m = { ...(await import('../src/state.js')), ...(await import('../src/game.js')), ...(await import('../src/bot/bot.js')), ...(await import('../src/bot/upkeep.js')), ...(await import('../src/data/items.js')) };
    m.ui.selectedClass = cls;
    m.setBot(true);
    let level = 0;
    for (let i = 0; i < SECONDS * 60; i++) {
      m.fixedUpdate(1 / 60);
      level = Math.max(level, m.game.hero.level);
    }
    const s = m.botStats();
    const h = m.game.hero, gear = Math.round(m.GEAR_SLOTS.reduce((t, k) => t + m.gearScore(h.equipment[k]), 0));
    return { cls, seed, runs: s.runs, deaths: s.deaths, act: s.bestAct + 1, wave: s.bestWave, level, kills: s.kills, slots: `${h.slot1}/${h.slot2}`, gear };
  } finally { env.restore(); }
}

it('봇 보고서', async () => {
  const rows = [];
  for (const cls of CLASSES) for (const seed of SEEDS) rows.push(await run(cls, seed));
  const head = ['직업', '시드', '판', '죽음', '최고 막', '최고 웨이브', '레벨', '처치', '슬롯', '장비 점수'];
  const lines = rows.map((r) => [r.cls, r.seed, r.runs, r.deaths, r.act, r.wave, r.level, r.kills, r.slots, r.gear].join('\t'));
  process.stdout.write(`\n봇 보고서 (${SECONDS}초씩, 보통 난이도 목장)\n${head.join('\t')}\n${lines.join('\n')}\n\n`);
}, 0);
