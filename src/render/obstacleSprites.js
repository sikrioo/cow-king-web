// 구조물 그림 (2026-10-14 사용자: 어설프지 않게): 1막 목장 - 둥근 건초더미(세워 둔 원통), 나무 울타리 한 토막(가로)
//   발 위치(o.ay) 순서로 몬스터·주인공과 같이 그림(renderer). 주인공이 뒤에 가려지면 반투명. 짚·나뭇결은 hash01(결정적) - 게임 난수 안 씀
import { OBSTACLES, OBSTACLE_FADE_ALPHA } from '../data/obstacles.js';
import { hash01 } from '../util.js';

const HAY = { base: '#a08a52', light: '#b8a066', shade: '#5e4e2c', straw: '#cdb67a', loose: '#9c8650' }; // 칙칙한 짚 색 (풀밭에서 덜 튐)
const WOOD = { post: '#6b4a2e', cap: '#8f6844', rail: '#9a7448', railTop: '#bf9666', railLow: '#5e4228', knot: '#5a3e24' };

// 주인공이 이 구조물 뒤에(그림에 가려지는 자리) 있는지
function hides(o, hero, def) {
  if (!hero) return false;
  return hero.y < o.ay && hero.y > o.ay - def.height - 14 && hero.x > o.ax - o.r - 14 && hero.x < o.bx + o.r + 14;
}

function shadow(ctx, cx, cy, rx, ry) {
  ctx.globalAlpha *= 0.26;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.26;
}

// 건초더미 (2026-10-14 사용자: 튀고 통나무 같음 → 낮고 넓은 짚더미): 둥근 봉우리 실루엣 + 테두리에 삐죽한 짚 + 결 몇 가닥, 칙칙한 짚 색
function haySilhouette(ctx, x, y, w, H, seed, inset = 0) {
  ctx.beginPath();
  ctx.moveTo(x - w + inset, y);
  const n = 16;
  for (let i = 0; i <= n; i++) { // 봉우리 둘레를 따라 들쭉날쭉 (짚 끝)
    const a = Math.PI - (i / n) * Math.PI;
    const jag = i % 2 ? (2 + hash01(seed, i, 31) * 4) : 0;
    ctx.lineTo(x + Math.cos(a) * (w - inset + jag * 0.5), y - Math.sin(a) * (H - inset + jag));
  }
  ctx.quadraticCurveTo(x, y + 6, x - w + inset, y);
  ctx.closePath();
}
function drawHay(ctx, o, def) {
  const x = o.ax, y = o.ay, w = o.r * 1.25, H = def.height;
  shadow(ctx, x + 5, y + 2, w * 1.1, w * 0.36);
  ctx.fillStyle = HAY.base; haySilhouette(ctx, x, y, w, H, o.seed); ctx.fill();
  ctx.fillStyle = HAY.light; haySilhouette(ctx, x - w * 0.12, y - H * 0.08, w * 0.78, H * 0.88, o.seed + 7, 2); ctx.fill(); // 위쪽 밝은 덩어리
  ctx.save(); // 오른쪽 아래 그늘
  haySilhouette(ctx, x, y, w, H, o.seed); ctx.clip();
  ctx.globalAlpha *= 0.3; ctx.fillStyle = HAY.shade;
  ctx.beginPath(); ctx.ellipse(x + w * 0.55, y - H * 0.15, w * 0.7, H * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = HAY.straw; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; // 짚 결 (봉우리를 따라 비스듬히)
  for (let i = 0; i < 9; i++) {
    const t = 0.15 + hash01(o.seed, i, 32) * 0.7, a = Math.PI - t * Math.PI, rr = 0.35 + hash01(o.seed, i, 33) * 0.5;
    const px = x + Math.cos(a) * w * rr, py = y - Math.sin(a) * H * rr - 2, len = 5 + hash01(o.seed, i, 34) * 6;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a - 1.2) * len, py - Math.sin(a - 1.2) * len * 0.6); ctx.stroke();
  }
  ctx.strokeStyle = HAY.loose; // 바닥에 흩어진 짚 몇 가닥
  for (let i = 0; i < 4; i++) {
    const px = x + (hash01(o.seed, i, 35) - 0.5) * w * 2.2, py = y + 2 + hash01(o.seed, i, 36) * 5, ang = hash01(o.seed, i, 37) * 3;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang) * 7, py + Math.sin(ang) * 2); ctx.stroke();
  }
}

// 울타리: 기둥(끝과 약 70px마다) + 가로대 두 줄
function drawFence(ctx, o, def) {
  const y = o.ay, H = def.height, len = o.bx - o.ax;
  ctx.globalAlpha *= 0.22; // 그림자 (발밑 띠)
  ctx.fillStyle = '#000';
  ctx.fillRect(o.ax - 2, y - 1, len + 8, 7);
  ctx.globalAlpha /= 0.22;
  const n = Math.max(2, Math.round(len / 70) + 1);
  const posts = Array.from({ length: n }, (_, i) => o.ax + (len * i) / (n - 1));
  [H * 0.72, H * 0.36].forEach((h, ri) => { // 가로대
    const ty = y - h, tilt = (hash01(o.seed, ri, 21) - 0.5) * 3;
    ctx.fillStyle = WOOD.rail;
    ctx.beginPath(); ctx.moveTo(o.ax - 4, ty - 3); ctx.lineTo(o.bx + 4, ty - 3 + tilt); ctx.lineTo(o.bx + 4, ty + 4 + tilt); ctx.lineTo(o.ax - 4, ty + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = WOOD.railTop;
    ctx.fillRect(o.ax - 4, ty - 3, len + 8, 1.6);
    ctx.fillStyle = WOOD.railLow;
    ctx.fillRect(o.ax - 4, ty + 3, len + 8, 1.2);
    ctx.fillStyle = WOOD.knot; // 옹이
    ctx.beginPath(); ctx.arc(o.ax + len * (0.2 + hash01(o.seed, ri, 22) * 0.6), ty + 0.5, 1.4, 0, Math.PI * 2); ctx.fill();
  });
  posts.forEach((px, i) => { // 기둥
    const ph = H + 4 + hash01(o.seed, i, 23) * 4;
    ctx.fillStyle = WOOD.post;
    ctx.fillRect(px - 4, y - ph, 8, ph + 2);
    ctx.fillStyle = WOOD.cap;
    ctx.fillRect(px - 4, y - ph, 8, 3);
    ctx.fillStyle = WOOD.railLow;
    ctx.fillRect(px + 2, y - ph + 3, 2, ph - 1);
  });
}

const DRAW = { hay: drawHay, fence: drawFence };

export function drawObstacle(ctx, o, hero) {
  const def = OBSTACLES[o.kind];
  ctx.save();
  if (hides(o, hero, def)) ctx.globalAlpha = OBSTACLE_FADE_ALPHA;
  DRAW[o.kind](ctx, o, def);
  ctx.restore();
}
