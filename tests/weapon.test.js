// 무기 기본 속성: 종류별 피해 범위/속도, 등급·강화·양손 배율, 쌍수 번갈아 휘두르기, 피해 굴림 범위
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  return {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/gear.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/data/items.js'))
  };
}
const weapon = (variant, extra = {}) => ({ category: 'weapon', handedness: 'one', rarity: 'normal', upgradeLevel: 0, variant, stats: {}, ...extra });

it('느린 무기일수록 한 방이 세고, 초당 피해는 비슷하다', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const list = Object.keys(m.WEAPON_BASE).map((v) => ({ v, ...m.weaponStats(weapon(v)) }));
    const bySpeed = [...list].sort((a, b) => a.interval - b.interval);
    for (let i = 1; i < bySpeed.length; i++) expect((bySpeed[i].min + bySpeed[i].max)).toBeGreaterThan(bySpeed[i - 1].min + bySpeed[i - 1].max);
    const dps = list.map((s) => (s.min + s.max) / 2 / s.interval);
    expect(Math.max(...dps) / Math.min(...dps)).toBeLessThan(1.1);
    expect(m.weaponStats({ category: 'shield', rarity: 'normal', stats: {} })).toBe(null);
  } finally { env.restore(); }
});

it('등급·강화는 피해만, 양손은 피해↑ 속도↓', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const base = m.weaponStats(weapon('sword'));
    const leg = m.weaponStats(weapon('sword', { rarity: 'legendary', upgradeLevel: 1 }));
    expect(leg.max).toBe(Math.round(m.WEAPON_BASE.sword.max * m.RARITY_DEF.legendary.mult * 1.25));
    expect(leg.interval).toBe(base.interval);
    const two = m.weaponStats(weapon('sword', { handedness: 'two' }));
    expect(two.max).toBe(Math.round(m.WEAPON_BASE.sword.max * m.TWO_HAND_DAMAGE_MULT));
    expect(two.interval).toBeGreaterThan(base.interval);
  } finally { env.restore(); }
});

it('쌍수면 주무기/보조무기를 번갈아 쓰고, 피해는 무기 범위 + 공격력', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    m.resetGame();
    const h = m.game.hero;
    h.equipment.weaponMain = weapon('mace');
    h.equipment.weaponOff = weapon('dagger');
    m.recalcGearStats();
    const cds = [];
    for (let i = 0; i < 4; i++) { h.attackCooldown = 0; m.tryPlayerAttack(); cds.push(+h.attackCooldown.toFixed(4)); }
    expect(cds[0]).not.toBe(cds[1]);
    expect(cds[0]).toBe(cds[2]);
    expect(cds[1]).toBe(cds[3]);
    const ws = h.weaponStats.main;
    for (let i = 0; i < 200; i++) {
      const d = m.heroHitDamage(ws) - h.attackBonus - h.gearAtkPower;
      expect(d >= ws.min && d <= ws.max && Number.isInteger(d)).toBe(true);
    }
  } finally { env.restore(); }
});

it('한손 무기는 주무기/보조무기 칸을 골라 장착하고, 바뀐 장비는 가방으로', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    m.resetGame();
    const h = m.game.hero;
    const main0 = h.equipment.weaponMain, shield = h.equipment.weaponOff; // 시작: 한손무기 + 방패
    const a = weapon('dagger', { identified: true }), b = weapon('mace', { identified: true });
    h.inventory.push(a, b);
    m.equipFromInventory(h.inventory.indexOf(a), 'weaponOff');
    expect(h.equipment.weaponMain).toBe(main0);
    expect(h.equipment.weaponOff).toBe(a);
    expect(h.inventory).toContain(shield);
    m.equipFromInventory(h.inventory.indexOf(b), 'weaponMain');
    expect(h.equipment.weaponMain).toBe(b);
    expect(h.equipment.weaponOff).toBe(a);
    expect(h.inventory).toContain(main0);
    expect(h.weaponStats.off).not.toBe(null); // 쌍수
  } finally { env.restore(); }
});

it('대검: 언제나 양손, 한 방 가장 셈·가장 느림·사거리 가장 김, 개발자 가방에 있음, 맞히면 더 크게 밀어냄', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/session.js');
    const { rollGearItem, weaponStats, equipFromInventory } = await import('../src/systems/gear.js');
    const { getWeaponRange, getAttackArc, damageCow } = await import('../src/systems/combat.js');
    const { WEAPON_VARIANTS, WEAPON_HEAVY } = await import('../src/data/items.js');
    const { Monster } = await import('../src/entities/monster.js');
    resetGame();
    const g = rollGearItem({ category: 'weapon', variant: 'greatsword', handedness: 'one', rarity: 'normal', identified: true });
    expect(g.handedness).toBe('two');
    const gs = weaponStats(g);
    WEAPON_VARIANTS.filter((v) => v !== 'greatsword').forEach((v) => {
      const o = weaponStats(rollGearItem({ category: 'weapon', variant: v, handedness: 'two', rarity: 'normal' }));
      expect(gs.max).toBeGreaterThan(o.max);
      expect(gs.interval).toBeGreaterThan(o.interval);
    });
    const h = game.hero;
    const idx = h.inventory.findIndex((it) => it.variant === 'greatsword');
    expect(idx).toBeGreaterThanOrEqual(0); // 개발자 모드 테스트 가방
    const r0 = getWeaponRange();
    equipFromInventory(idx);
    expect(h.equipment.weaponMain.variant).toBe('greatsword');
    expect(h.equipment.weaponOff).toBe('LOCKED'); // 양손이라 보조 칸 잠김
    expect(getWeaponRange()).toBeGreaterThan(r0);
    expect(getAttackArc()).toBeGreaterThan(Math.PI * 0.62);
    const c = new Monster(0.4, 'normal'); c.hp = c.maxHp = 100000;
    damageCow(c, 10, WEAPON_HEAVY.greatsword);
    expect(c.knockback).toBeGreaterThan(0.18);
    // 양손 그림(왼손이 손잡이에)으로 그리기 - 평소·공격·위/아래 방향 모두 예외 없음
    const { isTwoHanded } = await import('../src/render/heroSprites.js');
    expect(isTwoHanded(h)).toBe(true);
    game.waveTransition = 999;
    for (const f of [0, Math.PI / 2, -Math.PI / 2]) { h.facing = f; env.frame(2); h.attackCooldown = 0; h.attackTimer = 0.2; h.currentAttackDuration = 0.4; env.frame(3); }
    const { ui } = await import('../src/state.js');
    ui.heroTopView = true; // 탑뷰 비교 모드로도
    for (const f of [0, -Math.PI / 2]) { h.facing = f; env.frame(2); h.attackTimer = 0.2; env.frame(3); }
    ui.heroTopView = false;
  } finally { env.restore(); }
});

it('대검 기본 공격: 누르는 순간이 아니라 내리치는 순간(동작의 windup 지점)에 피해', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/session.js');
    const { fixedUpdate } = await import('../src/game.js');
    const { equipFromInventory } = await import('../src/systems/gear.js');
    const { tryPlayerAttack } = await import('../src/systems/combat.js');
    const { WEAPON_HEAVY } = await import('../src/data/items.js');
    const { Monster } = await import('../src/entities/monster.js');
    const { Body } = await import('../src/core/physics.js');
    resetGame(); game.waveTransition = 999;
    const h = game.hero;
    equipFromInventory(h.inventory.findIndex((it) => it.variant === 'greatsword'));
    const c = new Monster(0.4, 'normal'); c.hp = c.maxHp = 100000; c.speed = 0;
    const p = { x: h.x + 50, y: h.y }; Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    game.cows = [c];
    h.facing = 0;
    tryPlayerAttack();
    expect(c.hp).toBe(100000); // 아직 안 맞음 (들어 올리는 중)
    const impact = h.currentAttackDuration * WEAPON_HEAVY.greatsword.windup;
    let hitAt = null;
    for (let i = 1; i <= 120 && hitAt === null; i++) { fixedUpdate(1 / 60); if (c.hp < 100000) hitAt = i / 60; }
    expect(hitAt).not.toBe(null);
    expect(Math.abs(hitAt - impact)).toBeLessThan(0.05);
  } finally { env.restore(); }
});

it('양손 무기 휘두르는 방향: 왼쪽·오른쪽 어느 쪽을 봐도 칼이 머리 위(화면 위쪽)를 지나감', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { overheadSide } = await import('../src/render/heroSprites.js');
    // 휘두르는 중간(옆) 방향 = facing + side·π/2 → 화면 위쪽(y < 0)이어야 함
    for (const facing of [0, Math.PI, 0.6, Math.PI - 0.6, -0.4, Math.PI + 0.4]) {
      const mid = facing + overheadSide(facing) * Math.PI / 2;
      expect(Math.sin(mid), `facing ${facing}`).toBeLessThan(0);
    }
  } finally { env.restore(); }
});

it('창: 찌르기 - 사거리 가장 길고 공격 각도는 좁음 (앞쪽 멀리 있는 적은 맞고, 옆에 있는 적은 안 맞음)', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/session.js');
    const { getWeaponRange, getAttackArc, tryPlayerAttack } = await import('../src/systems/combat.js');
    const { WEAPON_RANGE } = await import('../src/data/balance.js');
    const { Monster } = await import('../src/entities/monster.js');
    const { Body } = await import('../src/core/physics.js');
    resetGame(); game.waveTransition = 999;
    const h = game.hero;
    Object.keys(WEAPON_RANGE).filter((v) => v !== 'spear').forEach((v) => expect(WEAPON_RANGE.spear).toBeGreaterThan(WEAPON_RANGE[v]));
    h.equipment.weaponMain = { category: 'weapon', variant: 'spear', handedness: 'one', rarity: 'normal', stats: {}, upgradeLevel: 0 };
    h.equipment.weaponOff = null;
    expect(getWeaponRange()).toBe(WEAPON_RANGE.spear);
    expect(getAttackArc()).toBeLessThan(Math.PI * 0.5);
    const put = (dx, dy) => { const c = new Monster(0.4, 'normal'); c.hp = c.maxHp = 100000; c.speed = 0; const p = { x: h.x + dx, y: h.y + dy }; Body.setPosition(c.body, p); c.x = p.x; c.y = p.y; game.cows.push(c); return c; };
    game.cows = [];
    const far = put(WEAPON_RANGE.spear, 0), side = put(25, 45);
    h.facing = 0; h.attackCooldown = 0;
    tryPlayerAttack();
    expect(far.hp).toBeLessThan(100000);   // 앞쪽 멀리 - 찔림
    expect(side.hp).toBe(100000);          // 옆 - 범위 밖
    for (let i = 0; i < 12; i++) env.frame(1); // 찌르기 그림
  } finally { env.restore(); }
});

it('양손 도끼도 대검처럼: 등 뒤에서 내리치는 순간(windup)에 피해, 대검보다 빨리', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/session.js');
    const { fixedUpdate } = await import('../src/game.js');
    const { equipFromInventory } = await import('../src/systems/gear.js');
    const { tryPlayerAttack } = await import('../src/systems/combat.js');
    const { WEAPON_HEAVY } = await import('../src/data/items.js');
    const { Monster } = await import('../src/entities/monster.js');
    const { Body } = await import('../src/core/physics.js');
    expect(WEAPON_HEAVY.axe.windup).toBeLessThan(WEAPON_HEAVY.greatsword.windup);
    resetGame(); game.waveTransition = 999;
    const h = game.hero;
    equipFromInventory(h.inventory.findIndex((it) => it.variant === 'axe'));
    expect(h.equipment.weaponMain.handedness).toBe('two');
    const c = new Monster(0.4, 'normal'); c.hp = c.maxHp = 100000; c.speed = 0;
    const p = { x: h.x + 40, y: h.y }; Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    game.cows = [c];
    h.facing = 0;
    tryPlayerAttack();
    expect(c.hp).toBe(100000);
    const impact = h.currentAttackDuration * WEAPON_HEAVY.axe.windup;
    let hitAt = null;
    for (let i = 1; i <= 120 && hitAt === null; i++) { fixedUpdate(1 / 60); if (c.hp < 100000) hitAt = i / 60; }
    expect(Math.abs(hitAt - impact)).toBeLessThan(0.05);
  } finally { env.restore(); }
});
