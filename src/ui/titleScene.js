// 타이틀/맵 선택 화면 배경: 목장 가운데를 돌아다니는 소들 (ui 상태만 바꿈), 타이틀 캐릭터 고르기
import { ui } from '../state.js';
import { PEN } from '../world/arena.js';
import { viewSize } from '../world/camera.js';
import { CLASS_ORDER } from '../data/classes.js';

// 타이틀 소들이 돌아다니는 영역: 목장 가운데의 화면에 보이는 만큼
function titleArea() {
  const v = viewSize();
  const w = Math.min(v.w, PEN.size), h = Math.min(v.h, PEN.size);
  return { x: PEN.x + (PEN.size - w) / 2, y: PEN.y + (PEN.size - h) / 2, w, h };
}

export function initTitleScene() {
  ui.titleCows = [];
  const area = titleArea();
  const count = Math.max(7, Math.min(12, Math.round(Math.min(area.w, area.h) / 70)));
  for (let i = 0; i < count; i++) {
    const p = { x: area.x + area.w * (0.1 + Math.random() * 0.8), y: area.y + area.h * (0.1 + Math.random() * 0.8) };
    const a = Math.random() * Math.PI * 2;
    ui.titleCows.push({
      x: p.x, y: p.y,
      vx: Math.cos(a) * (10 + Math.random() * 14),
      vy: Math.sin(a) * (8 + Math.random() * 12),
      scale: 0.23 + Math.random() * 0.12,
      phase: Math.random() * 8,
      facing: Math.cos(a) >= 0 ? 1 : -1
    });
  }
}

export function updateTitleScene(dt) {
  ui.titleTime += dt;
  if (!ui.titleCows.length) initTitleScene();
  const area = titleArea();
  const minX = area.x + 34, maxX = area.x + area.w - 34;
  const minY = area.y + 40, maxY = area.y + area.h - 32;
  ui.titleCows.forEach((c, i) => {
    c.vx += Math.sin(ui.titleTime * 0.7 + c.phase + i) * 2.2 * dt;
    c.vy += Math.cos(ui.titleTime * 0.6 + c.phase * 1.3) * 1.8 * dt;
    const sp = Math.hypot(c.vx, c.vy) || 1;
    const maxSp = 24;
    if (sp > maxSp) { c.vx = c.vx / sp * maxSp; c.vy = c.vy / sp * maxSp; }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.x < minX || c.x > maxX) { c.vx *= -1; c.x = Math.max(minX, Math.min(maxX, c.x)); }
    if (c.y < minY || c.y > maxY) { c.vy *= -1; c.y = Math.max(minY, Math.min(maxY, c.y)); }
    if (Math.abs(c.vx) > 0.2) c.facing = c.vx > 0 ? 1 : -1;
  });
}

// 타이틀 캐릭터 고르기 (키보드 ←/→, 카드 클릭은 input.js)
export function cycleTitleClass(dir) {
  const i = CLASS_ORDER.indexOf(ui.selectedClass);
  ui.selectedClass = CLASS_ORDER[(i + dir + CLASS_ORDER.length) % CLASS_ORDER.length];
}
