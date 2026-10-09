// 관리자 미리보기 샌드박스: 모든 스킬이 허수아비 앞에서 실제로 시전되고(피해/효과), 모든 몬스터가 행동함 (그리기 포함 예외 없음)
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot() {
  vi.resetModules();
  await import('../src/main.js');
  return {
    ...(await import('../src/state.js')),
    ...(await import('../src/session.js')),
    ...(await import('../src/systems/sandbox.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/data/monsters.js'))
  };
}

it('주소 읽기: 스킬/몬스터, 잘못된 id는 무시, 레벨은 1~최대', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    expect(m.sandboxParams('?sandbox=skill&id=fireball&lv=3')).toEqual({ mode: 'skill', id: 'fireball', lv: 3 });
    expect(m.sandboxParams('?sandbox=skill&id=nope')).toBe(null);
    expect(m.sandboxParams('?sandbox=monster&id=pyro').mode).toBe('monster');
    expect(m.sandboxParams('?sandbox=skill&id=orb&lv=99').lv).toBe(5);
    expect(m.sandboxClass({ mode: 'skill', id: 'orb' })).toBe('sorc');
    expect(m.sandboxClass({ mode: 'skill', id: 'teleport' })).toBe('warrior');
  } finally { env.restore(); }
});

it('모든 스킬: 허수아비 앞에서 반복 시전 → 피해나 효과가 보임', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot();
    for (const id of Object.keys(m.SKILLS)) {
      const sb = { mode: 'skill', id, lv: 3 };
      m.ui.selectedClass = m.sandboxClass(sb);
      m.resetGame();
      m.startSandbox(sb);
      const h = m.game.hero;
      let hurt = 0, moved = 0, stunned = false, fort = false;
      for (let i = 0; i < 360; i++) {
        env.frame(1);
        m.game.cows.forEach((c) => { hurt = Math.max(hurt, c.maxHp - c.hp); if (c.stunTimer > 0) stunned = true; });
        moved = Math.max(moved, Math.hypot(h.x - m.game.sandbox.anchor.x, h.y - m.game.sandbox.anchor.y));
        if (h.fortifyTimer > 0) fort = true;
      }
      expect(m.game.gameState, id).toBe('playing');
      expect(m.game.cardOffer, id).toBe(null);
      const effect = id === 'fortify' ? fort : id === 'teleport' ? moved > 100 : id === 'warcry' ? stunned : hurt > 0;
      expect(effect, id).toBe(true);
    }
  } finally { env.restore(); }
}, 120000);

it('모든 몬스터: 주인공에게 행동하고, 죽거나 사라지면 다시 나옴', async () => {
  const env = installBrowserEnv({ seed: 2 });
  try {
    const m = await boot();
    for (const id of Object.keys(m.MONSTERS)) {
      m.ui.selectedClass = 'warrior';
      m.resetGame();
      m.startSandbox({ mode: 'monster', id, lv: 1 });
      for (let i = 0; i < 600; i++) env.frame(1);
      expect(m.game.gameState, id).toBe('playing');
      expect(m.game.hero.alive, id).toBe(true);
      // 자폭 카우처럼 스스로 죽는 몬스터도 다시 나옴
      for (let i = 0; i < 200 && !m.game.cows.some((c) => c.sandboxTarget && c.state !== 'dead'); i++) env.frame(1);
      expect(m.game.cows.some((c) => c.kind === id && c.sandboxTarget), id).toBe(true);
    }
  } finally { env.restore(); }
}, 120000);
