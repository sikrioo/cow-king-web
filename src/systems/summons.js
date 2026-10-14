// 몬스터가 불러낸 몬스터 만들기 (해골 카우 킹의 해골 소환): behaviors는 game.pendingSpawns에 넣기만 하고 여기서 Monster를 만듦
//   (entities/behaviors → entities/monster 순환 import를 피하려고)
import { game } from '../state.js';
import { Monster } from '../entities/monster.js';
import { clampToPen } from '../world/arena.js';
import { sfx } from '../audio/sfx.js';

// 시체 자리 수명
export function updateCorpses(dt) {
  for (let i = game.corpses.length - 1; i >= 0; i--) { game.corpses[i].life -= dt; if (game.corpses[i].life <= 0) game.corpses.splice(i, 1); }
}

export function processSpawns() {
  if (!game.pendingSpawns.length) return;
  sfx('summon', game.pendingSpawns[0]); // 한 번 부를 때 한 번
  game.pendingSpawns.splice(0).forEach((s) => {
    const p = clampToPen(s.x, s.y, 24);
    const c = new Monster(0.4, s.kind, { pos: p, hunt: true, dropCount: 0 });
    c.summoner = s.summoner || null;
    if (s.props) Object.assign(c, s.props); // 종류별 추가 값 (악마 쥐: 대형 자리)
    if (s.squad) { c.squad = s.squad; s.squad.members.push(c); } // 부대 (쥐떼 카우)
    game.cows.push(c);
  });
}
