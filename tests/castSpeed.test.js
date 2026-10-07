// 시전속도: 스킬 대기시간만 줄임(전사·마법사 공통), 기본 공격(근접/마력탄)은 공격속도. 상한 2배, 스킬 지속 시간은 그대로
import { it, expect, vi } from 'vitest';
import { installBrowserEnv } from './helpers/browserEnv.js';

async function boot(cls) {
  vi.resetModules();
  await import('../src/main.js');
  const m = {
    ...(await import('../src/state.js')),
    ...(await import('../src/game.js')),
    ...(await import('../src/systems/skills.js')),
    ...(await import('../src/systems/sorcSkills.js')),
    ...(await import('../src/systems/gear.js')),
    ...(await import('../src/data/balance.js')),
    ...(await import('../src/data/skills.js')),
    ...(await import('../src/util.js'))
  };
  m.ui.selectedClass = cls;
  m.resetGame();
  m.game.hero.level = 10; m.game.hero.mana = 999; m.game.hero.maxMana = 999;
  return m;
}

it('전사: 시전속도 +50%면 스킬 대기시간 2/3, 휠윈드 지속 시간은 그대로, 상한 2배', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('warrior');
    const h = m.game.hero;
    h.levelStats.castSpeed = 50; m.recalcGearStats();
    expect(h.gearCastSpeed).toBeCloseTo(0.5);
    m.tryWarCry();
    expect(h.warcryCooldown).toBeCloseTo(m.WARCRY_COOLDOWN / 1.5);
    m.tryWhirlwind();
    expect(h.whirlwindCooldown).toBeCloseTo(m.WHIRLWIND_COOLDOWN / 1.5 + m.WHIRLWIND_DURATION);
    h.levelStats.castSpeed = 500; m.recalcGearStats();
    expect(m.castSpeedMul(h)).toBeCloseTo(1 / m.CAST_SPEED_MAX_MULT);
  } finally { env.restore(); }
});

it('마법사: 화염구는 시전속도, 마력탄은 공격속도', async () => {
  const env = installBrowserEnv({ seed: 1 });
  try {
    const m = await boot('sorc');
    const h = m.game.hero;
    h.levelStats.castSpeed = 100; m.recalcGearStats();
    m.tryFireballSpell();
    expect(h.spellCd.fireball).toBeCloseTo(m.SPELLS.fireball.cooldown / 2);
    m.tryBolt();
    expect(h.spellCd.bolt).toBeCloseTo(m.SPELLS.bolt.cooldown * m.attackSpeedMul(h));
    expect(h.spellCd.bolt).toBeCloseTo(m.SPELLS.bolt.cooldown); // 공격속도 0이면 그대로
  } finally { env.restore(); }
});
