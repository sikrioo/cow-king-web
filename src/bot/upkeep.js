// 봇 성장 관리 (2026-10-14 사용자: 봇이 스탯도 올리고 장비도 바꿔야 함) - 싸움과 따로, 정해진 초마다 한 번
//   스탯 포인트 분배(BOT_BUILD.build 비율) → 미감정 장비 감정 → 더 좋은 장비로 바꿔 끼기(점수 비교) → 재료로 무기·갑옷 강화 → 배운 좋은 스킬을 슬롯에
//   사람이 메뉴에서 누르는 것과 같은 함수만 씀 (systems/gear·progression·skills)
import { BOT_BUILD, BOT_UPKEEP } from '../data/bot.js';
import { GEAR_SLOTS } from '../data/items.js';
import { SKILL_META } from '../data/skills.js';
import { game, ui } from '../state.js';
import { trySpendStatPoint, isSkillUnlocked } from '../systems/progression.js';
import { tryIdentify, equipFromInventory, tryUpgradeSlot, weaponStats, gearArmor } from '../systems/gear.js';
import { cycleSkillSlot } from '../systems/skills.js';
import { specialUsable } from '../util.js';

const buildOf = () => BOT_BUILD[game.hero.classKey] || BOT_BUILD.warrior;

// 장비 하나 점수 (가중치 BOT_BUILD.gear)
export function gearScore(it) {
  if (!it || it === 'LOCKED') return 0;
  const w = buildOf().gear;
  let s = 0;
  for (const k in it.stats) s += (w[k] || 0) * it.stats[k];
  if (it.category === 'weapon') { const ws = weaponStats(it); s += w.dps * ((ws.min + ws.max) / 2) / ws.interval; }
  else s += w.armor * gearArmor(it);
  return s;
}

function spendPoints() {
  const h = game.hero, b = buildOf().build, keys = Object.keys(b);
  while (h.statPoints > 0) { // 비율에 가장 못 미친 스탯부터
    const k = keys.reduce((best, x) => ((h.levelStats[x] || 0) / b[x] < (h.levelStats[best] || 0) / b[best] ? x : best), keys[0]);
    const before = h.statPoints;
    trySpendStatPoint(k);
    if (h.statPoints === before) break;
  }
}

function identifyOne() {
  if (ui.identifyingItem) return;
  const i = game.hero.inventory.findIndex((it) => it && !it.identified);
  if (i >= 0) tryIdentify(i);
}

// 가방에서 지금보다 확실히 좋은 장비를 하나 끼움 (한 번에 하나 - 무기는 한손이면 주무기 칸, 양손이면 주+보조 합계와 비교)
function equipBetter() {
  const h = game.hero, eq = h.equipment;
  let best = null;
  h.inventory.forEach((it, i) => {
    if (!it || !it.identified || !it.category) return;
    let cur, slot = null;
    if (it.category === 'weapon' && it.handedness === 'two') cur = gearScore(eq.weaponMain) + gearScore(eq.weaponOff);
    else if (it.category === 'weapon') { cur = gearScore(eq.weaponMain); slot = eq.weaponMain && eq.weaponMain.handedness !== 'two' ? 'weaponMain' : null; }
    else if (it.category === 'shield') cur = gearScore(eq.weaponOff) + (eq.weaponMain && eq.weaponMain.handedness === 'two' ? gearScore(eq.weaponMain) : 0);
    else if (it.category === 'accessory') cur = Math.min(gearScore(eq.accessory1), gearScore(eq.accessory2));
    else cur = gearScore(eq[it.category]);
    const gain = gearScore(it) - cur * (1 + BOT_UPKEEP.equipMargin);
    if (gain > 0 && (!best || gain > best.gain)) best = { i, slot, gain };
  });
  if (best) equipFromInventory(best.i, best.slot);
}

function upgradeGear() {
  const h = game.hero;
  if (!(h.materials > 0)) return;
  const order = ['weaponMain', 'armor', 'weaponOff', 'greaves', 'boots'];
  const slot = order.find((s) => h.equipment[s] && h.equipment[s] !== 'LOCKED');
  if (slot) tryUpgradeSlot(GEAR_SLOTS.indexOf(slot));
}

// 배운 스킬 중 우선순위 앞의 둘을 슬롯1·2에 (오라·무기 특수기는 휴리스틱이 다루지 않아 뺌)
function fillSlots() {
  const h = game.hero;
  const want = buildOf().skills.filter((id) => isSkillUnlocked(id) && !SKILL_META[id].aura && specialUsable(h, id)).slice(0, 2);
  want.forEach((id, n) => {
    const key = n === 0 ? 'slot1' : 'slot2';
    for (let i = 0; i < 40 && h[key] !== id; i++) { const before = h[key]; cycleSkillSlot(n + 1); if (h[key] === before) break; }
  });
}

export function upkeep(mem, dt) {
  mem.upkeepT = (mem.upkeepT || 0) - dt;
  if (mem.upkeepT > 0 || game.gameState !== 'playing' || game.cardOffer) return;
  mem.upkeepT = BOT_UPKEEP.upkeepEvery;
  spendPoints();
  identifyOne();
  equipBetter();
  upgradeGear();
  fillSlots();
}
