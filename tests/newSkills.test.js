// 물리 스킬 투지(잠깐 최대 체력 증가), 공통 스킬 순간이동(Q/R로 슬롯에, 우클릭), 스킬 분류
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot(cls = 'warrior') {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/levelCards.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/systems/physSkills.js')),
    ...(await import('../src/systems/commonSkills.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js'))
  };
  m.ui.selectedClass = cls;
  m.resetGame();
  m.game.waveTransition = 999;
  const h = m.game.hero;
  m.Body.setPosition(h.body, { x: m.PEN.size / 2, y: m.PEN.size / 2 }); h.x = m.PEN.size / 2; h.y = m.PEN.size / 2;
  m.tick = (sec) => { for (let i = 0; i < sec * 60; i++) m.fixedUpdate(1 / 60); };
  return m;
}

it('모든 스킬에 분류가 있고, 공통 스킬은 두 캐릭터 모두 카드로 배울 수 있음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    Object.values(m.SKILL_META).forEach((s) => expect(['physical', 'magic', 'common']).toContain(s.type));
    expect(m.learnableSkills()).toContain('teleport');
    expect(m.learnableSkills()).toContain('fortify');
    m.ui.selectedClass = 'sorc'; m.resetGame();
    expect(m.learnableSkills()).toContain('teleport');
    expect(m.learnableSkills()).not.toContain('fortify'); // 물리 스킬은 전사만
  } finally { env.restore(); }
});

it('투지: 최대 체력이 늘고 그만큼 회복, 끝나면 되돌아감 (체력은 정수)', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const max0 = h.maxHp + h.bonusMaxHp + h.gearMaxHp;
    h.hp = max0 - 10;
    const mana0 = h.mana;
    m.tryFortify();
    const add = Math.round((h.maxHp + h.gearMaxHp) * m.SKILL_STATS.fortify.life);
    expect(h.bonusMaxHp).toBe(add);
    expect(h.hp).toBe(max0 - 10 + add);
    expect(h.mana).toBe(mana0 - m.SKILL_STATS.fortify.mana);
    m.tryFortify(); // 대기시간 중이면 안 됨
    expect(h.bonusMaxHp).toBe(add);
    m.tick(m.SKILL_STATS.fortify.duration + 0.5);
    expect(h.bonusMaxHp).toBe(0);
    expect(h.hp).toBeLessThanOrEqual(max0);
    expect(Number.isInteger(h.hp)).toBe(true);
  } finally { env.restore(); }
});

it('순간이동: 카드로 배우면 R로 슬롯2에 넣고, 바라보는 쪽 사거리만큼 이동 (목장 밖으론 안 나감)', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    m.cycleSkillSlot(2);
    expect(h.slot2).not.toBe('teleport'); // 안 배웠으면 전환 목록에 없음
    h.level = 3;
    m.game.cardOffer = { cards: [{ type: 'newSkill', id: 'teleport', from: 0, to: 1 }] };
    m.pickCard(0);
    for (let i = 0; i < 8 && h.slot2 !== 'teleport'; i++) m.cycleSkillSlot(2);
    expect(h.slot2).toBe('teleport');
    const x0 = h.x, y0 = h.y;
    h.facing = 0;
    m.input.mouseScreen = null; // 모바일처럼 바라보는 방향
    m.trySlot(2);
    expect(h.x - x0).toBeCloseTo(m.SKILL_STATS.teleport.range, 0);
    expect(h.y).toBeCloseTo(y0, 5);
    expect(h.spellCd.teleport).toBeGreaterThan(0);
    m.tick(m.SKILL_STATS.teleport.cooldown + 0.1);
    for (let i = 0; i < 10; i++) { m.tick(m.SKILL_STATS.teleport.cooldown + 0.1); h.mana = h.maxMana; m.trySlot(2); }
    expect(h.x).toBeLessThanOrEqual(m.PEN.x + m.PEN.size - h.r); // 벽 안쪽
  } finally { env.restore(); }
});
