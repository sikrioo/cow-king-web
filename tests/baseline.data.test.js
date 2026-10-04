// 골든(docs/baseline.golden.json)의 exact 키 중 data 모듈만으로 계산 가능한 것을 비교한다.
// 기대값은 골든 JSON에서만 읽는다 (숫자를 테스트에 복사하지 말 것). 계산식은 legacy/tools/baseline.cjs와 같게.
import { describe, it, expect } from 'vitest';
import golden from '../docs/baseline.golden.json';
import { MONSTERS } from '../src/data/monsters.js';
import { SKILL_UNLOCK_LEVEL } from '../src/data/skills.js';
import { RARITY_DEF, STAT_DEF } from '../src/data/items.js';
import {
  BASE_DAMAGE, expForLevel, POINTS_PER_LEVEL, MAX_LEVEL, LEVEL_STAT_PER_POINT,
  WEAPON_RANGE, ATTACK_RANGE, ATTACK_ARC, ATTACK_ARC_SINGLE, BOSS_WAVE,
  GEAR_DROP_CHANCE, MATERIAL_DROP_CHANCE, UPGRADE_SUCCESS_CHANCE,
  POTION_MAX, POTION_COOLDOWN, POTION_HEAL_RATIO, POTION_MANA_AMOUNT, POTION_DROP_WEIGHTS
} from '../src/data/balance.js';

const G = golden.exact;
const SPAWN_SCALE = 0.4; // baseline.cjs가 new Cow(0.4, kind)로 뽑은 기준 체구

describe('golden: data', () => {
  it('monsters', () => {
    const actual = Object.fromEntries(Object.keys(G.monsters).map((k) => {
      const m = MONSTERS[k];
      return [k, { hp: m.hp, meleeDmg: m.dmg, scaleRatio: +((SPAWN_SCALE * m.scaleMul) / SPAWN_SCALE).toFixed(3) }];
    }));
    expect(actual).toEqual(G.monsters);
    expect(Object.keys(MONSTERS).sort()).toEqual(Object.keys(G.monsters).sort());
  });

  it('baseDamage / hitsToKill', () => {
    expect(BASE_DAMAGE).toBe(G.baseDamage);
    const small = MONSTERS.normal.hp, big = MONSTERS.tough.hp, boss = MONSTERS.boss.hp;
    const actual = Object.fromEntries(Object.keys(G.hitsToKill).map((d) => [d, {
      small: Math.ceil(small / d), big: Math.ceil(big / d), boss: Math.ceil(boss / d)
    }]));
    expect(actual).toEqual(G.hitsToKill);
  });

  it('progression', () => {
    const cum = []; let s = 0;
    for (let L = 1; L <= G.progression.expToReach_cumulative.length; L++) { s += expForLevel(L); cum.push(s); }
    expect({
      expToReach_cumulative: cum, pointsPerLevel: POINTS_PER_LEVEL, maxLevel: MAX_LEVEL,
      perPoint: LEVEL_STAT_PER_POINT, skillUnlockLevel: SKILL_UNLOCK_LEVEL
    }).toEqual(G.progression);
  });

  it('weaponRange / attack arc', () => {
    expect({ ...WEAPON_RANGE, unarmed: ATTACK_RANGE }).toEqual(G.weaponRange);
    expect(+(ATTACK_ARC_SINGLE * 180 / Math.PI).toFixed(1)).toBe(G.arcDegSingle);
    expect(+(ATTACK_ARC * 180 / Math.PI).toFixed(1)).toBe(G.arcDegDual);
  });

  it('rarity', () => {
    const actual = Object.fromEntries(Object.entries(RARITY_DEF).map(([k, v]) => [k, { label: v.label, weight: v.weight, statMin: v.statMin, statMax: v.statMax, mult: v.mult }]));
    expect(actual).toEqual(G.rarity);
  });

  it('statDef', () => {
    const actual = Object.fromEntries(Object.entries(STAT_DEF).map(([k, v]) => [k, { label: v.label, min: v.min, max: v.max, fmtAtMax: v.fmt(v.max) }]));
    expect(actual).toEqual(G.statDef);
  });

  it('dropConstants / bossWave', () => {
    expect({ gear: GEAR_DROP_CHANCE, material: MATERIAL_DROP_CHANCE, upgradeSuccess: UPGRADE_SUCCESS_CHANCE }).toEqual(G.dropConstants);
    expect(BOSS_WAVE).toBe(G.bossWave);
  });

  it('potions (상수 부분)', () => {
    expect({ max: POTION_MAX, cooldown: POTION_COOLDOWN, healRatio: POTION_HEAL_RATIO, manaAmount: POTION_MANA_AMOUNT, dropWeights: POTION_DROP_WEIGHTS })
      .toEqual({ max: G.potions.max, cooldown: G.potions.cooldown, healRatio: G.potions.healRatio, manaAmount: G.potions.manaAmount, dropWeights: G.potions.dropWeights });
  });
});
