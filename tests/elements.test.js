// 원소 규칙: 물리는 방어력/원소는 저항(상한), 화상·중독 지속 피해, 둔화(저항만큼 짧아짐, 공격도 느려짐), 번개 편차, 독 구름, 몬스터 근접 원소
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/elements.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/systems/fx.js')),
    ...(await import('../src/data/elements.js')),
    ...(await import('../src/data/balance.js'))
  };
  m.resetGame();
  m.game.gameState = 'playing';
  return m;
}
const noDodge = () => vi.spyOn(Math, 'random').mockReturnValue(0.999); // 회피/블락이 안 나게

it('물리는 방어력만, 원소는 저항만 (저항 상한 75%)', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.armorReduction = 0.5;
    h.resist.fire = 0.4; h.resist.cold = 2; // 상한 넘게
    const r = m.resolveHeroDamage({ phys: 40, fire: 50, cold: 100 });
    expect(r.parts).toEqual({ phys: 20, fire: 30, cold: 25 });
    expect(r.total).toBe(75);
    expect(r.dominant).toBe('fire');
    expect(m.resolveHeroDamage(m.toPacket(30)).parts).toEqual({ phys: 15 }); // 숫자 = 물리
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('화염 → 화상(지속 피해, 넉백 없음), 독 → 중독(겹치지 않고 갱신)', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.armorReduction = 0; h.hp = 1000; h.invuln = 0;
    noDodge();
    m.hitPlayer(h.x + 10, h.y, { fire: 40 });
    expect(h.hp).toBe(960);
    expect(h.burn.timer).toBe(m.BURN_DURATION);
    for (let i = 0; i < 60 * 3; i++) m.updateHeroStatuses(1 / 60);
    expect(h.burn.timer).toBe(0);
    expect(960 - h.hp).toBeGreaterThanOrEqual(Math.round(40 * m.BURN_RATIO) - 2); // 화상 총량 ≈ 화염의 절반
    expect(960 - h.hp).toBeLessThanOrEqual(Math.round(40 * m.BURN_RATIO) + 4);

    m.applyPoisonDirect(80);
    const dps = h.poison.dps;
    m.applyPoisonDirect(40); // 약한 독은 세기를 바꾸지 않음
    expect(h.poison.dps).toBe(dps);
    expect(h.poison.timer).toBe(m.POISON_DURATION);
    h.resist.poison = 0.5;
    h.poison.timer = 0;
    m.applyPoisonDirect(80);
    expect(h.poison.dps).toBeCloseTo(dps / 2);
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('냉기 → 둔화(냉기 저항만큼 짧게), 둔화 중엔 공격속도도 느려짐', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const { attackSpeedMul } = await import('../src/util.js');
    const h = m.game.hero;
    h.slowTimer = 0; h.resist.cold = 0.5;
    m.applyChill(2);
    expect(h.slowTimer).toBeCloseTo(1);
    const slow = attackSpeedMul(h);
    h.slowTimer = 0;
    expect(slow).toBeCloseTo(attackSpeedMul(h) / m.CHILL_ATTACK_SPEED_MULT);
  } finally { env.restore(); }
});

it('번개 피해는 기준값의 MIN~MAX배 사이 정수', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot();
    const vals = Array.from({ length: 500 }, () => m.rollLightning(60));
    expect(vals.every((v) => Number.isInteger(v) && v >= Math.round(60 * m.LIGHTNING_MIN) && v <= Math.round(60 * m.LIGHTNING_MAX))).toBe(true);
    expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(40);
  } finally { env.restore(); }
});

it('독 구름 안에 있으면 막기/회피 없이 중독, 원소 몬스터 근접은 그 원소 피해', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const { Monster } = await import('../src/entities/monster.js');
    const h = m.game.hero;
    m.spawnPoisonCloud(h.x, h.y);
    m.updateHazards(1 / 60);
    expect(h.poison.timer).toBeGreaterThan(0);
    expect(new Monster(0.4, 'venom').element).toBe('poison');
    expect(new Monster(0.4, 'burning').element).toBe('fire');
    expect(new Monster(0.4, 'normal').element).toBe(null);
  } finally { env.restore(); }
});

it('지속 피해로 죽으면 게임오버', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.hp = 3;
    m.applyPoisonDirect(400);
    for (let i = 0; i < 60 && h.alive; i++) m.updateHeroStatuses(1 / 60);
    expect(h.alive).toBe(false);
    expect(h.hp).toBe(0);
    expect(m.game.gameState).toBe('gameover');
  } finally { env.restore(); }
});
