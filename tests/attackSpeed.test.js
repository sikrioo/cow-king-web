// 공격속도 규칙: "+N%"는 정말 N% 빨라짐(속도 배율 = 1 + 공속 + 콤보), 전체 상한 2배
import { it, expect } from 'vitest';
import { attacksPerSecond, attackSpeedMul } from '../src/util.js';
import { ATTACK_COOLDOWN, ATTACK_SPEED_MAX_MULT, COMBO_SPEED_CAP } from '../src/data/balance.js';

const hero = (gearAtkSpeed, combo = 0) => ({ gearAtkSpeed, combo });

it('기본/장비 공속/상한', () => {
  const base = 1 / ATTACK_COOLDOWN;
  expect(attacksPerSecond(hero(0))).toBeCloseTo(base);
  expect(attacksPerSecond(hero(0.2))).toBeCloseTo(base * 1.2);
  expect(attacksPerSecond(hero(0.5))).toBeCloseTo(base * 1.5);
  expect(attacksPerSecond(hero(5, 999))).toBeCloseTo(base * ATTACK_SPEED_MAX_MULT);
});

it('콤보도 속도 배율에 더해진다(콤보 상한 있음)', () => {
  expect(attackSpeedMul(hero(0, 999))).toBeCloseTo(1 / (1 + COMBO_SPEED_CAP));
});
