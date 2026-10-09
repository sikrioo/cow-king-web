// 수학/색 유틸 (상태 없음, 순수 함수)
import { CHILL_ATTACK_SPEED_MULT } from './data/elements.js';
import { CAST_SPEED_MAX_MULT, COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP, ATTACK_SPEED_GEAR_CAP, ATTACK_SPEED_MAX_MULT } from './data/balance.js';
import { SKILL_LEVEL_UP } from './data/skills.js';
import { MONSTERS } from './data/monsters.js';
import { MAPS } from './data/maps.js';
import { DIFFICULTY, WAVE_MLVL_STEP, MLVL_BONUS } from './data/difficulty.js';
import { MAX_ITEM_LEVEL } from './data/affixes.js';

// 몬스터 레벨 (= 떨군 장비의 아이템 레벨): 난이도 기본 + 맵(목장은 웨이브마다, 파밍 맵은 맵 보탬) + 종류(엘리트/보스/우두머리)
export function monsterLevel(run, wave, kind, mapBoss = false) {
  const d = DIFFICULTY[run.difficulty] || DIFFICULTY.normal;
  const map = MAPS[run.mapId] || MAPS.ranch;
  const area = map.mode === 'wave' ? Math.max(0, wave - 1) * WAVE_MLVL_STEP : (map.mlvl || 0);
  const bonus = mapBoss ? MLVL_BONUS.mapBoss : kind === 'boss' ? MLVL_BONUS.boss : kind !== 'normal' ? MLVL_BONUS.elite : 0;
  return Math.max(1, Math.min(MAX_ITEM_LEVEL, d.mlvl + area + bonus));
}

// 몬스터 저항 (0~1, 1이면 면역): 개체 덮어쓰기(c.resist - 개발자 소환 등) → 종류 기본값(data/monsters.js resist)
export function resistOf(c, key) {
  if (c.resist && c.resist[key] != null) return c.resist[key];
  const r = (MONSTERS[c.kind] || MONSTERS.normal).resist;
  return (r && r[key]) || 0;
}

// 스킬 레벨 (0 = 안 배움). 레벨업 카드로 오름 (systems/levelCards.js)
export function skillLevel(hero, id) {
  return (hero.skillLevels && hero.skillLevels[id]) || 0;
}
// 스킬 레벨 보너스: Lv1 대비 더해지는 양 (data/skills.js의 SKILL_LEVEL_UP × (레벨 - 1)). 안 배운 스킬을 직접 써도 Lv1처럼
export function skillBonus(hero, id, key) {
  const per = (SKILL_LEVEL_UP[id] && SKILL_LEVEL_UP[id][key]) || 0;
  return per * Math.max(0, skillLevel(hero, id) - 1);
}
export function skillMul(hero, id, key) {
  return 1 + skillBonus(hero, id, key);
}

// 기본 공격의 시간 배율(작을수록 빠름, 공격 대기/동작 시간에 곱함) = 1 / 속도 배율
//   속도 배율 = 1 + 장비/레벨 공격속도 + 콤보 (최대 ATTACK_SPEED_MAX_MULT). 공격(combat)과 HUD 표시가 같이 쓴다
export function attackSpeedMul(hero) {
  const comboBonus = Math.min(hero.combo * COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP);
  const speed = Math.min(1 + Math.min(hero.gearAtkSpeed, ATTACK_SPEED_GEAR_CAP) + comboBonus, ATTACK_SPEED_MAX_MULT);
  const chill = hero.slowTimer > 0 ? CHILL_ATTACK_SPEED_MULT : 1; // 냉기 둔화 중엔 공격도 느려짐
  return 1 / (speed * chill);
}

// 스킬 대기시간 배율(작을수록 자주) = 1 / (1 + 시전속도), 상한 CAST_SPEED_MAX_MULT. 전사·마법사 스킬 공통 (기본 공격은 attackSpeedMul)
export function castSpeedMul(hero) {
  return 1 / Math.min(1 + (hero.gearCastSpeed || 0), CAST_SPEED_MAX_MULT);
}

// 초당 기본 공격 횟수 (공격 버튼을 누르고 있을 때). 쌍수면 두 무기 간격의 평균
export function attacksPerSecond(hero) {
  const ws = hero.weaponStats;
  const interval = ws.off ? (ws.main.interval + ws.off.interval) / 2 : ws.main.interval;
  return 1 / (interval * attackSpeedMul(hero));
}

// 정수 3개 → 0~1 (결정적 해시). 그림에서 Math.random 대신 씀
export function hash01(a, b, c) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function clamp01(v) { return Math.max(0, Math.min(1, v)); }

export function lerpAngle(a, b, t) {
  const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + diff * t;
}

export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

export function moveToward2D(cx, cy, tx, ty, maxDelta) {
  const dx = tx - cx, dy = ty - cy;
  const d = Math.hypot(dx, dy);
  if (d <= maxDelta || d === 0) return { x: tx, y: ty };
  return { x: cx + (dx / d) * maxDelta, y: cy + (dy / d) * maxDelta };
}

// 점(px,py)과 선분(x1,y1)-(x2,y2) 사이의 최단 거리 - 번개 빔처럼 "지나가는" 피격판정에 사용
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// 보스는 몸통 중앙의 보석(타격점)을 맞춰야 데미지가 들어감 - 몸이 워낙 커서 어디를 때려야 할지
// 명확하게 하기 위함. 일반 카우는 그냥 자기 중심좌표 그대로 반환.
export function getHitPoint(c) {
  if (c.kind === 'boss') return { x: c.x, y: c.y - 40 * c.scale };
  return { x: c.x, y: c.y };
}

export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
