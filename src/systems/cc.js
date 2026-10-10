// 군중 제어(CC) 한 곳: 변이(양)·기절·경직을 몬스터에 거는 규칙
//   우선순위 CC_RANK(변이 > 기절 > 경직): 더 높은 것이 걸려 있으면 낮은 것은 무시
//   보스(카우킹·맵 보스)는 전부 면역 - 둔화만 절반(behaviors.getAuraSpeedMult)
//   걸리는 순간 하던 특수 행동(돌진 예고·돌진, 번개 충전, 마법 시전, 근접 공격)이 끊김 → 종류별 정리는 behaviors의 interrupt 훅
import { CC_RANK } from '../data/balance.js';
import { SPELLS } from '../data/skills.js';
import { MONSTERS } from '../data/monsters.js';

export function isBossCow(c) {
  return c.kind === 'boss' || !!c.mapBoss || !!(MONSTERS[c.kind] && MONSTERS[c.kind].boss);
}

export const isSheep = (c) => c.stunTimer > 0 && c.ccKind === 'poly';

// kind: 'poly' | 'stun' | 'stagger', time: 초. 걸렸으면 true
export function applyCC(c, kind, time) {
  if (!c || c.state === 'dead' || !(time > 0) || isBossCow(c)) return false;
  const active = c.stunTimer > 0;
  if (active && CC_RANK[c.ccKind] > CC_RANK[kind]) return false;
  c.stunTimer = active && c.ccKind === kind ? Math.max(c.stunTimer, time) : time;
  c.ccKind = kind;
  if (c.behavior && c.behavior.interrupt) c.behavior.interrupt(c);
  if (c.setState) c.setState('stunned', 0);
  return true;
}

// 변이(양): 엘리트는 짧게, 같은 적에게 drWindow초 안에 다시 걸면 줄어들고 세 번째는 면역 (보스는 applyCC에서 면역)
export function applyPoly(c, time) {
  const s = SPELLS.polymorph;
  if (!c || c.state === 'dead' || isBossCow(c)) return false;
  const n = c.polyDrT > 0 ? (c.polyN || 0) + 1 : 1;
  if (n >= 3) return false;
  const t = time * (c.kind !== 'normal' ? s.eliteMul : 1) * (n === 2 ? s.drMul : 1);
  if (!applyCC(c, 'poly', t)) return false;
  c.polyN = n;
  c.polyDrT = s.drWindow;
  c.sheepDir = null;
  return true;
}

// 매 틱 (Monster.update): 변이 반복 감소 시간
export function updateCC(c, dt) {
  if (c.polyDrT > 0) c.polyDrT -= dt;
}
