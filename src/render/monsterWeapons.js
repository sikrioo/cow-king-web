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
export const BIG_WEAPONS = ['greatsword', 'battleaxe'];
export function drawBigWeapon(ctx, weapon, x, y, angle) { // 해골 전사가 직접 각도를 정해 휘두를 때
  drawAbstractSword(ctx, x, y, angle, BIG_WEAPON_SCALE, 1, weapon === 'battleaxe' ? 'axe' : 'greatsword', weapon === 'battleaxe'); // 도끼날은 휘두르는 쪽
}

export const WEAPON_DRAW = {
  bow: drawBow, greatsword: drawGreatsword, battleaxe: drawBattleAxe,
  halberd: drawHalberd, pitchfork: drawPitchfork, club: drawClub, axe: drawAxe, spear: drawSpear,
  hammer: drawHammer, cleaver: drawCleaver, staff: drawStaff, torch: drawTorch, rod: drawRod, firestaff: drawFirestaff
};

// 무기 하나 그리기: 손 위치(x, y)로 옮기고, 찌르기(poke 0→1)만큼 앞으로 회전
//   창(spear)은 휘두르지 않고 앞을 겨눈 채 곧게 찌름 (2026-10-11 사용자: 창이니 찌르기)
//   size: 무기 크기 배율 (보스는 BOSS_WEAPON_SCALE)
export function drawMonsterWeapon(ctx, weapon, x, y, poke, animT, size = 1) {
  ctx.save();
  if (weapon === 'spear') { ctx.translate(x + poke * 24, y + 6); ctx.rotate(-0.08); }
  else { ctx.translate(x, y); ctx.rotate(-Math.PI / 4 + poke * (Math.PI / 4)); }
  if (size !== 1) ctx.scale(size, size);
  (WEAPON_DRAW[weapon] || drawHalberd)(ctx, animT);
  ctx.restore();
}
