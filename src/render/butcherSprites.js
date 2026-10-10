// 도살자 꾸밈 (도살자 카우·도살자 악마 - 2026-10-11 시안, 관리자 전용): 기존 카우 그림(drawCow) 앞에 덧그림 - 소 그림 좌표계(몸 가운데 (0,-40) 반지름 30)
//   도살자 카우: 피 묻은 가죽 앞치마 + 어깨끈 + 붉은 눈 테두리 / 도살자 악마: 검은 가죽 앞치마 + 가슴을 가로지르는 사슬 + 뿔 가시
//   몬스터가 많아도 되게 단색 도형만, 난수 없음(얼룩 자리는 고정)
const BLOOD = '#8a1414';

function apron(ctx, cloth, edge) {
  ctx.fillStyle = cloth;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-17, -38); ctx.lineTo(17, -38); ctx.lineTo(21, -10); ctx.quadraticCurveTo(0, -5, -21, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = edge; ctx.lineWidth = 2; // 어깨끈
  ctx.beginPath(); ctx.moveTo(-15, -38); ctx.lineTo(-10, -56); ctx.moveTo(15, -38); ctx.lineTo(10, -56); ctx.stroke();
  ctx.fillStyle = BLOOD; // 핏자국 (고정 자리)
  [[-8, -28, 4], [6, -20, 5], [11, -32, 2.5], [-3, -15, 3], [-13, -18, 2]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillRect(5, -20, 2, 9); // 흘러내린 자국
}

export function butcherDecor(kind) {
  if (kind === 'demon') return {
    front: (ctx) => {
      apron(ctx, '#2a1410', '#140806');
      ctx.strokeStyle = '#8b8f96'; ctx.lineWidth = 2.2; // 사슬 (가슴을 비스듬히)
      for (let i = 0; i < 6; i++) { const x = -22 + i * 8.5, y = -50 + i * 4; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.6, 0.45, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#14060a'; // 뿔 가시
      [-9, 0, 9].forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x - 4, -66); ctx.lineTo(x, -79 - (i % 2) * 4); ctx.lineTo(x + 4, -66); ctx.closePath(); ctx.fill(); });
    }
  };
  return {
    front: (ctx) => {
      apron(ctx, '#d8d0c0', '#6a5a48');
      ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = 1.2; // 핏발 선 눈 테두리
      ctx.beginPath(); ctx.ellipse(-12, -46, 5.5, 4, -0.15, 0, Math.PI * 2); ctx.ellipse(12, -46, 5.5, 4, 0.15, 0, Math.PI * 2); ctx.stroke();
    }
  };
}
