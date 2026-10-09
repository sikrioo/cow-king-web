// 주인공이 드는 것 그림: 무기 종류별 칼날(검·도끼·메이스·단검·창·대검), 방패, 베기 궤적 - 상태 없음 (heroSprites.js가 씀)

export function drawAbstractSword(ctx, x, y, angle, r, alpha = 1, variant = 'sword') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  if (variant === 'axe') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.80, 0);
    ctx.stroke();
    ctx.fillStyle = '#c7cdd4';
    ctx.beginPath();
    ctx.moveTo(r * 0.42, -r * 0.04);
    ctx.quadraticCurveTo(r * 1.08, -r * 0.56, r * 0.98, -r * 0.02);
    ctx.quadraticCurveTo(r * 1.02, r * 0.48, r * 0.48, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else if (variant === 'mace') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.92, 0);
    ctx.stroke();
    ctx.fillStyle = '#9aa1a8';
    ctx.beginPath();
    ctx.arc(r * 1.08, 0, r * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f656b';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(r * 1.08 + Math.cos(a) * r * 0.30, Math.sin(a) * r * 0.30, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variant === 'dagger') {
    ctx.strokeStyle = '#373d46';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, 0);
    ctx.lineTo(r * 0.14, 0);
    ctx.stroke();
    ctx.strokeStyle = '#c78b34';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.13, -r * 0.11);
    ctx.lineTo(r * 0.13, r * 0.11);
    ctx.stroke();
    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.16, -r * 0.07);
    ctx.lineTo(r * 0.62, -r * 0.045);
    ctx.lineTo(r * 0.76, 0);
    ctx.lineTo(r * 0.62, r * 0.045);
    ctx.lineTo(r * 0.16, r * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (variant === 'greatsword') {
    // 대검: 긴 양손 손잡이 + 투박한 가드 + 몸보다 긴 넓은 철판 칼날 (끝이 뭉툭)
    ctx.strokeStyle = '#2f343b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(r * 0.40, 0); ctx.stroke();
    ctx.fillStyle = '#4a4f57';
    ctx.fillRect(r * 0.36, -r * 0.30, r * 0.12, r * 0.60);
    ctx.fillStyle = '#7d848d';
    ctx.strokeStyle = '#3b4047';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(r * 0.48, -r * 0.24);
    ctx.lineTo(r * 3.05, -r * 0.20);
    ctx.lineTo(r * 3.25, -r * 0.06);
    ctx.lineTo(r * 3.22, r * 0.14);
    ctx.lineTo(r * 3.00, r * 0.22);
    ctx.lineTo(r * 0.48, r * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,226,232,0.65)'; // 날 쪽 밝은 줄
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.19); ctx.lineTo(r * 3.0, -r * 0.16); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,32,36,0.45)'; // 가운데 홈
    ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.02); ctx.lineTo(r * 2.6, r * 0.02); ctx.stroke();
  } else if (variant === 'spear') {
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(r * 1.05, 0);
    ctx.stroke();
    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.98, -r * 0.09);
    ctx.lineTo(r * 1.42, 0);
    ctx.lineTo(r * 0.98, r * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // 기본값(검)
    ctx.strokeStyle = '#373d46';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.10, 0);
    ctx.lineTo(r * 0.34, 0);
    ctx.stroke();

    ctx.strokeStyle = '#c78b34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.31, -r * 0.20);
    ctx.lineTo(r * 0.31, r * 0.20);
    ctx.stroke();

    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.38, -r * 0.15);
    ctx.lineTo(r * 1.36, -r * 0.11);
    ctx.lineTo(r * 1.66, 0);
    ctx.lineTo(r * 1.36, r * 0.11);
    ctx.lineTo(r * 0.38, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// 보조손에 방패가 장착된 경우 전용 드로잉 - 칼날 대신 몸 앞을 막아선 방패 모양
export function drawHeldShield(ctx, x, y, angle, r, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 0.3); // 방패는 칼날만큼 크게 회전하지 않게 완화
  ctx.globalAlpha = alpha;
  const s = r * 1.25;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.46);
  ctx.lineTo(s * 0.34, -s * 0.30);
  ctx.lineTo(s * 0.30, s * 0.10);
  ctx.quadraticCurveTo(s * 0.24, s * 0.38, 0, s * 0.50);
  ctx.quadraticCurveTo(-s * 0.24, s * 0.38, -s * 0.30, s * 0.10);
  ctx.lineTo(-s * 0.34, -s * 0.30);
  ctx.closePath();
  ctx.fillStyle = '#8a6a44';
  ctx.fill();
  ctx.strokeStyle = '#3d2c1a';
  ctx.lineWidth = r * 0.09;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.30);
  ctx.lineTo(0, s * 0.26);
  ctx.stroke();
  ctx.fillStyle = '#d7a14c';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawAbstractSlashTrail(ctx, cx, cy, radius, angleFrom, angleTo, alpha) {
  ctx.save();
  ctx.strokeStyle = `rgba(255,230,170,${alpha})`;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.70, angleFrom, angleTo);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.55})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, angleFrom, angleTo);
  ctx.stroke();
  ctx.restore();
}
