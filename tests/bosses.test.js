// 보스 기술 3개씩: 카우킹(대지 강타·황소 돌진·무리의 함성, 2단계), 해골 카우 킹(시체 자리 소환·뼈 창 부채꼴·시체 폭발), 악마 카우킹(지옥 폭발)
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/summons.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/data/monsters.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/entities/monster.js')),
    ...(await import('../src/core/physics.js')),
    ...(await import('../src/world/arena.js'))
  };
  m.resetGame();
  m.game.gameState = 'playing';
  m.game.waveTransition = 999;
  m.game.cows.length = 0;
  const h = m.game.hero;
  m.Body.setPosition(h.body, { x: m.PEN.size / 2, y: m.PEN.size / 2 }); h.x = m.PEN.size / 2; h.y = m.PEN.size / 2;
  h.hp = 99999;
  m.spawn = (kind, dx, dy = 0) => { const c = new m.Monster(0.4, kind, { pos: { x: h.x + dx, y: h.y + dy } }); m.game.cows.push(c); return c; };
  m.step = (c, sec) => { for (let i = 0; i < sec * 60; i++) c.update(1 / 60); };
  return m;
}
const noDodge = () => vi.spyOn(Math, 'random').mockReturnValue(0.99); // 회피·블락 없음

it('카우킹: 크기 2.0 / 대지 강타 - 안쪽 구역부터 차례로 터지고, 이미 터진 안쪽에 있으면 다음 구역은 안 맞음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const h = m.game.hero;
    expect(m.MONSTERS.boss.scaleMul).toBe(2);
    const k = m.spawn('boss', 130); // 두 번째 구역(90~170) 안
    noDodge();
    k.skillGap = 0; k.patternI = 0;
    k.update(1 / 60);
    expect(k.state).toBe('slamPrep');
    h.invuln = 0;
    m.step(k, m.BOSS_SLAM_TELEGRAPH + 0.05);
    expect(h.hp).toBe(99999);              // 첫 구역(안쪽)은 빗나감
    h.invuln = 0;
    m.step(k, m.BOSS_SLAM_ZONE_GAP);
    expect(h.hp).toBeLessThan(99999);      // 두 번째 구역에 맞음
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('카우킹: 황소 돌진 - 예고 뒤 돌진해 맞히고, 벽에 부딪히면 멍해짐 / 2단계면 두 번 / 함성 - 일반 카우 소환 + 흥분', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero;
    noDodge();
    const k = m.spawn('boss', 200);
    k.skillGap = 0; k.patternI = 1; // charge
    k.update(1 / 60);
    expect(k.state).toBe('chargePrep');
    h.invuln = 0;
    m.step(k, m.BOSS_CHARGE_TELEGRAPH + m.BOSS_CHARGE_TIME + 0.05);
    expect(h.hp).toBeLessThan(99999);
    expect(['dazed', 'idle']).toContain(k.state);
    // 벽 쪽으로 돌진 → 멍함
    const w = m.spawn('boss', 0);
    m.Body.setPosition(w.body, { x: m.PEN.x + 200, y: h.y }); w.x = m.PEN.x + 200; w.y = h.y;
    m.Body.setPosition(h.body, { x: m.PEN.x + 120, y: h.y }); h.x = m.PEN.x + 120;
    w.skillGap = 0; w.patternI = 1;
    w.update(1 / 60);
    expect(w.chargeWall).toBe(true);
    m.step(w, m.BOSS_CHARGE_TELEGRAPH + m.BOSS_CHARGE_TIME + 0.05);
    expect(w.state).toBe('dazed');
    // 2단계 두 번 돌진
    m.game.cows.length = 0;
    m.Body.setPosition(h.body, { x: m.PEN.size / 2, y: m.PEN.size / 2 }); h.x = m.PEN.size / 2; h.y = m.PEN.size / 2;
    const p = m.spawn('boss', 150);
    p.hp = Math.floor(p.maxHp * 0.4);
    p.skillGap = 0; p.patternI = 1;
    p.update(1 / 60);
    expect(p.phase2).toBe(true);
    m.step(p, m.BOSS_CHARGE_TELEGRAPH + m.BOSS_CHARGE_TIME + 0.05);
    if (!p.chargeWall) expect(p.secondCharge).toBe(true);
    // 함성
    const r = m.spawn('boss', 120), buddy = m.spawn('normal', 160, 40);
    r.skillGap = 0; r.patternI = 3; // herd
    r.update(1 / 60);
    expect(r.state).toBe('roar');
    m.step(r, m.BOSS_HERD_CAST + 0.05);
    m.processSpawns();
    expect(m.game.cows.filter((c) => c.summoner === r).length).toBe(m.BOSS_HERD_COUNT);
    expect(buddy.excitedTimer).toBeGreaterThan(0);
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('해골 카우 킹: 시체 자리에서 해골이 일어남 / 뼈 창 3갈래(2단계 5) / 시체 폭발 - 주인공 근처 부하가 부풀다 터짐', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const king = m.spawn('skeletonKing', 300);
    const victim = m.spawn('normal', 250, 80);
    m.killCow(victim);
    const spot = m.game.corpses[m.game.corpses.length - 1];
    king.summonCd = 0; king.boneCd = 99; king.blastCd = 99;
    king.update(1 / 60);
    m.step(king, m.NECRO_CAST_TIME + 0.05);
    m.processSpawns();
    const minions = m.game.cows.filter((c) => c.summoner === king);
    expect(minions.some((c) => Math.hypot(c.x - spot.x, c.y - spot.y) < 30)).toBe(true);
    // 뼈 창 부채꼴
    m.game.projectiles.length = 0;
    king.boneCd = 0; king.summonCd = 99; king.state = 'idle';
    king.update(1 / 60);
    expect(m.game.projectiles.filter((p) => p.kind === 'bonespear').length).toBe(m.NECRO_BONE_FAN);
    // 시체 폭발: 부하 하나를 주인공 옆으로
    const mn = minions[0];
    m.Body.setPosition(mn.body, { x: h.x + 30, y: h.y }); mn.x = h.x + 30; mn.y = h.y;
    king.blastCd = 0; king.summonCd = 99; king.boneCd = 99; king.state = 'idle';
    king.update(1 / 60);
    expect(king.castKind).toBe('blast');
    m.step(king, m.NECRO_CAST_TIME + 0.05);
    expect(mn.bloatTimer).toBeGreaterThan(0);
    noDodge(); h.invuln = 0;
    m.step(mn, m.NECRO_BLOAT + 0.05);
    expect(mn.state).toBe('dead');
    expect(h.hp).toBeLessThan(99999);
  } finally { vi.restoreAllMocks(); env.restore(); }
});

it('악마 카우킹: 지옥 폭발 - 예고 뒤 주변 전체 화염, 분노면 두 번', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    const m = await boot();
    const h = m.game.hero;
    noDodge();
    const k = m.spawn('demonKing', 120);
    k.novaCd = 0; k.summonCd = 99; k.fireCd = 99;
    k.update(1 / 60);
    expect(k.state).toBe('nova');
    h.invuln = 0;
    m.step(k, m.DKING_NOVA_CAST - 0.1);
    expect(h.hp).toBe(99999);
    m.step(k, 0.15);
    expect(h.hp).toBeLessThan(99999);
    // 분노: 두 번
    k.hp = Math.floor(k.maxHp * 0.4); k.state = 'idle';
    k.novaCd = 0;
    k.update(1 / 60);
    expect(k.novaLeft).toBe(2);
    const hp1 = h.hp; h.invuln = 0;
    m.step(k, m.DKING_NOVA_CAST + 0.05);
    h.invuln = 0;
    m.step(k, m.DKING_NOVA_GAP + 0.05);
    expect(h.hp).toBeLessThan(hp1);
    expect(k.state).not.toBe('nova');
  } finally { vi.restoreAllMocks(); env.restore(); }
});
