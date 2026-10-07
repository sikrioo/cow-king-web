// 얼음 이펙트 그림: 서리 노바(퍼지는 얼음 가시 고리), 얼음 보주(거친 결정), 얼음 조각
// 단색 도형만(그라데이션/filter 없음), 모양의 들쭉날쭉함은 hash01(결정적) - 게임 난수 안 씀
import { game } from '../state.js';
import { hash01, easeOutCubic } from '../util.js';

const ICE_LIGHT = '#e8f7ff';
const ICE_MID = '#bfeaff';
const ICE_DEEP = '#7fd4ff';

// 서리 노바: 바깥으로 퍼지며 바닥에 서리가 깔리고, 가장자리에 바깥을 향한 얼음 가시가 돋음
export function drawIceRings(ctx) {
  game.iceRings.forEach((g, gi) => {
    const p = Math.min(1, g.age / g.duration);
    const r = g.maxRadius * easeOutCubic(Math.min(1, p * 1.6)); // 빨리 퍼지고 잠깐 머묾
    const fade = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    ctx.save();
    // 바닥 서리
    ctx.globalAlpha = 0.16 * fade;
    ctx.fillStyle = ICE_MID;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = ICE_LIGHT;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    // 가장자리 얼음 가시 (바깥을 향한 뾰족한 결정, 길이·폭 들쭉날쭉)
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash01(gi, i, 1) * 0.12;
      const len = (10 + hash01(g.seed, i, 2) * 16) * (0.6 + 0.4 * fade);
      const w = 3 + hash01(g.seed, i, 3) * 3;
      const ca = Math.cos(a), sa = Math.sin(a) * 0.62; // 바닥 원근(타원)
      const bx = g.x + ca * r, by = g.y + sa * r;
      const nx = -sa, ny = ca; // 가시 밑동 폭 방향
      const nl = Math.hypot(nx, ny) || 1;
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = i % 3 === 0 ? ICE_DEEP : ICE_MID;
      ctx.beginPath();
      ctx.moveTo(bx + (nx / nl) * w, by + (ny / nl) * w);
      ctx.lineTo(bx + ca * len, by + sa * len - len * 0.35); // 살짝 위로 솟음
      ctx.lineTo(bx - (nx / nl) * w, by - (ny / nl) * w);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = ICE_LIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + ca * len * 0.8, by + sa * len * 0.8 - len * 0.28);
      ctx.stroke();
    }
    ctx.restore();
  });
}

// 얼음 보주: 들쭉날쭉한 결정 덩어리가 돌면서 날아가고, 뒤로 서리 가루가 날림
export function drawOrb(ctx, p, t) {
  ctx.save();
  // 뒤로 흩날리는 서리 가루 (위치는 이동 거리로 정해짐)
  ctx.fillStyle = ICE_LIGHT;
  for (let k = 1; k <= 5; k++) {
    const back = k * 9;
    const side = (hash01(Math.floor(p.traveled / 9) + k, k, 7) - 0.5) * 14;
    ctx.globalAlpha = 0.5 - k * 0.08;
    ctx.fillRect(p.x - p.dirX * back - p.dirY * side - 1.5, p.y - p.dirY * back + p.dirX * side - 1.5, 3, 3);
  }
  // 차가운 기운
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = ICE_DEEP;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.7, 0, Math.PI * 2); ctx.fill();
  // 결정 덩어리: 꼭짓점 10개, 반지름이 들쭉날쭉 → 거친 얼음
  ctx.translate(p.x, p.y);
  ctx.rotate(t * 3);
  const pts = 10;
  ctx.globalAlpha = 1;
  ctx.fillStyle = ICE_MID;
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = p.radius * (i % 2 === 0 ? 1.25 + hash01(i, 3, 5) * 0.35 : 0.7 + hash01(i, 4, 5) * 0.15);
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ICE_DEEP;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 결정 면(안쪽 금)
  ctx.strokeStyle = ICE_LIGHT;
  ctx.beginPath();
  for (let i = 0; i < pts; i += 2) {
    const a = (i / pts) * Math.PI * 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * p.radius * 1.1, Math.sin(a) * p.radius * 1.1);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-p.radius * 0.25, -p.radius * 0.25, p.radius * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 얼음 조각: 진행 방향으로 길쭉한 결정 (길이는 조각마다 조금씩 다름) + 밝은 결
export function drawShard(ctx, p, i) {
  const len = 9 + hash01(i, Math.floor(p.dirX * 100), 9) * 5;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(p.dirY, p.dirX));
  ctx.fillStyle = ICE_MID;
  ctx.beginPath();
  ctx.moveTo(len, 0); ctx.lineTo(1, 3.2); ctx.lineTo(-len * 0.6, 0); ctx.lineTo(1, -3.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ICE_LIGHT;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-len * 0.4, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
  ctx.restore();
}
