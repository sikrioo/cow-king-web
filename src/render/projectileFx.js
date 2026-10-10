// 몬스터 투사체 그림: 뼈 창(해골 카우 킹), 화살(궁수), 지옥불 구슬(악마 저주 카우), 영혼 탄(버닝 소울·창백한 원혼) - render/fx.js drawProjectiles가 부름 (fx.js가 400줄을 넘어 나눔)

// 뼈 창 (해골 카우 킹): 진행 방향으로 긴 하얀 뼈 + 끝 마디 + 옅은 초록 꼬리
export function drawBoneSpear(ctx, p) {
  const a = Math.atan2(p.dirY, p.dirX);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#7fffd4';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-8, 0); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(12, 0); ctx.stroke();
  ctx.fillStyle = '#f4efe2';
  ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(20, 0); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(-18, -2.5, 2.5, 0, Math.PI * 2); ctx.arc(-18, 2.5, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 화살 (궁수): 가는 나무 살 + 화살촉 + 깃 (해골 궁수는 초록빛 꼬리)
export function drawArrow(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(p.dirY, p.dirX));
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = p.color || '#ffd36a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-10, 0); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke();
  ctx.fillStyle = '#c9ced6';
  ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(16, 0); ctx.lineTo(10, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p.color || '#ffd36a';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-18, -3.5); ctx.lineTo(-11, 0); ctx.lineTo(-18, 3.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// 지옥불 구슬 (악마 저주 카우): 보랏빛 불덩이 + 꼬리
export function drawHellOrb(ctx, p, t, i) {
  ctx.save();
  for (let k = 4; k >= 1; k--) {
    ctx.globalAlpha = 0.45 - k * 0.09;
    ctx.fillStyle = k > 2 ? '#5a1a8a' : '#9f3dff';
    ctx.beginPath(); ctx.arc(p.x - p.dirX * k * 7, p.y - p.dirY * k * 7, p.radius * (1 - k * 0.15), 0, Math.PI * 2); ctx.fill();
  }
  const wob = 1 + Math.sin(t * 18 + i) * 0.1;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#7a1aaa';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.1 * wob, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d98bff';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe8ff';
  ctx.beginPath(); ctx.arc(p.x + p.dirX * 2, p.y + p.dirY * 2, p.radius * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 영혼 탄: 작은 밝은 불씨 + 짧은 꼬리 (색 = 영혼 색)
export function drawSoulBolt(ctx, p) {
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(p.x - p.dirX * 8, p.y - p.dirY * 8, p.radius * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
