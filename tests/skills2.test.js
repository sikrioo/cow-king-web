// 새 스킬: 에너지 쉴드(피해 일부를 마나로), 버서커(주는·받는 피해 증가), 더미(몬스터가 미끼를 공격), 난타(연속 베기, 이동 잠김),
//          뇌진탕(기절), 눈보라(지점 냉기 지속 피해·둔화), 화염기둥(지연 후 화염 피해·화상)
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot(cls) {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/session.js')),
    ...(await import('../src/systems/physSkills.js')),
    ...(await import('../src/systems/groundSpells.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/systems/elements.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js')),
    ...(await import('../src/game.js'))
  };
  m.ui.selectedClass = cls;
  m.resetGame();
  m.game.waveTransition = 999;
  const h = m.game.hero;
  const cx = m.PEN.size / 2, cy = m.PEN.size / 2;
  m.Body.setPosition(h.body, { x: cx, y: cy }); h.x = cx; h.y = cy; h.facing = 0;
  h.mana = h.maxMana = 999; h.baseMaxMana = 999;
  m.place = (dx, dy = 0, kind = 'normal') => {
    const c = new m.Monster(0.4, kind);
    const p = { x: h.x + dx, y: h.y + dy };
    m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    c.hp = c.maxHp = 100000;
    m.game.cows.push(c);
    return c;
  };
  m.tick = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) m.fixedUpdate(1 / 60); };
  return m;
}

it('에너지 쉴드: 받는 피해의 절반을 마나로, 마나가 없으면 그대로 받음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    m.tryEnergyShield();
    expect(h.shieldTimer).toBeGreaterThan(0);
    h.hp = 100; const mana0 = h.mana;
    expect(m.heroDamageTaken(40)).toBe(40 - Math.round(40 * m.SPELLS.energyshield.absorb));
    expect(h.mana).toBeLessThan(mana0);
    h.mana = 0;
    expect(m.heroDamageTaken(40)).toBe(40);
  } finally { env.restore(); }
});

it('버서커: 주는 피해·받는 피해 증가, 끝나면 원래대로', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('warrior');
    const h = m.game.hero;
    h.weaponStats = { main: { min: 100, max: 100, interval: 0.4 }, off: null };
    h.gearAtkPower = 0; h.attackBonus = 0;
    expect(m.heroHitDamage()).toBe(100);
    expect(m.heroDamageTaken(100)).toBe(100);
    m.tryBerserk();
    expect(m.heroHitDamage()).toBe(Math.round(100 * (1 + m.SKILL_STATS.berserk.power)));
    expect(m.heroDamageTaken(100)).toBe(Math.round(100 * (1 + m.SKILL_STATS.berserk.taken)));
    m.tick(m.SKILL_STATS.berserk.duration + 0.2);
    expect(m.heroHitDamage()).toBe(100);
  } finally { env.restore(); }
});

it('더미: 가까운 몬스터가 미끼를 공격(주인공은 무사), 시간이 지나면 사라짐', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot('warrior');
    const h = m.game.hero;
    m.tryDecoy();
    const d = m.game.decoy;
    expect(d).toBeTruthy();
    const c = m.place(d.x - h.x + 30, d.y - h.y - 20); // 미끼 바로 옆
    c.hp = c.maxHp = 100000;
    const hp0 = h.hp, dhp0 = d.hp;
    m.tick(1);
    expect(m.game.decoy.hp).toBeLessThan(dhp0);
    expect(h.hp).toBe(hp0);
    m.tick(m.SKILL_STATS.decoy.duration);
    expect(m.game.decoy).toBe(null);
  } finally { env.restore(); }
});

it('난타: 앞의 적을 여러 번 벰(그동안 제자리), 뇌진탕: 피해 + 긴 기절', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('warrior');
    const h = m.game.hero;
    const c = m.place(45);
    c.speed = 0;
    let hits = 0, last = c.hp;
    m.tryFlurry();
    const x0 = h.x;
    for (let i = 0; i < 60; i++) { m.fixedUpdate(1 / 60); if (c.hp < last) { hits++; last = c.hp; } }
    expect(hits).toBe(m.SKILL_STATS.flurry.hits);
    expect(Math.abs(h.x - x0)).toBeLessThan(2);
    m.tick(m.SKILL_STATS.flurry.cooldown);
    const hp1 = c.hp;
    m.tryConcuss();
    expect(c.hp).toBeLessThan(hp1);
    expect(c.stunTimer).toBeGreaterThan(m.SKILL_STATS.concuss.stun * 0.9);
  } finally { env.restore(); }
});

it('눈보라: 조준 지점 범위에 냉기 지속 피해 + 둔화 / 화염기둥: 잠깐 뒤 화염 피해 + 화상', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    const a = m.place(250, 0), far = m.place(250, 400);
    h.aimX = a.x; h.aimY = a.y;
    m.tryBlizzard();
    m.tick(1.2);
    expect(a.hp).toBeLessThan(100000);
    expect(a.chillTimer).toBeGreaterThan(0);
    expect(far.hp).toBe(100000);
    const hpA = a.hp;
    h.aimX = a.x; h.aimY = a.y;
    m.tryFlamePillar();
    m.tick(m.SPELLS.flamepillar.delay * 0.5);
    const mid = a.hp;
    m.tick(m.SPELLS.flamepillar.delay);
    expect(a.hp).toBeLessThan(mid);
    expect(a.burn.timer).toBeGreaterThan(0);
    expect(hpA).toBeGreaterThan(a.hp);
  } finally { env.restore(); }
});

it('사거리 제한: 조준 지점이 사거리 밖이면 지점 마법을 안 씀(마나 그대로) / 화염 파도: 부채꼴 안 적은 모두 한 번씩, 밖은 무사', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    const mana0 = h.mana;
    h.aimX = h.x + m.SPELLS.blizzard.range + 80; h.aimY = h.y;
    m.tryBlizzard();
    expect(m.game.groundSpells.length).toBe(0);
    expect(h.mana).toBe(mana0);
    expect(h.spellCd.blizzard).toBe(0);
    h.aimX = h.x + m.SPELLS.blizzard.range - 40;
    m.tryBlizzard();
    expect(m.game.groundSpells.length).toBe(1);

    m.game.groundSpells = [];
    const a = m.place(120, 0), b = m.place(220, 60), side = m.place(0, 200), far = m.place(m.SPELLS.firewave.range + 150, 0);
    h.facing = 0;
    m.tryFireWave();
    const hits = new Map();
    for (let i = 0; i < 90; i++) {
      m.fixedUpdate(1 / 60);
      [a, b, side, far].forEach((c) => { if (c.hp < 100000 && !hits.has(c)) hits.set(c, 100000 - c.hp); });
    }
    expect(hits.has(a)).toBe(true);
    expect(hits.has(b)).toBe(true);
    expect(hits.has(side)).toBe(false);
    expect(hits.has(far)).toBe(false);
    expect(a.burn.timer > 0 || a.burn.dps > 0 || hits.get(a) > 0).toBe(true);
  } finally { env.restore(); }
});

it('화염기둥: 불기둥 여러 개가 간격을 두고 차례로 솟음 (가운데 적은 여러 번 맞을 수 있음)', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    const c = m.place(220, 0);
    h.aimX = c.x; h.aimY = c.y;
    m.tryFlamePillar();
    const g = m.game.groundSpells[0];
    const s = m.SPELLS.flamepillar;
    expect(g.pillars.length).toBe(s.count);
    const firedAt = [];
    for (let i = 0; i < 120; i++) {
      m.fixedUpdate(1 / 60);
      g.pillars.forEach((p, k) => { if (p.fired && firedAt[k] === undefined) firedAt[k] = g.age; });
    }
    expect(firedAt.filter((v) => v !== undefined).length).toBe(s.count);
    for (let k = 1; k < s.count; k++) expect(firedAt[k]).toBeGreaterThan(firedAt[k - 1]); // 차례로
    expect(c.hp).toBeLessThan(100000);
  } finally { env.restore(); }
});
