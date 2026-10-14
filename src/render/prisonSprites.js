// 뼈 감옥 그림 (entities/prisonBehaviors.js): 솟기 전엔 땅에 좁아지는 고리 조각, 솟으면 바깥으로 살짝 휜 뼈 창살, 다치면 금, 무너질 땐 가라앉음
// 상태는 읽기만 - 들쭉날쭉한 모양은 hash01(결정적)
import { PRISON } from '../data/balance.js';
import { hash01 } from '../util.js';

const BONE = { body: '#e8e2d0', edge: '#9a927e', dark: '#6e6858', crack: '#4a4438' };
const WHITE = { body: '#ffffff', edge: '#ffffff', dark: '#ffffff', crack: '#ffffff' };

// c: 창살(몬스터) - prison {x, y, r}, barAngle, age, hp/maxHp. sink: 0~1 무너짐(죽은 뒤)
export function drawBoneBar(ctx, c, t, flash = false, sink = 0) {
  const k = c.scale / 0.37, col = flash ? WHITE : BONE;
  const p = c.prison, a = c.barAngle || 0, seed = Math.round((a || 0) * 100);
  ctx.save();
  if (c.age < PRISON.warn && !sink) { // 예고: 감옥 자리에 좁아지는 고리 (창살마다 제 몫의 호)
    const q = c.age / PRISON.warn, rr = p.r * (1.6 - 0.6 * q), span = Math.PI / PRISON.bars;
    ctx.globalAlpha = 0.35 + q * 0.5;
    ctx.strokeStyle = col.body;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr, a - span, a + span); ctx.stroke();
    ctx.fillStyle = col.dark; // 갈라지는 땅
    ctx.globalAlpha = q * 0.6;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, 6 * k * q, 2.5 * k * q, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const rise = sink ? 1 - sink : Math.min(1, (c.age - PRISON.warn) / 0.12);
  const H = 46 * k * rise, lean = Math.cos(a) * 5 * k; // 바깥으로 살짝 휨 (좌우)
  ctx.globalAlpha *= 0.28; // 그림자
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(c.x + 3, c.y + 1, 9 * k, 3.5 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.28;
  // 뼈 창살: 밑동이 굵고 끝이 뾰족한 휜 뼈 (밑동 마디 두 개)
  ctx.fillStyle = col.body; ctx.strokeStyle = col.edge; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(c.x - 6 * k, c.y);
  ctx.quadraticCurveTo(c.x - 5 * k + lean * 0.4, c.y - H * 0.6, c.x + lean, c.y - H);
  ctx.quadraticCurveTo(c.x + 5 * k + lean * 0.4, c.y - H * 0.6, c.x + 6 * k, c.y);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(c.x - 5 * k, c.y - 2 * k, 3.4 * k, 0, Math.PI * 2); ctx.arc(c.x + 5 * k, c.y - 2 * k, 3.4 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // 다친 만큼 금 (체력 2/3·1/3 아래)
  const hurt = c.maxHp ? 1 - c.hp / c.maxHp : 0;
  if (hurt > 0.33 && rise > 0.5) {
    ctx.strokeStyle = col.crack; ctx.lineWidth = 1.2;
    const n = hurt > 0.66 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const y0 = c.y - H * (0.3 + 0.3 * i), x0 = c.x + lean * (0.3 + 0.3 * i);
      ctx.beginPath(); ctx.moveTo(x0 - 3 * k, y0); ctx.lineTo(x0 + (hash01(seed, i, 41) - 0.5) * 4 * k, y0 - 4 * k); ctx.lineTo(x0 + 3 * k, y0 - 7 * k); ctx.stroke();
    }
  }
  ctx.restore();
}
