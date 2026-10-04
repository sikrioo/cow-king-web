// 캔버스/2D 컨텍스트와 화면 크기 맞춤
export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');

export function resizeCanvas() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
