// 주인공이 드는 것 그림: 무기 종류별 칼날(검·도끼·메이스·단검·창·대검), 방패, 베기 궤적 - 상태 없음 (heroSprites.js가 씀)

export function drawAbstractSword(ctx, x, y, angle, r, alpha = 1, variant = 'sword') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  if (variant === 'axe') {
    // 도끼: 긴 나무 자루 + 끝에 자루와 직각인 넓은 날(자루 쪽은 좁고 바깥으로 갈수록 넓어짐, 바깥 날은 둥글게) + 반대편 뭉툭한 뒷머리
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.20, 0); ctx.lineTo(r * 1.30, 0); ctx.stroke();
    ctx.strokeStyle = '#4a3322'; // 손잡이에 감은 가죽
    ctx.lineWidth = 4;
    ctx.lineCap = 'butt';
    [0.02, 0.16].forEach((p) => { ctx.beginPath(); ctx.moveTo(r * p, 0); ctx.lineTo(r * (p + 0.07), 0); ctx.stroke(); });
    // 날
    ctx.fillStyle = '#c9cfd6';
    ctx.strokeStyle = '#4f565e';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.98, -r * 0.08);
    ctx.lineTo(r * 0.80, -r * 0.42);
    ctx.quadraticCurveTo(r * 1.10, -r * 0.98, r * 1.52, -r * 0.48); // 바깥 날 (둥글게 부풂)
    ctx.lineTo(r * 1.22, -r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245,248,252,0.9)'; // 날 선 부분
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.86, -r * 0.48);
    ctx.quadraticCurveTo(r * 1.11, -r * 0.90, r * 1.45, -r * 0.50);
    ctx.stroke();
    // 자루를 감싼 쇠 고리 + 반대편 뒷머리
    ctx.fillStyle = '#5f666e';
    ctx.fillRect(r * 0.96, -r * 0.12, r * 0.28, r * 0.24);
    ctx.fillStyle = '#7d848c';
    ctx.fillRect(r * 1.02, r * 0.10, r * 0.16, r * 0.16);
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
    // 창: 원래부터 긴 자루 (뒤 끝 -0.95r ~ 창끝 2.65r) - 찌를 때 늘어나지 않고 손이 앞으로 나감
    ctx.strokeStyle = '#8d623e';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, 0);
    ctx.lineTo(r * 2.15, 0);
    ctx.stroke();
    ctx.strokeStyle = '#5b3f27'; // 창끝 아래 묶은 끈
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(r * 2.0, 0); ctx.lineTo(r * 2.12, 0); ctx.stroke();
    ctx.fillStyle = '#d7dde2';
    ctx.strokeStyle = '#596068';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 2.08, -r * 0.11);
    ctx.lineTo(r * 2.65, 0);
    ctx.lineTo(r * 2.08, r * 0.11);
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

// 찌르기 잔상: 손에서 앞으로 뻗는 가늘어지는 직선 (창)
export function drawThrustTrail(ctx, hx, hy, angle, len, alpha) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255,230,170,${alpha})`;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(hx + dx * len * 0.25, hy + dy * len * 0.25); ctx.lineTo(hx + dx * len, hy + dy * len); ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(hx + dx * len * 0.35, hy + dy * len * 0.35); ctx.lineTo(hx + dx * len * 1.05, hy + dy * len * 1.05); ctx.stroke();
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
