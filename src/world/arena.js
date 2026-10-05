// 아레나(목장): 위치/크기 계산, 울타리 벽, 안쪽 좌표 계산. 맵 수치는 data/maps.js
import { CURRENT_MAP } from '../data/maps.js';
import { World, Bodies, world } from '../core/physics.js';

// 목장(정사각형 아레나) 위치/크기 - 화면과 상관없는 고정 크기(data/maps.js), layoutArena()가 채움
export const PEN = { x: 0, y: 0, size: 0 };
let wallBodies = [];

export function setupWalls() {
  if (wallBodies.length) World.remove(world, wallBodies);
  const t = CURRENT_MAP.wallThickness;
  const { x, y, size } = PEN;
  wallBodies = [
    Bodies.rectangle(x + size / 2, y - t / 2, size + t * 2, t, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x + size / 2, y + size + t / 2, size + t * 2, t, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x - t / 2, y + size / 2, t, size + t * 2, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x + size + t / 2, y + size / 2, t, size + t * 2, { isStatic: true, label: 'wall' })
  ];
  World.add(world, wallBodies);
}

// 목장 배치 + 울타리 벽 (부팅 때 한 번, 주인공 바디보다 먼저)
export function layoutArena() {
  PEN.size = CURRENT_MAP.size;
  PEN.x = 0;
  PEN.y = 0;
  setupWalls();
}

export function randomPointInPen(marginRatio = CURRENT_MAP.spawnMarginRatio) {
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
