// 영혼 몬스터 그림 (버닝 소울·창백한 원혼 - 2026-10-11 사용자 참고 그림: 어두운 작은 몸 위로 일렁이며 솟는 불꽃 줄기 + 은은한 빛)
//   소 그림과 같은 좌표계(발 = 0, 몸 가운데 (0,-40) 근처): 몸은 떠 있음(그림자만 땅에). 몬스터가 많아도 되게 그라데이션 없이 반투명 원·선만, 난수 없음(시간·개체 위상)
//   색은 data/monsters.js SOUL_PALETTES (몬스터의 soul 값으로 고름)
import { SOUL_PALETTES } from '../data/monsters.js';

export function drawSoul(ctx, x, y, scale, animT, facing = 1, kind = 'fire', flash = false, alpha = 1) {
  const P = SOUL_PALETTES[kind] || SOUL_PALETTES.fire;
  const float = Math.sin(animT * 2.6) * 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  ctx.globalAlpha = 0.35 * alpha; // 땅의 그림자 (몸은 떠 있음)
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 2, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -8 + float);

  // 은은한 빛 (겹친 반투명 원)
  [[46, 0.10], [32, 0.14], [20, 0.18]].forEach(([r, a]) => {
    ctx.globalAlpha = a * alpha * (0.85 + Math.sin(animT * 5) * 0.15);
    ctx.fillStyle = P.glow;
    ctx.beginPath(); ctx.arc(0, -46, r, 0, Math.PI * 2); ctx.fill();
  });

  // 불꽃 줄기: 몸에서 위로 솟으며 바깥으로 휘고 일렁임 (바깥 진한 색 → 안쪽 밝은 색 두 겹)
  const strands = 7;
  ctx.lineCap = 'round';
  for (let i = 0; i < strands; i++) {
    const u = i / (strands - 1) - 0.5;           // -0.5 ~ 0.5 (왼쪽 → 오른쪽)
    const ph = animT * (3 + (i % 3)) + i * 1.7;
    const baseX = u * 14, baseY = -40;
    const topX = u * 46 + Math.sin(ph) * 6, topY = -82 - (1 - Math.abs(u) * 1.4) * 14 + Math.cos(ph * 0.8) * 4;
    const midX = u * 24 + Math.sin(ph + 1.3) * 8, midY = (baseY + topY) / 2;
    const path = () => { ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.quadraticCurveTo(midX, midY, topX, topY); };
    ctx.globalAlpha = 0.55 * alpha; ctx.strokeStyle = P.outer; ctx.lineWidth = 5.5; path(); ctx.stroke();
    ctx.globalAlpha = 0.85 * alpha; ctx.strokeStyle = flash ? '#ffffff' : P.inner; ctx.lineWidth = 2.6; path(); ctx.stroke();
    ctx.globalAlpha = 0.9 * alpha; ctx.fillStyle = P.tip; // 끝 불씨
    ctx.beginPath(); ctx.arc(topX, topY, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // 몸: 아래로 흐르는 꼬리(물방울) + 밝은 테두리, 작은 어두운 머리
  const sway = Math.sin(animT * 3.4) * 3;
  ctx.globalAlpha = 0.9 * alpha;
  ctx.fillStyle = flash ? '#ffffff' : P.inner;
  ctx.beginPath(); ctx.moveTo(-8, -44); ctx.quadraticCurveTo(-10, -26, sway, -14); ctx.quadraticCurveTo(10, -26, 8, -44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = P.core;
  ctx.beginPath(); ctx.moveTo(-5, -44); ctx.quadraticCurveTo(-6, -30, sway * 0.6, -20); ctx.quadraticCurveTo(6, -30, 5, -44); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -50, 6.5, 0, Math.PI * 2); ctx.fill();          // 머리
  ctx.globalAlpha = (0.7 + Math.sin(animT * 6) * 0.3) * alpha;
  ctx.fillStyle = P.eye;
  ctx.beginPath(); ctx.arc(-2.2, -51, 1.2, 0, Math.PI * 2); ctx.arc(2.2, -51, 1.2, 0, Math.PI * 2); ctx.fill(); // 눈빛
  ctx.restore();
}
