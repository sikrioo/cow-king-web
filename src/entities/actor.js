// 주인공/몬스터 공통 뼈대 (지금은 넉백만. team 등은 이후)
import { Body } from '../core/physics.js';

export function applyKnockback(body, fromX, fromY, force) {
  const dx = body.position.x - fromX;
  const dy = body.position.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  Body.setVelocity(body, { x: (dx / dist) * force, y: (dy / dist) * force });
}
