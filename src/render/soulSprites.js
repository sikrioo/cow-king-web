// 영혼 몬스터 그림 (버닝 소울·창백한 원혼 - 2026-10-11 사용자 참고 그림): 바닥에서 위로 곧게 솟는 불꽃 혀 여러 가닥이 모인 기둥
//   + 바닥의 작은 소용돌이 빛. 높이가 서로 다르고 위쪽 끝이 일렁임 (예전 '머리 + 퍼지는 줄기'는 뒤집힌 오징어 같다는 피드백으로 바꿈)
//   소 그림과 같은 좌표계(발 = 0, 위가 -). 몬스터가 많아도 되게 그라데이션 없이 반투명 도형만, 난수 없음(시간·개체 위상)
//   색은 data/monsters.js SOUL_PALETTES (몬스터의 soul 값으로 고름)
import { SOUL_PALETTES } from '../data/monsters.js';

// 불꽃 혀 하나: 아래가 넓고 위로 갈수록 가늘어지며 끝이 옆으로 휨
function tongue(ctx, x, w, h, sway) {
  ctx.beginPath();
  ctx.moveTo(x - w, 0);
  ctx.bezierCurveTo(x - w * 0.9, -h * 0.45, x + sway * 0.4 - w * 0.35, -h * 0.75, x + sway, -h);
  ctx.bezierCurveTo(x + sway * 0.4 + w * 0.35, -h * 0.75, x + w * 0.9, -h * 0.45, x + w, 0);
  ctx.closePath();
}

// 가닥: [가운데에서의 x, 폭, 높이] - 뒤(낮고 넓게) → 앞 순서
const STRANDS = [[-11, 6, 62], [10, 6, 70], [-4, 7, 92], [5, 6, 80], [-14, 4, 50], [14, 4, 56], [0, 5, 100]];

// bright: 번개를 모으는 중이면 1 (더 밝고 크게 일렁임)
export function drawSoul(ctx, x, y, scale, animT, facing = 1, kind = 'fire', flash = false, bright = 0) {
  const P = SOUL_PALETTES[kind] || SOUL_PALETTES.fire;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);

  // 바닥 소용돌이 빛 (도는 고리 + 옅은 원)
  ctx.globalAlpha = 0.25 + bright * 0.2;
  ctx.fillStyle = P.base;
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = P.base;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 5.5, 0, animT * 3, animT * 3 + Math.PI * 1.3); ctx.stroke();

  // 은은한 빛 기둥 (겹친 반투명 타원)
  ctx.globalAlpha = 0.10 + bright * 0.12;
  ctx.fillStyle = P.glow;
  ctx.beginPath(); ctx.ellipse(0, -48, 26, 56, 0, 0, Math.PI * 2); ctx.fill();

  // 불꽃 혀들: 바깥(진한 색, 반투명) → 안쪽(밝은 색, 좁게) 두 겹, 높이가 깜빡이며 끝이 일렁임
  const wob = 1 + bright * 0.6;
  STRANDS.forEach(([sx, w, h], i) => {
    const ph = animT * (4.2 + (i % 3) * 0.9) + i * 2.1;
    const hh = h * (0.9 + Math.sin(ph) * 0.08 * wob + bright * 0.08);
    const sway = Math.sin(ph * 0.7 + i) * 7 * wob;
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = flash ? '#ffffff' : P.outer;
    tongue(ctx, sx, w, hh, sway); ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = flash ? '#ffffff' : P.inner;
    tongue(ctx, sx + sway * 0.1, w * 0.45, hh * 0.85, sway * 0.85); ctx.fill();
  });
  // 가운데 밝은 심지
  ctx.globalAlpha = 0.5 + bright * 0.4;
  ctx.fillStyle = P.tip;
  tongue(ctx, 0, 2.2, 60 + Math.sin(animT * 6) * 4, Math.sin(animT * 3) * 3); ctx.fill();
  ctx.restore();
}
