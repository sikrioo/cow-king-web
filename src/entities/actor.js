// 주인공/몬스터 공통 뼈대: 진영(team), 넉백
// 진영 - 다른 진영끼리만 서로 때릴 수 있음 (combat.canHit). PVP/멀티에서는 주인공마다 진영을 달리 주면 됨
import { Body } from '../core/physics.js';
export const TEAM_HERO = 'hero';
export const TEAM_MONSTER = 'monster';

export function applyKnockback(body, fromX, fromY, force) {
  const dx = body.position.x - fromX;
  const dy = body.position.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  Body.setVelocity(body, { x: (dx / dist) * force, y: (dy / dist) * force });
}
