// 해골 카우 그림 (관리자 전용 몬스터 - 2026-10-10 사용자: 기존 카우 형태 그대로 단순하게, 앙상하고 속이 빈 해골 느낌, 네모여도 됨)
//   소 그림과 같은 좌표계·크기(몸 = 가운데 (0,-40) 반지름 30쯤): 둥근 몸 대신 모서리가 둥근 네모 해골 + 뼈 뿔 + 퀭한 눈구멍(초록 눈빛)
//   + 콧구멍 자리(코 대신 구멍) + 움푹 파인 볼 + 이빨 + 금. 킹은 금관 + 더 밝은 눈빛. 상태는 읽기만, 빛·흔들림은 시간으로만(난수 없음)
import { PALETTE } from '../data/palette.js';
import { drawMonsterWeapon } from './monsterWeapons.js';

const BONE = '#e8e2d0', BONE_SHADE = '#c9c1aa', OUTLINE = '#5a5446', HOLE = '#141210';

// stunFn: 기절 별 그림(monsterSprites.drawStunDots - 순환 import를 피하려고 넘겨받음)
export function drawSkeletonCow(ctx, x, y, scale, state, animT, facing = 1, stateElapsed = 0, opts = {}) {
  const { king = false, flash = false, weapon = 'club', stunFn = null } = opts;
  const bob = state === 'walk' ? Math.abs(Math.sin(animT * 8)) * 8 : state === 'idle' ? Math.abs(Math.sin(animT * 2.2)) * 2 : 0;
  const shake = state === 'stunned' ? Math.sin(animT * 45) * 3 : 0;
  const poke = state === 'attack' ? Math.sin(Math.min(stateElapsed * 10, Math.PI)) : 0;
  const jaw = state === 'attack' ? poke * 3 : Math.abs(Math.sin(animT * 6)) * (state === 'walk' ? 1.5 : 0.5); // 턱이 달그락

  ctx.save();
  ctx.translate(x + shake, y - bob);
  ctx.scale(scale * facing, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath(); ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

  drawMonsterWeapon(ctx, weapon, 18 + poke * 16, -38, poke, animT);

  // 뼈 뿔 (소 뿔 모양, 뼈 색 + 테두리)
  [-1, 1].forEach((sd) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(sd * 16, -58); ctx.quadraticCurveTo(sd * 33, -64, sd * 33, -82); ctx.quadraticCurveTo(sd * 33, -92, sd * 20, -95); ctx.stroke();
    ctx.strokeStyle = BONE_SHADE; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(sd * 16, -58); ctx.quadraticCurveTo(sd * 33, -64, sd * 33, -82); ctx.quadraticCurveTo(sd * 33, -92, sd * 20, -95); ctx.stroke();
  });

  // 해골 (모서리가 둥근 네모 - 위는 넓고 아래 주둥이로 조금 좁아짐)
  ctx.fillStyle = flash ? '#ffffff' : BONE;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-22, -68);
  ctx.quadraticCurveTo(-27, -68, -27, -62);
  ctx.lineTo(-25, -38);
  ctx.quadraticCurveTo(-24, -30, -16, -26);
  ctx.lineTo(-14, -16);
  ctx.quadraticCurveTo(0, -11, 14, -16);
  ctx.lineTo(16, -26);
  ctx.quadraticCurveTo(24, -30, 25, -38);
  ctx.lineTo(27, -62);
  ctx.quadraticCurveTo(27, -68, 22, -68);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 움푹 파인 볼 (양옆 어두운 홈 - 앙상한 느낌)
  ctx.fillStyle = 'rgba(60,54,42,0.45)';
  [-1, 1].forEach((sd) => {
    ctx.beginPath(); ctx.moveTo(sd * 24, -40); ctx.quadraticCurveTo(sd * 15, -34, sd * 16, -26); ctx.quadraticCurveTo(sd * 21, -31, sd * 24, -40); ctx.fill();
  });

  // 퀭한 눈구멍 (크고 각진) + 초록 눈빛
  ctx.fillStyle = HOLE;
  [-1, 1].forEach((sd) => {
    ctx.beginPath(); ctx.moveTo(sd * 20, -56); ctx.lineTo(sd * 6, -55); ctx.lineTo(sd * 7, -43); ctx.lineTo(sd * 18, -44); ctx.closePath(); ctx.fill();
  });
  const glow = (king ? 0.8 : 0.6) + Math.sin(animT * 5) * 0.25;
  ctx.globalAlpha = Math.max(0, Math.min(1, glow));
  ctx.fillStyle = '#7fffd4';
  ctx.beginPath(); ctx.arc(-12.5, -49.5, king ? 3 : 2.4, 0, Math.PI * 2); ctx.arc(12.5, -49.5, king ? 3 : 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // 콧구멍 자리 (코 대신 뒤집힌 하트 모양 구멍)
  ctx.fillStyle = HOLE;
  ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(-4.5, -30); ctx.lineTo(0, -32); ctx.lineTo(4.5, -30); ctx.closePath(); ctx.fill();

  // 이빨 (아래 턱 - 살짝 벌어졌다 닫힘)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(10, -22); ctx.stroke();
  for (let i = -8; i <= 8; i += 4) { ctx.beginPath(); ctx.moveTo(i, -22); ctx.lineTo(i, -18 + jaw * 0.5); ctx.stroke(); }

  // 금 (이마·뺨)
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-6, -68); ctx.lineTo(-3, -62); ctx.lineTo(-7, -58); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22, -60); ctx.lineTo(18, -57); ctx.stroke();

  if (king) { // 금관
    ctx.fillStyle = '#e8c547'; ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-17, -66); ctx.lineTo(-17, -78); ctx.lineTo(-9, -71); ctx.lineTo(-3, -83); ctx.lineTo(3, -71); ctx.lineTo(9, -83); ctx.lineTo(17, -75); ctx.lineTo(17, -66); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7fffd4';
    ctx.beginPath(); ctx.arc(0, -71, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  if (state === 'stunned' && stunFn) stunFn(ctx, animT);
  ctx.restore();
}
