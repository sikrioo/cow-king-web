// 구조물 그림 (2026-10-14 사용자: 어설프지 않게): 1막 목장 - 둥근 건초더미(세워 둔 원통), 나무 울타리 한 토막(가로)
//   발 위치(o.ay) 순서로 몬스터·주인공과 같이 그림(renderer). 주인공이 뒤에 가려지면 반투명. 짚·나뭇결은 hash01(결정적) - 게임 난수 안 씀
import { OBSTACLES, OBSTACLE_FADE_ALPHA } from '../data/obstacles.js';
import { hash01 } from '../util.js';

const HAY = { top: '#e8c86c', ring: '#c9a24e', side: '#cfa048', shade: '#a87c32', straw: '#b68a3a', band: '#7a5626', bottom: '#9a7230' };
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

// 건초더미: 세워 둔 원통 - 옆면 짚 결 + 묶은 끈 두 줄, 윗면은 돌돌 말린 고리
function drawHay(ctx, o, def) {
  const x = o.ax, y = o.ay, r = o.r, H = def.height, ry = r * 0.42;
  shadow(ctx, x + 4, y + 3, r * 1.18, ry * 1.1);
  ctx.fillStyle = HAY.bottom; // 아래 둥근 면
  ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = HAY.side; // 옆면
  ctx.fillRect(x - r, y - H, r * 2, H);
  ctx.fillStyle = HAY.shade; // 오른쪽 그늘
  ctx.globalAlpha *= 0.35;
  ctx.fillRect(x + r * 0.35, y - H, r * 0.65, H);
  ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI); ctx.fill();
  ctx.globalAlpha /= 0.35;
  ctx.strokeStyle = HAY.straw; // 짚 결 (세로로 짧게)
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    const fx = (hash01(o.seed, i, 11) - 0.5) * 1.9 * r, fy = hash01(o.seed, i, 12) * (H - 8);
    const len = 6 + hash01(o.seed, i, 13) * 8, curve = Math.sqrt(Math.max(0, 1 - (fx / r) ** 2)) * ry;
    ctx.beginPath(); ctx.moveTo(x + fx, y - H + fy + curve); ctx.lineTo(x + fx + 1, y - H + fy + curve + len); ctx.stroke();
  }
  ctx.strokeStyle = HAY.band; // 묶은 끈 두 줄 (원통을 감싸는 곡선)
  ctx.lineWidth = 2;
  [0.32, 0.68].forEach((k) => { ctx.beginPath(); ctx.ellipse(x, y - H * k, r, ry, 0, 0, Math.PI); ctx.stroke(); });
  ctx.fillStyle = HAY.top; // 윗면
  ctx.beginPath(); ctx.ellipse(x, y - H, r, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = HAY.ring; // 말린 고리
  ctx.lineWidth = 1.4;
  [0.72, 0.45, 0.2].forEach((k) => { ctx.beginPath(); ctx.ellipse(x + r * 0.04, y - H, r * k, ry * k, 0, 0, Math.PI * 2); ctx.stroke(); });
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
