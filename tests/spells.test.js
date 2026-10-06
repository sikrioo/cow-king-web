// 메테오: 경고 후 착탄 - 범위 안이면 화염 피해(+화상), 착탄 자리에 불꽃 바닥. 화염술사 카우는 사거리 안에서 시전
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/spells.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js'))
  };
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 999;
  return m;
}

it('메테오: DELAY 전엔 피해 없음 → 착탄하면 화염 피해 + 화상 + 불꽃 바닥, 범위 밖이면 무사', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.hp = 1000; h.invuln = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // 회피/블락 없음
    m.spawnMeteor(h.x, h.y);
    m.updateMeteors(m.METEOR_DELAY - 0.05);
    expect(h.hp).toBe(1000);
    m.updateMeteors(0.1);
    expect(h.hp).toBeLessThan(1000);
    expect(h.burn.timer).toBeGreaterThan(0);
    expect(m.game.meteors.length).toBe(0);
    expect(m.game.hazards.some((z) => z.element === 'fire' && z.r === m.METEOR_FIRE_RADIUS)).toBe(true);

    const hp = h.hp; h.invuln = 0;
    m.spawnMeteor(h.x + m.METEOR_RADIUS + 60, h.y);
    m.updateMeteors(m.METEOR_DELAY + 0.01);
    expect(h.hp).toBe(hp);
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('화염술사 카우: 사거리 안이면 시전 후 그 순간 주인공 자리에 메테오', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const c = new m.Monster(0.4, 'pyro');
    const p = { x: h.x + 300, y: h.y };
    m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    c.castCooldown = 0; c.meteorCooldown = 0; // 300px = 메테오 거리
    m.game.cows.push(c);
    c.update(1 / 60);
    expect(c.state).toBe('casting');
    expect(c.castSpell).toBe('meteor');
    const aim = { x: c.castX, y: c.castY };
    for (let i = 0; i < 60 && !m.game.meteors.length; i++) c.update(1 / 60);
    expect(m.game.meteors.length).toBe(1);
    expect(m.game.meteors[0].x).toBe(aim.x);
    expect(c.castCooldown).toBeGreaterThan(0);
  } finally { env.restore(); }
});

it('화염술사 마법 고르기: 중간 거리 파이어볼(곧게 날아가 맞으면 화염 피해), 가까우면 화염 벽', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.hp = 1000;
    // resetGame 직후엔 h.x/h.y가 아직 (0,0) - 목장 가운데로 (울타리 밖 판정에 걸리지 않게)
    const { PEN } = await import('../src/world/arena.js');
    m.Body.setPosition(h.body, { x: PEN.size / 2, y: PEN.size / 2 }); h.x = PEN.size / 2; h.y = PEN.size / 2;
    const place = (dx) => {
      const c = new m.Monster(0.4, 'pyro');
      const p = { x: h.x + dx, y: h.y };
      m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
      c.castCooldown = 0; c.meteorCooldown = 0; c.wallCooldown = 0;
      m.game.cows.push(c);
      return c;
    };
    const mid = place(220);
    mid.update(1 / 60);
    expect(mid.castSpell).toBe('fireball');
    for (let i = 0; i < 40 && !m.game.projectiles.length; i++) mid.update(1 / 60);
    expect(m.game.projectiles.length).toBe(1);
    const { updateProjectiles } = await import('../src/systems/projectiles.js');
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // 회피/블락 없음
    h.invuln = 0;
    for (let i = 0; i < 120 && m.game.projectiles.length; i++) updateProjectiles(1 / 60);
    expect(m.game.projectiles.length).toBe(0);
    expect(h.hp).toBeLessThan(1000);
    expect(h.burn.timer).toBeGreaterThan(0);
    vi.restoreAllMocks();

    m.game.cows.length = 0; m.game.hazards.length = 0;
    const near = place(120);
    near.update(1 / 60);
    expect(near.castSpell).toBe('wall');
    for (let i = 0; i < 60 && near.state === 'casting'; i++) near.update(1 / 60);
    expect(m.game.hazards.filter((z) => z.element === 'fire').length).toBe(m.FIRE_WALL_SEGMENTS);
  } finally { vi.restoreAllMocks(); env.restore(); }
});
