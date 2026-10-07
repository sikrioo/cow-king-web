// 레벨업 카드(뱀서식): 레벨업 → 카드 3장 → 고르면 스킬 배우기/강화, 강화 카드(등급·원소), 고르는 동안 게임 멈춤, 다시 뽑기, 채우기 카드
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot(cls = 'warrior') {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/levelCards.js')),
    ...(await import('../src/systems/progression.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/systems/sorcSkills.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/data/cards.js'))
  };
  m.ui.selectedClass = cls;
  m.resetGame();
  m.levelUp = () => m.gainExp(Math.max(1, m.game.hero.expToNext - m.game.hero.exp));
  // 강화 카드를 다 고른 것으로 → 스킬 카드만 남김
  m.noUpgrades = () => m.UPGRADE_ORDER.forEach((id) => { m.game.hero.cardPicks[id] = m.UPGRADE_MAX_PICKS; });
  return m;
}

it('시작: 시작 슬롯 2개만 Lv1, 나머지 스킬은 못 씀', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    expect(h.skillLevels).toEqual({ attack: 1, warcry: 1 });
    expect(m.isSkillUnlocked('rush')).toBe(false);
    expect(m.game.cardOffer).toBe(null);
  } finally { env.restore(); }
});

it('레벨업 → 카드 3장, 고르는 동안 게임 멈춤, 새 스킬을 고르면 슬롯 전환으로 쓸 수 있음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    m.noUpgrades();
    m.levelUp();
    expect(h.level).toBe(2);
    expect(h.statPoints).toBeGreaterThan(0); // 스탯 포인트는 그대로
    const offer = m.game.cardOffer;
    expect(offer.cards.length).toBe(m.CARD_CHOICES);
    // Lv2: 새 스킬은 러시만(해금 레벨 2), 나머지는 배운 스킬 강화
    const keys = offer.cards.map((c) => `${c.type}:${c.id}`).sort();
    expect(keys).toEqual(['newSkill:rush', 'skillUp:attack', 'skillUp:warcry']);

    const wt = m.game.waveTransition;
    for (let i = 0; i < 60; i++) m.fixedUpdate(1 / 60);
    expect(m.game.waveTransition).toBe(wt); // 멈춰 있음

    m.pickCard(offer.cards.findIndex((c) => c.id === 'rush'));
    expect(h.skillLevels.rush).toBe(1);
    expect(m.game.cardOffer).toBe(null);
    m.cycleSkillSlot(2);
    expect(h.slot2).toBe('rush');
  } finally { env.restore(); }
});

it('여러 레벨이 한 번에 오르면 차례로 고름, 다시 뽑기는 횟수만큼', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero;
    m.levelUp(); m.levelUp(); m.levelUp();
    expect(h.pendingCards).toBe(2);
    for (let i = 0; i < m.CARD_REROLLS; i++) expect(m.rerollCards()).toBe(true);
    expect(m.rerollCards()).toBe(false);
    m.pickCard(0); m.pickCard(0);
    expect(m.game.cardOffer).not.toBe(null);
    m.pickCard(0);
    expect(m.game.cardOffer).toBe(null);
    expect(h.pendingCards).toBe(0);
  } finally { env.restore(); }
});

it('스킬 레벨이 오르면 피해/범위/튕김이 늚', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    const d1 = m.spellDamage(100, 'fireball');
    h.skillLevels.fireball = 3;
    expect(m.spellDamage(100, 'fireball')).toBe(Math.round(d1 * (1 + 2 * m.SKILL_LEVEL_UP.fireball.damage)));
    const { skillBonus } = await import('../src/util.js');
    h.skillLevels.chain = 4;
    expect(skillBonus(h, 'chain', 'jumps')).toBe(3);
    expect(skillBonus(h, 'orb', 'damage')).toBe(0); // 안 배운 스킬은 Lv1처럼
  } finally { env.restore(); }
});

it('스킬을 전부 최대로 올리면 채우기 카드(재정비/물약)가 나옴', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    ['attack', 'warcry', 'whirlwind', 'leap', 'rush', 'smash'].forEach((id) => { h.skillLevels[id] = m.SKILL_MAX_LEVEL; });
    m.noUpgrades();
    m.levelUp();
    expect(m.game.cardOffer.cards.map((c) => c.type)).toEqual(['filler', 'filler', 'filler']);
    h.hp = 1;
    m.pickCard(m.game.cardOffer.cards.findIndex((c) => c.id === 'restore'));
    expect(h.hp).toBe(h.maxHp + h.bonusMaxHp + h.gearMaxHp);
  } finally { env.restore(); }
});

it('강화 카드: 등급만큼 수치, 체력/원소 피해/화상에 반영, 원소 카드는 마법사만, 같은 카드는 최대 횟수까지', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    const { damageCowPacket } = await import('../src/systems/elementCombat.js');
    const { Monster } = await import('../src/entities/monster.js');
    const offer = (card) => { m.game.cardOffer = { cards: [card] }; m.pickCard(0); };

    const hp0 = h.maxHp + h.gearMaxHp;
    offer({ type: 'upgrade', id: 'vigor', rarity: 'legendary', amount: Math.round(m.UPGRADE_CARDS.vigor.amount * m.CARD_RARITY.legendary.mult) });
    expect(h.maxHp + h.gearMaxHp).toBe(hp0 + Math.round(m.UPGRADE_CARDS.vigor.amount * m.CARD_RARITY.legendary.mult));

    const c = new Monster(0.4, 'normal'); c.hp = c.maxHp = 100000;
    const base = damageCowPacket(c, { fire: 100 });
    offer({ type: 'upgrade', id: 'pyro', rarity: 'common', amount: 0.5 });
    expect(damageCowPacket(c, { fire: 100 })).toBe(Math.round(base * 1.5));
    offer({ type: 'upgrade', id: 'ember', rarity: 'common', amount: 1 });
    damageCowPacket(c, { fire: 100 });
    expect(c.burn.dps).toBeGreaterThan(0);

    // 같은 카드는 UPGRADE_MAX_PICKS번까지만 나옴
    for (let i = 0; i < m.UPGRADE_MAX_PICKS; i++) offer({ type: 'upgrade', id: 'haste', rarity: 'common', amount: 0.01 });
    for (let i = 0; i < 40; i++) expect(m.rollCards().some((k) => k.id === 'haste')).toBe(false);
    // 등급 굴림: 수치 = 일반 수치 × 배율
    for (let i = 0; i < 40; i++) m.rollCards().filter((k) => k.type === 'upgrade').forEach((k) => {
      const u = m.UPGRADE_CARDS[k.id], v = u.amount * m.CARD_RARITY[k.rarity].mult;
      expect(k.amount).toBe(u.unit === 'int' ? Math.round(v) : v);
    });

    m.ui.selectedClass = 'warrior'; m.resetGame();
    for (let i = 0; i < 60; i++) m.rollCards().forEach((k) => { if (k.type === 'upgrade') expect(m.UPGRADE_CARDS[k.id].classes || ['warrior']).toContain('warrior'); });
    expect(m.game.hero.cardBonus.fire).toBe(0); // 새 게임이면 초기화
  } finally { env.restore(); }
});
