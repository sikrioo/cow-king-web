// 휴리스틱 봇 (규칙으로 판단): 관측(bot/observe.js) → 행동(bot/act.js). 화면 흐름(타이틀·맵 선택·죽음)도 스스로 넘김
//   우선순위: 카드 고르기 → 물약 → 감옥 창살 부수기 → 피하기(지역 공격·돌진 줄·투사체) → 스킬 → 공격(마법사는 거리 유지) → 줍기·대기
//   판단에 쓰는 수치는 data/bot.js BOT (튜닝용 숫자를 코드에 박지 않음). mem = 봇 기억(틱 사이 유지)
import { BOT, BOT_BUILD } from '../data/bot.js';
import { IDLE } from './act.js';
import { detourPoint, obstacleAt } from '../world/arena.js';

const len = (x, y) => Math.hypot(x, y) || 1;
const norm = (x, y) => { const l = len(x, y); return { x: x / l, y: y / l }; };

// 맵 끝에서 멀어지게 섞기 (구석에 몰리지 않게)
function withCenterPull(obs, v) {
  const p = obs.pen, h = obs.hero, m = BOT.edge;
  let x = v.x, y = v.y;
  if (h.x < p.x + m) x += 1; if (h.x > p.x + p.size - m) x -= 1;
  if (h.y < p.y + m) y += 1; if (h.y > p.y + p.size - m) y -= 1;
  return norm(x, y);
}

// 구조물 비켜 가기 (몬스터와 같은 방식 - systems/obstacles.js): 가려는 쪽 가까이에 구조물이 있으면 둘레(접선) 쪽으로
function aroundObstacles(obs, v) {
  const h = obs.hero;
  let best = null;
  for (const o of obs.obstacles) {
    const dx = o.bx - o.ax, dy = o.by - o.ay, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((h.x - o.ax) * dx + (h.y - o.ay) * dy) / l2)) : 0;
    const nx = o.ax + dx * t - h.x, ny = o.ay + dy * t - h.y, d = len(nx, ny);
    const gap = d - o.r - h.r;
    if (gap > BOT.avoidLook) continue;
    const toward = (v.x * nx + v.y * ny) / d;
    if (toward <= 0.15) continue;
    const w = Math.min(1, Math.max(0, 1 - gap / BOT.avoidLook)) * toward;
    if (!best || w > best.w) best = { w, ox: nx / d, oy: ny / d, o, t };
  }
  if (!best) return v;
  let tx = -best.oy, ty = best.ox;
  const o = best.o, line = o.bx !== o.ax || o.by !== o.ay;
  if (line) { if ((tx * (o.bx - o.ax) + ty * (o.by - o.ay) > 0) !== (best.t > 0.5)) { tx = -tx; ty = -ty; } } // 울타리: 가까운 끝 쪽
  else if (tx * v.x + ty * v.y < 0) { tx = -tx; ty = -ty; }
  return norm(v.x + tx * best.w * 1.8 - best.ox * best.w * 0.5, v.y + ty * best.w * 1.8 - best.oy * best.w * 0.5);
}

function chooseCard(obs) {
  const slotted = [obs.hero.slot1 && obs.hero.slot1.id, obs.hero.slot2 && obs.hero.slot2.id];
  const prio = (BOT_BUILD[obs.hero.cls] || BOT_BUILD.warrior).skills.slice(0, 4); // 슬롯에 넣고 싶은 스킬 (bot/upkeep.js가 넣음)
  const score = (c) => (c.type === 'newSkill' && prio.includes(c.id) ? 6 : c.type === 'skillUp' && slotted.includes(c.id) ? 5 : c.type === 'mastery' ? 4 : c.type === 'upgrade' ? 3 : c.type === 'skillUp' ? 2 : c.type === 'newSkill' ? 1 : 0);
  let best = 0;
  obs.cards.forEach((c, i) => { if (score(c) > score(obs.cards[best])) best = i; });
  return best;
}

// 피해야 할 방향 (없으면 null): 지역 공격 안 → 밖으로 / 돌진 줄 위 → 옆으로 / 날아오는 투사체 → 옆으로
function dodge(obs) {
  const h = obs.hero;
  for (const d of obs.dangers) {
    const dist = Math.hypot(h.x - d.x, h.y - d.y);
    if (dist < d.r + h.r + BOT.dodgePad) return norm(h.x - d.x + 0.01, h.y - d.y);
  }
  for (const m of obs.monsters) {
    if (!m.line || m.dist > BOT.lineWatch) continue;
    const rx = h.x - m.x, ry = h.y - m.y, ahead = rx * m.line.x + ry * m.line.y;
    const side = rx * -m.line.y + ry * m.line.x; // 줄에서 옆으로 떨어진 거리(부호 = 어느 쪽)
    if (ahead > 0 && Math.abs(side) < BOT.lineWidth) { const s = side >= 0 ? 1 : -1; return { x: -m.line.y * s, y: m.line.x * s }; }
  }
  for (const p of obs.shots) {
    const rx = h.x - p.x, ry = h.y - p.y, ahead = rx * p.dx + ry * p.dy;
    if (ahead <= 0 || ahead > BOT.shotWatch) continue;
    const side = rx * -p.dy + ry * p.dx;
    if (Math.abs(side) < p.r + h.r + BOT.dodgePad) { const s = side >= 0 ? 1 : -1; return { x: -p.dy * s, y: p.dx * s }; }
  }
  return null;
}

// 가장 덜 위험한 방향: 여러 방향으로 조금 가 본 자리에서 적 위협(가중치 / 거리)의 합 + 위험 지역·맵 끝·구조물 벌점이 가장 작은 쪽
function safestDir(obs, foes) {
  const h = obs.hero, p = obs.pen, step = BOT.escapeStep;
  let best = null;
  for (let i = 0; i < BOT.escapeDirs; i++) {
    const a = (i / BOT.escapeDirs) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), x = h.x + dx * step, y = h.y + dy * step;
    let s = 0;
    if (x < p.x + BOT.edge * 0.5 || y < p.y + BOT.edge * 0.5 || x > p.x + p.size - BOT.edge * 0.5 || y > p.y + p.size - BOT.edge * 0.5) s += 50;
    if (obstacleAt(x, y, h.r)) s += 50;
    obs.dangers.forEach((d) => { if (Math.hypot(x - d.x, y - d.y) < d.r + h.r) s += 30; });
    foes.forEach((m) => {
      const w = m.boss ? BOT.threatBoss : m.threat ? BOT.threatCharging : m.ranged ? BOT.threatRanged : 1;
      s += w * 100 / Math.max(25, Math.hypot(x - m.x, y - m.y));
    });
    if (!best || s < best.s) best = { s, x: dx, y: dy };
  }
  return best && { x: best.x, y: best.y };
}

export function decide(obs, mem, dt) {
  const a = { ...IDLE };
  // 화면 흐름: 잠깐 기다렸다가 넘김 (타이틀/죽음/승리 → 다음, 맵 선택 → 입장)
  if (obs.screen !== 'playing') {
    mem.flowT = (mem.flowT || 0) + dt;
    if (mem.flowT < BOT.flowWait) return a;
    mem.flowT = 0;
    a.flow = obs.screen === 'hub' ? 'enter' : 'advance';
    return a;
  }
  mem.flowT = 0;
  if (obs.cards) { // 카드는 cardWait초 보여 준 뒤 고름 (게임은 카드가 떠 있는 동안 멈춰 있음)
    mem.cardT = (mem.cardT || 0) + dt;
    if (mem.cardT >= BOT.cardHoverAt) a.cardHover = chooseCard(obs); // 고를 카드에 잠깐 마우스를 올림
    if (mem.cardT >= BOT.cardWait) { mem.cardT = 0; a.card = chooseCard(obs); }
    return a;
  }
  mem.cardT = 0;
  const h = obs.hero;
  if (!h.alive || obs.paused) return a;

  if (h.hp < h.maxHp * BOT.healAt && h.potions.heal > 0 && h.potionReady.heal) a.potion = 'heal';
  else if (h.mana < h.maxMana * BOT.manaAt && h.potions.mana > 0 && h.potionReady.mana) a.potion = 'mana';

  const foes = obs.monsters.filter((m) => !m.prop).sort((p, q) => p.dist - q.dist);
  // 감옥에 갇히면: 가장 가까운 창살부터 부숨
  if (h.jail) {
    const bar = obs.monsters.filter((m) => m.prop).sort((p, q) => p.dist - q.dist)[0];
    if (bar) { a.attack = bar.ref; return a; }
  }
  // 막힘 풀기: 움직이려는데 한동안 제자리면 옆으로 잠깐
  if (mem.unstuck > 0) { mem.unstuck -= dt; a.move = mem.unstuckDir; return a; }
  const moved = mem.last ? Math.hypot(h.x - mem.last.x, h.y - mem.last.y) : 1;
  mem.last = { x: h.x, y: h.y };
  if (mem.wantMove && moved < 0.2) mem.stuckT = (mem.stuckT || 0) + dt; else mem.stuckT = 0;
  if (mem.stuckT > BOT.stuckTime) {
    mem.stuckT = 0; mem.unstuck = BOT.unstuckTime; mem.flip = -(mem.flip || 1);
    const d = mem.wantMove; mem.unstuckDir = { x: -d.y * mem.flip, y: d.x * mem.flip };
    a.move = mem.unstuckDir; return a;
  }
  mem.wantMove = null;

  const away = dodge(obs);
  if (away && !h.busy) { a.move = withCenterPull(obs, away); a.run = true; mem.wantMove = a.move; return a; }

  // 생존: 체력이 낮은데 바로 마실 생명 물약이 없으면 - 바닥 생명 물약으로, 없으면 가장 덜 위험한 쪽으로 달림
  //   체력 회복이 없어서 도망은 '곧 마실 수 있을 때'(물약이 있고 대기 중)만 - 물약이 하나도 없으면 도망 대신 조심해서 싸움(외톨이 적부터, 아래)
  const lowHp = h.hp < h.maxHp * BOT.surviveHp && !(h.potions.heal > 0 && h.potionReady.heal);
  const noPotion = !(h.potions.heal > 0);
  if (lowHp && foes.length) {
    const pot = obs.items.filter((it) => it.type === 'heal').sort((p, q) => Math.hypot(p.x - h.x, p.y - h.y) - Math.hypot(q.x - h.x, q.y - h.y))[0];
    if (pot && Math.hypot(pot.x - h.x, pot.y - h.y) < BOT.potionRange) { a.move = aroundObstacles(obs, norm(pot.x - h.x, pot.y - h.y)); a.run = true; mem.wantMove = a.move; return a; }
    // 물약이 하나도 없으면 도망쳐도 회복이 없어 끝없이 쫓김 → 싸움(외톨이부터)
    if (!noPotion) { const esc = safestDir(obs, foes.filter((m) => m.dist < 400)); if (esc) { a.move = esc; a.run = true; mem.wantMove = a.move; return a; } }
  }
  // 보스가 크게 때리려는 중(예고)이면 그 둘레에서 벗어남
  const bossWindup = foes.find((m) => m.boss && m.threat && m.dist < 230);
  if (bossWindup && !h.busy) { const esc = safestDir(obs, foes.filter((m) => m.dist < 400)); if (esc) { a.move = esc; a.run = true; mem.wantMove = a.move; return a; } }

  // 조언자 전술 (bot/advisor.js): retreat = 무리 반대쪽으로 달림, loot = 적이 붙기 전까지 줍기 먼저, hold = 제자리에서 사거리 안만
  if (mem.tactic === 'retreat' && foes.length) {
    const g = foes.slice(0, 5), cx = g.reduce((s, m) => s + m.x, 0) / g.length, cy = g.reduce((s, m) => s + m.y, 0) / g.length;
    a.move = aroundObstacles(obs, withCenterPull(obs, norm(h.x - cx, h.y - cy))); a.run = true; mem.wantMove = a.move;
    return a;
  }
  if (mem.tactic === 'loot' && obs.items.length && !(foes[0] && foes[0].dist < BOT.crowdRadius)) {
    const it = obs.items.slice().sort((p, q) => Math.hypot(p.x - h.x, p.y - h.y) - Math.hypot(q.x - h.x, q.y - h.y))[0];
    a.move = aroundObstacles(obs, norm(it.x - h.x, it.y - h.y)); mem.wantMove = a.move;
    return a;
  }
  if (mem.tactic === 'hold') {
    const inReach = foes.find((m) => m.dist <= m.reach);
    if (inReach) a.attack = inReach.ref;
    return a;
  }
  // 먼저 잡을 적(치유·소환·저주 등)이 가깝고 길이 열려 있으면 그쪽부터
  const prio = foes.find((m) => BOT.priorityKinds.includes(m.kind) && m.dist < BOT.priorityRange && !detourPoint(h.x, h.y, m.x, m.y, h.r));
  // 체력이 낮고 물약도 없으면: 가까운 적 중 주변에 동료가 가장 적은(외톨이) 적부터
  const lonely = lowHp && noPotion && foes.length > 1 ? foes.slice(0, 6).map((m) => ({ m, n: foes.filter((q) => q !== m && Math.hypot(q.x - m.x, q.y - m.y) < BOT.crowdRadius).length })).sort((p, q) => p.n - q.n || p.m.dist - q.m.dist)[0].m : null;
  const near = prio || lonely || foes[0];
  if (!near) { // 싸울 적이 없으면: 막 넘기기 전에 바닥 아이템 줍기 → 가운데 근처에서 대기
    const it = obs.items.slice().sort((p, q) => Math.hypot(p.x - h.x, p.y - h.y) - Math.hypot(q.x - h.x, q.y - h.y))[0];
    if (it && Math.hypot(it.x - h.x, it.y - h.y) < BOT.lootRange) { a.move = aroundObstacles(obs, norm(it.x - h.x, it.y - h.y)); mem.wantMove = a.move; return a; }
    if (obs.canNextAct) { a.nextAct = true; return a; }
    const cx = obs.pen.x + obs.pen.size / 2, cy = obs.pen.y + obs.pen.size / 2;
    if (Math.hypot(cx - h.x, cy - h.y) > BOT.homeRadius) { a.move = aroundObstacles(obs, norm(cx - h.x, cy - h.y)); mem.wantMove = a.move; }
    return a;
  }

  // 스킬: 슬롯 스킬(오라 제외)이 준비됐고 적이 가까우면 번갈아
  const castRange = h.cls === 'sorc' ? BOT.castRangeSorc : BOT.castRangeWarrior;
  if (!h.busy && !h.stunned && near.dist < castRange) {
    mem.castTurn = mem.castTurn === 1 ? 2 : 1;
    for (const n of [mem.castTurn, 3 - mem.castTurn]) {
      const s = n === 1 ? h.slot1 : h.slot2;
      if (s && s.ready && !s.aura) { a.cast = n; break; }
    }
  }
  // 둘러싸이고 체력이 줄면 무리 반대쪽으로 빠짐 (스킬을 쓰는 틱은 제외)
  const crowd = foes.filter((m) => m.dist < BOT.crowdRadius);
  if (mem.retreatCd > 0) mem.retreatCd -= dt;
  if (!a.cast && !(mem.retreat > 0) && !(mem.retreatCd > 0) && crowd.length >= BOT.crowdCount && h.hp < h.maxHp * BOT.crowdHp) { mem.retreat = BOT.retreatTime; mem.retreatCd = BOT.retreatCd; }
  if (mem.retreat > 0 && !a.cast) {
    mem.retreat -= dt;
    const group = crowd.length ? crowd : foes.slice(0, 3);
    const cx = group.reduce((s, m) => s + m.x, 0) / group.length, cy = group.reduce((s, m) => s + m.y, 0) / group.length;
    a.move = withCenterPull(obs, norm(h.x - cx, h.y - cy)); a.run = true; mem.wantMove = a.move;
    return a;
  }
  // 마법사: 너무 가까우면 물러남 (맵 끝 피해서)
  if (h.cls === 'sorc' && near.dist < BOT.sorcKeep && !a.cast) {
    a.move = aroundObstacles(obs, withCenterPull(obs, norm(h.x - near.x, h.y - near.y))); mem.wantMove = a.move;
    return a;
  }
  const blockedShot = near.dist > BOT.meleeLos && detourPoint(h.x, h.y, near.x, near.y, BOT.shotRadius); // 원거리: 사이에 구조물 = 투사체가 막힘
  if (near.dist > near.reach + BOT.approachPad || blockedShot) { // 멀면 직접 다가감 (구조물을 비켜서) - 가까워지면 클릭 공격처럼
    const dp = detourPoint(h.x, h.y, near.x, near.y, h.r); // 길을 막으면 구조물 모서리를 돌아서
    a.move = dp ? norm(dp.x - h.x, dp.y - h.y) : aroundObstacles(obs, norm(near.x - h.x, near.y - h.y)); mem.wantMove = a.move;
    return a;
  }
  a.attack = near.ref;
  mem.wantMove = near.dist > near.reach ? norm(near.x - h.x, near.y - h.y) : null;
  return a;
}
