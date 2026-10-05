// 공격속도 규칙: "+N%"는 정말 N% 빨라짐(속도 배율 = 1 + 공속 + 콤보), 전체 상한 2배. 무기마다 기본 간격이 다름
import { it, expect } from 'vitest';
import { attacksPerSecond, attackSpeedMul } from '../src/util.js';
import { ATTACK_SPEED_MAX_MULT, COMBO_SPEED_CAP } from '../src/data/balance.js';

const sword = { min: 24, max: 36, interval: 0.4 };
const dagger = { min: 18, max: 28, interval: 0.3 };
const hero = (gearAtkSpeed, combo = 0, off = null) => ({ gearAtkSpeed, combo, weaponStats: { main: sword, off } });

it('기본/장비 공속/상한', () => {
  const base = 1 / sword.interval;
  expect(attacksPerSecond(hero(0))).toBeCloseTo(base);
  expect(attacksPerSecond(hero(0.2))).toBeCloseTo(base * 1.2);
  expect(attacksPerSecond(hero(0.5))).toBeCloseTo(base * 1.5);
  expect(attacksPerSecond(hero(5, 999))).toBeCloseTo(base * ATTACK_SPEED_MAX_MULT);
});

it('쌍수면 두 무기 간격의 평균', () => {
  expect(attacksPerSecond(hero(0, 0, dagger))).toBeCloseTo(1 / ((sword.interval + dagger.interval) / 2));
});

it('콤보도 속도 배율에 더해진다(콤보 상한 있음)', () => {
  expect(attackSpeedMul(hero(0, 999))).toBeCloseTo(1 / (1 + COMBO_SPEED_CAP));
});
