// 가벼운 시야 (2026-10-14 사용자: 제대로 된 빛 반경은 나중 - docs/TODO.md): 화면 가장자리만 은은하게 어둡게, 막·맵마다 색
//   화면 크기·색이 바뀔 때만 오프스크린에 그라데이션을 한 번 그려 두고 매 프레임 한 장 덮음 (몬스터 수와 무관)
//   그림만 - 게임 결과에 영향 없음. 개발자 패널 '어둠 끄기'(dev.noVignette)로 끌 수 있음
import { ACTS, VIGNETTE_INNER } from '../data/acts.js';
import { MAPS } from '../data/maps.js';
import { game, dev } from '../state.js';

let cache = null; // { w, h, key, cv }

function current() {
  const run = game.run || {};
  if (run.mode === 'farm') return (MAPS[run.mapId] || {}).vignette;
  return (ACTS[game.act] || ACTS[0]).vignette;
}

export function drawVignette(ctx) {
  const v = current();
  if (!v || dev.noVignette) return;
  const { width: w, height: h } = ctx.canvas;
  const key = `${v.color}|${v.alpha}`;
  if (!cache || cache.w !== w || cache.h !== h || cache.key !== key) {
    const cv = cache && cache.cv ? cache.cv : document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    if (!c) return;
    const R = Math.hypot(w, h) / 2;
    const g = c.createRadialGradient(w / 2, h / 2, R * VIGNETTE_INNER, w / 2, h / 2, R);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, v.color);
    c.clearRect(0, 0, w, h);
    c.globalAlpha = v.alpha;
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    cache = { w, h, key, cv };
  }
  ctx.drawImage(cache.cv, 0, 0);
}
