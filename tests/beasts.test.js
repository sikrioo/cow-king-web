// 짐승 (2026-10-13): 쥐떼 카우가 악마 쥐 부대를 대형으로 부르고, 가까워지면 대형을 풀고 덤빔 / 박치기 뱀은 빗나가면 휘돌아 두 번째 돌진
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/world/arena.js'))
  };
  m.ui.selectedClass = 'warrior';
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 1e9;
  m.game.cows = [];
  m.dev.god = true;
  return m;
}
const place = (m, c, x, y) => { m.Body.setPosition(c.body, { x, y }); c.x = x; c.y = y; };

it('쥐떼 카우: 3×3 부대를 부르고, 부대는 대형(기준점)을 지키며 행군하다 가까워지면 대형을 풂', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const h = m.game.hero, cx = m.PEN.x + m.PEN.size / 2, cy = m.PEN.y + m.PEN.size / 2;
    m.Body.setPosition(h.body, { x: cx - 250, y: cy }); h.x = cx - 250; h.y = cy;
    const k = new m.Monster(0.4, 'ratKeeper', { hunt: true }); place(m, k, cx + 50, cy); k.summonCd = 0;
    m.game.cows.push(k);
    let rats = [], marched = false;
    for (let i = 0; i < 600 && !rats.length; i++) { m.fixedUpdate(1 / 60); rats = m.game.cows.filter((c) => c.kind === 'rat'); }
    expect(rats.length).toBe(m.RAT_SQUAD.rows * m.RAT_SQUAD.cols);
    const sq = rats[0].squad;
    expect(rats.every((r) => r.squad === sq)).toBe(true);
    for (let i = 0; i < 1200 && !sq.broken; i++) {
      m.Body.setPosition(h.body, { x: cx - 250, y: cy }); h.x = cx - 250; h.y = cy; // 주인공은 제자리
      m.fixedUpdate(1 / 60);
      if (!sq.broken && sq.x < cx) marched = true;
    }
    expect(marched).toBe(true); // 주인공 쪽으로 행군
    expect(sq.broken).toBe(true); // 가까워지면 대형을 풂
  } finally { env.restore(); }
}, 60000);

it('박치기 뱀: 똬리 → 돌진, 빗나가면 휘돌아(turn) 두 번째 돌진', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    const m = await boot();
    const h = m.game.hero, cx = m.PEN.x + m.PEN.size / 2, cy = m.PEN.y + m.PEN.size / 2;
    const s = new m.Monster(0.4, 'snake'); place(m, s, cx - 120, cy); s.dashCd = 0;
    m.game.cows.push(s);
    m.Body.setPosition(h.body, { x: cx + 80, y: cy }); h.x = cx + 80; h.y = cy;
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      if (s.state === 'strike' && s.dashNo === 1) { m.Body.setPosition(h.body, { x: cx + 80, y: cy + 200 }); h.x = cx + 80; h.y = cy + 200; } // 옆으로 피함
      m.fixedUpdate(1 / 60);
      seen.add(s.state + (s.state === 'strike' ? s.dashNo : ''));
    }
    expect(seen.has('coil')).toBe(true);
    expect(seen.has('strike1')).toBe(true);
    expect(seen.has('turn')).toBe(true);
    expect(seen.has('strike2')).toBe(true);
  } finally { env.restore(); }
}, 60000);
