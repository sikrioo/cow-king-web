// 지팡이 그림 (2026-10-14 사용자): 주인공(마법사 빈손·지팡이 무기) = 전투 지팡이(참고 그림 - 쇠 띠·소뿔 날·천 술), 해골 카우 킹 = 간달프 지팡이처럼 옹이진 나무 + 수정
//   간달프 지팡이(drawGnarledStaff): 구불구불 옹이진 나무 자루 + 꼭대기에서 가지 여러 갈래가 바깥으로 휘었다가 안으로 감아 쥔 빛나는 수정
//   자루 방향 +x 기준 로컬 좌표로 그림. 난수 없음 (모양은 고정, 빛만 시간에 따라 맥동)
const WOOD = { dark: '#3b2a1c', mid: '#5c4129', light: '#8a6a48' };

// len: 손에서 꼭대기 수정까지, back: 손 뒤로 나온 자루, w: 자루 두께, glow/core: 수정 빛·심 색
export function drawGnarledStaff(ctx, len, back, w, glow, core, t = 0) {
  const headX = len, wave = (x) => Math.sin(x / len * 7.0) * w * 0.35; // 자루의 완만한 굽이
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // 자루 (어두운 테두리 → 나무 → 밝은 결)
  [[w * 1.25, WOOD.dark], [w, WOOD.mid]].forEach(([lw, col]) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const x = -back + (headX * 0.82 + back) * (i / 12); i ? ctx.lineTo(x, wave(x)) : ctx.moveTo(x, wave(x)); }
    ctx.stroke();
  });
  ctx.strokeStyle = WOOD.light; ctx.lineWidth = w * 0.25;
  ctx.beginPath(); ctx.moveTo(-back * 0.6, wave(-back * 0.6) - w * 0.2); ctx.lineTo(headX * 0.6, wave(headX * 0.6) - w * 0.2); ctx.stroke();
  // 옹이 (자루 마디)
  ctx.fillStyle = WOOD.dark;
  [0.15, 0.45].forEach((p) => { const x = headX * p; ctx.beginPath(); ctx.ellipse(x, wave(x), w * 0.85, w * 0.6, 0, 0, Math.PI * 2); ctx.fill(); });
  // 수정 빛 (맥동)
  const cx = headX, pulse = 1 + Math.sin(t * 4) * 0.12, R = w * 2.0;
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, 0, R * 2.1 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.3;
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, 0, R * 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(cx - R * 0.2, -R * 0.2, R * 0.38, 0, Math.PI * 2); ctx.fill();
  // 수정을 감아 쥔 가지 4갈래: 자루 끝에서 바깥으로 휘었다가 수정 위로 감겨 들어감
  const base = headX * 0.8;
  ctx.strokeStyle = WOOD.mid; ctx.lineWidth = w * 0.7;
  [[-1, 1.15, 0.9], [1, 1.15, 0.9], [-1, 0.75, 1.35], [1, 0.75, 1.35]].forEach(([side, spread, reach]) => {
    ctx.beginPath();
    ctx.moveTo(base, wave(base));
    ctx.bezierCurveTo(cx - R * 0.6, side * R * 1.6 * spread, cx + R * 0.9 * reach, side * R * 1.5 * spread, cx + R * 0.35, side * R * 0.25);
    ctx.stroke();
  });
  ctx.strokeStyle = WOOD.dark; ctx.lineWidth = w * 0.3; // 가지 그늘
  [-1, 1].forEach((side) => {
    ctx.beginPath(); ctx.moveTo(base, wave(base) + side * w * 0.3);
    ctx.bezierCurveTo(cx - R * 0.5, side * R * 1.75, cx + R * 0.8, side * R * 1.6, cx + R * 0.3, side * R * 0.45); ctx.stroke();
  });
}

// 전투 지팡이 (2026-10-14 사용자 참고 그림): 곧은 어두운 나무 자루 + 쇠 띠 세 줄 + 바닥 쇠 마개, 머리는 쇠 덩어리 양옆으로 소뿔처럼 휜 날,
//   머리 아래 붉은 천 술과 깃털이 살랑임. len: 손에서 머리까지, back: 손 뒤 자루, w: 자루 두께
const IRON = { dark: '#2b2e33', mid: '#4a4f57', light: '#8a9098' };
export function drawWarStaff(ctx, len, back, w, t = 0) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // 자루
  ctx.strokeStyle = WOOD.dark; ctx.lineWidth = w * 1.3;
  ctx.beginPath(); ctx.moveTo(-back, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(-back, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(160,120,80,0.45)'; ctx.lineWidth = w * 0.25; // 나뭇결
  ctx.beginPath(); ctx.moveTo(-back * 0.8, -w * 0.2); ctx.lineTo(len * 0.8, -w * 0.2); ctx.stroke();
  // 쇠 띠 세 줄 + 바닥 마개
  const band = (x, bw) => { ctx.fillStyle = IRON.mid; ctx.fillRect(x - bw / 2, -w * 0.8, bw, w * 1.6); ctx.fillStyle = IRON.light; ctx.fillRect(x - bw / 2, -w * 0.8, bw, w * 0.35); };
  band(-back * 0.15, w * 1.1); band(len * 0.35, w * 0.9); band(len * 0.72, w * 1.3);
  ctx.fillStyle = IRON.dark; ctx.beginPath(); ctx.ellipse(-back, 0, w * 0.9, w * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  // 천 술과 깃털 (머리 아래에 매달려 살랑임)
  const hx = len * 0.82, sway = Math.sin(t * 3) * w * 0.6;
  ctx.fillStyle = '#9a1f24';
  ctx.beginPath(); ctx.moveTo(hx, w * 0.5); ctx.quadraticCurveTo(hx - w * 1.2 + sway, w * 3, hx - w * 2.6 + sway, w * 5.2); ctx.lineTo(hx - w * 1.4 + sway, w * 5.4); ctx.quadraticCurveTo(hx - w * 0.2, w * 3, hx + w * 0.6, w * 0.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = w * 0.35; // 깃털
  ctx.beginPath(); ctx.moveTo(hx + w * 0.3, w * 0.6); ctx.quadraticCurveTo(hx + w * 0.2 + sway, w * 3.2, hx - w * 0.6 + sway * 1.3, w * 5.8); ctx.stroke();
  // 머리: 쇠 덩어리 + 양옆 소뿔 날 (+x 쪽으로 휘어 올라감)
  ctx.fillStyle = IRON.mid; ctx.strokeStyle = IRON.dark; ctx.lineWidth = w * 0.3;
  ctx.beginPath(); ctx.rect(len * 0.88, -w * 1.1, w * 2.2, w * 2.2); ctx.fill(); ctx.stroke();
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(len * 0.9, side * w * 0.9);
    ctx.quadraticCurveTo(len * 0.86, side * w * 3.6, len * 0.9 + w * 3.6, side * w * 4.2); // 바깥 곡선 (끝이 앞으로)
    ctx.quadraticCurveTo(len * 0.9 + w * 1.2, side * w * 2.6, len * 0.9 + w * 2.2, side * w * 1.0); // 안쪽 곡선
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = IRON.light; ctx.lineWidth = w * 0.25; // 날 빛
    ctx.beginPath(); ctx.moveTo(len * 0.9 + w * 0.2, side * w * 1.4); ctx.quadraticCurveTo(len * 0.88, side * w * 3.3, len * 0.9 + w * 3.2, side * w * 3.9); ctx.stroke();
    ctx.strokeStyle = IRON.dark; ctx.lineWidth = w * 0.3;
  });
  ctx.fillStyle = IRON.light; ctx.beginPath(); ctx.arc(len * 0.9 + w * 1.1, 0, w * 0.35, 0, Math.PI * 2); ctx.fill(); // 징
}

// 주인공 지팡이: 손 위치(x, y)에서 angle 방향 (마법사 빈손 + 지팡이 무기 - heroWeapons.drawAbstractSword가 넘김)
export function drawHeroStaff(ctx, x, y, angle, r, alpha = 1, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  drawWarStaff(ctx, r * 1.8, r * 1.05, r * 0.14, t); // 주인공은 전투 지팡이 (해골 카우 킹은 drawGnarledStaff) - 세워 들면 아래 끝이 발 근처
  ctx.restore();
}
