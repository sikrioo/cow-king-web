// 아레나(목장): 위치/크기 계산, 울타리 벽, 안쪽 좌표 계산. 맵 수치는 data/maps.js
import { CURRENT_MAP } from '../data/maps.js';
import { World, Bodies, world } from '../core/physics.js';

// 목장(정사각형 아레나) 위치/크기 - layoutArena()가 채움
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

// 화면 크기에 맞춰 목장을 가운데 정사각형으로 배치하고 벽을 다시 세움
export function layoutArena(width, height) {
  const pad = Math.max(CURRENT_MAP.padMin, Math.min(width, height) * CURRENT_MAP.padRatio);
  PEN.size = Math.min(width, height) - pad * 2;
  PEN.x = (width - PEN.size) / 2;
  PEN.y = (height - PEN.size) / 2;
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
