// 악마 카우 꾸밈 (관리자 전용 몬스터): 기존 카우 그림(drawCow) 위아래에 덧그림 - 소 그림 좌표계(몸 가운데 (0,-40) 반지름 30)
//   back = 몸 뒤(날개·꼬리·망토), front = 몸 앞(이마 문양·뿔 가시·왕관). 몬스터가 많아도 되게 단색 도형만(그라데이션 없음), 난수 없음
const WING = '#2a0a14', MEMBRANE = '#5a1020';

function batWing(ctx, side, span, lift, flap) { // 박쥐 날개: 어깨에서 바깥 위로, 아래 가장자리는 물결
  const tipX = side * span, tipY = -64 - lift - flap;
  ctx.fillStyle = MEMBRANE;
  ctx.strokeStyle = WING;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(side * 16, -50);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(side * span * 0.85, -44 - flap * 0.5, side * span * 0.7, -36);
  ctx.quadraticCurveTo(side * span * 0.55, -42, side * span * 0.42, -32);
  ctx.quadraticCurveTo(side * span * 0.3, -38, side * 18, -30);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(side * 16, -50); ctx.lineTo(side * span * 0.7, -36); ctx.moveTo(side * 16, -50); ctx.lineTo(side * span * 0.42, -32); ctx.stroke(); // 날개 뼈
}

function tail(ctx, animT) { // 끝이 화살촉인 꼬리 (몸 뒤 아래에서 흔들림)
  const sway = Math.sin(animT * 4) * 5;
  ctx.strokeStyle = '#3a0a0e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, -16); ctx.quadraticCurveTo(-34, -10 + sway, -38, -28 + sway); ctx.stroke();
  ctx.fillStyle = '#3a0a0e';
  ctx.beginPath(); ctx.moveTo(-38, -36 + sway); ctx.lineTo(-44, -24 + sway); ctx.lineTo(-32, -26 + sway); ctx.closePath(); ctx.fill();
}

function hornSpikes(ctx, n, color) { // 머리 위 작은 뿔 가시들
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 9;
    ctx.beginPath(); ctx.moveTo(x - 4, -66); ctx.lineTo(x, -78 - (i % 2) * 4); ctx.lineTo(x + 4, -66); ctx.closePath(); ctx.fill();
  }
}

// kind: data/monsters.js의 demon 값, c: 몬스터(분노 여부 등 읽기만)
export function demonDecor(kind, c) {
  if (kind === 'imp') return {
    back: (ctx, animT) => { const f = Math.sin(animT * 16) * 4; batWing(ctx, -1, 40, 0, f); batWing(ctx, 1, 40, 0, f); tail(ctx, animT); }
  };
  if (kind === 'curser') return {
    back: (ctx) => { // 보라 두건 망토
      ctx.fillStyle = '#2e0a2a';
      ctx.beginPath(); ctx.moveTo(-30, -52); ctx.quadraticCurveTo(0, -84, 30, -52); ctx.lineTo(32, -12); ctx.lineTo(-32, -12); ctx.closePath(); ctx.fill();
    },
    front: (ctx, animT) => { // 이마의 빛나는 저주 문양 (도는 세모 + 원)
      ctx.save();
      ctx.translate(0, -60);
      ctx.globalAlpha = 0.7 + Math.sin(animT * 5) * 0.25;
      ctx.strokeStyle = '#d98bff';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(animT * 1.5);
      ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 6, Math.sin(a) * 6); } ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
  };
  if (kind === 'berserker') return {
    back: (ctx, animT) => tail(ctx, animT),
    front: (ctx) => {
      hornSpikes(ctx, 3, '#1a0606');
      ctx.strokeStyle = c.enraged ? '#ff5a3d' : '#3a0606'; // 흉터 (분노하면 붉게 빛남)
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-20, -52); ctx.lineTo(-8, -36); ctx.moveTo(18, -30); ctx.lineTo(10, -20); ctx.stroke();
    }
  };
  if (kind === 'king') return {
    back: (ctx, animT) => { // 큰 날개 - 분노하면 활짝 펴고 빨리 펄럭임
      const span = c.enraged ? 64 : 46, f = Math.sin(animT * (c.enraged ? 10 : 4)) * (c.enraged ? 6 : 3);
      batWing(ctx, -1, span, c.enraged ? 12 : 0, f); batWing(ctx, 1, span, c.enraged ? 12 : 0, f);
      tail(ctx, animT);
    },
    front: (ctx, animT) => { // 뿔 왕관 + 보랏빛 보석
      hornSpikes(ctx, 5, '#14060a');
      ctx.fillStyle = '#ff5ad8';
      ctx.globalAlpha = 0.7 + Math.sin(animT * 4) * 0.3;
      ctx.beginPath(); ctx.arc(0, -64, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
  return null;
}
