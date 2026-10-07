// 마법사가 무기를 안 들었을 때 손에 드는 지팡이 (heroSprites.drawFloatingHandAndBlade에서 heldKind 'staff')
// 손 위치(x, y)에서 angle 방향으로, 끝에 빛나는 구슬. 난수 없음
export function drawHeroStaff(ctx, x, y, angle, r, alpha = 1, t = 0) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#6b4a2e';
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - ca * r * 0.7, y - sa * r * 0.7);
  ctx.lineTo(x + ca * r * 1.5, y + sa * r * 1.5);
  ctx.stroke();
  const ox = x + ca * r * 1.68, oy = y + sa * r * 1.68;
  const pulse = 1 + Math.sin(t * 5) * 0.12;
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#7fd4ff';
  ctx.beginPath(); ctx.arc(ox, oy, r * 0.42 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#4d9bff';
  ctx.beginPath(); ctx.arc(ox, oy, r * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8f7ff';
  ctx.beginPath(); ctx.arc(ox - r * 0.07, oy - r * 0.07, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
