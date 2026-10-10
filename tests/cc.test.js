// 군중 제어 한 곳(systems/cc.js: 변이 > 기절 > 경직, 보스 면역, 특수 행동 끊기) + 마법사 방전·볼 라이트닝
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot(cls = 'sorc') {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/systems/sorcSkills.js')),
    ...(await import('../src/systems/groundSpells.js')),
    ...(await import('../src/systems/cc.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js'))
  };
  m.ui.selectedClass = cls;
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
    m.game.cows.push(c);
    return c;
  };
  return m;
}

it('CC: 기절 중엔 경직이 무시되고, 경직 위엔 기절이 덮어씀 / 보스는 면역', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const c = m.cow('normal', 300);
    expect(m.applyCC(c, 'stun', 1.0)).toBe(true);
    expect(m.applyCC(c, 'stagger', 0.4)).toBe(false);
    expect(c.stunTimer).toBe(1.0);
    const d = m.cow('normal', -300);
    m.applyCC(d, 'stagger', 0.4);
    expect(m.applyCC(d, 'stun', 1.0)).toBe(true);
    expect(d.ccKind).toBe('stun');
    const boss = m.cow('boss', 0, 300);
    expect(m.applyCC(boss, 'stun', 2)).toBe(false);
    expect(boss.stunTimer).toBe(0);
  } finally { env.restore(); }
});

it('CC: 돌진 카우 예고 중에 경직이 걸리면 돌진이 취소되고, 경직 중엔 특수 행동이 멈춤', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const c = m.cow('charger', 200);
    c.chargeCooldownTimer = 0;
    c.update(1 / 60);
    expect(c.state).toBe('telegraph');
    m.applyCC(c, 'stagger', 0.4);
    expect(c.state).toBe('stunned');
    expect(c.chargeCooldownTimer).toBe(m.CHARGE_COOLDOWN);
    for (let i = 0; i < 20; i++) c.update(1 / 60);
    expect(c.state).toBe('stunned'); // 아직 경직 중 - 돌진 상태로 안 돌아감
    for (let i = 0; i < 20; i++) c.update(1 / 60);
    expect(c.state).not.toBe('stunned');
  } finally { env.restore(); }
});

it('함성: 보스는 기절하지 않음 (일반 카우는 기절)', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot('warrior');
    const boss = m.cow('boss', 60), c = m.cow('normal', -60);
    m.warCryHitCow(boss); m.warCryHitCow(c);
    expect(boss.stunTimer).toBe(0);
    expect(c.stunTimer).toBeGreaterThan(0);
  } finally { env.restore(); }
});

it('방전: 반경 안 적만 번개 피해 + 경직, 마나·대기시간 사용', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    const m = await boot();
    const h = m.game.hero, s = m.SPELLS.discharge;
    const near = m.cow('normal', 60), far = m.cow('normal', s.radius + 200);
    near.hp = near.maxHp = 9999; // 번개는 들쭉날쭉 - 죽지 않게
    const mana = h.mana;
    m.tryDischarge();
    expect(h.mana).toBe(mana - s.mana);
    expect(h.spellCd.discharge).toBeGreaterThan(0);
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(near.ccKind).toBe('stagger');
    expect(near.stunTimer).toBeCloseTo(s.stagger);
    expect(far.hp).toBe(far.maxHp);
    expect(Number.isInteger(near.hp)).toBe(true);
  } finally { env.restore(); }
});

it('볼 라이트닝: 설치 → 주변 적에게 번개, 다시 누르면 바로 폭발(길게 누르기 반복은 안 터짐), 시간이 다 되면 폭발', async () => {
  const env = installBrowserEnv({ seed: 5 });
  try {
    const m = await boot();
    const h = m.game.hero, s = m.SPELLS.balllightning;
    const c = m.cow('tough', 150);
    c.hp = c.maxHp = 9999;
    h.aimX = h.x + 100; h.aimY = h.y;
    m.tryBallLightning();
    const ball = () => m.game.groundSpells.find((g) => g.kind === 'balllightning');
    expect(ball()).toBeTruthy();
    m.updateGroundSpells(s.arcEvery + 0.01);
    const afterArc = c.hp;
    expect(afterArc).toBeLessThan(9999);

    m.tryBallLightning({ repeat: true }); // 길게 누르는 중 → 안 터짐
    expect(ball().done).toBe(false);
    m.tryBallLightning(); // 새로 누름 → 바로 폭발
    expect(ball().done).toBe(true);
    expect(c.hp).toBeLessThan(afterArc);
    m.updateGroundSpells(0.5);
    expect(ball()).toBeFalsy();

    // 사거리 밖이면 설치 안 함
    h.spellCd.balllightning = 0;
    h.aimX = h.x + s.range + 50;
    m.tryBallLightning();
    expect(ball()).toBeFalsy();

    // 시간이 다 되면 저절로 폭발
    h.aimX = h.x + 100;
    m.tryBallLightning();
    for (let i = 0; i < (s.duration + 0.5) * 60; i++) m.updateGroundSpells(1 / 60);
    expect(ball()).toBeFalsy();
  } finally { env.restore(); }
});

it('대규모 변이: 주변 적이 양이 됨(맞아도 안 풀림, 기절 무시, 배회), 엘리트 절반, 보스 면역, 반복 감소 → 세 번째 면역', async () => {
  const env = installBrowserEnv({ seed: 6 });
  try {
    const m = await boot();
    const h = m.game.hero, s = m.SPELLS.polymorph;
    const c = m.cow('normal', 80), e = m.cow('tough', -80), boss = m.cow('boss', 0, 120), far = m.cow('normal', s.radius + 250);
    m.tryPolymorph();
    expect(m.isSheep(c)).toBe(true);
    expect(c.stunTimer).toBeCloseTo(s.duration);
    expect(e.stunTimer).toBeCloseTo(s.duration * s.eliteMul);
    expect(m.isSheep(boss)).toBe(false);
    expect(m.isSheep(far)).toBe(false);
    expect(m.applyCC(c, 'stun', 5)).toBe(false); // 변이가 더 높음
    const hp = c.hp;
    m.tryDischarge(); // 피해는 정상, 양은 그대로
    expect(c.hp).toBeLessThan(hp);
    expect(m.isSheep(c)).toBe(true);
    const x0 = c.x;
    for (let i = 0; i < 30; i++) { c.update(1 / 60); m.Engine.update(m.engine, 1000 / 60); }
    expect(Math.abs(c.x - x0) + Math.abs(c.y - m.game.hero.y)).toBeGreaterThan(0); // 돌아다님
    expect(c.state).toBe('stunned');
    // 반복 감소: 두 번째 절반, 세 번째 면역
    c.stunTimer = 0;
    expect(m.applyPoly(c, s.duration)).toBe(true);
    expect(c.stunTimer).toBeCloseTo(s.duration * s.drMul);
    c.stunTimer = 0;
    expect(m.applyPoly(c, s.duration)).toBe(false);
    c.polyDrT = 0; // 시간이 지나면 다시 걸림
    expect(m.applyPoly(c, s.duration)).toBe(true);
  } finally { env.restore(); }
});

it('대규모 변이: 양으로 죽은 자폭 카우는 안 터짐, 양이 된 광신 카우는 오라가 꺼짐', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const { getAuraSpeedMult } = await import('../src/entities/behaviors.js');
    const { killCow } = await import('../src/systems/combat.js');
    const ex = m.cow('exploder', 30);
    m.applyPoly(ex, 2);
    h.hp = 9999; const hp = h.hp; h.invuln = 0;
    killCow(ex);
    expect(ex.sheepDead).toBe(true);
    expect(h.hp).toBe(hp); // 폭발 피해 없음

    const fan = m.cow('fanatic', 200), buddy = m.cow('normal', 230);
    expect(getAuraSpeedMult(buddy)).toBeGreaterThan(1);
    m.applyPoly(fan, 2);
    expect(getAuraSpeedMult(buddy)).toBe(1);
  } finally { env.restore(); }
});
