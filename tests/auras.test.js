// 전사 오라 3종(슬롯에 있는 동안만, 하나만, 바꾸면 1초 대기) + 공통 수습생의 마법(레벨만큼 무작위 연속 시전, 내 마나·대기시간 그대로)
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot(cls = 'warrior') {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/auras.js')),
    ...(await import('../src/systems/apprentice.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/entities/behaviors.js')),
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
  m.cow = (kind, dx, dy = 0, hp = 99999) => {
    const c = new m.Monster(0.4, kind);
    const p = { x: h.x + dx, y: h.y + dy };
    m.Body.setPosition(c.body, p); c.x = p.x; c.y = p.y;
    c.hp = c.maxHp = hp;
    m.game.cows.push(c);
    return c;
  };
  m.auraTick = (sec) => { for (let i = 0; i < sec * 60; i++) m.updateAuras(1 / 60); };
  return m;
}

it('오라: 슬롯에 넣으면 1초 뒤 켜지고, 빼면 꺼짐 / 두 슬롯 다 오라면 누른 쪽으로 바뀜', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.skillLevels.aurafire = 1; h.skillLevels.aurafrost = 1;
    h.slot2 = 'aurafire';
    m.auraTick(0.5);
    expect(h.aura).toBe(null);
    m.auraTick(0.6);
    expect(h.aura).toBe('aurafire');
    h.slot1 = 'aurafrost';
    m.trySlot(1);
    expect(h.aura).toBe('aurafire'); // 바뀌는 중 (1초)
    m.auraTick(1.1);
    expect(h.aura).toBe('aurafrost');
    h.slot1 = 'attack';
    m.auraTick(0.05);
    expect(h.aura).not.toBe('aurafrost'); // 슬롯에서 빼면 꺼짐 → 남은 오라(불꽃)가 다시 켜지는 중
    m.auraTick(1.1);
    expect(h.aura).toBe('aurafire');
    h.slot2 = 'warcry';
    m.auraTick(0.05);
    expect(h.aura).toBe(null);
  } finally { env.restore(); }
});

it('불꽃 오라: 1초마다 반경 안 화염 (버닝 카우는 절반) / 빙결 오라: 이동 느려짐, 광신 오라와 더해서, 보스는 절반', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.skillLevels.aurafire = 1; h.aura = 'aurafire'; h.slot2 = 'aurafire';
    const near = m.cow('normal', 80), burn = m.cow('burning', -80), far = m.cow('normal', 400);
    m.auraTick(1.05);
    const dn = near.maxHp - near.hp, db = burn.maxHp - burn.hp;
    expect(dn).toBeGreaterThan(0);
    expect(db).toBe(Math.round(dn * 0.5));
    expect(far.hp).toBe(far.maxHp);

    m.game.cows.length = 0;
    h.skillLevels.aurafrost = 1; h.aura = 'aurafrost'; h.slot2 = 'aurafrost';
    const s = m.SKILL_STATS.aurafrost;
    const c = m.cow('normal', 60), boss = m.cow('boss', -60);
    expect(m.getAuraSpeedMult(c)).toBeCloseTo(1 - s.slow);
    expect(m.getAuraSpeedMult(boss)).toBeCloseTo(1 - s.slow * m.BOSS_SLOW_SCALE);
    const fan = m.cow('fanatic', 70, 20);
    expect(m.getAuraSpeedMult(fan)).toBeCloseTo(1 + (m.AURA_SPEED_MULT - 1) - s.slow); // 더해서
  } finally { env.restore(); }
});

it('가시 오라: 근접으로 받은 피해만큼 되돌려 줌 (막거나 피하면 없음)', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const h = m.game.hero;
    h.skillLevels.aurathorns = 1; h.aura = 'aurathorns'; h.slot2 = 'aurathorns';
    h.hp = 9999; h.invuln = 0;
    const c = m.cow('normal', 30);
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // 회피·블락 없음
    const before = h.hp;
    for (let i = 0; i < 40 && h.hp === before; i++) c.update(1 / 60);
    const taken = before - h.hp;
    expect(taken).toBeGreaterThan(0);
    expect(c.maxHp - c.hp).toBe(Math.max(1, Math.round(taken * m.SKILL_STATS.aurathorns.reflect)));
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('수습생의 마법: Lv만큼(최대 5) 연달아 나감, 같은 스킬 2번·변이 1번까지, 내 마나·대기시간·배운 레벨은 그대로', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    for (let i = 0; i < 200; i++) {
      const q = m.rollApprentice(5);
      expect(q.length).toBe(5);
      expect(q.filter((x) => x === 'polymorph').length).toBeLessThanOrEqual(1);
      m.SKILL_STATS.apprentice.pool.forEach((id) => expect(q.filter((x) => x === id).length).toBeLessThanOrEqual(2));
    }
    h.skillLevels.apprentice = 3;
    h.mana = 100;
    m.cow('normal', 120);
    h.spellCd.discharge = 0;
    m.tryApprentice();
    expect(h.mana).toBe(100 - m.SKILL_STATS.apprentice.mana);
    expect(h.apprentice.total).toBe(3);
    const mana = h.mana, learned = { ...h.skillLevels };
    for (let i = 0; i < 200; i++) m.updateApprentice(1 / 60, m.castFree); // 뜸 0.4초 + 0.6초 간격 × 3
    expect(h.apprentice).toBe(null);
    expect(h.mana).toBe(mana);                 // 나온 스킬은 마나를 안 씀
    expect(h.skillLevels).toEqual(learned);   // 배운 레벨 그대로
    expect(h.spellCd.discharge).toBe(0);      // 내 스킬 대기시간도 그대로
  } finally { env.restore(); }
});

it('수습생의 마법: 오라가 나오면 잠깐 임시로 켜짐 (지금 오라와 따로)', async () => {
  const env = installBrowserEnv({ seed: 5 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    m.castFree('aurafire', 3);
    expect(m.activeAuras(h).some((a) => a.id === 'aurafire' && a.lv === 3)).toBe(true);
    m.auraTick(m.SKILL_STATS.apprentice.tempAura + 0.1);
    expect(m.activeAuras(h).length).toBe(0);
  } finally { env.restore(); }
});

it('수습생의 마법: 저레벨 꽝(아무 일 없음) / 자기 자신에게 - 반동 피해(안 죽음), 변이면 주인공이 양(스킬 못 씀)', async () => {
  const env = installBrowserEnv({ seed: 6 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero, s = m.SKILL_STATS.apprentice;
    const c = m.cow('normal', 100);
    const run = (queue, r) => {
      vi.spyOn(Math, 'random').mockReturnValue(r);
      h.apprentice = { queue: [...queue], level: 1, t: 0, n: 0, total: queue.length };
      m.updateApprentice(1 / 60, m.castFree);
      vi.restoreAllMocks();
    };
    run(['discharge'], s.fizzle[0] * 0.5); // 꽝
    expect(m.game.groundSpells.some((g) => g.kind === 'discharge')).toBe(false);
    h.hp = 2;
    run(['discharge'], s.fizzle[0] + s.self[0] * 0.5); // 자기 자신에게
    expect(m.game.groundSpells.some((g) => g.kind === 'discharge')).toBe(true);
    expect(h.hp).toBe(1); // 반동 피해 - 죽지는 않음
    run(['polymorph'], s.fizzle[0] + s.self[0] * 0.5);
    expect(h.sheepTimer).toBeGreaterThan(0);
    expect(c.ccKind).not.toBe('poly'); // 몬스터는 안 걸림
    h.spellCd.fireball = 0; h.slot1 = 'fireball'; h.skillLevels.fireball = 1;
    const mana = h.mana;
    m.trySlot(1);
    expect(h.mana).toBe(mana); // 양이면 스킬 못 씀
    for (let i = 0; i < (s.selfSheep + 0.2) * 60; i++) m.updateApprentice(1 / 60, m.castFree);
    expect(h.sheepTimer).toBe(0);
    // 높은 레벨엔 꽝이 없음
    expect(s.fizzle[Math.min(s.fizzle.length - 1, 4)]).toBe(0);
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('메테오: 잠시 뒤 떨어져 반경 안 화염 + 화상, 그 자리 불타는 바닥이 계속 태움 / 보스에게 변이는 안 통함', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot('sorc');
    const { tryMeteor, updateGroundSpells } = await import('../src/systems/groundSpells.js');
    const { updateMeteors } = await import('../src/systems/spells.js');
    const h = m.game.hero, s = m.SPELLS.meteor;
    h.mana = 999;
    const c = m.cow('normal', 200), far = m.cow('normal', -300);
    h.aimX = c.x; h.aimY = c.y;
    const heroHp = h.hp;
    tryMeteor();
    updateMeteors(s.delay - 0.1);
    expect(c.hp).toBe(c.maxHp);
    updateMeteors(0.2);
    expect(c.hp).toBeLessThan(c.maxHp);
    expect(c.burn.timer).toBeGreaterThan(0);
    expect(far.hp).toBe(far.maxHp);
    expect(h.hp).toBe(heroHp); // 주인공은 안 맞음
    const field = () => m.game.groundSpells.find((g) => g.kind === 'firefield');
    expect(field()).toBeTruthy();
    const hp1 = c.hp; c.burn.timer = 0;
    m.Body.setPosition(c.body, { x: field().x, y: field().y }); c.x = field().x; c.y = field().y;
    updateGroundSpells(s.fieldTick + 0.01);
    expect(c.hp).toBeLessThan(hp1);

    const boss = m.cow('boss', 60, 60);
    const { tryPolymorph } = await import('../src/systems/sorcSkills.js');
    tryPolymorph();
    expect(boss.ccKind).not.toBe('poly');
  } finally { env.restore(); }
});
