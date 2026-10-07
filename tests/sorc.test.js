// 마법사: 캐릭터 선택 적용, 마력탄/화염구/서리 노바/연쇄 번개/얼음 보주, 몬스터 저항·상태, 마나, 슬롯 전환
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function bootSorc(seed = 1) {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/sorcSkills.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/systems/projectiles.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/entities/behaviors.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js'))
  };
  m.ui.selectedClass = 'sorc';
  m.resetGame();
  m.game.waveTransition = 999;
  const h = m.game.hero;
  m.Body.setPosition(h.body, { x: m.PEN.size / 2, y: m.PEN.size / 2 }); h.x = m.PEN.size / 2; h.y = m.PEN.size / 2;
  h.facing = 0; // 오른쪽
  m.place = (dx, dy = 0, kind = 'normal') => {
    const c = new m.Monster(0.4, kind);
    const p = { x: h.x + dx, y: h.y + dy };
    m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    c.hp = c.maxHp = 100000; c.speed = 0;
    m.game.cows.push(c);
    return c;
  };
  m.fly = (sec) => { for (let i = 0; i < sec * 60; i++) m.updateProjectiles(1 / 60); };
  return m;
}

it('마법사 선택: 체력/마나/슬롯/시작 장비', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await bootSorc();
    const h = m.game.hero;
    expect(h.classKey).toBe('sorc');
    expect(h.maxHp).toBe(100);
    expect(h.maxMana).toBe(160);
    expect([h.slot1, h.slot2]).toEqual(['bolt', 'fireball']);
    expect(h.equipment.weaponMain).toBe(null); // 시작 무기 없음 (지팡이 모습)
    m.cycleSkillSlot(2); // Lv1: bolt/fireball만 → 바뀌지 않음(다른 슬롯과 겹치면 건너뜀)
    expect(['bolt', 'fireball']).toContain(h.slot2);
    m.ui.selectedClass = 'warrior'; m.resetGame();
    expect(h.classKey).toBe('warrior');
    expect(h.slot1).toBe('attack');
  } finally { env.restore(); }
});

it('마력탄은 마나 없이 앞의 적을 맞히고, 화염구는 범위 화염 + 화상 + 마나 소모', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await bootSorc();
    const h = m.game.hero;
    const a = m.place(150);
    const mana0 = h.mana;
    m.tryBolt();
    m.fly(1);
    expect(a.hp).toBeLessThan(100000);
    expect(h.mana).toBe(mana0);

    const b = m.place(200, 20), c = m.place(200, -20);
    const hb = b.hp, hc = c.hp;
    m.game.cows.splice(m.game.cows.indexOf(a), 1);
    m.tryFireballSpell();
    expect(h.mana).toBe(mana0 - m.SPELLS.fireball.mana);
    m.fly(1.5);
    expect(b.hp).toBeLessThan(hb);
    expect(c.hp).toBeLessThan(hc);
    expect(b.burn.timer).toBeGreaterThan(0);
  } finally { env.restore(); }
});

it('서리 노바: 주변 적 냉기 피해 + 둔화(이동 배율 0.5), 멀리 있는 적은 무사', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await bootSorc();
    const near = m.place(80), far = m.place(400);
    m.tryFrostNova();
    expect(near.hp).toBeLessThan(100000);
    expect(near.chillTimer).toBeGreaterThan(0);
    expect(m.getAuraSpeedMult(near)).toBeCloseTo(0.5);
    expect(far.hp).toBe(100000);
  } finally { env.restore(); }
});

it('연쇄 번개: 앞의 적에서 근처 적들로 튐', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await bootSorc();
    const cows = [m.place(150), m.place(270), m.place(390), m.place(390, 120)];
    m.tryChain();
    cows.forEach((c) => expect(c.hp).toBeLessThan(100000));
  } finally { env.restore(); }
});

it('얼음 보주: 날아가며 조각을 뿌리고 끝에서 터짐 → 경로 주변 적 냉기 피해', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await bootSorc();
    const side = m.place(200, 70), end = m.place(m.SPELLS.orb.range + 60, 0);
    m.tryOrb();
    expect(m.game.projectiles.length).toBe(1);
    m.fly(4);
    expect(side.hp).toBeLessThan(100000);
    expect(side.chillTimer).toBeGreaterThan(0);
    expect(end.hp).toBeLessThan(100000);
    expect(m.game.projectiles.length).toBe(0);
  } finally { env.restore(); }
});

it('몬스터 저항: 버닝 카우는 화염 피해가 절반', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await bootSorc();
    const { damageCowPacket } = await import('../src/systems/elementCombat.js');
    const n = m.place(150), b = m.place(-150, 0, 'burning');
    b.hp = b.maxHp = 100000;
    const dn = damageCowPacket(n, { fire: 100 }), db = damageCowPacket(b, { fire: 100 });
    expect(dn).toBe(100);
    expect(db).toBe(50);
  } finally { env.restore(); }
});

it('마나가 모자라면 시전 안 됨, 적 클릭 기본 공격은 마력탄', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await bootSorc();
    const h = m.game.hero;
    h.mana = 1;
    m.tryFireballSpell();
    expect(m.game.projectiles.length).toBe(0);
    expect(m.basicAttackReach(m.place(100))).toBeGreaterThan(200); // 멀리서 쏨
    m.tryBasicAttack();
    expect(m.game.projectiles[0].kind).toBe('bolt');
  } finally { env.restore(); }
});

it('마법사로 실제 진행(그리기 포함): 예외 없음, 체력 정수, 전투가 일어남', async () => {
  const env = installBrowserEnv({ seed: 11 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game, ui } = await import('../src/state.js');
    ui.selectedClass = 'sorc';
    env.frame(20); env.key(' '); env.key(' ', false); env.frame(20);
    expect(game.hero.classKey).toBe('sorc');
    const keys = [' ', 'e', 'q', 'r', 'w', 'a', 's', 'd', 'l'];
    let r = 7;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let i = 0; i < 3600; i++) {
      if (i % 20 === 0) { const k = keys[Math.floor(rnd() * keys.length)]; env.key(k); if (i % 40 === 0) env.key(k, false); }
      if (i % 45 === 0) ['w', 'a', 's', 'd', ' ', 'e'].forEach((k) => env.key(k, false));
      env.frame(1);
      expect(Number.isInteger(game.hero.hp)).toBe(true);
      if (game.gameState !== 'playing') break;
    }
    expect(game.kills).toBeGreaterThan(0);
  } finally { env.restore(); }
}, 120000);
