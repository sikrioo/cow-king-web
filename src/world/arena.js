// 아레나: 지금 맵(currentMap)의 위치/크기, 울타리 벽, 안쪽 좌표 계산. 맵 수치는 data/maps.js
// 맵을 바꾸면(setMap) 크기와 벽을 다시 만듦 - 맵 진행(입장/나가기)은 systems/mapRun.js
// 구조물(통과 불가): 발밑 캡슐 { kind, ax, ay, bx, by, r } (원이면 a = b) - 배치는 systems/obstacles.js, 수치 data/obstacles.js
import { MAPS } from '../data/maps.js';
import { World, Bodies, world } from '../core/physics.js';

// 목장(정사각형 아레나) 위치/크기 - 화면과 상관없는 고정 크기(data/maps.js), layoutArena()가 채움
export const PEN = { x: 0, y: 0, size: 0 };
let wallBodies = [];
export const obstacles = [];
let obstacleBodies = [];
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

// 맵 안쪽으로 + 구조물 밖으로 (생성 자리·돌진 끝·순간이동 등 위치를 정하는 곳은 전부 여기를 거침)
export function clampToPen(x, y, margin) {
  const inPen = (px, py) => ({
    x: Math.min(Math.max(px, PEN.x + margin), PEN.x + PEN.size - margin),
    y: Math.min(Math.max(py, PEN.y + margin), PEN.y + PEN.size - margin)
  });
  if (!obstacles.length) return inPen(x, y);
  const p = pushOutOfObstacles(inPen(x, y), margin);
  return inPen(p.x, p.y);
}

// 구조물 바꾸기: 물리 바디(정적)도 같이 - 원 = circle, 선 = 모서리가 둥근 사각(캡슐 근사)
export function setObstacles(list) {
  if (obstacleBodies.length) World.remove(world, obstacleBodies);
  obstacles.length = 0;
  obstacles.push(...list);
  obstacleBodies = list.map((o) => o.ax === o.bx && o.ay === o.by
    ? Bodies.circle(o.ax, o.ay, o.r, { isStatic: true, label: 'obstacle' })
    : Bodies.rectangle((o.ax + o.bx) / 2, (o.ay + o.by) / 2, Math.hypot(o.bx - o.ax, o.by - o.ay) + o.r * 2, o.r * 2, { isStatic: true, label: 'obstacle', chamfer: { radius: o.r - 0.5 } }));
  if (obstacleBodies.length) World.add(world, obstacleBodies);
}

// 구조물 발밑 선분에서 가장 가까운 점과 거리
export function nearestOnObstacle(o, x, y) {
  const dx = o.bx - o.ax, dy = o.by - o.ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - o.ax) * dx + (y - o.ay) * dy) / l2)) : 0;
  const px = o.ax + dx * t, py = o.ay + dy * t;
  return { x: px, y: py, d: Math.hypot(x - px, y - py) };
}

// (x, y)가 구조물(+ margin) 안이면 그 구조물, 아니면 null
export function obstacleAt(x, y, margin = 0) {
  for (const o of obstacles) if (nearestOnObstacle(o, x, y).d < o.r + margin) return o;
  return null;
}

// 구조물 안이면 가장 가까운 바깥(테두리 + margin)으로
export function pushOutOfObstacles(p, margin = 0) {
  let { x, y } = p;
  for (let pass = 0; pass < 2; pass++) { // 두 구조물 사이에 끼면 한 번 더
    for (const o of obstacles) {
      const n = nearestOnObstacle(o, x, y), need = o.r + margin;
      if (n.d >= need) continue;
      const ux = n.d > 0.001 ? (x - n.x) / n.d : 0, uy = n.d > 0.001 ? (y - n.y) / n.d : 1; // 한가운데면 아래로
      x = n.x + ux * need; y = n.y + uy * need;
    }
  }
  return { x, y };
}

// 두 선분 사이 최단 거리 (길이 0이면 점)
function segSegDist(px, py, qx, qy, ax, ay, bx, by) {
  const ptSeg = (x, y, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2)) : 0;
    return Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t));
  };
  const cross = (x1, y1, x2, y2, x3, y3) => (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d1 = cross(px, py, qx, qy, ax, ay), d2 = cross(px, py, qx, qy, bx, by), d3 = cross(ax, ay, bx, by, px, py), d4 = cross(ax, ay, bx, by, qx, qy);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0; // 교차
  return Math.min(ptSeg(px, py, ax, ay, bx, by), ptSeg(qx, qy, ax, ay, bx, by), ptSeg(ax, ay, px, py, qx, qy), ptSeg(bx, by, px, py, qx, qy));
}
const pathBlocked = (x, y, tx, ty, radius, skip) => obstacles.find((o) => o !== skip && segSegDist(x, y, tx, ty, o.ax, o.ay, o.bx, o.by) < o.r + radius);

// 우회 지점 (2026-10-14: 긴 울타리 끝과 끝에 마주 서면 살짝 비켜 가기로는 못 빠져나옴 - 봇 보고서로 발견)
//   (x, y) → (tx, ty) 길을 구조물이 막으면, 그 구조물 모서리 바깥(반지름 + radius + pad) 중 돌아가는 길이 가장 짧고 거기까지는 막히지 않은 점. 안 막히면 null
export function detourPoint(x, y, tx, ty, radius, pad = 18) {
  const o = pathBlocked(x, y, tx, ty, radius);
  if (!o) return null;
  const off = o.r + radius + pad;
  const ax = o.bx - o.ax, ay = o.by - o.ay, l = Math.hypot(ax, ay);
  let ux, uy; // 구조물 축 (원이면 길에 수직인 방향을 축처럼)
  if (l > 0.001) { ux = ax / l; uy = ay / l; } else { const dl = Math.hypot(tx - x, ty - y) || 1; ux = -(ty - y) / dl; uy = (tx - x) / dl; }
  const vx = -uy, vy = ux;
  const ends = l > 0.001 ? [[o.ax - ux * off, o.ay - uy * off], [o.bx + ux * off, o.by + uy * off]] : [[o.ax + ux * off, o.ay + uy * off], [o.ax - ux * off, o.ay - uy * off]];
  const cands = [];
  // 울타리는 끝의 옆 모서리만 (끝의 연장선 위는 길이 축과 같아서 소용없음), 원은 길에 수직인 양옆
  ends.forEach(([ex, ey]) => { if (l > 0.001) cands.push([ex + vx * off, ey + vy * off], [ex - vx * off, ey - vy * off]); else cands.push([ex, ey]); });
  let best = null;
  cands.forEach(([cx, cy]) => {
    if (cx < PEN.x || cy < PEN.y || cx > PEN.x + PEN.size || cy > PEN.y + PEN.size) return;
    if (Math.hypot(cx - x, cy - y) < 10) return; // 이미 거기 - 다음 후보
    if (pathBlocked(x, y, cx, cy, radius * 0.9)) return;
    const cost = Math.hypot(cx - x, cy - y) + Math.hypot(tx - cx, ty - cy);
    if (!best || cost < best.cost) best = { x: cx, y: cy, cost };
  });
  return best;
}
