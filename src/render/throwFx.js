// 무기 특수기 그림: 던진 무기(game.throws - systems/weaponThrows.js). 상태는 읽기만, 무기 모양은 주인공이 드는 그림(heroWeapons)을 그대로
//   바닥(몬스터 아래): 그림자, 내려찍기 예고 원·충격파 부채꼴 / 위: 날아가는 무기
import { game } from '../state.js';
import { SKILL_STATS } from '../data/skills.js';
import { drawAbstractSword, drawHeldShield } from './heroWeapons.js';

export function drawThrowsUnder(ctx, t) {
  game.throws.forEach((th) => {
    ctx.save();
    if (th.id === 'skyfall' && th.phase === 'charge') {
      const s = SKILL_STATS.skyfall, k = Math.min(1, th.age / s.charge);
      ctx.globalAlpha = 0.18 + k * 0.25; // 낙하 지점 예고 원 (안쪽이 차오름)
      ctx.fillStyle = '#ff5b4d';
      ctx.beginPath(); ctx.ellipse(th.x, th.y, th.radius * k, th.radius * k * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ffd1c9';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(th.x, th.y, th.radius, th.radius * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.12 + k * 0.1; // 충격파 부채꼴
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(th.x, th.y);
      ctx.arc(th.x, th.y, s.waveRange, th.dir - s.waveArc / 2, th.dir + s.waveArc / 2);
      ctx.closePath(); ctx.fill();
    }
    if (th.z > 4 || th.phase === 'charge') { // 떠 있는 무기의 그림자
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(th.x, th.y, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}

export function drawThrowsOver(ctx, t) {
  const r = game.hero.r;
  game.throws.forEach((th) => {
    const y = th.y - th.z;
    ctx.save();
    if (th.id === 'skyfall') {
      // 칼끝이 아래: 충전 중엔 위에서 커지며 떨림, 꽂힌 뒤엔 땅에 박힘, 돌아올 땐 회전
      const s = SKILL_STATS.skyfall;
      if (th.phase === 'charge') {
        const k = Math.min(1, th.age / s.charge), shake = Math.sin(t * 60) * 2 * k;
        ctx.globalAlpha = 0.5 + k * 0.5;
        drawAbstractSword(ctx, th.x + shake, y - r * 1.2 * (1 + k * 0.8), Math.PI / 2, r * (1 + k * 0.8), 1, 'greatsword');
      } else if (th.phase === 'stuck') {
        drawAbstractSword(ctx, th.x, th.y - r * 2.6, Math.PI / 2, r * 1.6, 1, 'greatsword');
      } else drawAbstractSword(ctx, th.x, y, th.spin, r, 1, 'greatsword');
    } else if (th.variant === 'shield') {
      drawHeldShield(ctx, th.x, y, th.spin, r * 1.1, 1);
    } else if (th.id === 'piercespear' || th.id === 'vitalthrow') {
      // 곧게 날아가는 무기: 끝이 나아가는 쪽 (손잡이가 뒤) - 손잡이 기준 그림이라 길이만큼 뒤로 물려서 그림
      const back = th.id === 'piercespear' ? r * 1.6 : r * 0.6;
      const glow = th.id === 'vitalthrow' && th.phase === 'charge';
      if (glow) { ctx.globalAlpha = 0.35 + Math.sin(t * 40) * 0.2; ctx.fillStyle = '#9be39b'; ctx.beginPath(); ctx.arc(th.x, y, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      drawAbstractSword(ctx, th.x - Math.cos(th.angle) * back, y - Math.sin(th.angle) * back, th.angle, r, 1, th.variant);
    } else {
      // 회전검·회전도끼·메이스: 손잡이를 중심으로 돌지 않게 무기 가운데쯤을 축으로 회전
      ctx.translate(th.x, y);
      ctx.rotate(th.spin);
      drawAbstractSword(ctx, -r * 0.7, 0, 0, r, 1, th.variant);
    }
    ctx.restore();
  });
}
