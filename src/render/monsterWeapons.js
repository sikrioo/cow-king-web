// 몬스터(카우)가 드는 무기 그림. 모두 같은 좌표계: 손 위치에서 +x 방향으로 뻗고, drawCow가 위치/찌르기 회전을 넣어 줌
// 새 무기: 여기 함수 하나 + WEAPON_DRAW에 등록 + data/monsters.js의 weapons 목록에 이름 추가
// (몬스터 40마리 이상이 동시에 그려지므로 그라데이션/filter 없이 단색 도형만)
import { PALETTE } from '../data/palette.js';
import { drawAbstractSword } from './heroWeapons.js';

const WOOD = '#7a5230';
const WOOD_DARK = '#4e3320';
const IRON = '#8b8f96';

function shaft(ctx, from, to, width, color = PALETTE.shaft) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from, 0);
  ctx.lineTo(to, 0);
  ctx.stroke();
}

// 헬버드 (기존 기본 무기)
export function drawHalberd(ctx) {
  shaft(ctx, -42, 58, 4);
  ctx.fillStyle = PALETTE.blade;
  ctx.beginPath();
  ctx.moveTo(66, 0);
  ctx.lineTo(48, 14);
  ctx.lineTo(38, 0);
  ctx.lineTo(48, -14);
  ctx.closePath();
  ctx.fill();
}

// 쇠스랑 (목장 농기구)
function drawPitchfork(ctx) {
  shaft(ctx, -40, 50, 3.5, WOOD);
  ctx.strokeStyle = PALETTE.blade;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(50, -10);
  ctx.lineTo(50, 10);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  [-10, 0, 10].forEach((ty) => { ctx.moveTo(50, ty); ctx.lineTo(70, ty); });
  ctx.stroke();
}

// 몽둥이 (징 박힌 나무 방망이)
function drawClub(ctx) {
  shaft(ctx, -30, 24, 5, WOOD_DARK);
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.ellipse(40, 0, 19, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.blade;
  ctx.beginPath();
  ctx.arc(32, -7, 2.2, 0, Math.PI * 2);
  ctx.arc(42, 7, 2.2, 0, Math.PI * 2);
  ctx.arc(50, -5, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

// 도끼
function drawAxe(ctx) {
  shaft(ctx, -32, 46, 4.5, WOOD);
  ctx.fillStyle = PALETTE.blade;
  ctx.beginPath();
  ctx.moveTo(36, 3);
  ctx.lineTo(36, -5);
  ctx.quadraticCurveTo(42, -24, 58, -20);
  ctx.quadraticCurveTo(52, -6, 58, 8);
  ctx.quadraticCurveTo(44, 12, 36, 3);
  ctx.closePath();
  ctx.fill();
}

// 창 (긴 자루 + 잎사귀 날)
function drawSpear(ctx) {
  shaft(ctx, -46, 60, 3);
  ctx.fillStyle = PALETTE.blade;
  ctx.beginPath();
  ctx.moveTo(78, 0);
  ctx.quadraticCurveTo(68, -8, 58, 0);
  ctx.quadraticCurveTo(68, 8, 78, 0);
  ctx.closePath();
  ctx.fill();
}

// 망치 (강화 카우/보스)
function drawHammer(ctx) {
  shaft(ctx, -32, 42, 5, WOOD_DARK);
  ctx.fillStyle = IRON;
  ctx.fillRect(36, -15, 18, 30);
  ctx.strokeStyle = PALETTE.dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(36, -15, 18, 30);
}

// 식칼 (넓적한 날)
function drawCleaver(ctx) {
  shaft(ctx, -20, 14, 5, WOOD_DARK);
  ctx.fillStyle = PALETTE.blade;
  ctx.beginPath();
  ctx.moveTo(14, -4);
  ctx.lineTo(52, -4);
  ctx.lineTo(57, 6);
  ctx.lineTo(52, 17);
  ctx.lineTo(14, 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.dark;
  ctx.beginPath();
  ctx.arc(21, 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

// 지팡이 (주술사 - 보라 구슬)
function drawStaff(ctx) {
  shaft(ctx, -40, 48, 4, WOOD);
  ctx.fillStyle = 'rgba(159,107,255,0.35)';
  ctx.beginPath();
  ctx.arc(55, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b48cff';
  ctx.beginPath();
  ctx.arc(55, 0, 7, 0, Math.PI * 2);
  ctx.fill();
}

// 횃불 (버닝 카우 - 일렁이는 불꽃)
function drawTorch(ctx, animT) {
  shaft(ctx, -26, 30, 5, WOOD_DARK);
  const f = Math.sin(animT * 14) * 2;
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.ellipse(42 + f * 0.5, 0, 13 + f, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.ellipse(40, 0, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 번개봉 (번개 카우 - 끝에 지그재그 전기)
function drawRod(ctx) {
  shaft(ctx, -38, 50, 3, '#c9c9b0');
  ctx.fillStyle = '#fff066';
  ctx.beginPath();
  ctx.arc(52, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff9b0';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(56, 0);
  ctx.lineTo(62, -6);
  ctx.lineTo(66, 2);
  ctx.lineTo(72, -4);
  ctx.stroke();
}

// 화염 지팡이 (화염술사 카우 - 끝에서 일렁이는 불꽃 구슬)
function drawFirestaff(ctx, animT) {
  shaft(ctx, -40, 46, 4, WOOD_DARK);
  const f = Math.sin(animT * 11) * 1.5;
  ctx.fillStyle = 'rgba(255,122,26,0.35)';
  ctx.beginPath();
  ctx.arc(54, 0, 13 + f, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.arc(54, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(53, -1, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

// 활 (궁수): 손에서 앞쪽으로 휜 나무 활대 + 시위 (찌르기 회전이 들면 앞을 겨눔)
function drawBow(ctx) {
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4, -22); ctx.quadraticCurveTo(22, 0, 4, 22); ctx.stroke();
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(4, -22); ctx.quadraticCurveTo(22, 0, 4, 22); ctx.stroke();
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(4, -22); ctx.lineTo(0, 0); ctx.lineTo(4, 22); ctx.stroke();
}

// 큰 무기 (보스·해골 전사): 주인공의 대검·양손 도끼 그림을 그대로 (render/heroWeapons.js)
const BIG_WEAPON_SCALE = 21;
function drawGreatsword(ctx) { drawAbstractSword(ctx, -8, 0, 0, BIG_WEAPON_SCALE, 1, 'greatsword'); }
function drawBattleAxe(ctx) { drawAbstractSword(ctx, -8, 0, 0, BIG_WEAPON_SCALE, 1, 'axe', true); } // flip: 도끼날이 휘두르는 쪽(아래) - 전엔 자기 얼굴 쪽 (사용자)
export const BIG_WEAPONS = ['greatsword', 'battleaxe', 'demonblade'];
// 큰 무기를 크게 휘두르는 각도 (해골 전사·카우킹·악마 카우킹): 평소엔 몸 옆에 칼날을 세워 듦 → 공격하면 뒤로 들어 올렸다(0~75%) 머리 위로 내리침(75~100%, 맞는 순간 hitAt) → 앞 아래
export function bigSwingAngle(attacking, elapsed, hitAt) {
  if (!attacking) return -1.75;
  const p = Math.min(1, elapsed / hitAt);
  if (p >= 1) return 0.9;
  return -1.75 - Math.sin(Math.min(1, p / 0.75) * Math.PI / 2) * 0.95 + (p > 0.75 ? (p - 0.75) / 0.25 * 3.6 : 0);
}
// 큰 무기 그리기 (손 위치 x,y, 각도 angle, 크기 배율 size)
export function drawBigWeapon(ctx, weapon, x, y, angle, size = 1, animT = 0) {
  if (weapon === 'demonblade') { drawDemonBlade(ctx, x, y, angle, BIG_WEAPON_SCALE * size, animT); return; }
  drawAbstractSword(ctx, x, y, angle, BIG_WEAPON_SCALE * size, 1, weapon === 'battleaxe' ? 'axe' : 'greatsword', weapon === 'battleaxe'); // 도끼날은 휘두르는 쪽
}

// 악마 대검 (악마 카우킹, 2026-10-11 사용자: 주워다 쓴 것 같지 않게): 검게 그을린 넓은 칼날 + 붉게 달아오른 톱니 날 + 칼날의 룬
//   + 뿔 모양 칼코등이 + 보라 보석. 좌표는 대검(heroWeapons 'greatsword')과 같이 손잡이에서 +x로 r × 3.3쯤
function drawDemonBlade(ctx, x, y, angle, r, animT = 0) {
  const glow = 0.65 + Math.sin(animT * 4) * 0.25;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a0a0c'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; // 손잡이 (가죽 감김)
  ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.38, 0); ctx.stroke();
  ctx.strokeStyle = '#5a1018'; ctx.lineWidth = r * 0.06;
  for (let i = 0; i < 4; i++) { const hx = -r * 0.4 + i * r * 0.2; ctx.beginPath(); ctx.moveTo(hx, -r * 0.09); ctx.lineTo(hx + r * 0.08, r * 0.09); ctx.stroke(); }
  // 칼날: 톱니가 난 넓은 철판, 끝은 갈고리처럼 뾰족
  const blade = () => {
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -r * 0.26);
    for (let i = 0; i < 5; i++) { const bx = r * (0.75 + i * 0.48); ctx.lineTo(bx, -r * 0.24); ctx.lineTo(bx + r * 0.18, -r * 0.36); ctx.lineTo(bx + r * 0.3, -r * 0.22); }
    ctx.lineTo(r * 3.45, -r * 0.05);
    ctx.lineTo(r * 3.1, r * 0.22);
    ctx.lineTo(r * 0.45, r * 0.26);
    ctx.closePath();
  };
  ctx.fillStyle = '#2a0f14'; blade(); ctx.fill();
  ctx.globalAlpha = 0.45 * glow; ctx.strokeStyle = '#ff2a1a'; ctx.lineWidth = r * 0.16; blade(); ctx.stroke(); // 달아오른 빛 번짐
  ctx.globalAlpha = 1; ctx.strokeStyle = '#ff5a3d'; ctx.lineWidth = r * 0.05; blade(); ctx.stroke();     // 붉은 날
  ctx.strokeStyle = '#120608'; ctx.lineWidth = r * 0.06; // 가운데 홈
  ctx.beginPath(); ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 3.0, 0.02 * r); ctx.stroke();
  ctx.globalAlpha = glow; ctx.strokeStyle = '#ff7a3d'; ctx.lineWidth = r * 0.045; // 룬 (짧은 꺾인 선)
  for (let i = 0; i < 4; i++) { const rx = r * (0.9 + i * 0.55); ctx.beginPath(); ctx.moveTo(rx, -r * 0.1); ctx.lineTo(rx + r * 0.1, r * 0.06); ctx.lineTo(rx + r * 0.2, -r * 0.08); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 뿔 모양 칼코등이 (양쪽으로 휜 검은 뿔) + 보라 보석
  ctx.fillStyle = '#14060a'; ctx.strokeStyle = '#5a1018'; ctx.lineWidth = r * 0.04;
  [-1, 1].forEach((sd) => {
    ctx.beginPath(); ctx.moveTo(r * 0.36, sd * r * 0.1); ctx.quadraticCurveTo(r * 0.3, sd * r * 0.5, r * 0.62, sd * r * 0.62); ctx.quadraticCurveTo(r * 0.44, sd * r * 0.32, r * 0.5, sd * r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = '#c04dff'; ctx.globalAlpha = 0.6 + glow * 0.4;
  ctx.beginPath(); ctx.arc(r * 0.43, 0, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export const WEAPON_DRAW = {
  bow: drawBow, greatsword: drawGreatsword, battleaxe: drawBattleAxe, demonblade: (ctx, animT) => drawDemonBlade(ctx, -8, 0, 0, BIG_WEAPON_SCALE, animT),
  halberd: drawHalberd, pitchfork: drawPitchfork, club: drawClub, axe: drawAxe, spear: drawSpear,
  hammer: drawHammer, cleaver: drawCleaver, staff: drawStaff, torch: drawTorch, rod: drawRod, firestaff: drawFirestaff
};

// 무기 하나 그리기: 손 위치(x, y)로 옮기고, 찌르기(poke 0→1)만큼 앞으로 회전
//   창(spear)은 휘두르지 않고 앞을 겨눈 채 곧게 찌름 (2026-10-11 사용자: 창이니 찌르기)
//   size: 무기 크기 배율 (data/monsters.js WEAPON_SCALE)
export function drawMonsterWeapon(ctx, weapon, x, y, poke, animT, size = 1) {
  ctx.save();
  if (weapon === 'spear') { ctx.translate(x + poke * 24, y + 6); ctx.rotate(-0.08); }
  else { ctx.translate(x, y); ctx.rotate(-Math.PI / 4 + poke * (Math.PI / 4)); }
  if (size !== 1) ctx.scale(size, size);
  (WEAPON_DRAW[weapon] || drawHalberd)(ctx, animT);
  ctx.restore();
}
