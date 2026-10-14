// 구조물 배치와 몬스터 비켜 가기 (2026-10-14 사용자: 통과 불가 구조물, 모든 맵)
//   배치: 맵에 들어갈 때마다(mapRun.beginRun) 새로 - 맵 끝·주인공 시작 자리를 비우고 서로 띄움 (data/obstacles.js OBSTACLE_RULES, 개수는 data/maps.js obstacles)
//   비켜 가기: 몬스터 이동이 다 정해진 뒤(game.js, 물리 엔진 직전) 앞에 구조물이 있으면 속도를 둘레 쪽으로 돌림 - 구조물 앞에서 비비지 않게
//   충돌·밀어내기 계산은 world/arena.js, 그림은 render/obstacleSprites.js
import { OBSTACLES, OBSTACLE_RULES, OBSTACLE_AVOID } from '../data/obstacles.js';
import { Body } from '../core/physics.js';
import { PEN, obstacles, setObstacles, nearestOnObstacle, detourPoint } from '../world/arena.js';
import { game } from '../state.js';

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

// 몬스터 비켜 가기 (빠르기는 그대로): 길이 막히면 구조물 모서리 바깥으로 우회(world/arena.js detourPoint), 바로 앞에 붙으면 둘레(접선) 쪽으로
export function steerAroundObstacles(cows) {
  if (!obstacles.length) return;
  const A = OBSTACLE_AVOID;
  cows.forEach((c) => {
    if (c.state === 'dead' || !c.body) return;
    const v = c.body.velocity, sp = Math.hypot(v.x, v.y);
    if (sp < 0.2) return;
    // 1) 가려는 곳(주인공 쪽으로 가는 중이면 주인공, 아니면 앞쪽)까지 길을 구조물이 막으면 모서리 바깥을 거쳐 감
    const h = game.hero, hx = h.x - c.x, hy = h.y - c.y, hd = Math.hypot(hx, hy) || 1;
    const toHero = (v.x * hx + v.y * hy) / (sp * hd) > 0.5;
    const gx = toHero ? h.x : c.x + (v.x / sp) * 250, gy = toHero ? h.y : c.y + (v.y / sp) * 250;
    const dp = detourPoint(c.x, c.y, gx, gy, c.r);
    if (dp) { const dx = dp.x - c.x, dy = dp.y - c.y, d = Math.hypot(dx, dy) || 1; Body.setVelocity(c.body, { x: (dx / d) * sp, y: (dy / d) * sp }); return; }
    // 2) 그래도 바로 앞에 붙어 있으면 둘레(접선) 쪽으로
    let best = null;
    for (const o of obstacles) {
      const n = nearestOnObstacle(o, c.x, c.y);
      const gap = n.d - o.r - c.r;
      if (gap > A.look || n.d < 0.001) continue;
      const ox = (n.x - c.x) / n.d, oy = (n.y - c.y) / n.d; // 구조물 쪽
      const toward = (v.x * ox + v.y * oy) / sp;
      if (toward <= 0.15) continue;
      const w = Math.min(1, Math.max(0, 1 - gap / A.look)) * toward;
      if (!best || w > best.w) best = { w, ox, oy, o, px: n.x };
    }
    if (!best) return;
    // 접선 두 방향 중: 긴 구조물(울타리)은 가까운 끝 쪽 (한가운데에서 좌우가 매 틱 뒤집혀 비비지 않게), 둥근 건 지금 가려던 쪽
    let tx = -best.oy, ty = best.ox;
    const o = best.o;
    if (o.bx !== o.ax || o.by !== o.ay) { const ax = o.bx - o.ax, ay = o.by - o.ay, toB = (best.px - o.ax) / (ax || 1) > 0.5 || (ax === 0 && (c.y - o.ay) / (ay || 1) > 0.5); if ((tx * ax + ty * ay > 0) !== toB) { tx = -tx; ty = -ty; } }
    else if (tx * v.x + ty * v.y < 0) { tx = -tx; ty = -ty; }
    const k = best.w * A.turn;
    const nx = v.x / sp + tx * k - best.ox * best.w * 0.5, ny = v.y / sp + ty * k - best.oy * best.w * 0.5;
    const nl = Math.hypot(nx, ny) || 1;
    Body.setVelocity(c.body, { x: (nx / nl) * sp, y: (ny / nl) * sp });
  });
}
