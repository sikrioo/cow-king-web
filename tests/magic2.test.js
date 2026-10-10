// 마법사 화염 토템(가까운 적에게 불덩이)·냉기 장판(네모 안 냉기 + 둔화)·전기충격(적 하나에 하늘 번개 + 옆 조금)
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/groundSpells.js')),
    ...(await import('../src/systems/projectiles.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js'))
  };
  m.ui.selectedClass = 'sorc';
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 999;
  m.game.cows.length = 0;
  const h = m.game.hero;
  m.Body.setPosition(h.body, { x: m.PEN.size / 2, y: m.PEN.size / 2 }); h.x = m.PEN.size / 2; h.y = m.PEN.size / 2;
  h.mana = 999;
  m.cow = (kind, dx, dy = 0) => {
    const c = new m.Monster(0.4, kind);
    const p = { x: h.x + dx, y: h.y + dy };
    m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    c.hp = c.maxHp = 99999;
    m.game.cows.push(c);
    return c;
  };
  m.run = (sec) => { for (let i = 0; i < sec * 60; i++) { m.updateGroundSpells(1 / 60); m.updateProjectiles(1 / 60); } };
  return m;
}

it('화염 토템: 지점에 서서 가까운 적에게 불덩이를 계속 쏨(화상), 하나만, 시간이 다 되면 사라짐', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero, s = m.SPELLS.firetotem;
    const c = m.cow('normal', 250);
    h.aimX = h.x + 150; h.aimY = h.y;
    m.tryFireTotem();
    m.run(2);
    expect(c.hp).toBeLessThan(c.maxHp);
    expect(c.burn.timer).toBeGreaterThan(0);
    h.spellCd.firetotem = 0;
    m.tryFireTotem();
    expect(m.game.groundSpells.filter((g) => g.kind === 'firetotem').length).toBe(1);
    m.run(s.duration + 0.5);
    expect(m.game.groundSpells.some((g) => g.kind === 'firetotem')).toBe(false);
  } finally { env.restore(); }
});

it('냉기 장판: 발밑 네모 안 적만 냉기 피해 + 둔화, 따라오지 않음', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero, s = m.SPELLS.frostfield;
    const inside = m.cow('normal', s.width / 2 - 20, 0), outside = m.cow('normal', 0, s.height / 2 + 60);
    m.tryFrostField();
    m.run(0.1);
    expect(inside.hp).toBeLessThan(inside.maxHp);
    expect(inside.chillTimer).toBeGreaterThan(0);
    expect(outside.hp).toBe(outside.maxHp);
    const g = m.game.groundSpells.find((x) => x.kind === 'frostfield');
    const x0 = g.x; h.x += 100;
    m.run(0.6);
    expect(g.x).toBe(x0);
  } finally { env.restore(); }
});

it('전기충격: 조준한 적에게 잠시 뒤 번개, 옆 적은 조금, 대상이 없으면 안 씀', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const h = m.game.hero, s = m.SPELLS.thunderstrike;
    const mana = h.mana;
    m.tryThunderStrike();
    expect(h.mana).toBe(mana); // 대상 없음
    const t = m.cow('normal', 200), side = m.cow('normal', 220, 15);
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // 번개 편차 고정
    h.aimX = t.x; h.aimY = t.y;
    m.tryThunderStrike();
    m.run(s.delay - 0.1);
    expect(t.hp).toBe(t.maxHp);
    m.run(0.2);
    const dt = t.maxHp - t.hp, ds = side.maxHp - side.hp;
    expect(dt).toBeGreaterThan(0);
    expect(ds).toBeGreaterThan(0);
    expect(ds).toBeLessThan(dt);
  } finally { vi.restoreAllMocks(); env.restore(); }
});
