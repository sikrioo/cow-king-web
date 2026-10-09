// 아이템 표시 규칙 한 곳 - 바닥 칩/가방/상세/장비/강화 화면과 줍기 메시지가 전부 이것을 쓴다.
// (표시 방식을 바꿀 때는 이 파일만 고치면 됨. 상태 없음, data만 참조하는 순수 함수)
import { ITEM_STYLE, POTION_LABEL, GEAR_CATEGORY_LABEL, GEAR_VARIANT_LABEL, RARITY_DEF, STAT_DEF, ROLL_QUALITY } from '../data/items.js';
import { AFFIXES } from '../data/affixes.js';

const AFFIX_BY_ID = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

// 장비 이름: 변형(검/도끼/반지…)이 있으면 변형 이름, 없으면 분류 이름(갑옷/방패…)
export function gearDisplayName(gear) {
  return GEAR_VARIANT_LABEL[gear.variant] || GEAR_CATEGORY_LABEL[gear.category];
}

// 감정된 장비 제목: "[등급] 이름 (한손) +강화"
//   hand: 무기의 한손/양손 표기, upgrade: 강화 수치 표기
export function gearTitle(gear, { hand = false, upgrade = true } = {}) {
  const handTxt = hand && gear.category === 'weapon' ? (gear.handedness === 'two' ? ' (양손)' : ' (한손)') : '';
  const upgTxt = upgrade && gear.upgradeLevel > 0 ? ` +${gear.upgradeLevel}` : '';
  return `[${RARITY_DEF[gear.rarity].label}] ${gearDisplayName(gear)}${handTxt}${upgTxt}`;
}

// 미감정 장비 제목: "미감정 이름" / 감정 진행 중이면 "감정 중… 이름"
export function unidentifiedTitle(gear, identifying = false) {
  return `${identifying ? '감정 중… ' : '미감정 '}${gearDisplayName(gear)}`;
}

// 이 능력치를 준 접사(티어·굴림 위치) - 접사 기록이 없는 장비(테스트 무기 등)는 null. 같은 능력치를 두 접사가 주면 높은 티어 쪽
function affixFor(gear, key) {
  let best = null;
  (gear.affixes || []).forEach((a) => {
    const def = AFFIX_BY_ID[a.id];
    if (def && a.rolls[key] != null && (!best || def.tier > best.tier)) best = { tier: def.tier, magicOnly: def.magicOnly, q: a.q[key] };
  });
  return best;
}

// 옵션 굴림 품질: { tier, pct: '87%', tag: '최상'|'꽝'|'', color } - 티어 범위 안에서의 위치
export function rollTag(gear, key) {
  const a = affixFor(gear, key);
  if (!a) return null;
  const pct = `${Math.round(a.q * 100)}%`;
  if (a.q >= ROLL_QUALITY.top) return { tier: a.tier, magicOnly: a.magicOnly, pct, tag: '최상', color: '#ffd34d' };
  if (a.q <= ROLL_QUALITY.dud) return { tier: a.tier, magicOnly: a.magicOnly, pct, tag: '꽝', color: '#8a8a8a' };
  return { tier: a.tier, magicOnly: a.magicOnly, pct, tag: '', color: '#9aa596' };
}

// 옵션 한 줄 글자: "화염 피해 +32 (3단계·최상)" - detail이면 굴림 %까지
export function optionText(gear, key, value, { detail = false } = {}) {
  const r = rollTag(gear, key);
  let extra = '';
  if (r) {
    const parts = [`${r.tier}단계${r.magicOnly ? '★' : ''}`];
    if (r.tag) parts.push(r.tag);
    if (detail) parts.push(r.pct);
    extra = ` (${parts.join('·')})`;
  }
  return `${STAT_DEF[key].label} ${STAT_DEF[key].fmt(value)}${extra}`;
}

// 옵션 표시 순서 = STAT_DEF 순서
export function statKeysInOrder(gear) {
  return Object.keys(STAT_DEF).filter((k) => gear.stats[k] != null);
}

// 감정된 장비 색 = 등급색
export function gearColor(gear) {
  return RARITY_DEF[gear.rarity].color;
}
export const UNIDENTIFIED_COLOR = '#a9a9a9';

// 바닥 아이템은 아이콘 대신 글자 칩으로 표시 - 장비는 미감정이라 회색, 물약/재료는 색으로 구분
export function groundLabelForGear(gear) {
  if (gear.category === 'weapon') return '무기';
  if (gear.category === 'accessory') return '장신구';
  return '방어구'; // 갑옷/각반/신발/방패
}

// 바닥 칩 글자/색
export function groundChip(it) {
  const isGear = it.type === 'gear';
  const isMaterial = it.type === 'material';
  const label = isGear ? groundLabelForGear(it.gearData) : isMaterial ? '재료' : (POTION_LABEL[it.type] || '물약');
  const color = isGear ? '#cfcfcf' : isMaterial ? '#9fd6e0' : ITEM_STYLE[it.type].color;
  return { label, color };
}
