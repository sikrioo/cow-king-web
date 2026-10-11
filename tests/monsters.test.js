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

it('몬스터 무기마다 휘두르는 동작(WEAPON_STYLE)이 정해져 있고, 동작마다 자세 계산이 됨(그림만 - 난수 없음)', async () => {
  const { MONSTER_WEAPONS, WEAPON_STYLE } = await import('../src/data/monsters.js');
  const { weaponPose } = await import('../src/render/weaponMotion.js');
  const used = new Set(Object.values(MONSTER_WEAPONS).flat());
  used.forEach((w) => expect(WEAPON_STYLE[w], w).toBeTruthy());
  const rand = Math.random;
  Math.random = () => { throw new Error('그림에서 게임 난수 사용'); };
  try {
    ['thrust', 'chop', 'slash', 'cast', 'bow'].forEach((st) => {
      [0, 0.06, 0.12, 0.2, 0.4, 0.59].forEach((t) => {
        const p = weaponPose(st, true, t, { hitAt: 0.12, attackTime: 0.6 });
        expect(Number.isFinite(p.a) && Number.isFinite(p.x) && Number.isFinite(p.lunge)).toBe(true);
      });
    });
    expect(weaponPose('chop', true, 0.13, { hitAt: 0.12, attackTime: 0.6 }).dust).toBeGreaterThanOrEqual(0);
    expect(weaponPose('cast', false, 0, { casting: true }).glow).toBeGreaterThan(0);
  } finally { Math.random = rand; }
});

it('걸음걸이: 모든 걸음 종류가 자세를 내고(난수 없음), 같은 종류라도 개체마다 리듬이 다름', async () => {
  const { MONSTERS, MONSTER_GAIT } = await import('../src/data/monsters.js');
  const { gaitOf, gaitPose } = await import('../src/render/gait.js');
  const rand = Math.random;
  Math.random = () => { throw new Error('그림에서 게임 난수 사용'); };
  try {
    Object.keys(MONSTERS).forEach((k) => { const g = gaitOf(k, 1.234); expect(['hop', 'trot', 'stomp', 'scuttle', 'sway']).toContain(g); });
    ['hop', 'trot', 'stomp', 'scuttle', 'sway'].forEach((g) => [0, 0.3, 1.1].forEach((t) => {
      const p = gaitPose(g, 'walk', t, 2.5);
      expect(Number.isFinite(p.bob) && Number.isFinite(p.tilt) && p.sx > 0 && p.sy > 0).toBe(true);
    }));
    expect(gaitPose('hop', 'walk', 0.37, 1.0).bob).not.toBe(gaitPose('hop', 'walk', 0.37, 7.7).bob);
    expect(Array.isArray(MONSTER_GAIT.normal)).toBe(true);
  } finally { Math.random = rand; }
});
