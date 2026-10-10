// 이펙트 그리기 (파티클/불바닥/번개/충격파/떠오르는 글자) - 생성·갱신은 main.js
import { hexToRgba, hash01, resistOf } from '../util.js';
import { ELEMENTS, ELEMENT_DEF } from '../data/elements.js';
import { game, ui, input } from '../state.js';
import { drawOrb, drawShard } from './iceFx.js';

// 불꽃 바닥: 그을린 바닥 + 일렁이는 불꽃 혀 (그라데이션/난수 없음 - 시간과 위치로만)
function drawFireField(ctx, h) {
  const t = performance.now() / 1000;
  const fade = Math.max(0, Math.min(1, h.life / 0.5, (h.maxLife - h.life) / 0.15 + 0.3));
  ctx.save();
  ctx.globalAlpha = 0.35 * fade;
  ctx.fillStyle = '#5a1e08';
  ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = (0.3 + Math.sin(t * 7 + h.x) * 0.06) * fade;
  ctx.fillStyle = '#ff6a1a';
  ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 0.78, h.r * 0.48, 0, 0, Math.PI * 2); ctx.fill();
  const n = Math.max(3, Math.round(h.r / 8));
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996; // 황금각 - 고르게 흩어짐
    const rr = h.r * 0.72 * Math.sqrt((i + 0.5) / n);
    const fx = h.x + Math.cos(a) * rr, fy = h.y + Math.sin(a) * rr * 0.6;
    const wob = Math.sin(t * 9 + i * 1.7 + h.x * 0.05);
    const ht = (h.r * 0.32 + 7) * (0.7 + 0.3 * wob);
    const w = 3 + h.r * 0.05;
    const sway = Math.sin(t * 5 + i) * w * 0.6;
    ctx.globalAlpha = 0.8 * fade;
    ctx.fillStyle = '#ff7a1a';
    flame(ctx, fx, fy, w, ht, sway);
    ctx.fillStyle = '#ffd34d';
    flame(ctx, fx, fy, w * 0.5, ht * 0.55, sway * 0.6);
  }
  ctx.restore();
}

// 불꽃 혀 하나 (밑동 (x, y), 폭 w, 높이 ht, 끝 흔들림 sway)
function flame(ctx, x, y, w, ht, sway) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.7, y - ht * 0.55, x + sway, y - ht);
  ctx.quadraticCurveTo(x + w * 0.7, y - ht * 0.55, x + w, y);
  ctx.closePath();
  ctx.fill();
}

// 메테오 경고: 착탄 지점에 차오르는 붉은 원 + 떨어질수록 짙어지는 그림자
export function drawMeteorMarkers(ctx) {
  game.meteors.forEach((m) => {
    const p = Math.min(1, m.t / m.delay);
    ctx.save();
    ctx.globalAlpha = 0.12 + p * 0.25;
    ctx.fillStyle = '#ff4d1a';
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r * p, m.r * p * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.r, m.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    const q = Math.max(0, (m.t - (m.delay - m.fall)) / m.fall);
    if (q > 0) {
      ctx.globalAlpha = 0.35 * q;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 10 + 12 * q, (10 + 12 * q) * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}

// 투사체 (파이어볼): 진행 방향 뒤로 꼬리 + 일렁이는 불덩이
export function drawProjectiles(ctx) {
  const t = performance.now() / 1000;
  game.projectiles.forEach((p, i) => {
    if (p.kind === 'bolt') { drawBolt(ctx, p); return; }
    if (p.kind === 'shard') { drawShard(ctx, p, i); return; }
    if (p.kind === 'orb') { drawOrb(ctx, p, t); return; }
    if (p.kind === 'bonespear') { drawBoneSpear(ctx, p); return; }
    if (p.kind === 'arrow') { drawArrow(ctx, p); return; }
    ctx.save();
    for (let k = 4; k >= 1; k--) {
      ctx.globalAlpha = 0.5 - k * 0.1;
      ctx.fillStyle = k > 2 ? '#ff4d1a' : '#ff7a1a';
      ctx.beginPath();
      ctx.arc(p.x - p.dirX * k * 7, p.y - p.dirY * k * 7, p.radius * (1 - k * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    const wob = 1 + Math.sin(t * 20 + i) * 0.08;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff4d1a';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.15 * wob, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c0';
    ctx.beginPath(); ctx.arc(p.x + p.dirX * 2, p.y + p.dirY * 2, p.radius * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

// 마력탄: 보랏빛 작은 구슬 + 짧은 꼬리
function drawBolt(ctx, p) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#9f86ff';
  ctx.beginPath(); ctx.arc(p.x - p.dirX * 9, p.y - p.dirY * 9, p.radius * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#b8a4ff';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2eeff';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 메테오 불덩이: 하늘(왼쪽 위)에서 착탄 지점으로 떨어짐 + 꼬리
export function drawMeteorBalls(ctx) {
  game.meteors.forEach((m) => {
    const q = (m.t - (m.delay - m.fall)) / m.fall;
    if (q <= 0) return;
    const sx = m.x - 140, sy = m.y - 420;
    const at = (k) => ({ x: sx + (m.x - sx) * k, y: sy + (m.y - sy) * k });
    ctx.save();
    for (let k = 4; k >= 1; k--) {
      const tq = q - k * 0.07;
      if (tq < 0) continue;
      const p = at(tq);
      ctx.globalAlpha = 0.55 - k * 0.11;
      ctx.fillStyle = k > 2 ? '#ff4d1a' : '#ff7a1a';
      ctx.beginPath(); ctx.arc(p.x, p.y, 13 - k * 2, 0, Math.PI * 2); ctx.fill();
    }
    const p = at(q);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff4d1a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c0';
    ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

// 독 구름: 단색 원 겹치기 + 떠오르는 거품 (그라데이션 없음, 난수 없음)
function drawPoisonCloud(ctx, h) {
  const t = performance.now() / 1000;
  const fade = Math.min(1, h.life / 0.6, (h.maxLife - h.life) / 0.25 + 0.2);
  ctx.save();
  ctx.globalAlpha = 0.22 * fade;
  ctx.fillStyle = '#5fbf3a';
  ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.18 * fade;
  ctx.fillStyle = '#9be35a';
  for (let i = 0; i < 3; i++) {
    const a = t * 0.6 + i * 2.1;
    ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * h.r * 0.35, h.y + Math.sin(a) * h.r * 0.25, h.r * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.6 * fade;
  ctx.fillStyle = '#c6ff4d';
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.5 + i / 6) % 1;
    ctx.beginPath(); ctx.arc(h.x + Math.cos(i * 1.7) * h.r * 0.6, h.y + Math.sin(i * 2.3) * h.r * 0.4 - p * 18, 2.5 * (1 - p) + 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 둔화(냉기) 중인 주인공 발밑 서리 고리
export function drawHeroChill(ctx) {
  const h = game.hero;
  if (!(h.slowTimer > 0) || !h.alive) return;
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 160) * 0.15;
  ctx.strokeStyle = '#bfeaff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + h.r * 0.7, h.r * 1.3, h.r * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 투지(최대 체력 증가) 중: 발밑에 붉은 오라가 맥동하고 불티가 위로 올라감. 끝나기 2초 전부터 깜빡임
// 불티 위치는 시간 t + hash01(결정적) - 게임 난수 안 씀
export function drawHeroFortify(ctx, t) {
  const h = game.hero;
  if (!(h.fortifyTimer > 0) || !h.alive) return;
  const ending = h.fortifyTimer < 2;
  const blink = ending ? (Math.sin(t * 18) > 0 ? 1 : 0.35) : 1;
  const pulse = 0.5 + Math.sin(t * 5) * 0.5;
  ctx.save();
  ctx.globalAlpha = (0.18 + pulse * 0.12) * blink;
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + h.r * 0.7, h.r * (1.5 + pulse * 0.15), h.r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85 * blink;
  ctx.strokeStyle = '#ff8a4d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + h.r * 0.7, h.r * (1.35 + pulse * 0.2), h.r * (0.58 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.stroke();
  // 불티: 몸 둘레에서 위로 떠오르며 사라짐
  ctx.fillStyle = '#ffb066';
  for (let i = 0; i < 7; i++) {
    const life = (t * 0.9 + hash01(i, 11, 3)) % 1;
    const a = hash01(i, 12, 3) * Math.PI * 2;
    const px = h.x + Math.cos(a) * h.r * 1.1;
    const py = h.y + h.r * 0.5 - life * 46;
    ctx.globalAlpha = (1 - life) * 0.9 * blink;
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
  ctx.restore();
}

// 면역 표시: 면역인 속성마다 머리 위에 "물리 면역" 같은 글자 (cows = 화면에 보이는 몬스터만)
const IMMUNE_KEYS = ['phys', ...ELEMENTS];
const IMMUNE_LABEL = { phys: { text: '물리 면역', color: '#e0e0e0' }, ...Object.fromEntries(ELEMENTS.map((el) => [el, { text: `${ELEMENT_DEF[el].label} 면역`, color: ELEMENT_DEF[el].color }])) };
export function drawImmuneLabels(ctx, cows) {
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  cows.forEach((c) => {
    if (c.state === 'dead') return;
    const keys = IMMUNE_KEYS.filter((k) => resistOf(c, k) >= 1);
    if (!keys.length) return;
    const top = c.y - 70 * c.scale - 8; // 몸통 원(발 위 40*scale, 반지름 30*scale) 위
    keys.forEach((k, i) => {
      const y = top - (keys.length - 1 - i) * 12;
      ctx.strokeText(IMMUNE_LABEL[k].text, c.x, y);
      ctx.fillStyle = IMMUNE_LABEL[k].color;
      ctx.fillText(IMMUNE_LABEL[k].text, c.x, y);
    });
  });
  ctx.restore();
}

// 클릭 공격 목표 표시: 발밑 빨간 고리
export function drawAttackTargetMarker(ctx) {
  const c = input.attackTarget;
  if (!c || c.state === 'dead') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,91,82,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + c.r * 0.55, c.r * 1.1, c.r * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 클릭 이동 표시: 찍은 지점에 줄어드는 고리 (0.45초)
export function drawMoveMarker(ctx) {
  const m = ui.moveMarker;
  if (!m) return;
  const p = (performance.now() - m.t0) / 450;
  if (p >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.strokeStyle = '#9be39b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, 14 * (1 - p * 0.6), 7 * (1 - p * 0.6), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawParticles(ctx) {
  game.particles.forEach((p) => {
    const a = Math.max(p.life / p.maxLife, 0);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * a + 1, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

export function drawHazards(ctx) {
  game.hazards.forEach((h) => {
    if (h.element === 'poison') { drawPoisonCloud(ctx, h); return; }
    drawFireField(ctx, h);
  });
}

export function drawLightningBolts(ctx) {
  game.lightningBolts.forEach((b) => {
    const alpha = Math.max(0, b.life / b.maxLife);
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist, ny = dx / dist;
    const segs = 6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff066';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const jitter = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 14;
      const px = b.x1 + dx * t + nx * jitter;
      const py = b.y1 + dy * t + ny * jitter;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  });
}

export function drawShockwaves(ctx) {
  game.shockwaves.forEach((s) => {
    const t = s.age / s.duration;
    const r = Math.max(s.maxRadius * t, 1);
    const alpha = 1 - t;

    const grad = ctx.createRadialGradient(s.x, s.y, Math.max(r - 26, 0), s.x, s.y, r);
    grad.addColorStop(0, hexToRgba(s.color, 0));
    grad.addColorStop(0.75, hexToRgba(s.color, alpha * 0.5));
    grad.addColorStop(1, hexToRgba(s.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(s.color, Math.min(alpha * 1.4, 1));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
}

export function drawFloatTexts(ctx) {
  ctx.textAlign = 'center';
  game.floatTexts.forEach((f) => {
    const t = 1 - f.life / f.maxLife;
    const pop = f.big ? (t < 0.2 ? 1 + Math.sin((t / 0.2) * Math.PI / 2) * 0.4 : 1) : 1;
    ctx.font = f.big ? `bold ${Math.round(17 * pop)}px sans-serif` : 'bold 14px sans-serif';
    ctx.globalAlpha = Math.max(f.life / f.maxLife, 0);
    ctx.fillStyle = f.color;
    if (f.big) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(f.text, f.x, f.y);
    }
    ctx.fillText(f.text, f.x, f.y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// 뼈 창 (해골 카우 킹): 진행 방향으로 긴 하얀 뼈 + 끝 마디 + 옅은 초록 꼬리
function drawBoneSpear(ctx, p) {
  const a = Math.atan2(p.dirY, p.dirX);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#7fffd4';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-8, 0); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(12, 0); ctx.stroke();
  ctx.fillStyle = '#f4efe2';
  ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(20, 0); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(-18, -2.5, 2.5, 0, Math.PI * 2); ctx.arc(-18, 2.5, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 화살 (궁수): 가는 나무 살 + 화살촉 + 깃 (해골 궁수는 초록빛 꼬리)
function drawArrow(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(p.dirY, p.dirX));
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = p.color || '#ffd36a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-10, 0); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke();
  ctx.fillStyle = '#c9ced6';
  ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(16, 0); ctx.lineTo(10, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = p.color || '#ffd36a';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-18, -3.5); ctx.lineTo(-11, 0); ctx.lineTo(-18, 3.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
