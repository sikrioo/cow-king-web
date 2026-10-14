// 개발자 모드 동작 (테스트 편의). 켜는 조건은 config.isDevMode(), 화면은 ui/devPanel.js
// 일반 플레이에는 영향 없음 - 패널 버튼과 dev 플래그(무적/마나 무한/대기시간 0)로만 동작
import { MAX_LEVEL, POTION_MAX, INVENTORY_SIZE } from '../data/balance.js';
import { SKILL_MAX_LEVEL, COMMON_SKILLS } from '../data/skills.js';
import { CLASSES } from '../data/classes.js';
import { World, world } from '../core/physics.js';
import { game, dev } from '../state.js';
import { Monster } from '../entities/monster.js';
import { floatText } from './fx.js';
import { rollGearItem, recalcGearStats } from './gear.js';
import { STAT_DEF } from '../data/items.js';
import { LEVEL_STAT_KEYS } from '../data/balance.js';
import { gainExp } from './progression.js';
import { clampToPen } from '../world/arena.js';
import { waveInfo } from '../util.js';
import { MONSTERS } from '../data/monsters.js';
import { SCENARIOS } from '../data/scenarios.js';
import { ACTS } from '../data/acts.js';

const say = (text, color = '#7fe0ff') => floatText(game.hero.x, game.hero.y - 50, text, color);

export function devLevelUp(n = 1) {
  for (let i = 0; i < n && game.hero.level < MAX_LEVEL; i++) gainExp(Math.max(1, game.hero.expToNext - game.hero.exp));
  say(`레벨 ${game.hero.level}`);
}

// 최대 레벨 + 이 캐릭터 스킬 전부 최대 (레벨업 카드는 건너뜀)
export function devMaxLevel() {
  devLevelUp(MAX_LEVEL);
  [...CLASSES[game.hero.classKey].skills, ...COMMON_SKILLS].forEach((id) => { game.hero.skillLevels[id] = SKILL_MAX_LEVEL; });
  devSkipCards();
}

// 쌓인 레벨업 카드를 고르지 않고 닫음
export function devSkipCards() {
  game.hero.pendingCards = 0;
  game.cardOffer = null;
}

export function devStatPoints(n = 5) {
  game.hero.statPoints += n;
  say(`스탯 포인트 +${n}`);
}

export function devFill() {
  const h = game.hero;
  h.hp = h.maxHp + h.bonusMaxHp + h.gearMaxHp;
  h.mana = h.maxMana;
  h.stamina = h.maxStamina;
  say('체력·마나 가득');
}

export function devToggle(flag) {
  dev[flag] = !dev[flag];
  return dev[flag];
}

// 몬스터를 경험치/드랍 없이 치움
function clearCows() {
  game.cows.forEach((c) => { if (c.body) World.remove(world, c.body); });
  game.cows = [];
}

export function devKillAll() {
  clearCows();
  game.waveTransition = Math.min(game.waveTransition, 1);
  say('몬스터 제거');
}

// n번째 웨이브로 (지금 몬스터는 치우고 곧바로 시작)
export function devJumpWave(n) {
  clearCows();
  game.wave = n - 1;
  game.act = waveInfo(n).act; // 막도 맞춤 (바닥 분위기)
  game.actClear = 0; game.actScene = 0;
  game.waveTransition = 0.3;
  say(`웨이브 ${n}로`);
}

// immune: 면역으로 만들 속성 목록 (['phys', 'fire', ...]) - 개체 저항 c.resist에 1로 덮어씀 (종류 기본 저항은 그대로)
// at: 소환 자리 { x, y } (없으면 바라보는 쪽 170). 크기는 웨이브와 같은 규칙 (카우킹 1.0, 다른 보스·도살자 0.4, 그 밖엔 무작위 체구)
export function devSpawn(kind, immune = [], at = null) {
  const a = game.hero.facing;
  const p = at ? clampToPen(at.x, at.y, 40) : clampToPen(game.hero.x + Math.cos(a) * 170, game.hero.y + Math.sin(a) * 170, 40);
  const def = MONSTERS[kind] || {};
  const scale = kind === 'boss' ? 1.0 : def.boss || def.butcher ? 0.4 : (1.05 + Math.random() * 0.5) * 0.3;
  const c = new Monster(scale, kind, { pos: p, hunt: true });
  if (immune.length) c.resist = Object.fromEntries(immune.map((k) => [k, 1]));
  game.cows.push(c);
  return c;
}

// 시나리오 (data/scenarios.js): 몬스터를 치우고 막을 맞춘 뒤 웨이브를 멈추고 주인공 둘레에 소환
export function devScenario(id) {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc || game.run.mode !== 'wave') { say('목장(웨이브)에서만', '#ff8a80'); return; }
  clearCows();
  if (sc.act != null) { // 막 맞춤 (그 막의 첫 웨이브 번호)
    game.act = sc.act;
    game.wave = ACTS.slice(0, sc.act).reduce((s, a) => s + a.waves, 0);
  }
  game.actClear = 0; game.actScene = 0; game.invade = null;
  game.waveTransition = Infinity; // 웨이브 멈춤 ('웨이브 재개'로)
  const h = game.hero;
  sc.spawns.forEach((sp) => {
    for (let i = 0; i < sp.n; i++) {
      const ang = sp.spread == null ? (i / sp.n) * Math.PI * 2 : h.facing + sp.spread + (sp.n > 1 ? (i / (sp.n - 1) - 0.5) * 0.9 : 0);
      devSpawn(sp.kind, [], { x: h.x + Math.cos(ang) * sp.dist, y: h.y + Math.sin(ang) * sp.dist });
    }
  });
  say(`시나리오: ${sc.label}`);
}

// 멈춘 웨이브 다시
export function devResumeWaves() {
  if (game.run.mode !== 'wave') return;
  game.waveTransition = 0.3;
  say('웨이브 재개');
}

// 스탯 올리기 (패널 선택 상자): 'pt:키' = 스탯 포인트 ±10점(레벨 스탯), 그 밖 = 장비 옵션(보이지 않는 장비 hero.devStats)
//   장비 옵션 한 번 = 고정 수치면 10, %면 10%, 스킬 레벨 옵션은 1 (0 아래로는 안 내려감)
export const DEV_STAT_POINT_KEYS = Object.values(LEVEL_STAT_KEYS);
export function devStatStep(key) {
  if (key.startsWith('pt:')) return 10;
  const d = STAT_DEF[key];
  return d.noUpgrade ? 1 : d.flat ? 10 : 0.1;
}
export function devAddStat(key, sign = 1) {
  const h = game.hero, step = devStatStep(key) * sign;
  if (key.startsWith('pt:')) {
    const k = key.slice(3);
    h.levelStats[k] = Math.max(0, (h.levelStats[k] || 0) + step);
    recalcGearStats();
    say(`${k} 포인트 ${h.levelStats[k]}`);
    return h.levelStats[k];
  }
  h.devStats = h.devStats || {};
  const v = Math.max(0, Math.round(((h.devStats[key] || 0) + step) * 1000) / 1000);
  if (v) h.devStats[key] = v; else delete h.devStats[key];
  recalcGearStats();
  say(`${STAT_DEF[key].label} ${STAT_DEF[key].fmt(v) || v}`);
  return v;
}
export function devResetStats() {
  game.hero.devStats = {};
  recalcGearStats();
  say('개발자 스탯 초기화');
}

export function devGiveGear(rarity) {
  if (game.hero.inventory.length >= INVENTORY_SIZE) { say('가방 가득!', '#ff5b52'); return; }
  game.hero.inventory.push(rollGearItem({ rarity, identified: true, ilvl: Math.max(game.hero.level, 24) })); // 개발자: 높은 티어도 보이게
  say(`${rarity} 장비 지급`);
}

export function devMaterials(n = 10) {
  game.hero.materials += n;
  say(`재료 +${n}`);
}

export function devPotions() {
  game.hero.potions = { heal: POTION_MAX, mana: POTION_MAX };
  say('물약 가득');
}

// 매 틱: 마나 무한/대기시간 0
export function updateDev() {
  const h = game.hero;
  if (dev.infiniteMana) h.mana = h.maxMana;
  if (dev.noCooldown) {
    h.warcryCooldown = 0; h.whirlwindCooldown = 0; h.leapCooldown = 0; h.rushCooldown = 0; h.smashCooldown = 0;
    for (const k in h.spellCd) h.spellCd[k] = 0;
  }
}
