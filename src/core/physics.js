// Matter 엔진/월드
import Matter from 'matter-js';

export const { Engine, World, Bodies, Body } = Matter;

export const engine = Engine.create();
engine.gravity.x = 0;
engine.gravity.y = 0;
export const world = engine.world;
