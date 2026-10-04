// 목장(아레나) 안 좌표 계산
import { PEN } from '../core/physics.js';

export function randomPointInPen(marginRatio = 0.14) {
  const m = PEN.size * marginRatio;
  return {
    x: PEN.x + m + Math.random() * (PEN.size - m * 2),
    y: PEN.y + m + Math.random() * (PEN.size - m * 2)
  };
}

export function clampToPen(x, y, margin) {
  return {
    x: Math.min(Math.max(x, PEN.x + margin), PEN.x + PEN.size - margin),
    y: Math.min(Math.max(y, PEN.y + margin), PEN.y + PEN.size - margin)
  };
}
