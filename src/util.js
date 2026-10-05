// 수학/색 유틸 (상태 없음, 순수 함수)
import { ATTACK_COOLDOWN, COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP } from './data/balance.js';

// 기본 공격 속도 배율(작을수록 빠름) - 장비/레벨 공격속도 + 콤보. 공격(combat)과 HUD 표시가 같이 쓴다
export function attackSpeedMul(hero) {
  const comboBonus = Math.min(hero.combo * COMBO_SPEED_PER_HIT, COMBO_SPEED_CAP);
  return Math.max(1 - Math.min(hero.gearAtkSpeed, 0.7) - comboBonus, 0.25);
}

// 초당 기본 공격 횟수 (공격 버튼을 누르고 있을 때)
export function attacksPerSecond(hero) {
  return 1 / (ATTACK_COOLDOWN * attackSpeedMul(hero));
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
