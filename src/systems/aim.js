// 조준 한 곳: 공격·스킬을 쓰기 직전에 바라보는 방향(hero.facing)과 목표 지점(hero.aimX/aimY - 눈보라·화염기둥 같은 지점 스킬)을 정함
//   PC(마우스를 쓴 적 있음): 커서 방향. 커서가 적 위에 있거나, 커서 방향 ±AIM_ASSIST_ANGLE 안에 적이 있으면 그 적에 정확히 맞춤(흡착)
//   모바일·키보드만(커서 없음): 사거리 안의 가까운 적을 자동 조준 (바라보는 쪽에 있는 적 우선)
//   자동 조준을 끄면(G, game.releaseMeta.autoAim === false) PC는 커서 그대로, 모바일은 바라보는 방향 그대로
//   mode 'free'(순간이동처럼 적을 겨누면 안 되는 스킬): 적 보정 없이 커서/바라보는 방향만
// 수치는 data/balance.js AUTO_AIM_* / AIM_ASSIST_ANGLE
import { AUTO_AIM_RANGE, AUTO_AIM_FACING_WEIGHT, AIM_ASSIST_ANGLE, AIM_DEFAULT_DISTANCE, CLICK_PICK_PADDING } from '../data/balance.js';
import { game, input } from '../state.js';
import { canHit, getCowBody, cowEdgeDist } from './combat.js';
import { screenToWorld } from '../world/camera.js';

export const autoAimOn = () => game.releaseMeta.autoAim !== false;

const angleDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
const alive = () => game.cows.filter((c) => c.state !== 'dead' && canHit(game.hero, c));

function face(x, y) {
  const h = game.hero;
  const dx = x - h.x, dy = y - h.y;
  if (Math.hypot(dx, dy) > 4) h.facing = Math.atan2(dy, dx);
  h.aimX = x; h.aimY = y;
}
// 적을 겨눔: 방향은 그림의 몸통(투사체가 맞는 높이), 지점은 발밑
function faceCow(c) {
  const b = getCowBody(c), h = game.hero;
  h.facing = Math.atan2(b.y - h.y, b.x - h.x);
  h.aimX = c.x; h.aimY = c.y;
  return c;
}

// 시전 직전에 부름 (skills.trySlot, 제자리 공격). 반환: 겨눈 적(없으면 null)
// range: 이 스킬의 사거리 - 자동 조준·흡착은 이 안의 적만 (없으면 AUTO_AIM_RANGE)
export function aim(mode = 'target', range = AUTO_AIM_RANGE) {
  const reach = Math.min(range, AUTO_AIM_RANGE);
  const h = game.hero;
  if (!h.alive) return null;
  const assist = mode !== 'free' && autoAimOn();
  if (input.mouseScreen) {
    const w = screenToWorld(input.mouseScreen.x, input.mouseScreen.y);
    if (assist) {
      const cows = alive();
      // 커서가 적 위
      const under = cows.find((c) => cowEdgeDist(c, w.x, w.y) <= CLICK_PICK_PADDING);
      if (under) return faceCow(under);
      // 커서 방향 근처의 사거리 안 적 (각도 차가 가장 작은 것)
      const a = Math.atan2(w.y - h.y, w.x - h.x);
      let best = null, bestD = AIM_ASSIST_ANGLE;
      cows.forEach((c) => {
        const b = getCowBody(c);
        if (Math.hypot(b.x - h.x, b.y - h.y) > reach) return;
        const d = angleDiff(Math.atan2(b.y - h.y, b.x - h.x), a);
        if (d <= bestD) { bestD = d; best = c; }
      });
      if (best) return faceCow(best);
    }
    face(w.x, w.y);
    return null;
  }
  // 커서 없음: 가까운 적 (거리 × (1 + 바라보는 방향과의 각도 차 × 가중치) 가 가장 작은 것)
  if (assist) {
    let best = null, bestScore = Infinity;
    alive().forEach((c) => {
      const b = getCowBody(c);
      const d = Math.hypot(b.x - h.x, b.y - h.y);
      if (d > reach) return;
      const score = d * (1 + angleDiff(Math.atan2(b.y - h.y, b.x - h.x), h.facing) * AUTO_AIM_FACING_WEIGHT);
      if (score < bestScore) { bestScore = score; best = c; }
    });
    if (best) return faceCow(best);
  }
  face(h.x + Math.cos(h.facing) * AIM_DEFAULT_DISTANCE, h.y + Math.sin(h.facing) * AIM_DEFAULT_DISTANCE);
  return null;
}
