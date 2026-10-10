// 악마 카우 종족(관리자 전용): 임프 순간이동, 저주 카우 저주(효과·건 몬스터가 죽으면 풀림)·지옥불 구슬, 버서커 도약·분노, 카우킹 임프 소환·지옥불 원·분노·보스
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/summons.js')),
    ...(await import('../src/systems/curses.js')),
    ...(await import('../src/systems/demonSpells.js')),
    ...(await import('../src/systems/cc.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/systems/elements.js')),
    ...(await import('../src/data/monsters.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js')),
    ...(await import('../src/util.js'))
  };
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 999;
  m.game.cows.length = 0;
  const h = m.game.hero;
  m.Body.setPosition(h.body, { x: m.PEN.size / 2, y: m.PEN.size / 2 }); h.x = m.PEN.size / 2; h.y = m.PEN.size / 2;
  m.spawn = (kind, dx, dy = 0) => { const c = new m.Monster(0.4, kind, { pos: { x: h.x + dx, y: h.y + dy } }); m.game.cows.push(c); return c; };
  return m;
}

it('3막에 나옴 + 화염 저항·냉기 약점', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    ['imp', 'demonCurser', 'demonBerserker', 'demonKing'].forEach((k) => {
      expect(m.MONSTERS[k].adminOnly).toBeFalsy();
      expect(m.resistOf({ kind: k }, 'fire')).toBe(0.5);
      expect(m.resistOf({ kind: k }, 'cold')).toBeLessThan(0);
    });
  } finally { env.restore(); }
});

it('임프: 가까우면 주인공 옆으로 순간이동', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const imp = m.spawn('imp', 220);
    imp.blinkCd = 0;
    imp.update(1 / 60);
    expect(Math.hypot(imp.x - h.x, imp.y - h.y)).toBeLessThan(m.IMP_BLINK_NEAR + 5);
  } finally { env.restore(); }
});

it('저주: 받는 피해 증가·느려짐·스킬 대기 증가, 건 몬스터가 죽거나 시간이 지나면 풀림', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const h = m.game.hero;
    m.applyCurse('weak');
    expect(m.heroDamageTaken(40)).toBe(Math.round(40 * m.CURSES.weak.mul));
    const cd0 = m.castSpeedMul({ gearCastSpeed: 0 });
    m.applyCurse('hex');
    expect(m.castSpeedMul(h)).toBeCloseTo(cd0 * m.CURSES.hex.mul);
    m.applyCurse('slow');
    expect(m.curseMul(h, 'slow')).toBe(m.CURSES.slow.mul);
    m.updateCurses(m.CURSE_DURATION + 0.1);
    expect(h.curse).toBe(null);
    // 저주 카우가 주문 → 저주, 죽으면 풀림
    const c = m.spawn('demonCurser', 250);
    c.curseCd = 0; c.orbCd = 99;
    c.update(1 / 60);
    expect(c.state).toBe('casting');
    for (let i = 0; i < m.CURSER_CAST * 60 + 2; i++) c.update(1 / 60);
    expect(h.curse && h.curse.source).toBe(c);
    m.killCow(c);
    m.updateCurses(1 / 60);
    expect(h.curse).toBe(null);
    // 지옥불 구슬
    const c2 = m.spawn('demonCurser', 250);
    c2.curseCd = 99; c2.orbCd = 0;
    c2.update(1 / 60);
    expect(m.game.projectiles.some((p) => p.kind === 'hellorb' && p.packet.fire > 0)).toBe(true);
  } finally { env.restore(); }
});

it('버서커: 예고 → 그 자리로 도약해 내려찍기, 체력 절반 아래면 분노(빨라지고 세짐)', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.hp = 9999; h.invuln = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // 회피·블락 없음
    const b = m.spawn('demonBerserker', 200);
    b.leapCd = 0;
    b.update(1 / 60);
    expect(b.state).toBe('leapPrep');
    const target = { ...b.leapTo };
    for (let i = 0; i < (m.BERSERKER_TELEGRAPH + m.BERSERKER_LEAP_TIME) * 60 + 3; i++) b.update(1 / 60);
    expect(Math.hypot(b.x - target.x, b.y - target.y)).toBeLessThan(2);
    expect(h.hp).toBeLessThan(9999);
    const sp = b.speed, dmg = b.dmg;
    b.hp = Math.floor(b.maxHp * 0.4);
    b.update(1 / 60);
    expect(b.enraged).toBe(true);
    expect(b.speed).toBeCloseTo(sp * m.DEMON_ENRAGE_SPEED);
    expect(b.dmg).toBe(Math.round(dmg * m.DEMON_ENRAGE_DAMAGE));
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('악마 카우킹: 보스(CC 면역), 임프 소환(최대치까지), 지옥불 원(예고 뒤 피해), 분노, 죽으면 임프도 사라짐', async () => {
  const env = installBrowserEnv({ seed: 5 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const k = m.spawn('demonKing', 300);
    expect(m.isBossCow(k)).toBe(true);
    expect(m.applyCC(k, 'stun', 2)).toBe(false);
    k.summonCd = 0; k.fireCd = 99;
    k.update(1 / 60);
    m.processSpawns();
    const imps = () => m.game.cows.filter((c) => c.summoner === k && c.state !== 'dead');
    expect(imps().length).toBe(m.DKING_SUMMON_COUNT);
    for (let i = 0; i < 5; i++) { k.summonCd = 0; k.update(1 / 60); m.processSpawns(); }
    expect(imps().length).toBeLessThanOrEqual(m.DKING_MAX_IMPS);
    // 지옥불 원
    k.fireCd = 0; k.summonCd = 99;
    k.update(1 / 60);
    expect(k.state).toBe('casting');
    for (let i = 0; i < m.DKING_CAST * 60 + 2; i++) k.update(1 / 60);
    expect(m.game.hellfires.length).toBe(m.DKING_FIRE_COUNT);
    h.hp = 9999; h.invuln = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    m.updateHellfires(m.HELLFIRE_DELAY - 0.1);
    expect(h.hp).toBe(9999);
    m.updateHellfires(0.2);
    expect(h.hp).toBeLessThan(9999);
    vi.restoreAllMocks();
    k.hp = Math.floor(k.maxHp * 0.4);
    k.update(1 / 60);
    expect(k.enraged).toBe(true);
    m.killCow(k);
    expect(imps().length).toBe(0);
  } finally { vi.restoreAllMocks(); env.restore(); }
});
