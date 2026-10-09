// 맵 진입 구조: 타이틀 → 맵 선택(hub) → 목장(웨이브)/파밍 맵(난이도) → 나가기·죽음 → 맵 선택. 캐릭터는 그대로
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  return {
    ...(await import('../src/state.js')),
    ...(await import('../src/session.js')),
    ...(await import('../src/systems/mapRun.js')),
    ...(await import('../src/systems/gear.js')),
    ...(await import('../src/data/maps.js')),
    ...(await import('../src/data/difficulty.js')),
    ...(await import('../src/world/arena.js')),
    ...(await import('../src/util.js'))
  };
}

it('타이틀 → 맵 선택 → 파밍 맵 입장: 무리·우두머리 배치, 난이도 배율, 시작 위치, 입장 횟수 (그리기 포함 예외 없음)', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    env.frame(5);
    env.key(' '); env.key(' ', false);
    expect(m.game.gameState).toBe('hub');
    env.frame(10); // 맵 선택 화면 그리기
    env.key('s'); env.key('s', false); // ↓ = 다음 맵(외양간)
    expect(m.ui.hubMap).toBe('barn');
    env.key('d'); env.key('d', false); // → = 난이도 올림
    expect(m.ui.hubDifficulty).toBe('hard');
    env.key('i'); env.frame(5); env.key('i'); // 맵 선택 화면에서 장비창 열고 닫기
    expect(m.game.gameState).toBe('hub');
    env.key(' '); env.key(' ', false);
    expect(m.game.gameState).toBe('playing');
    expect(m.game.run).toMatchObject({ mapId: 'barn', mode: 'farm', difficulty: 'hard', hpMul: m.DIFFICULTY.hard.hp });
    expect(m.PEN.size).toBe(m.MAPS.barn.size);
    const def = m.MAPS.barn;
    expect(m.game.cows.length).toBeGreaterThanOrEqual(def.packs * def.packSize[0] + 1);
    const boss = m.game.cows.filter((c) => c.mapBoss);
    expect(boss.length).toBe(1);
    expect(boss[0].dropCount).toBe(def.boss.drops);
    const normal = m.game.cows.find((c) => c.kind === 'normal' && !c.mapBoss);
    expect(normal.maxHp).toBe(Math.round(60 * m.DIFFICULTY.hard.hp));
    expect(m.game.cows.every((c) => c.home && !c.hunt)).toBe(true); // 자리 지키다가 가까이 가면 덤빔
    expect(m.game.hero.y).toBeCloseTo(m.PEN.size * def.start.y, 0);
    expect(m.game.hero.mapRuns['barn:hard']).toBe(1);
    env.frame(120); // 파밍 맵 진행 + 그리기
  } finally { env.restore(); }
});

it('극한 난이도: 면역 무리가 맵의 면역 종류로 나옴, 높은 등급 비중이 늘어남', async () => {
  const env = installBrowserEnv({ seed: 7 });
  try {
    const m = await boot();
    m.resetGame();
    m.enterMap('barn', { difficulty: 'extreme' });
    const immune = m.game.cows.filter((c) => c.resist);
    expect(immune.length).toBeGreaterThan(0);
    immune.forEach((c) => {
      const keys = Object.keys(c.resist);
      expect(keys.length).toBe(1);
      expect(m.MAPS.barn.immune).toContain(keys[0]);
      expect(m.resistOf(c, keys[0])).toBe(1);
    });
    const share = (boost) => {
      let hi = 0;
      for (let i = 0; i < 4000; i++) if (m.rollRarity(boost) !== 'normal') hi++;
      return hi / 4000;
    };
    expect(share(m.DIFFICULTY.extreme.rarity)).toBeGreaterThan(share(1) + 0.1);
  } finally { env.restore(); }
});

it('다 잡으면 클리어, T 두 번 = 맵 선택으로 (캐릭터·가방·레벨 그대로), 재입장하면 새로 배치 + 횟수 증가', async () => {
  const env = installBrowserEnv({ seed: 5 });
  try {
    const m = await boot();
    const { killCow } = await import('../src/systems/combat.js');
    m.resetGame();
    m.enterMap('barn');
    m.game.cows.slice().forEach((c) => killCow(c));
    m.game.cardOffer = null; m.game.hero.pendingCards = 0; // 레벨업 카드는 이 테스트에선 건너뜀
    env.frame(30);
    expect(m.game.cows.length).toBe(0);
    expect(m.game.run.cleared).toBe(true);
    const lv = m.game.hero.level, inv = m.game.hero.inventory.length;
    expect(lv).toBeGreaterThan(1);

    env.key('t'); env.key('t', false);
    expect(m.game.gameState).toBe('playing'); // 한 번은 안내만
    env.key('t'); env.key('t', false);
    expect(m.game.gameState).toBe('hub');
    expect(m.game.hero.level).toBe(lv);
    expect(m.game.hero.inventory.length).toBe(inv);

    m.enterMap('barn');
    expect(m.game.cows.length).toBeGreaterThan(0);
    expect(m.game.hero.mapRuns['barn:normal']).toBe(2);
  } finally { env.restore(); }
});

it('목장: 난이도를 골라 1웨이브부터 (몬스터 체력 배율, 면역 무리 없음), 죽으면 맵 선택으로 (캐릭터 유지)', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const { startNextWave } = await import('../src/systems/waves.js');
    const { hitPlayer } = await import('../src/systems/combat.js');
    m.resetGame();
    m.goHub();
    m.hubChangeOption(1); m.hubChangeOption(1); m.hubChangeOption(1); // 끝에서 멈춤
    expect(m.ui.hubDifficulty).toBe('extreme');
    m.enterSelectedMap();
    expect(m.game.run).toMatchObject({ mapId: 'ranch', mode: 'wave', difficulty: 'extreme', hpMul: m.DIFFICULTY.extreme.hp });
    expect(m.game.wave).toBe(0);
    startNextWave();
    expect(m.game.wave).toBe(1);
    const c = m.game.cows[0];
    expect(c.maxHp).toBe(Math.round(60 * m.DIFFICULTY.extreme.hp));
    expect(m.game.cows.some((k) => k.resist)).toBe(false); // 목장엔 면역 무리 없음 (전사가 막히지 않게)
    expect(m.game.hero.mapRuns['ranch:extreme']).toBe(1);

    const lv = m.game.hero.level;
    // 회피·막기는 확률이라 죽을 때까지 때림
    for (let i = 0; i < 50 && m.game.gameState === 'playing'; i++) { m.game.hero.invuln = 0; hitPlayer(m.game.hero.x + 5, m.game.hero.y, 999999); }
    expect(m.game.gameState).toBe('gameover');
    env.key(' '); env.key(' ', false);
    expect(m.game.gameState).toBe('hub');
    expect(m.game.hero.level).toBe(lv);
    env.key(' '); env.key(' ', false); // 다시 입장 → 1웨이브부터, 체력 가득
    expect(m.game.gameState).toBe('playing');
    expect(m.game.wave).toBe(0);
    expect(m.game.hero.alive).toBe(true);
    expect(m.game.hero.hp).toBe(m.game.hero.maxHp + m.game.hero.gearMaxHp);
  } finally { env.restore(); }
});
