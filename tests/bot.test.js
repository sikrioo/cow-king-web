// 자동 플레이 봇 (2026-10-14): 타이틀부터 혼자 맵에 들어가 싸우고(카드·물약·피하기), 예외 없이 계속 돔. 관측은 외부 모델용 JSON으로도
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function run(cls, seed, seconds) {
  const env = installBrowserEnv({ seed });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const m = { ...(await import('../src/state.js')), ...(await import('../src/game.js')), ...(await import('../src/bot/bot.js')) };
    m.ui.selectedClass = cls;
    m.setBot(true);
    let maxLv = 0;
    for (let i = 0; i < seconds * 60; i++) { m.fixedUpdate(1 / 60); maxLv = Math.max(maxLv, m.game.hero.level); }
    return { ...m.botStats(), level: maxLv, api: m.botApi };
  } finally { env.restore(); }
}

it('봇: 전사·마법사 모두 타이틀에서 시작해 혼자 웨이브를 깨며 레벨이 오름', async () => {
  for (const cls of ['warrior', 'sorc']) {
    const s = await run(cls, 11, 150);
    expect(s.runs, cls).toBeGreaterThanOrEqual(1);   // 혼자 맵에 들어감
    expect(s.kills, cls).toBeGreaterThan(15);         // 실제로 싸움
    expect(s.bestWave, cls).toBeGreaterThanOrEqual(2);
    expect(s.level, cls).toBeGreaterThan(1);           // 카드도 고름(멈추지 않음)
  }
}, 240000);

it('봇 관측: 외부 모델로 보낼 JSON (몬스터는 참조 없이 번호)', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const m = { ...(await import('../src/state.js')), ...(await import('../src/game.js')), ...(await import('../src/bot/bot.js')) };
    m.setBot(true);
    for (let i = 0; i < 60 * 12; i++) m.fixedUpdate(1 / 60);
    const o = m.botApi.observe();
    const text = JSON.stringify(o); // 순환 참조가 없어야 함
    expect(text.length).toBeGreaterThan(50);
    expect(o.hero).toBeTruthy();
    o.monsters.forEach((mm, i) => { expect(mm.id).toBe(i); expect(mm.ref).toBeUndefined(); });
  } finally { env.restore(); }
}, 60000);

it('전술 조언자: 비동기로 답한 전술(retreat)을 따르고, 확신이 낮으면 무시', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const m = { ...(await import('../src/state.js')), ...(await import('../src/game.js')), ...(await import('../src/bot/bot.js')) };
    m.setBot(true);
    let asked = null;
    m.botApi.setAdvisor(async (q) => { asked = q; return { tactic: 'retreat', confidence: 0.9 }; }, { interval: 0.5 });
    for (let i = 0; i < 60 * 15; i++) { m.fixedUpdate(1 / 60); if (i % 30 === 0) await Promise.resolve(); await null; }
    expect(asked && asked.choices).toContain('retreat');
    expect(JSON.stringify(asked).length).toBeGreaterThan(50);
    expect(m.botApi.advisor().tactic).toBe('retreat');
    m.botApi.setAdvisor(async () => ({ tactic: 'hold', confidence: 0.2 }), { interval: 0.5 });
    for (let i = 0; i < 60 * 2; i++) { m.fixedUpdate(1 / 60); await null; }
    expect(m.botApi.advisor().tactic).toBe('fight'); // 확신 0.2 < 0.6 → 무시
  } finally { env.restore(); }
}, 60000);
