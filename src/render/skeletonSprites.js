// 해골 카우 그림 (관리자 전용 몬스터 - 2026-10-10 사용자: "흰 소가 아니라 앙상하고 속이 빈 해골, 네모여도 됨")
//   소 그림과 같은 좌표계(발 = 0, 위가 -): 네모난 소 두개골(뿔·눈구멍·콧구멍·이빨) → 목뼈 → 선으로만 그린 갈비뼈(속이 비어 바닥이 보임) → 골반 → 뼈다리
//   킹: 갈비뼈 뒤로 보라 망토 + 금관 + 더 밝은 눈빛. 상태는 읽기만, 흔들림·빛은 시간으로만(난수 없음)
import { PALETTE } from '../data/palette.js';
import { drawMonsterWeapon } from './monsterWeapons.js';

const BONE = '#e8e2d0', BONE_DARK = '#9c937c', OUTLINE = '#4a4538', HOLE = '#141210';

// stunFn: 기절 별 그림(monsterSprites.drawStunDots - 순환 import를 피하려고 넘겨받음)
export function drawSkeletonCow(ctx, x, y, scale, state, animT, facing = 1, stateElapsed = 0, opts = {}) {
  const { king = false, flash = false, weapon = 'club', stunFn = null } = opts;
  const walk = state === 'walk';
  const bob = walk ? Math.abs(Math.sin(animT * 8)) * 6 : state === 'idle' ? Math.abs(Math.sin(animT * 2.2)) * 1.5 : 0;
  const shake = state === 'stunned' ? Math.sin(animT * 45) * 3 : 0;
  const poke = state === 'attack' ? Math.sin(Math.min(stateElapsed * 10, Math.PI)) : 0;
  const rattle = Math.sin(animT * 11) * (walk ? 1.2 : 0.4); // 뼈가 달그락
  const bone = flash ? '#ffffff' : BONE;

  ctx.save();
  ctx.translate(x + shake, y);
  ctx.scale(scale * facing, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = PALETTE.shadow; // 그림자 (몸이 떠도 땅에)
  ctx.beginPath(); ctx.ellipse(0, 2, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -bob);

  // 다리뼈 (걸으면 번갈아)
  const step = walk ? Math.sin(animT * 8) * 4 : 0;
  [[-7, step], [7, -step]].forEach(([lx, s]) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(lx, -12); ctx.lineTo(lx + s * 0.4, -6); ctx.lineTo(lx + s, bob); ctx.stroke();
    ctx.strokeStyle = bone; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, -12); ctx.lineTo(lx + s * 0.4, -6); ctx.lineTo(lx + s, bob); ctx.stroke();
    ctx.fillStyle = bone; // 무릎 마디
    ctx.beginPath(); ctx.arc(lx + s * 0.4, -6, 2.4, 0, Math.PI * 2); ctx.fill();
  });

  if (king) { // 망토: 갈비뼈 뒤로 비침 (속이 비어서 망토가 보임)
    ctx.fillStyle = 'rgba(70,30,95,0.9)';
    ctx.beginPath();
    ctx.moveTo(-20, -44); ctx.lineTo(20, -44); ctx.lineTo(26, -6 + rattle); ctx.lineTo(10, -2); ctx.lineTo(0, -7); ctx.lineTo(-10, -2); ctx.lineTo(-26, -6 - rattle);
    ctx.closePath(); ctx.fill();
  }

  drawMonsterWeapon(ctx, weapon, 18 + poke * 16, -34, poke, animT);

  // 골반 (네모난 뼈)
  ctx.fillStyle = bone; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(-10, -15, 20, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = HOLE;
  ctx.beginPath(); ctx.arc(-4, -12.5, 1.4, 0, Math.PI * 2); ctx.arc(4, -12.5, 1.4, 0, Math.PI * 2); ctx.fill();

  // 등뼈 (마디마디)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(0, -15); ctx.stroke();
  ctx.fillStyle = bone;
  for (let i = 0; i < 6; i++) { const vy = -43 + i * 5; ctx.fillRect(-2.5, vy, 5, 3.4); }

  // 갈비뼈: 선만 (안이 비어 보임) - 좌우 4쌍, 아래로 갈수록 짧게
  for (let i = 0; i < 4; i++) {
    const ry = -40 + i * 6, w = 17 - i * 2.5 + (i % 2 ? rattle * 0.4 : -rattle * 0.4);
    [-1, 1].forEach((sd) => {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(sd * w, ry - 3, sd * (w - 2), ry + 7); ctx.stroke();
      ctx.strokeStyle = i === 3 ? BONE_DARK : bone; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(sd * w, ry - 3, sd * (w - 2), ry + 7); ctx.stroke();
    });
  }

  // 두개골 (네모 - 위가 넓은 이마, 아래로 좁아지는 주둥이), 몸보다 살짝 앞으로 숙임
  ctx.save();
  ctx.translate(0, rattle * 0.3);
  // 뿔 (뼈 색, 소 뿔 모양)
  [-1, 1].forEach((sd) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sd * 14, -66); ctx.quadraticCurveTo(sd * 30, -70, sd * 30, -86); ctx.quadraticCurveTo(sd * 30, -94, sd * 20, -96); ctx.stroke();
    ctx.strokeStyle = BONE_DARK; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(sd * 14, -66); ctx.quadraticCurveTo(sd * 30, -70, sd * 30, -86); ctx.quadraticCurveTo(sd * 30, -94, sd * 20, -96); ctx.stroke();
  });
  ctx.fillStyle = bone; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-17, -72); ctx.lineTo(17, -72);   // 이마
  ctx.lineTo(18, -58); ctx.lineTo(10, -50);    // 광대 → 주둥이
  ctx.lineTo(9, -40); ctx.lineTo(-9, -40);
  ctx.lineTo(-10, -50); ctx.lineTo(-18, -58);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = HOLE; // 눈구멍 (크게 퀭하게, 네모에 가깝게)
  ctx.beginPath(); ctx.moveTo(-14, -64); ctx.lineTo(-4, -63); ctx.lineTo(-5, -55); ctx.lineTo(-12, -56); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -64); ctx.lineTo(4, -63); ctx.lineTo(5, -55); ctx.lineTo(12, -56); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3, -49); ctx.lineTo(-1, -45); ctx.lineTo(-4, -45); ctx.closePath(); ctx.fill(); // 콧구멍
  ctx.beginPath(); ctx.moveTo(3, -49); ctx.lineTo(1, -45); ctx.lineTo(4, -45); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; // 이빨
  for (let i = -6; i <= 6; i += 3) { ctx.beginPath(); ctx.moveTo(i, -43); ctx.lineTo(i, -40); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-3, -72); ctx.lineTo(-1, -68); ctx.lineTo(-4, -66); ctx.stroke(); // 이마 금
  const glow = (king ? 0.8 : 0.6) + Math.sin(animT * 5) * 0.25; // 눈빛
  ctx.globalAlpha = Math.max(0, Math.min(1, glow));
  ctx.fillStyle = '#7fffd4';
  ctx.beginPath(); ctx.arc(-8.5, -59.5, king ? 2.6 : 2, 0, Math.PI * 2); ctx.arc(8.5, -59.5, king ? 2.6 : 2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  if (king) { // 금관
    ctx.fillStyle = '#e8c547'; ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-15, -72); ctx.lineTo(-15, -82); ctx.lineTo(-8, -76); ctx.lineTo(-3, -86); ctx.lineTo(3, -76); ctx.lineTo(8, -86); ctx.lineTo(15, -78); ctx.lineTo(15, -72); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7fffd4';
    ctx.beginPath(); ctx.arc(0, -76, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  if (state === 'stunned' && stunFn) stunFn(ctx, animT);
  ctx.restore();
}
