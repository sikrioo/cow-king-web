// Matter 엔진/월드와 목장 울타리 벽
import Matter from 'matter-js';

const { Engine, World, Bodies } = Matter;

export const engine = Engine.create();
engine.gravity.x = 0;
engine.gravity.y = 0;
export const world = engine.world;

// 목장(정사각형 아레나) 위치/크기 - resize()가 채움
export const PEN = { x: 0, y: 0, size: 0 };
let wallBodies = [];
export function setupWalls() {
  if (wallBodies.length) World.remove(world, wallBodies);
  const t = 24;
  const { x, y, size } = PEN;
  wallBodies = [
    Bodies.rectangle(x + size / 2, y - t / 2, size + t * 2, t, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x + size / 2, y + size + t / 2, size + t * 2, t, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x - t / 2, y + size / 2, t, size + t * 2, { isStatic: true, label: 'wall' }),
    Bodies.rectangle(x + size + t / 2, y + size / 2, t, size + t * 2, { isStatic: true, label: 'wall' })
  ];
  World.add(world, wallBodies);
}
