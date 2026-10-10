// 마법사 지점 마법 그림 2: 화염 토템, 냉기 장판(네모), 전기충격 예고 - render/skillFx.js가 부름. 상태는 읽기만, 들쭉날쭉한 모양은 hash01
import { SPELLS } from '../data/skills.js';
import { hash01, easeOutCubic } from '../util.js';

// 바닥(몬스터 아래)
export function drawMagicUnder(ctx, g, t, gi) {
  if (g.kind === 'frostfield') {
    const fade = Math.min(1, g.age * 4, (g.duration - g.age) * 2);
    const k = easeOutCubic(Math.min(1, g.age / 0.25)); // 펼쳐짐
    const w = g.w * k, hh = g.h * k;
    ctx.globalAlpha = 0.22 * fade;
    ctx.fillStyle = '#bfeaff';
    ctx.fillRect(g.x - w / 2, g.y - hh / 2, w, hh);
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = '#e8f7ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(g.x - w / 2, g.y - hh / 2, w, hh);
    ctx.strokeStyle = '#ffffff'; // 얼음 결정 무늬 (작은 별)
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) {
      const x = g.x + (hash01(i, gi, 91) - 0.5) * w * 0.9, y = g.y + (hash01(i, gi, 92) - 0.5) * hh * 0.85, r = 4 + hash01(i, gi, 93) * 4;
      ctx.globalAlpha = (0.4 + Math.sin(t * 3 + i) * 0.25) * fade;
      ctx.beginPath();
      for (let j = 0; j < 3; j++) { const a = (j * Math.PI) / 3; ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      ctx.stroke();
    }
  } else if (g.kind === 'thunder' && !g.struck) {
    const k = Math.min(1, g.age / SPELLS.thunderstrike.delay); // 떨어질 자리 - 좁아지는 노란 고리
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#fff066';
    ctx.lineWidth = 2;
    const r = 34 * (1.6 - k * 0.6);
    ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (g.kind === 'firetotem') {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(g.x, g.y, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// 위(몬스터 위): 화염 토템 기둥 + 꼭대기 불꽃, 끝나기 1초 전부터 깜빡임
export function drawMagicOver(ctx, g, t, gi) {
  if (g.kind !== 'firetotem') return;
  const rise = easeOutCubic(Math.min(1, g.age / 0.25));
  const blink = g.duration - g.age < 1 && Math.floor(t * 10) % 2;
  ctx.globalAlpha = blink ? 0.5 : 1;
  const top = g.y - 40 * rise;
  ctx.fillStyle = '#4a2a1a'; // 기둥 (나무 + 띠)
  ctx.fillRect(g.x - 7, top, 14, g.y - top);
  ctx.fillStyle = '#8a4a22';
  ctx.fillRect(g.x - 9, top + 8, 18, 4);
  ctx.fillRect(g.x - 9, top + 22, 18, 4);
  ctx.fillStyle = '#2a160c';
  ctx.beginPath(); ctx.arc(g.x - 3, top + 15, 1.6, 0, Math.PI * 2); ctx.arc(g.x + 3, top + 15, 1.6, 0, Math.PI * 2); ctx.fill(); // 얼굴
  for (let i = 0; i < 4; i++) { // 꼭대기 불꽃
    const ox = (hash01(i, gi, Math.floor(t * 14)) - 0.5) * 12, hgt = (10 + hash01(i, gi + 3, Math.floor(t * 14)) * 10) * rise;
    ctx.fillStyle = i % 2 ? '#ffb347' : '#ff5a1e';
    ctx.beginPath(); ctx.moveTo(g.x + ox - 5, top); ctx.lineTo(g.x + ox, top - hgt); ctx.lineTo(g.x + ox + 5, top); ctx.closePath(); ctx.fill();
  }
}
