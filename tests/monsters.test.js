// 몬스터 무기: data의 무기 이름마다 그림이 있고, 같은 종류 안에서도 개체마다 섞여 나온다
import { it, expect } from 'vitest';
import { MONSTERS, MONSTER_WEAPONS, weaponFor } from '../src/data/monsters.js';
import { WEAPON_DRAW } from '../src/render/monsterWeapons.js';

it('모든 몬스터 종류에 무기 목록이 있고, 목록의 무기는 전부 그림이 있다', () => {
  expect(Object.keys(MONSTER_WEAPONS).sort()).toEqual(Object.keys(MONSTERS).sort());
  for (const list of Object.values(MONSTER_WEAPONS)) for (const w of list) expect(typeof WEAPON_DRAW[w]).toBe('function');
});

it('일반 카우 20마리면 무기가 여러 종류로 섞인다 (위상값 0~10 기준)', () => {
  const seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(weaponFor('normal', (i * 0.4937) % 10));
  expect(seen.size).toBeGreaterThanOrEqual(4);
});

it('관리자 몬스터 표: 모든 몬스터에 기술 설명(없으면 빈 목록)이 있음', async () => {
  const { MONSTERS, MONSTER_SKILLS } = await import('../src/data/monsters.js');
  expect(Object.keys(MONSTER_SKILLS).sort()).toEqual(Object.keys(MONSTERS).sort());
});
