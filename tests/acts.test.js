// 목장 3막: 웨이브 → 막 정보, 막마다 몬스터·보스, 보스 처치 → 전리품(좋은 등급) + 대기 → 막 전환 장면 → 다음 막, 마지막 보스 = 승리
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/acts.js')),
    ...(await import('../src/systems/waves.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/data/acts.js')),
    ...(await import('../src/data/drops.js')),
    ...(await import('../src/util.js'))
  };
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.cows.length = 0;
  return m;
}

it('웨이브 → 막: 1막 6웨이브(6 = 카우킹), 2·3막 4웨이브씩, 이어서 셈', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    expect(m.waveInfo(6)).toMatchObject({ act: 0, actWave: 6, isBoss: true });
    expect(m.waveInfo(7)).toMatchObject({ act: 1, actWave: 1, isBoss: false });
    expect(m.waveInfo(10)).toMatchObject({ act: 1, isBoss: true });
    expect(m.waveInfo(14)).toMatchObject({ act: 2, isBoss: true });
    expect(m.TOTAL_WAVES()).toBe(14);
    // 2막 웨이브엔 해골이, 2막 보스 웨이브엔 해골 카우 킹이
    m.game.wave = 6;
    m.startNextWave();
    expect(m.game.act).toBe(1);
    expect(m.game.cows.some((c) => c.kind.startsWith('skeleton'))).toBe(true);
    m.game.cows.length = 0;
    m.game.wave = 9;
    m.startNextWave();
    expect(m.game.cows.some((c) => c.kind === 'skeletonKing')).toBe(true);
  } finally { env.restore(); }
});

it('보스 처치 → 좋은 등급 전리품 + 버튼 대기(웨이브 안 나옴) → 누르면 장면(가운데에서 막이 바뀜) → 다음 웨이브 / 마지막 막 보스 = 승리', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    expect(m.DROP_RATES.boss.quality.normal).toBe(0);
    expect(m.DROP_RATES.boss.quality.legendary).toBeGreaterThan(m.DROP_RATES.elite.quality.legendary);
    m.game.wave = 5;
    m.startNextWave(); // 카우킹
    const boss = m.game.cows.find((c) => c.kind === 'boss');
    const items0 = m.game.items.length;
    m.killCow(boss);
    expect(m.game.items.length - items0).toBe(m.ACTS[0].bossDrops);
    expect(m.game.items.slice(items0).every((it) => it.type === 'gear')).toBe(true);
    expect(m.game.gameState).toBe('playing'); // 바로 승리하지 않음
    expect(m.game.actClear).toBeGreaterThan(0);
    expect(m.updateActFlow(60)).toBe(true); // 아무리 기다려도 버튼을 누를 때까지 그대로
    expect(m.game.actScene).toBe(0);
    expect(m.requestNextAct()).toBe(true);
    expect(m.requestNextAct()).toBe(false); // 두 번은 안 됨
    expect(m.game.actScene).toBeGreaterThan(0);
    expect(m.game.act).toBe(0);
    m.updateActFlow(m.ACT_SCENE / 2 + 0.01);
    expect(m.game.act).toBe(1); // 가장 어두울 때 바뀜
    m.updateActFlow(m.ACT_SCENE);
    expect(m.game.actScene).toBe(0);
    expect(m.game.waveTransition).toBeGreaterThan(0);
    // 마지막 막
    m.game.act = 2;
    const dk = { x: 100, y: 100, level: 10 };
    m.bossDown(dk);
    m.updateActFlow(1);
    expect(m.game.gameState).toBe('playing');
    m.requestNextAct();
    expect(m.game.gameState).toBe('victory');
  } finally { env.restore(); }
});

it('난입 도살자: 웨이브 도중 정해진 시간이 되면 경고 없이 한 마리 / 난이도 저항·방어력 패널티', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const el = await import('../src/systems/elements.js');
    const { DIFFICULTY } = await import('../src/data/difficulty.js');
    m.game.cows.length = 0;
    m.game.wave = 7; // 2막 2웨이브
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // 난입 당첨
    m.startNextWave();
    vi.restoreAllMocks();
    expect(m.game.invade && m.game.invade.kind).toBe('butcherCow');
    const n = m.game.cows.length;
    m.updateInvade(m.game.invade.t + 0.01);
    expect(m.game.cows.length).toBe(n + 1);
    expect(m.game.cows[m.game.cows.length - 1].kind).toBe('butcherCow');
    expect(m.game.invade).toBe(null);
    // 난이도 패널티: 극한이면 저항 -60%(음수 = 더 아픔), 방어력 -40%
    const h = m.game.hero;
    h.resist.fire = 0.5; h.gearArmor = 400; h.armorReduction = m.armorReductionOf(400);
    m.game.run.resistPenalty = DIFFICULTY.extreme.resistPenalty; m.game.run.armorPenalty = DIFFICULTY.extreme.armorPenalty;
    expect(el.heroResist('fire')).toBeCloseTo(0.5 - 0.6);
    expect(el.heroArmorReduction()).toBeCloseTo(m.armorReductionOf(400 * 0.6));
    expect(el.resolveHeroDamage({ fire: 100 }).total).toBe(110);
    m.game.run.resistPenalty = 0; m.game.run.armorPenalty = 0;
    expect(el.heroResist('fire')).toBe(0.5);
  } finally { vi.restoreAllMocks(); env.restore(); }
});
