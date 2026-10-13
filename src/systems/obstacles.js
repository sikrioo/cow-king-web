// 구조물 배치와 몬스터 비켜 가기 (2026-10-14 사용자: 통과 불가 구조물, 모든 맵)
//   배치: 맵에 들어갈 때마다(mapRun.beginRun) 새로 - 맵 끝·주인공 시작 자리를 비우고 서로 띄움 (data/obstacles.js OBSTACLE_RULES, 개수는 data/maps.js obstacles)
//   비켜 가기: 몬스터 이동이 다 정해진 뒤(game.js, 물리 엔진 직전) 앞에 구조물이 있으면 속도를 둘레 쪽으로 돌림 - 구조물 앞에서 비비지 않게
//   충돌·밀어내기 계산은 world/arena.js, 그림은 render/obstacleSprites.js
import { OBSTACLES, OBSTACLE_RULES, OBSTACLE_AVOID } from '../data/obstacles.js';
import { Body } from '../core/physics.js';
import { PEN, obstacles, setObstacles, nearestOnObstacle } from '../world/arena.js';

// 맵 구조물 새로 놓기. counts = { hay: 8, fence: 5 }, start = 주인공 시작 자리
export function layoutObstacles(counts, start) {
  const R = OBSTACLE_RULES, placed = [];
  const fits = (o) => {
    const cx = (o.ax + o.bx) / 2, cy = (o.ay + o.by) / 2;
    if (Math.hypot(cx - start.x, cy - start.y) < R.startClear) return false;
    return placed.every((q) => Math.hypot((q.ax + q.bx) / 2 - cx, (q.ay + q.by) / 2 - cy) >= R.apart + (o.half || 0) + (q.half || 0));
  };
  Object.entries(counts || {}).forEach(([kind, n]) => {
    const def = OBSTACLES[kind];
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < R.tries; t++) {
        const half = def.shape === 'line' ? (def.len[0] + Math.random() * (def.len[1] - def.len[0])) / 2 : 0;
        const x = PEN.x + R.edge + half + Math.random() * (PEN.size - (R.edge + half) * 2);
        const y = PEN.y + R.edge + Math.random() * (PEN.size - R.edge * 2);
        const o = { kind, ax: x - half, ay: y, bx: x + half, by: y, r: def.r, half, seed: placed.length + 1 };
        if (fits(o)) { placed.push(o); break; }
      }
    }
  });
  setObstacles(placed);
}

export function clearObstacles() { setObstacles([]); }

// 몬스터 비켜 가기: 움직이는 몬스터마다, 앞쪽 look 안 구조물로 향하고 있으면 둘레(접선) 쪽으로 속도를 돌림 (빠르기는 그대로)
export function steerAroundObstacles(cows) {
  if (!obstacles.length) return;
  const A = OBSTACLE_AVOID;
  cows.forEach((c) => {
    if (c.state === 'dead' || !c.body) return;
    const v = c.body.velocity, sp = Math.hypot(v.x, v.y);
    if (sp < 0.2) return;
    let best = null;
    for (const o of obstacles) {
      const n = nearestOnObstacle(o, c.x, c.y);
      const gap = n.d - o.r - c.r;
      if (gap > A.look || n.d < 0.001) continue;
      const ox = (n.x - c.x) / n.d, oy = (n.y - c.y) / n.d; // 구조물 쪽
      const toward = (v.x * ox + v.y * oy) / sp;
      if (toward <= 0.15) continue;
      const w = Math.min(1, Math.max(0, 1 - gap / A.look)) * toward;
      if (!best || w > best.w) best = { w, ox, oy };
    }
    if (!best) return;
    // 접선 두 방향 중 지금 가려던 쪽에 가까운 쪽
    let tx = -best.oy, ty = best.ox;
    if (tx * v.x + ty * v.y < 0) { tx = -tx; ty = -ty; }
    const k = best.w * A.turn;
    const nx = v.x / sp + tx * k - best.ox * best.w * 0.5, ny = v.y / sp + ty * k - best.oy * best.w * 0.5;
    const nl = Math.hypot(nx, ny) || 1;
    Body.setVelocity(c.body, { x: (nx / nl) * sp, y: (ny / nl) * sp });
  });
}
