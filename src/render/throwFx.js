// 무기 특수기 그림: 던진 무기(game.throws - systems/weaponThrows.js). 상태는 읽기만, 무기 모양은 주인공이 드는 그림(heroWeapons)을 그대로
//   바닥(몬스터 아래): 그림자, 내려찍기 예고 원·충격파 부채꼴 / 위: 날아가는 무기
import { game } from '../state.js';
import { SKILL_STATS } from '../data/skills.js';
import { ELEMENT_DEF } from '../data/elements.js';
import { hash01 } from '../util.js';
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
  game.throws.forEach((th, ti) => {
    const y = th.y - th.z;
    drawElementAura(ctx, th, y, t, ti);
    ctx.save();
    if (th.id === 'skyfall') {
      // 칼끝이 아래: 충전 중엔 위에서 커지며 떨림, 꽂힌 뒤엔 땅에 박힘, 돌아올 땐 회전
      const s = SKILL_STATS.skyfall;
      // 칼은 붉은 기운 (drawRedBlade)
      if (th.phase === 'charge') {
        const k = Math.min(1, th.age / s.charge), scale = r * (1 + k * 0.8);
        const hang = Math.max(0, Math.min(1, (th.age - s.charge) / s.hang));           // 멈칫: 살짝 위로 들림
        const fall = Math.max(0, Math.min(1, (th.age - s.charge - s.hang) / s.fall));  // 낙하: 가속(제곱)
        const top = y - r * 1.2 * (1 + k * 0.8) - Math.sin(hang * Math.PI / 2) * r * 0.5;
        const ground = th.y - r * 2.6;
        const sy = fall > 0 ? top + (ground - top) * fall * fall : top;
        const shake = fall > 0 ? 0 : Math.sin(t * 60) * (hang > 0 ? 3.5 : 2 * k);
        ctx.globalAlpha = 0.5 + k * 0.5;
        drawRedBlade(ctx, th.x + shake, sy, Math.PI / 2, scale, 0.25 + hang * 0.3, true);
        drawAbstractSword(ctx, th.x + shake, sy, Math.PI / 2, scale, 1, 'greatsword');
        drawRedBlade(ctx, th.x + shake, sy, Math.PI / 2, scale, 0.35 + hang * 0.2, false);
      } else if (th.phase === 'stuck') {
        drawAbstractSword(ctx, th.x, th.y - r * 2.6, Math.PI / 2, r * 1.6, 1, 'greatsword');
        drawRedBlade(ctx, th.x, th.y - r * 2.6, Math.PI / 2, r * 1.6, 0.35, false);
      } else {
        drawAbstractSword(ctx, th.x, y, th.spin, r, 1, 'greatsword');
        drawRedBlade(ctx, th.x, y, th.spin, r, 0.3, false);
      }
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

// 특수기 원소 효과 (무기 아래에 먼저): 지나온 자리 꼬리(원소 색) + 무기 둘레 - 화염 불꽃 / 번개 지지직 / 독 방울 / 냉기 서리 별
//   들쭉날쭉한 모양은 시간·개체 hash01 (게임 난수 안 씀)
function drawElementAura(ctx, th, y, t, ti) {
  const elem = SKILL_STATS[th.id] && SKILL_STATS[th.id].elem;
  if (!elem) return;
  const color = ELEMENT_DEF[elem].color, f = Math.floor(t * 24);
  const x = th.x;
  ctx.save();
  (th.trail || []).forEach((p, i, arr) => {
    const k = (i + 1) / arr.length;
    ctx.globalAlpha = 0.35 * k;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 + 6 * k, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9;
  if (elem === 'fire') {
    for (let i = 0; i < 4; i++) { // 위로 날리는 불꽃
      const ox = (hash01(f, ti, i) - 0.5) * 22, hgt = 8 + hash01(f, ti, i + 9) * 12;
      ctx.fillStyle = i % 2 ? '#ffb347' : '#ff5a1e';
      ctx.beginPath(); ctx.moveTo(x + ox - 4, y); ctx.lineTo(x + ox, y - hgt); ctx.lineTo(x + ox + 4, y); ctx.closePath(); ctx.fill();
    }
  } else if (elem === 'lightning') {
    ctx.strokeStyle = '#fff9b0';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { // 꺾인 전기 선
      const a = hash01(f, ti, 20 + i) * Math.PI * 2, len = 12 + hash01(f, ti, 30 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a + 0.6) * len * 0.5, y + Math.sin(a + 0.6) * len * 0.5);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  } else if (elem === 'poison') {
    ctx.fillStyle = '#9be35a';
    for (let i = 0; i < 3; i++) { // 떨어지는 독 방울
      const ph = ((t * 2 + hash01(ti, i, 40)) % 1);
      ctx.globalAlpha = 0.9 * (1 - ph);
      ctx.beginPath(); ctx.arc(x + (hash01(ti, i, 41) - 0.5) * 16, y + ph * 18, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (elem === 'cold') {
    ctx.strokeStyle = '#e8f7ff';
    ctx.lineWidth = 1.5;
    const spin = t * 3 + ti;
    ctx.beginPath(); // 도는 서리 별 (선 3개)
    for (let j = 0; j < 3; j++) {
      const a = spin + (j * Math.PI) / 3;
      ctx.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 12);
      ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// 내려찍기 대검의 붉은 기운: 대검 칼날 모양(heroWeapons 'greatsword'와 같은 좌표)에 붉은색을 겹침. glow = 칼 뒤의 넓은 붉은 빛
function drawRedBlade(ctx, x, y, angle, r, alpha, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = glow ? '#ff2a1a' : '#e0301e';
  const w = glow ? 0.5 : 0;
  ctx.beginPath();
  ctx.moveTo(r * 0.48, -r * (0.24 + w));
  ctx.lineTo(r * (3.05 + w * 0.4), -r * (0.20 + w));
  ctx.lineTo(r * (3.25 + w * 0.5), -r * 0.06);
  ctx.lineTo(r * (3.22 + w * 0.5), r * 0.14);
  ctx.lineTo(r * (3.00 + w * 0.4), r * (0.22 + w));
  ctx.lineTo(r * 0.48, r * (0.24 + w));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
