// 카메라(화면에 보이는 영역): 주인공을 따라가고 맵 끝에서 멈춤. 화면이 작으면 줌을 줄임.
// 보기 전용 상태 - 게임 결과(난수/위치)에 영향을 주면 안 됨. 그리기 직전에 updateCamera로 갱신
import { CAMERA_MIN_VIEW, CAMERA_EDGE_MARGIN } from '../data/maps.js';
import { canvas } from '../core/context.js';
import { PEN } from './arena.js';

export const camera = { x: 0, y: 0, zoom: 1 };

export function cameraZoom() {
  return Math.min(1, Math.min(canvas.width, canvas.height) / CAMERA_MIN_VIEW);
}

// 보이는 영역 크기(월드 px)
export function viewSize() {
  const z = cameraZoom();
  return { w: canvas.width / z, h: canvas.height / z };
}

function clampAxis(c, view, start, size) {
  const lo = start - CAMERA_EDGE_MARGIN + view / 2;
  const hi = start + size + CAMERA_EDGE_MARGIN - view / 2;
  return lo > hi ? start + size / 2 : Math.min(Math.max(c, lo), hi); // 화면이 맵보다 크면 가운데
}

export function updateCamera(tx, ty) {
  camera.zoom = cameraZoom();
  const { w, h } = viewSize();
  camera.x = clampAxis(tx, w, PEN.x, PEN.size);
  camera.y = clampAxis(ty, h, PEN.y, PEN.size);
}

// 월드 좌표로 그리기 시작 (ctx.save() 안에서 호출)
export function applyCamera(ctx) {
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}

// 보이는 영역 { x, y, w, h } (월드 좌표)
export function viewRect() {
  const { w, h } = viewSize();
  return { x: camera.x - w / 2, y: camera.y - h / 2, w, h };
}

export function inView(x, y, margin) {
  const v = viewRect();
  return x > v.x - margin && x < v.x + v.w + margin && y > v.y - margin && y < v.y + v.h + margin;
}
