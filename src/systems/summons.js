// 몬스터가 불러낸 몬스터 만들기 (해골 카우 킹의 해골 소환): behaviors는 game.pendingSpawns에 넣기만 하고 여기서 Monster를 만듦
//   (entities/behaviors → entities/monster 순환 import를 피하려고)
import { game } from '../state.js';
import { Monster } from '../entities/monster.js';
import { clampToPen } from '../world/arena.js';

export function processSpawns() {
  if (!game.pendingSpawns.length) return;
  game.pendingSpawns.splice(0).forEach((s) => {
    const p = clampToPen(s.x, s.y, 24);
    const c = new Monster(0.4, s.kind, { pos: p, hunt: true, dropCount: 0 });
    c.summoner = s.summoner || null;
    game.cows.push(c);
  });
}
