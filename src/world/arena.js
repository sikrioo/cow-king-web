// 아레나: 지금 맵(currentMap)의 위치/크기, 울타리 벽, 안쪽 좌표 계산. 맵 수치는 data/maps.js
// 맵을 바꾸면(setMap) 크기와 벽을 다시 만듦 - 맵 진행(입장/나가기)은 systems/mapRun.js
import { MAPS } from '../data/maps.js';
import { World, Bodies, world } from '../core/physics.js';

// 목장(정사각형 아레나) 위치/크기 - 화면과 상관없는 고정 크기(data/maps.js), layoutArena()가 채움
export const PEN = { x: 0, y: 0, size: 0 };
let wallBodies = [];
let mapId = 'ranch';

export function currentMapId() { return mapId; }
export function currentMap() { return MAPS[mapId]; }

export function setupWalls() {
  if (wallBodies.length) World.remove(world, wallBodies);
  const t = currentMap().wallThickness;
  const { x, y, size } = PEN;
  wallBodies = [
    Bodies.rectangle(x + size / 2, y - t / 2, size + t * 2, t, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x + size / 2, y + size + t / 2, size + t * 2, t, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x - t / 2, y + size / 2, t, size + t * 2, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x + size + t / 2, y + size / 2, t, size + t * 2, { isStatic: true, label: 'wall' })
  ];
  World.add(world, wallBodies);
}

// 맵 배치 + 울타리 벽 (부팅 때 한 번은 주인공 바디보다 먼저)
export function layoutArena() {
  PEN.size = currentMap().size;
  PEN.x = 0;
  PEN.y = 0;
  setupWalls();
}

// 맵 바꾸기: 크기/벽이 다르면 다시 만듦 (같은 맵이면 아무것도 안 함 - 물리 바디 순서 유지)
export function setMap(id) {
  if (!MAPS[id] || id === mapId) return;
  mapId = id;
  layoutArena();
}

export function randomPointInPen(marginRatio = currentMap().spawnMarginRatio) {
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
