// 해골 카우·해골 카우 킹(네크로맨서) - 관리자 페이지에만(게임 생성 목록에 없음), 킹은 해골 소환·뼈 창·죽으면 부하도 쓰러짐·보스 취급
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/summons.js')),
    ...(await import('../src/systems/cc.js')),
    ...(await import('../src/systems/combat.js')),
    ...(await import('../src/data/monsters.js')),
    ...(await import('../src/data/maps.js')),
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
  return m;
}

it('목장 막 구성: 2막 해골·3막 악마가 나오고, 막 보스가 맞음 / 궁수 카우만 관리자 전용 / 파밍 맵엔 없음', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    const { ACTS } = await import('../src/data/acts.js');
    expect(ACTS.map((a) => a.boss)).toEqual(['boss', 'skeletonKing', 'demonKing']);
    expect(ACTS[0].waves).toBe(6);
    expect(Object.keys(ACTS[1].normals)).toContain('skeleton');
    expect(ACTS[1].elites).toContain('skeletonShield');
    expect(Object.keys(ACTS[2].normals)).toContain('imp');
    expect(m.MONSTERS.archer.adminOnly).toBe(true);
    ['skeleton', 'skeletonKing'].forEach((k) => Object.values(m.MAPS).forEach((map) => expect(Object.keys(map.kinds || {})).not.toContain(k)));
  } finally { env.restore(); }
});

it('해골 카우 킹: 주문 → 해골 소환(부하 최대치까지), 뼈 창, 보스 CC 면역, 죽으면 부하도 쓰러짐', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const king = new m.Monster(0.4, 'skeletonKing', { pos: { x: h.x + 300, y: h.y } });
    m.game.cows.push(king);
    expect(m.isBossCow(king)).toBe(true);
    expect(m.applyCC(king, 'stun', 2)).toBe(false);
    king.summonCd = 0; king.boneCd = 99;
    king.update(1 / 60);
    expect(king.state).toBe('casting');
    for (let i = 0; i < m.NECRO_CAST_TIME * 60 + 2; i++) king.update(1 / 60);
    m.processSpawns();
    const minions = () => m.game.cows.filter((c) => c.summoner === king && c.state !== 'dead');
    expect(minions().length).toBe(m.NECRO_SUMMON_COUNT);
    expect(minions()[0].kind).toBe('skeleton');
    expect(minions()[0].dropCount).toBe(0);
    // 최대치면 더 안 부름
    for (let i = 0; i < 5; i++) { king.summonCd = 0; king.state = 'idle'; for (let j = 0; j < 60; j++) king.update(1 / 60); m.processSpawns(); }
    expect(minions().length).toBeLessThanOrEqual(m.NECRO_MAX_MINIONS);
    // 뼈 창
    king.summonCd = 99; king.boneCd = 0; king.state = 'idle';
    king.update(1 / 60);
    expect(m.game.projectiles.some((p) => p.kind === 'bonespear' && p.team === 'monster')).toBe(true);
    m.killCow(king);
    expect(minions().length).toBe(0);
  } finally { env.restore(); }
});

it('궁수 카우·해골 궁수 카우: 사거리 안이면 조준(방향 고정) → 화살, 경직이면 조준 취소, 관리자 전용', async () => {
  const env = installBrowserEnv({ seed: 3 });
  try {
    const m = await boot();
    const h = m.game.hero;
    for (const kind of ['archer', 'skeletonArcher']) {
      m.game.cows.length = 0; m.game.projectiles.length = 0;
      const a = new m.Monster(0.4, kind, { pos: { x: h.x + 260, y: h.y } });
      m.game.cows.push(a);
      a.shootCd = 0;
      a.update(1 / 60);
      expect(a.state).toBe('aiming');
      const dir = { x: a.aimDirX, y: a.aimDirY };
      for (let i = 0; i < m.ARCHER_AIM * 60 + 2; i++) a.update(1 / 60);
      const arrow = m.game.projectiles.find((p) => p.kind === 'arrow');
      expect(arrow).toBeTruthy();
      expect(arrow.team).toBe('monster');
      expect(arrow.dirX).toBeCloseTo(dir.x);
      // 조준 중 경직 → 취소
      a.shootCd = 0; a.state = 'idle';
      a.update(1 / 60);
      expect(a.state).toBe('aiming');
      m.applyCC(a, 'stagger', 0.4);
      expect(a.state).toBe('stunned');
      expect(a.shootCd).toBe(m.ARCHER_COOLDOWN);
    }
  } finally { env.restore(); }
});

it('해골 창병: 근접 사거리가 더 김 / 버닝 소울·창백한 원혼: 모으기(방향 고정) → 뻗어 나가며 이어지는 긴 번개(한 번 맞음, 옆으로 피하면 무사), 늘 떠다님, 막에 나옴', async () => {
  const env = installBrowserEnv({ seed: 4 });
  try {
    const m = await boot();
    const h = m.game.hero;
    const sk = new m.Monster(0.4, 'skeleton', { pos: { x: h.x + 300, y: h.y } });
    const sp = new m.Monster(0.4, 'skeletonSpear', { pos: { x: h.x - 300, y: h.y } });
    expect(sp.meleeRange).toBe(sk.meleeRange + m.MONSTERS.skeletonSpear.reach);
    const { ACTS } = await import('../src/data/acts.js');
    expect(Object.keys(ACTS[1].normals)).toEqual(expect.arrayContaining(['skeletonSpear', 'paleSoul']));
    expect(Object.keys(ACTS[2].normals)).toEqual(expect.arrayContaining(['burningSoul']));
    for (const kind of ['burningSoul', 'paleSoul']) {
      m.game.cows.length = 0;
      expect(m.MONSTERS[kind].element).toBe('lightning');
      const s = new m.Monster(0.4, kind, { pos: { x: h.x + 200, y: h.y } });
      m.game.cows.push(s);
      h.hp = 9999; h.invuln = 0;
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // 회피·블락 없음
      s.shootCd = 0;
      s.update(1 / 60);
      expect(s.state).toBe('charging');
      for (let i = 0; i < (m.SOUL_CHARGE + m.SOUL_BEAM_TIME) * 60 + 2; i++) s.update(1 / 60);
      expect(h.hp).toBeLessThan(9999); // 가만히 있으면 맞음
      expect(s.state).not.toBe('beaming'); // 번개가 끝남
      // 모으는 동안 옆으로 비키면 안 맞음
      h.hp = 9999; h.invuln = 0;
      s.shootCd = 0; s.state = 'idle';
      s.update(1 / 60);
      m.Body.setPosition(h.body, { x: h.x, y: h.y + 120 }); h.y += 120;
      for (let i = 0; i < (m.SOUL_CHARGE + m.SOUL_BEAM_TIME) * 60 + 2; i++) s.update(1 / 60);
      expect(h.hp).toBe(9999);
      vi.restoreAllMocks();
      m.Body.setPosition(h.body, { x: h.x, y: h.y - 120 }); h.y -= 120;
      // 사거리 안에서도 계속 움직임 (불규칙)
      s.shootCd = 99; s.state = 'idle';
      const x0 = s.x;
      for (let i = 0; i < 30; i++) { s.update(1 / 60); m.Engine.update(m.engine, 1000 / 60); s.x = s.body.position.x; }
      expect(Math.abs(s.x - x0) + Math.abs(s.body.position.y - h.y)).toBeGreaterThan(1);
    }
  } finally { env.restore(); }
});

it('해골 전사: 대검·도끼, 내려치는 순간(hitAt)에야 맞음 / 카우킹 도끼·악마 카우킹 대검', async () => {
  const env = installBrowserEnv({ seed: 5 });
  try {
    const m = await boot();
    const h = m.game.hero;
    expect(m.MONSTER_WEAPONS.skeletonBrute).toEqual(['greatsword', 'battleaxe']);
    expect(m.MONSTER_WEAPONS.boss).toEqual(['battleaxe']);
    expect(m.MONSTER_WEAPONS.demonKing).toEqual(['demonblade']);
    expect(new m.Monster(0.4, 'boss', { pos: { x: h.x + 500, y: h.y } }).hitAt).toBe(m.MONSTERS.boss.hitAt); // 보스도 큰 무기가 내려올 때 맞음
    const b = new m.Monster(0.4, 'skeletonBrute', { pos: { x: h.x + 40, y: h.y } });
    m.game.cows.push(b);
    expect(b.hitAt).toBe(m.MONSTERS.skeletonBrute.hitAt);
    h.hp = 9999; h.invuln = 0;
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    for (let i = 0; i < Math.floor(b.hitAt * 60) - 2; i++) b.update(1 / 60);
    expect(b.state).toBe('attack');
    expect(h.hp).toBe(9999); // 아직 들어 올리는 중
    for (let i = 0; i < 10; i++) b.update(1 / 60);
    expect(h.hp).toBeLessThan(9999);
  } finally { vi.restoreAllMocks(); env.restore(); }
});
