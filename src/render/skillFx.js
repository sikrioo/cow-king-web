// 새 스킬 그림: 더미(주인공과 같은 모습의 미끼), 에너지 쉴드 막, 버서커 기운, 눈보라·화염기둥
// 상태는 읽기만. 들쭉날쭉한 모양은 시간 + hash01(결정적) - 게임 난수 안 씀
import { game } from '../state.js';
import { hash01 } from '../util.js';
import { drawPlayer } from './heroSprites.js';

// 미끼: 주인공 그림 함수에 미끼 위치·방향을 넣은 '보기용 복사본'을 넘겨 그림 (게임 상태는 안 바꿈)
export function drawDecoy(ctx, t) {
  const d = game.decoy;
  if (!d) return;
  const view = {
    ...game.hero, x: d.x, y: d.y, facing: d.facing, alive: true, invuln: 0, flash: d.flash > 0 ? 0.1 : 0, knockback: 0,
    leapTimer: 0, rushTimer: 0, smashTimer: 0, whirlwindTimer: 0, flurryTimer: 0, attackTimer: 0,
    moveSpeedN: 0, moveReaction: 0, moveOffsetX: 0, moveOffsetY: 0, moveLean: 0, moveStep: 0
  };
  const ending = d.timer < 1.5 && Math.sin(t * 16) > 0;
  ctx.save();
  ctx.globalAlpha = ending ? 0.45 : 0.85;
  drawPlayer(ctx, t, view);
  ctx.restore();
  // 미끼 표시: 발밑 회색 고리 + 체력 막대
  ctx.save();
  ctx.strokeStyle = 'rgba(210,210,225,0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.ellipse(d.x, d.y + game.hero.r * 0.8, game.hero.r * 1.25, game.hero.r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  const w = 34, y = d.y - game.hero.r - 30;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(d.x - w / 2, y, w, 4);
  ctx.fillStyle = '#c9c9d6';
  ctx.fillRect(d.x - w / 2, y, w * Math.max(0, d.hp / d.maxHp), 4);
  ctx.restore();
}

// 버서커 기운 (발밑, 주인공 그림 아래)
export function drawHeroBerserk(ctx, t) {
  const h = game.hero;
  if (!(h.berserkTimer > 0) || !h.alive) return;
  const pulse = 0.5 + Math.sin(t * 9) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.25 + pulse * 0.2;
  ctx.fillStyle = '#ff2a2a';
  ctx.beginPath(); ctx.ellipse(h.x, h.y + h.r * 0.7, h.r * (1.6 + pulse * 0.2), h.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff6a3d';
  for (let i = 0; i < 6; i++) {
    const life = (t * 1.4 + hash01(i, 21, 5)) % 1;
    const a = hash01(i, 22, 5) * Math.PI * 2;
    ctx.globalAlpha = (1 - life) * 0.9;
    ctx.fillRect(h.x + Math.cos(a) * h.r * 0.9 - 1.5, h.y - life * 40 - 4, 3, 5);
  }
  ctx.restore();
}

// 에너지 쉴드 막 (주인공 그림 위)
export function drawHeroShield(ctx, t) {
  const h = game.hero;
  if (!(h.shieldTimer > 0) || !h.alive) return;
  const ending = h.shieldTimer < 2 && Math.sin(t * 16) > 0;
  ctx.save();
  ctx.globalAlpha = ending ? 0.15 : 0.22 + Math.sin(t * 3) * 0.06;
  ctx.fillStyle = '#6f9cff';
  ctx.beginPath(); ctx.arc(h.x, h.y - h.r * 0.4, h.r * 1.55, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = ending ? 0.3 : 0.75;
  ctx.strokeStyle = '#bcd2ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(h.x, h.y - h.r * 0.4, h.r * 1.55, t * 2, t * 2 + Math.PI * 1.3); ctx.stroke();
  ctx.restore();
}

// 지점 마법 - 바닥(몬스터 아래): 눈보라 범위, 화염기둥 예고 원
export function drawGroundSpellsUnder(ctx, t) {
  game.groundSpells.forEach((g) => {
    ctx.save();
    if (g.kind === 'blizzard') {
      const fade = Math.min(1, g.age * 4, (g.duration - g.age) * 3);
      ctx.globalAlpha = 0.18 * fade;
      ctx.fillStyle = '#bfeaff';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.6 * fade;
      ctx.strokeStyle = '#e8f7ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (g.kind === 'flamepillar' && !g.fired) {
      const p = Math.min(1, g.age / g.delay);
      ctx.globalAlpha = 0.25 + p * 0.25;
      ctx.fillStyle = '#ff5a1e';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius * p, g.radius * p * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  });
}

// 지점 마법 - 위(몬스터 위): 눈보라 얼음 덩어리 낙하, 화염기둥 불기둥
export function drawGroundSpellsOver(ctx, t) {
  game.groundSpells.forEach((g, gi) => {
    ctx.save();
    if (g.kind === 'blizzard' && g.age < g.duration) {
      ctx.fillStyle = '#e8f7ff';
      ctx.strokeStyle = '#7fd4ff';
      for (let i = 0; i < 14; i++) {
        const cycle = 0.45 + hash01(i, gi, 31) * 0.3;
        const phase = ((g.age + hash01(i, gi, 32) * cycle) % cycle) / cycle; // 0 = 위, 1 = 바닥
        const k = Math.floor((g.age + hash01(i, gi, 32) * cycle) / cycle);    // 몇 번째 낙하인지 → 떨어지는 자리 바뀜
        const a = hash01(i, k, 33 + gi) * Math.PI * 2, r = Math.sqrt(hash01(i, k, 34 + gi)) * g.radius;
        const x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r * 0.62;
        ctx.globalAlpha = 0.9 * (1 - phase * 0.3);
        const fy = y - (1 - phase) * 120;
        ctx.beginPath();
        ctx.moveTo(x, fy - 7); ctx.lineTo(x + 4, fy); ctx.lineTo(x, fy + 6); ctx.lineTo(x - 4, fy); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    } else if (g.kind === 'flamepillar' && g.fired) {
      const p = Math.min(1, (g.age - g.delay) / (g.duration - g.delay)); // 0 → 1 (사라짐)
      const hgt = 150 * (1 - p * 0.4), w = g.radius * 0.7 * (1 - p * 0.5);
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = '#ff5a1e';
      ctx.beginPath(); ctx.ellipse(g.x, g.y - hgt / 2, w, hgt / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.ellipse(g.x, g.y - hgt * 0.45, w * 0.6, hgt * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff2b0';
      ctx.beginPath(); ctx.ellipse(g.x, g.y - hgt * 0.4, w * 0.28, hgt * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}
