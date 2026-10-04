// 캔버스/2D 컨텍스트와 화면 크기 맞춤
import { PEN, setupWalls } from './physics.js';

export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');

export function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const pad = Math.max(20, Math.min(canvas.width, canvas.height) * 0.05);
  PEN.size = Math.min(canvas.width, canvas.height) - pad * 2;
  PEN.x = (canvas.width - PEN.size) / 2;
  PEN.y = (canvas.height - PEN.size) / 2;
  setupWalls();
}
