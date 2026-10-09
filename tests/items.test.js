// 아이템 데이터 규칙: 장비는 순수 데이터(JSON 왕복 시 그대로) + 고유 uid
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

it('장비는 uid가 겹치지 않고 JSON으로 그대로 직렬화된다', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/game.js');
    const { rollGearItem } = await import('../src/systems/gear.js');
    const gear = [];
    for (let i = 0; i < 3; i++) { resetGame(); gear.push(...Object.values(game.hero.equipment).filter((g) => g && g !== 'LOCKED'), ...game.hero.inventory); }
    for (let i = 0; i < 200; i++) gear.push(rollGearItem());
    const uids = gear.map((g) => g.uid);
    expect(uids.every((u) => Number.isInteger(u) && u > 0)).toBe(true);
    expect(new Set(uids).size).toBe(uids.length);
    gear.forEach((g) => expect(JSON.parse(JSON.stringify(g))).toEqual(g));
  } finally {
    env.restore();
  }
});

it('버리기: 발밑에 떨어지고, 바로 다시 줍지 않으며, 벗어났다 돌아오면 다시 주움', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { game } = await import('../src/state.js');
    const { resetGame } = await import('../src/game.js');
    const { discardFromInventory, updateItems } = await import('../src/systems/loot.js');
    const { Body } = await import('../src/core/physics.js');
    resetGame(); game.gameState = 'playing';
    const h = game.hero;
    const gear = h.inventory[0];
    const n = h.inventory.length;
    discardFromInventory(0);
    expect(h.inventory.length).toBe(n - 1);
    expect(game.items.some((it) => it.gearData === gear)).toBe(true);
    updateItems(1 / 60);
    expect(h.inventory).not.toContain(gear); // 바로 다시 줍지 않음
    const move = (x, y) => { Body.setPosition(h.body, { x, y }); h.x = x; h.y = y; };
    const ox = h.x, oy = h.y;
    move(ox + 120, oy); updateItems(1 / 60);
    move(ox, oy); updateItems(1 / 60);
    expect(h.inventory).toContain(gear);
  } finally {
    env.restore();
  }
});

it('접사 생성: 등급별 개수(일반 0 / 매직 1~2 / 레어 3~6 / 레전드 5~6), 방향당 최대·그룹 중복 금지·부위 제한·접사 레벨, 수치는 티어 범위 안', async () => {
  const env = installBrowserEnv({ seed: 9 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { rollGearItem, rollAffixes } = await import('../src/systems/itemGen.js');
    const { AFFIXES, AFFIX_RULES } = await import('../src/data/affixes.js');
    const { rollTag, optionText } = await import('../src/ui/itemView.js');
    const byId = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));
    const counts = { normal: new Set(), magic: new Set(), rare: new Set(), legendary: new Set() };
    let magicOnlyInRare = 0, magicOnlyInMagic = 0;
    for (let i = 0; i < 3000; i++) {
      const rarity = ['normal', 'magic', 'rare', 'legendary'][i % 4];
      const ilvl = 1 + (i % 30);
      const g = rollGearItem({ rarity, ilvl });
      counts[rarity].add(g.affixes.length);
      const side = { prefix: 0, suffix: 0 }, groups = new Set();
      const alvl = Math.min(30, ilvl + (AFFIX_RULES[rarity].alvlBonus || 0));
      g.affixes.forEach((a) => {
        const d = byId[a.id];
        expect(d.types).toContain(g.category);         // 부위 제한
        expect(d.alvl).toBeLessThanOrEqual(alvl);      // 접사 레벨
        side[d.side]++;
        const key = d.side + ':' + d.group;
        expect(groups.has(key)).toBe(false);           // 같은 방향·그룹 중복 금지
        groups.add(key);
        for (const [k, [min, max]] of Object.entries(d.mods)) { expect(a.rolls[k]).toBeGreaterThanOrEqual(min); expect(a.rolls[k]).toBeLessThanOrEqual(max); }
        if (d.magicOnly) { if (rarity === 'magic') magicOnlyInMagic++; else magicOnlyInRare++; }
      });
      if (rarity === 'magic') { expect(side.prefix).toBeLessThanOrEqual(1); expect(side.suffix).toBeLessThanOrEqual(1); }
      else { expect(side.prefix).toBeLessThanOrEqual(3); expect(side.suffix).toBeLessThanOrEqual(3); }
    }
    expect([...counts.normal]).toEqual([0]);
    expect(Math.max(...counts.magic)).toBeLessThanOrEqual(2);
    expect(Math.min(...counts.magic)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...counts.rare)).toBeLessThanOrEqual(6);
    expect(counts.rare.has(6)).toBe(true);
    expect(Math.max(...counts.legendary)).toBeLessThanOrEqual(6);
    expect(magicOnlyInRare).toBe(0);                    // 매직 전용 티어는 매직에만
    expect(magicOnlyInMagic).toBeGreaterThan(0);
    // 레벨 1 무기엔 1단계만, 레벨 30이면 높은 단계도
    const tiers = (ilvl) => rollAffixes('weapon', 'rare', ilvl).map((a) => byId[a.id].tier);
    for (let i = 0; i < 50; i++) expect(Math.max(0, ...tiers(1))).toBeLessThanOrEqual(1);
    let high = 0; for (let i = 0; i < 200; i++) if (tiers(30).some((t) => t >= 3)) high++;
    expect(high).toBeGreaterThan(0);
    // 표시: 단계 + 꽝/최상
    const g = rollGearItem({ rarity: 'magic', ilvl: 30, category: 'boots' });
    const k = Object.keys(g.stats)[0];
    expect(rollTag(g, k).tier).toBeGreaterThanOrEqual(1);
    expect(optionText(g, k, g.stats[k])).toMatch(/단계/);
    expect(rollTag({ stats: { health: 1 } }, 'health')).toBe(null); // 접사 기록 없는 장비(테스트 무기)
  } finally { env.restore(); }
});

it('드랍 테이블: 출처(일반/엘리트/카우킹/우두머리)별 등급 비중, 아이템 레벨 = 몬스터 레벨(난이도·웨이브·종류)', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    vi.resetModules();
    await import('../src/main.js');
    const { rollRarity } = await import('../src/systems/itemGen.js');
    const { monsterLevel } = await import('../src/util.js');
    const { DIFFICULTY, MLVL_BONUS } = await import('../src/data/difficulty.js');
    const share = (src) => { let hi = 0; for (let i = 0; i < 4000; i++) if (rollRarity(1, src) !== 'normal') hi++; return hi / 4000; };
    expect(share('elite')).toBeGreaterThan(share('normal'));
    expect(share('boss')).toBeGreaterThan(share('elite'));
    const run = (difficulty, mapId = 'ranch') => ({ difficulty, mapId });
    expect(monsterLevel(run('normal'), 1, 'normal')).toBe(DIFFICULTY.normal.mlvl);
    expect(monsterLevel(run('normal'), 4, 'normal')).toBe(DIFFICULTY.normal.mlvl + 3);
    expect(monsterLevel(run('hard'), 1, 'fast')).toBe(DIFFICULTY.hard.mlvl + MLVL_BONUS.elite);
    expect(monsterLevel(run('extreme', 'barn'), 0, 'tough', true)).toBeGreaterThan(monsterLevel(run('normal', 'barn'), 0, 'tough', true));
  } finally { env.restore(); }
});
