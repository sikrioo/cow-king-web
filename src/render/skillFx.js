// 새 스킬 그림: 더미(주인공과 같은 모습의 미끼), 에너지 쉴드 막, 버서커 기운, 눈보라·화염기둥
// 상태는 읽기만. 들쭉날쭉한 모양은 시간 + hash01(결정적) - 게임 난수 안 씀
import { game } from '../state.js';
import { hash01, easeOutCubic } from '../util.js';
import { drawPlayer } from './heroSprites.js';
import { SPELLS } from '../data/skills.js';
import { dischargeOrbs } from '../systems/groundSpells.js';
import { drawMagicUnder, drawMagicOver } from './magicFx.js';
import { activeAuras, auraRadius } from '../systems/auras.js';
import { SKILL_STATS } from '../data/skills.js';

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
  game.groundSpells.forEach((g, gi) => {
    ctx.save();
    drawMagicUnder(ctx, g, t, gi); // 화염 토템·냉기 장판·전기충격 (render/magicFx.js)
    if (g.kind === 'firefield') { // 메테오 자리: 그을린 바닥 + 일렁이는 불꽃 (끝나 갈수록 옅어짐)
      const fade = Math.min(1, (g.duration - g.age) * 2);
      ctx.globalAlpha = 0.35 * fade;
      ctx.fillStyle = '#3e1d0c';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 9; i++) {
        const a = hash01(i, Math.round(g.x), 81) * Math.PI * 2, r = Math.sqrt(hash01(i, Math.round(g.y), 82)) * g.radius * 0.85;
        const x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r * 0.62;
        const hgt = (10 + hash01(i, Math.floor(t * 12), 83) * 12) * fade;
        ctx.globalAlpha = 0.8 * fade;
        ctx.fillStyle = i % 2 ? '#ffb347' : '#ff5a1e';
        ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - hgt); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill();
      }
    }
    if (g.kind === 'blizzard') {
      // 지역이 생김(delay): 하얀 원이 퍼지며 도는 점선 고리 → 그다음 하얀 서리 바닥
      const form = Math.min(1, g.age / g.delay);
      const r = g.radius * easeOutCubic(form);
      const fade = Math.min(1, (g.duration - g.age) * 3);
      ctx.globalAlpha = (0.12 + form * 0.12) * fade;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.8 * fade;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      if (form < 1) { ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 60; } // 모여드는 바람
      ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    } else if (g.kind === 'flamepillar') {
      // 범위 예고 원 (마지막 기둥이 솟을 때까지) + 아직 안 솟은 기둥 자리마다 작은 달아오르는 원
      const last = g.pillars[g.pillars.length - 1].t;
      if (g.age < last) {
        const p = Math.min(1, g.age / g.delay);
        ctx.globalAlpha = 0.18 + p * 0.12;
        ctx.fillStyle = '#ff5a1e';
        ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius * p, g.radius * p * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      }
      g.pillars.forEach((pl) => {
        if (pl.fired) return;
        const k = Math.max(0, 1 - (pl.t - g.age) / 0.3);
        ctx.globalAlpha = 0.3 + k * 0.5;
        ctx.fillStyle = '#ff7a1a';
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y, 14 * k + 4, (14 * k + 4) * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
  });
}

// 화염 파도: 곧은 불의 벽(시전 방향에 수직, 폭 일정)이 앞으로 나아감 - 불꽃 혀가 줄지어 일렁이고 지나간 자리에 옅은 그을음 (들쭉날쭉은 hash01)
//   두께 있는 불의 띠: 뒤쪽은 어두운 붉은 불꽃, 앞쪽은 높고 밝은 불꽃(3겹) + 띠 전체에 옅은 불빛. 멈춘 뒤엔 그을린 자국만 서서히 사라짐
function drawFireWave(ctx, g, t, gi) {
  const s = SPELLS.firewave, n = 13;
  const fx = Math.cos(g.dir), fy = Math.sin(g.dir), px = -fy, py = fx, half = s.width / 2;
  const after = Math.max(0, g.age - s.travel);                // 멈춘 뒤 지난 시간
  const flame = Math.max(0, 1 - after / 0.2);                   // 불꽃은 멈추고 0.2초 안에 꺼짐
  const scorch = Math.max(0, 1 - after / s.linger);             // 그을음은 linger초에 걸쳐 사라짐
  const quad = (a, b) => { // 시전 자리에서 a ~ b 거리 사이 직사각형
    ctx.beginPath();
    ctx.moveTo(g.x + px * half + fx * a, g.y + py * half + fy * a);
    ctx.lineTo(g.x + px * half + fx * b, g.y + py * half + fy * b);
    ctx.lineTo(g.x - px * half + fx * b, g.y - py * half + fy * b);
    ctx.lineTo(g.x - px * half + fx * a, g.y - py * half + fy * a);
    ctx.closePath();
  };
  ctx.save();
  ctx.globalAlpha = 0.2 * scorch; // 그을린 자국
  ctx.fillStyle = '#3e1d0c';
  quad(0, g.front); ctx.fill();
  if (flame > 0) {
    ctx.globalAlpha = 0.22 * flame; // 불의 띠 불빛
    ctx.fillStyle = '#ff6a1e';
    quad(Math.max(0, g.front - s.thick), g.front); ctx.fill();
    const rows = [[0.85, '#b8301a', 0.55], [0.45, '#ff5a1e', 0.8], [0.05, '#ffb347', 1]]; // [두께 안 위치(뒤→앞), 색, 높이 배율]
    rows.forEach(([depth, color, hk], ri) => {
      const d = g.front - s.thick * depth;
      if (d < 0) return;
      for (let i = 0; i < n; i++) {
        const off = -half + (s.width * (i + 0.5 + (ri % 2) * 0.5)) / n;
        if (off > half) continue;
        const flick = hash01(i, gi * 3 + ri, Math.floor(t * 14)) * 0.45 + 0.55;
        const hgt = (30 + hash01(i, gi + ri, 7) * 26) * flick * hk;
        const x = g.x + fx * d + px * off, y = g.y + fy * d + py * off;
        const w = s.width / n + 8;
        ctx.globalAlpha = 0.92 * flame;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * 0.15, y - hgt * 0.6, x, y - hgt); ctx.quadraticCurveTo(x + w * 0.15, y - hgt * 0.6, x + w / 2, y); ctx.closePath(); ctx.fill();
        if (ri === 2) { // 맨 앞줄 밝은 속불
          ctx.fillStyle = '#fff2b0';
          ctx.beginPath(); ctx.moveTo(x - w / 5, y); ctx.lineTo(x, y - hgt * 0.5); ctx.lineTo(x + w / 5, y); ctx.closePath(); ctx.fill();
        }
      }
    });
  }
  ctx.restore();
}

// 지점 마법 - 위(몬스터 위): 눈보라 얼음 덩어리 낙하, 화염기둥 불기둥, 화염 파도, 볼 라이트닝 구체
export function drawGroundSpellsOver(ctx, t) {
  game.groundSpells.forEach((g, gi) => {
    if (g.kind === 'firewave') { drawFireWave(ctx, g, t, gi); return; }
    if (g.kind === 'balllightning') { drawBall(ctx, g, t, gi); return; }
    if (g.kind === 'discharge') { drawDischarge(ctx, g, t, gi); return; }
    if (g.kind === 'firetotem') { ctx.save(); drawMagicOver(ctx, g, t, gi); ctx.restore(); return; }
    ctx.save();
    if (g.kind === 'blizzard' && g.age >= g.delay && g.age < g.duration) {
      // 눈 결정(육각 별 - 선 3개)이 돌며 떨어지고, 닿은 자리에 작은 하얀 김 - 선만 써서 가벼움(성능)
      const e = g.age - g.delay;
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const cycle = 0.45 + hash01(i, gi, 31) * 0.3;
        const phase = ((e + hash01(i, gi, 32) * cycle) % cycle) / cycle; // 0 = 위, 1 = 바닥
        const k = Math.floor((e + hash01(i, gi, 32) * cycle) / cycle);    // 몇 번째 낙하인지 → 떨어지는 자리 바뀜
        const a = hash01(i, k, 33 + gi) * Math.PI * 2, r = Math.sqrt(hash01(i, k, 34 + gi)) * g.radius;
        const x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r * 0.62;
        const fy = y - (1 - phase) * 130;
        const size = 6 + hash01(i, k, 35) * 5, spin = e * 4 + i;
        ctx.globalAlpha = 0.95;
        for (const [color, lw] of [['rgba(150,185,215,0.8)', 3.2], ['#ffffff', 1.6]]) { // 옅은 파란 테두리 + 흰 결정
          ctx.strokeStyle = color;
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let j = 0; j < 3; j++) {
            const ang = spin + (j * Math.PI) / 3;
            ctx.moveTo(x - Math.cos(ang) * size, fy - Math.sin(ang) * size);
            ctx.lineTo(x + Math.cos(ang) * size, fy + Math.sin(ang) * size);
          }
          ctx.stroke();
        }
        if (phase > 0.85) { // 닿은 자리 하얀 김
          ctx.globalAlpha = (1 - phase) * 4;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (g.kind === 'flamepillar') {
      // 솟은 기둥마다: 0.15초에 걸쳐 높이 솟았다가 0.4초에 걸쳐 줄며 사라짐
      g.pillars.forEach((pl) => {
        if (!pl.fired) return;
        const e = g.age - pl.t;
        if (e > 0.55) return;
        const rise = Math.min(1, e / 0.15), p = Math.max(0, (e - 0.15) / 0.4);
        const hgt = 120 * rise * (1 - p * 0.5), w = 16 * (1 - p * 0.4);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#ff5a1e';
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y - hgt / 2, w, hgt / 2 + 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffb347';
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y - hgt * 0.45, w * 0.6, hgt * 0.42 + 1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff2b0';
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y - hgt * 0.4, w * 0.28, hgt * 0.3 + 1, 0, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
  });
}

// 볼 라이트닝 구체: 처음 grow초 동안 커지고, 지지직 떨림(시간 해시) + 겉을 도는 짧은 전기 선, 사라지기 blink초 전부터 깜빡임
//   바닥엔 아크 범위를 옅은 고리로. 터진 뒤(done)엔 안 그림(흰 고리는 충격파 이펙트)
function drawBall(ctx, g, t, gi) {
  if (g.done) return;
  const s = SPELLS.balllightning;
  const f = Math.floor(t * 30);
  const grow = easeOutCubic(Math.min(1, g.age / s.grow));
  const r = 13 * grow;
  const jx = (hash01(f, gi, 51) - 0.5) * 3, jy = (hash01(f, gi, 52) - 0.5) * 3;
  const cx = g.x + jx, cy = g.y - 20 + jy;
  const blinking = g.duration - g.age < s.blink && f % 4 < 2;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#8fe8ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.ellipse(g.x, g.y, s.arcRadius, s.arcRadius * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = blinking ? 0.35 : 0.3; // 바깥 빛 (겹친 원 - 그라데이션 안 씀)
  ctx.fillStyle = '#8fe8ff';
  ctx.beginPath(); ctx.arc(cx, cy, r * 2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = blinking ? 1 : 0.9;
  ctx.fillStyle = blinking ? '#ffffff' : '#bff4ff';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; // 겉을 도는 전기 선 3개 (꺾인 선)
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = hash01(f, gi, 60 + i) * Math.PI * 2, len = r * (1.2 + hash01(f, gi, 63 + i) * 0.9);
    const mx = cx + Math.cos(a + 0.4) * len * 0.6, my = cy + Math.sin(a + 0.4) * len * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
    ctx.lineTo(mx, my);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

// 방전: 주인공 둘레를 도는 전기 구체 + 바닥에 옅은 범위 고리, 끝나기 1초 전부터 깜빡임
function drawDischarge(ctx, g, t, gi) {
  const f = Math.floor(t * 30);
  const blinking = g.duration - g.age < 1 && f % 4 < 2;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#8fe8ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  dischargeOrbs(g).forEach((o, i) => {
    ctx.globalAlpha = blinking ? 0.3 : 0.28;
    ctx.fillStyle = '#8fe8ff';
    ctx.beginPath(); ctx.arc(o.x, o.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = blinking ? 0.5 : 0.95;
    ctx.fillStyle = '#e8fbff';
    ctx.beginPath(); ctx.arc(o.x, o.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    const a = hash01(f, gi * 7 + i, 71) * Math.PI * 2, len = 8 + hash01(f, gi * 7 + i, 72) * 6;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(o.x + Math.cos(a + 0.5) * len * 0.5, o.y + Math.sin(a + 0.5) * len * 0.5);
    ctx.lineTo(o.x + Math.cos(a) * len, o.y + Math.sin(a) * len);
    ctx.stroke();
  });
  ctx.restore();
}

// 오라 고리 (발밑, 몬스터 아래): 불꽃·빙결 = 오라 반경 고리(색), 가시 = 몸 둘레 작은 노란 원. 바뀌는 중이면 점선
export function drawAuraRings(ctx, t) {
  const h = game.hero;
  if (!h.alive) return;
  ctx.save();
  activeAuras(h).forEach(({ id, lv }, i) => {
    const color = SKILL_STATS[id].ring;
    if (id === 'aurathorns') { // 가시: 내 몸 둘레 작은 노란 원 (사용자 요청)
      const R = h.r * 1.35;
      ctx.globalAlpha = 0.12 + Math.sin(t * 4) * 0.04;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, R, R * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, R, R * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    const r = auraRadius(id, lv);
    ctx.globalAlpha = 0.08 + Math.sin(t * 3 + i) * 0.03;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  });
  if (h.auraPending) { // 켜지는 중
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = SKILL_STATS[h.auraPending].ring;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 40;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 2, h.r * 1.24, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
