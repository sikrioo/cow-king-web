// 바닥 무늬: 맵 데이터(data/maps.js의 ground)대로 GROUND_CHUNK px 조각마다 처음 보일 때 한 번 그려 캐시하고,
// 매 프레임은 보이는 조각만 붙임 (몬스터 40마리 이상에서도 바닥 비용은 drawImage 몇 번).
// 무늬의 "무작위"는 월드 좌표 해시(결정적) - 게임 난수(Math.random)를 쓰면 안 됨
import { CURRENT_MAP, GROUND_CHUNK } from '../data/maps.js';
import { PEN } from '../world/arena.js';
import { viewRect } from '../world/camera.js';

const cache = new Map(); // 'cx,cy' → 캔버스

// 정수 좌표 + 시드 → 0~1 (결정적)
function hash(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// 값 노이즈: 격자점 해시를 부드럽게 보간 → 큰 얼룩
function valueNoise(x, y, scale, seed) {
  const gx = x / scale, gy = y / scale;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  const sm = (t) => t * t * (3 - 2 * t);
  const u = sm(gx - ix), v = sm(gy - iy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// 위치의 지형 값 (0~1): 큰 얼룩 + 작은 얼룩
function terrainAt(g, x, y) {
  return valueNoise(x, y, g.patchScale, 1) * 0.7 + valueNoise(x, y, g.patchScale / 3.5, 2) * 0.3;
}

function buildChunk(g, cx, cy) {
  const C = GROUND_CHUNK;
  const cv = document.createElement('canvas');
  cv.width = C; cv.height = C;
  const c = cv.getContext('2d');
  const ox = cx * C, oy = cy * C;

  // 1) 바탕 + 풀 명암 얼룩 + 흙 얼룩 (칸마다 원을 찍어 가장자리를 부드럽게)
  c.fillStyle = g.base;
  c.fillRect(0, 0, C, C);
  const cell = g.cell;
  for (let y = -cell; y < C + cell; y += cell) {
    for (let x = -cell; x < C + cell; x += cell) {
      const wx = ox + x, wy = oy + y;
      const n = terrainAt(g, wx, wy);
      let color;
      if (n > g.dirtThreshold) color = n > g.dirtThreshold + 0.06 ? g.dirt : g.dirtEdge;
      else color = g.shades[Math.min(g.shades.length - 1, Math.floor(n / g.dirtThreshold * g.shades.length))];
      if (color === g.base) continue;
      c.fillStyle = color;
      c.beginPath();
      c.arc(x + cell / 2, y + cell / 2, cell * 0.78, 0, Math.PI * 2);
      c.fill();
    }
  }

  // 2) 장식: 월드 격자마다 해시로 위치/종류를 정해 조각 경계에서도 이어지게 (경계 밖 1칸까지 그려서 잘린 부분을 메움)
  g.decor.forEach((d, di) => {
    const s = d.every;
    for (let gy = Math.floor((oy - s) / s); gy <= Math.floor((oy + C + s) / s); gy++) {
      for (let gx = Math.floor((ox - s) / s); gx <= Math.floor((ox + C + s) / s); gx++) {
        if (hash(gx, gy, 10 + di) > d.chance) continue;
        const wx = gx * s + hash(gx, gy, 20 + di) * s, wy = gy * s + hash(gx, gy, 30 + di) * s;
        const onDirt = terrainAt(g, wx, wy) > g.dirtThreshold;
        if (onDirt !== !!d.onDirt) continue;
        const pick = hash(gx, gy, 40 + di);
        drawDecor(c, d, wx - ox, wy - oy, pick);
      }
    }
  });
  return cv;
}

function drawDecor(c, d, x, y, pick) {
  const color = d.colors[Math.floor(pick * d.colors.length)];
  if (d.type === 'tuft') {
    // 풀 덤불: 짧은 잎 3~5개
    c.strokeStyle = color;
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    const blades = 3 + Math.floor(pick * 3);
    c.beginPath();
    for (let i = 0; i < blades; i++) {
      const a = -Math.PI / 2 + (i - (blades - 1) / 2) * 0.38;
      const len = d.size * (0.7 + ((i * 37 + pick * 100) % 10) / 30);
      c.moveTo(x + (i - blades / 2) * 1.5, y);
      c.lineTo(x + (i - blades / 2) * 1.5 + Math.cos(a) * len, y + Math.sin(a) * len);
    }
    c.stroke();
  } else if (d.type === 'stone') {
    // 돌: 납작한 타원 + 위쪽 밝은 면
    const r = d.size * (0.6 + pick * 0.6);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.beginPath(); c.ellipse(x + 1.5, y + 2, r, r * 0.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = color;
    c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = d.light;
    c.beginPath(); c.ellipse(x - r * 0.25, y - r * 0.2, r * 0.45, r * 0.25, 0, 0, Math.PI * 2); c.fill();
  } else if (d.type === 'flower') {
    // 들꽃: 작은 점 몇 개
    c.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(x + Math.cos(i * 2.1 + pick * 6) * 3, y + Math.sin(i * 2.1 + pick * 6) * 3, d.size, 0, Math.PI * 2);
      c.fill();
    }
  } else if (d.type === 'speck') {
    // 흙 위 자갈/얼룩
    c.fillStyle = color;
    c.beginPath(); c.arc(x, y, d.size * (0.5 + pick), 0, Math.PI * 2); c.fill();
  }
}

// 목장 안쪽 바닥 (월드 좌표, 카메라 적용된 상태에서 호출)
export function drawGround(ctx) {
  const g = CURRENT_MAP.ground;
  const C = GROUND_CHUNK;
  const v = viewRect();
  const x0 = Math.max(PEN.x, v.x), y0 = Math.max(PEN.y, v.y);
  const x1 = Math.min(PEN.x + PEN.size, v.x + v.w), y1 = Math.min(PEN.y + PEN.size, v.y + v.h);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(PEN.x, PEN.y, PEN.size, PEN.size);
  ctx.clip();
  for (let cy = Math.floor((y0 - PEN.y) / C); cy <= Math.floor((y1 - PEN.y) / C); cy++) {
    for (let cx = Math.floor((x0 - PEN.x) / C); cx <= Math.floor((x1 - PEN.x) / C); cx++) {
      const key = cx + ',' + cy;
      let cv = cache.get(key);
      if (!cv) { cv = buildChunk(g, cx, cy); cache.set(key, cv); }
      ctx.drawImage(cv, PEN.x + cx * C, PEN.y + cy * C);
    }
  }
  ctx.restore();
}
