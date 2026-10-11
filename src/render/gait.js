// 몬스터 걸음걸이 (2026-10-11 사용자: 모두 콩콩 튀어서 단조로움 → 변화) - 그림만, 게임 결과는 그대로
//   종류는 data/monsters.js MONSTER_GAIT: hop 콩콩 / trot 종종(작게 빠르게 + 좌우로 흔듦) / stomp 쿵쿵(느리고 무겁게, 디딜 때 눌림)
//   scuttle 잰걸음(낮게 빠르게 + 앞으로 기울임) / sway 흔들흔들(거의 안 튀고 부드럽게 흔듦)
//   개체마다 리듬·높이가 조금씩 다름(seed = 몬스터 위상 - 게임 난수 안 씀)
import { MONSTER_GAIT } from '../data/monsters.js';
import { hash01 } from '../util.js';

// 이 몬스터의 걸음 (목록이면 개체마다 하나를 고름)
export function gaitOf(kind, seed) {
  const g = MONSTER_GAIT[kind] || 'hop';
  return Array.isArray(g) ? g[Math.floor(hash01(Math.round(seed * 1000), 7, 3) * g.length)] : g;
}

// 지금 몸 자세: { bob 위로 뜸(px), tilt 기울기(라디안, +는 앞으로), sx/sy 눌림 배율 } - 발이 원점이라 눌려도 땅에 붙어 있음
export function gaitPose(gait, state, animT, seed = 0) {
  const fq = 0.85 + hash01(Math.round(seed * 1000), 11, 5) * 0.3;   // 개체마다 리듬
  const am = 0.8 + hash01(Math.round(seed * 1000), 13, 9) * 0.4;    // 개체마다 높이
  const t = animT * fq;
  if (state === 'idle') { // 숨쉬기 (걸음 종류와 비슷한 결)
    const b = Math.abs(Math.sin(t * 2.2)) * 2 * am;
    return gait === 'stomp' ? { bob: b * 0.5, tilt: 0, sx: 1 + b * 0.006, sy: 1 - b * 0.006 } : { bob: gait === 'sway' ? 0 : b, tilt: gait === 'sway' ? Math.sin(t * 1.6) * 0.03 : 0, sx: 1, sy: 1 };
  }
  if (state !== 'walk') return { bob: 0, tilt: 0, sx: 1, sy: 1 };
  if (gait === 'trot') {
    const s = Math.sin(t * 11);
    return { bob: Math.abs(s) * 4 * am, tilt: s * 0.07, sx: 1, sy: 1 };
  }
  if (gait === 'stomp') {
    const s = Math.abs(Math.sin(t * 5));
    const land = Math.max(0, 0.25 - s) * 4;                          // 디디는 순간(아래) 눌림
    return { bob: s * 6 * am, tilt: Math.sin(t * 5) * 0.04, sx: 1 + land * 0.1, sy: 1 - land * 0.1 };
  }
  if (gait === 'scuttle') {
    const s = Math.sin(t * 17);
    return { bob: Math.abs(s) * 2.5 * am, tilt: 0.12 + s * 0.04, sx: 1, sy: 1 };
  }
  if (gait === 'sway') {
    const s = Math.sin(t * 4.5);
    return { bob: (s * 0.5 + 0.5) * 1.6 * am, tilt: s * 0.09, sx: 1, sy: 1 };
  }
  const s = Math.abs(Math.sin(t * 8)); // hop 콩콩 (예전 걸음)
  return { bob: s * 8 * am, tilt: 0, sx: 1 - s * 0.03, sy: 1 + s * 0.03 };
}
