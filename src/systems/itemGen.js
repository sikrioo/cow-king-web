// 장비 생성 (디아블로식 절차 생성의 핵심만): 분류 → 등급 → 아이템 레벨 → 접사 개수 → 접사 추첨(티어·그룹·부위·가중치) → 수치 굴림
// 데이터: 접사 data/affixes.js, 등급 비중 data/drops.js(출처별 quality)·data/items.js(RARITY_DEF), 능력치 이름 data/items.js(STAT_DEF)
// 장비 = 순수 데이터 + uid: { category, handedness, variant, rarity, ilvl, affixes: [{ id, rolls, q }], stats(합계), upgradeLevel, identified, uid }
//   affixes는 원본 기록(어떤 접사·티어·굴림이었는지), stats는 능력치 합계(장착 계산·비교에 씀 - 강화하면 stats만 커짐)
// 게임 난수(Math.random) 사용 - systems에서만
import { STAT_DEF, RARITY_DEF, WEAPON_VARIANTS, ACCESSORY_VARIANTS, OPTION_ROLL_SKEW, TWO_HAND_ONLY } from '../data/items.js';
import { AFFIXES, AFFIX_RULES, MAX_ITEM_LEVEL } from '../data/affixes.js';
import { DROP_RATES, GEAR_CATEGORY_WEIGHTS } from '../data/drops.js';
import { game } from '../state.js';

// 아이템 고유 번호 - 장비는 메서드 없는 순수 데이터(JSON 직렬화 가능) + uid (트레이드/저장 대비)
export function nextItemUid() {
  game.itemSeq += 1;
  return game.itemSeq;
}

// [[값, 가중치], ...] 중 하나
function pickWeighted(entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[entries.length - 1][0];
}

// 등급: 출처별 비중(data/drops.js quality) - 일반 외 등급은 boost(난이도 rarity 배율)를 곱함
export function rollRarity(boost = 1, source = 'normal') {
  const q = (DROP_RATES[source] || DROP_RATES.normal).quality;
  return pickWeighted(Object.keys(RARITY_DEF).map((k) => [k, (k === 'normal' ? 1 : boost) * q[k]]));
}

// 접사 하나의 수치 굴림: 범위 안 위치 q = r^OPTION_ROLL_SKEW (flat은 정수 범위 양 끝 포함)
function rollMods(affix) {
  const rolls = {}, q = {};
  for (const [stat, [min, max]] of Object.entries(affix.mods)) {
    const t = Math.pow(Math.random(), OPTION_ROLL_SKEW);
    if (STAT_DEF[stat].flat) {
      const v = Math.min(max, min + Math.floor(t * (max - min + 1)));
      rolls[stat] = v;
      q[stat] = max > min ? Math.round(((v - min) / (max - min)) * 100) / 100 : 1;
    } else {
      rolls[stat] = Math.round((min + t * (max - min)) * 1000) / 1000;
      q[stat] = Math.round(t * 100) / 100;
    }
  }
  return { id: affix.id, rolls, q };
}

// 접사 고르기: 등급 규칙(개수·구성·방향당 최대) + 후보 조건(부위·접사 레벨·매직 전용·그룹 중복)
//   후보가 모자라면 붙을 수 있는 만큼만 (낮은 레벨·좁은 부위). opts.noElement: 원소 피해 접사 제외
export function rollAffixes(category, rarity, ilvl, opts = {}) {
  const rule = AFFIX_RULES[rarity] || AFFIX_RULES.normal;
  const alvl = Math.min(MAX_ITEM_LEVEL, ilvl + (rule.alvlBonus || 0));
  const pool = AFFIXES.filter((a) => a.types.includes(category) && a.alvl <= alvl && (!a.magicOnly || rule.magicOnlyAllowed)
    && !(opts.noElement && Object.keys(a.mods).some((k) => STAT_DEF[k].element)));
  let sides; // 고를 방향 순서 (null이면 매번 반반)
  let total, maxPerSide;
  if (rule.compose) {
    const c = pickWeighted(Object.entries(rule.compose));
    sides = c === 'both' ? ['prefix', 'suffix'] : [c];
    total = sides.length;
    maxPerSide = 1;
  } else {
    total = Number(pickWeighted(Object.entries(rule.count)));
    maxPerSide = rule.maxPerSide || total;
    sides = null;
  }
  const count = { prefix: 0, suffix: 0 };
  const usedGroups = new Set();
  const chosen = [];
  const candidates = (side) => pool.filter((a) => a.side === side && count[side] < maxPerSide && !usedGroups.has(`${side}:${a.group}`));
  for (let n = 0; n < total; n++) {
    let side = sides ? sides[n] : (Math.random() < 0.5 ? 'prefix' : 'suffix');
    let list = candidates(side);
    if (!list.length) { side = side === 'prefix' ? 'suffix' : 'prefix'; list = candidates(side); } // 한쪽이 다 차거나 없으면 다른 쪽
    if (!list.length) break;
    const a = pickWeighted(list.map((x) => [x, x.weight]));
    usedGroups.add(`${side}:${a.group}`);
    count[side]++;
    chosen.push(rollMods(a));
  }
  return chosen;
}

// 접사 굴림 → 능력치 합계
export function sumAffixStats(affixes) {
  const stats = {};
  affixes.forEach((a) => { for (const [k, v] of Object.entries(a.rolls)) stats[k] = Math.round(((stats[k] || 0) + v) * 1000) / 1000; });
  return stats;
}

// 장비 하나 만들기. opts: { category, handedness, variant, rarity, ilvl(기본: 주인공 레벨), source(드랍 출처), rarityBoost, identified, noElement }
export function rollGearItem(opts = {}) {
  const category = opts.category || pickWeighted(Object.entries(GEAR_CATEGORY_WEIGHTS));
  const handedness = category === 'weapon' ? (opts.handedness || (Math.random() < 0.5 ? 'two' : 'one')) : null;
  const rarity = opts.rarity || rollRarity(opts.rarityBoost || 1, opts.source || 'normal');
  const ilvl = Math.max(1, Math.min(MAX_ITEM_LEVEL, Math.round(opts.ilvl || (game.hero && game.hero.level) || 1)));
  const affixes = rollAffixes(category, rarity, ilvl, opts);
  let variant = opts.variant || null;
  if (!variant) {
    if (category === 'weapon') variant = WEAPON_VARIANTS[Math.floor(Math.random() * WEAPON_VARIANTS.length)];
    else if (category === 'accessory') variant = ACCESSORY_VARIANTS[Math.floor(Math.random() * ACCESSORY_VARIANTS.length)];
  }
  const hand = TWO_HAND_ONLY.includes(variant) ? 'two' : handedness; // 대검은 언제나 양손
  return { category, handedness: hand, rarity, ilvl, affixes, stats: sumAffixStats(affixes), upgradeLevel: 0, identified: !!opts.identified, variant, uid: nextItemUid() };
}
