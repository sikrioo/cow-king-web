// 개발자 미리보기 샌드박스 - 관리자 페이지(admin.html)가 작은 창(iframe)으로 띄움. 실제 게임 코드가 그대로 돎
//   index.html?dev=1&sandbox=skill&id=fireball&lv=3  → 기본 카우 허수아비 앞에서 그 스킬을 계속 시전
//   index.html?dev=1&sandbox=monster&id=pyro          → 그 몬스터가 주인공에게 모든 행동을 함 (죽으면 다시 나옴)
// 주인공 무적·마나 무한, 웨이브·경험치(레벨업 카드) 없음. 개발자 모드에서만 (main.boot)
import { CLASSES, CLASS_ORDER } from '../data/classes.js';
import { SKILL_MAX_LEVEL } from '../data/skills.js';
import { MONSTERS } from '../data/monsters.js';
import { Body } from '../core/physics.js';
import { game, input, dev } from '../state.js';
import { Monster } from '../entities/monster.js';
import { SKILLS, trySlot } from './skills.js';
import { PEN } from '../world/arena.js';

const DUMMY_HP = 999999;
const CAST_GAP = 0.45;      // 스킬 대기시간이 끝난 뒤 다음 시전까지 쉬는 시간(초) - 연출이 겹치지 않게
const RESPAWN_DELAY = 1.5;  // 몬스터 미리보기: 죽거나 사라진 뒤 다시 나오기까지
// 허수아비 자리 (주인공 기준 px): 바로 앞 한 마리(근접) + 앞쪽 무리 + 옆 두 마리 (범위 스킬이 주변을 치는 것도 보이게)
const DUMMY_SPOTS = [[58, 0], [130, -40], [160, 45], [215, 0], [270, -65], [285, 60], [10, -120], [10, 120]];

// 주소에서 샌드박스 설정 읽기 (없으면 null)
export function sandboxParams(search = typeof location !== 'undefined' ? location.search : '') {
  const p = new URLSearchParams(search || '');
  const mode = p.get('sandbox');
  if (mode !== 'skill' && mode !== 'monster') return null;
  const id = p.get('id');
  if (mode === 'skill' && !SKILLS[id]) return null;
  if (mode === 'monster' && !MONSTERS[id]) return null;
  const lv = Math.max(1, Math.min(SKILL_MAX_LEVEL, Number(p.get('lv')) || 1));
  return { mode, id, lv };
}

// 스킬을 쓰는 직업 (공통 스킬·몬스터 미리보기는 전사)
export function sandboxClass(sb) {
  if (sb.mode === 'skill') return CLASS_ORDER.find((k) => CLASSES[k].skills.includes(sb.id)) || 'warrior';
  return 'warrior';
}

function dummy(x, y) {
  const c = new Monster(0.4, 'normal', { pos: { x, y } });
  c.hp = c.maxHp = DUMMY_HP;
  c.speed = 0;
  c.dmg = 0;
  c.aggroRange = 0;
  c.anchor = { x, y };
  game.cows.push(c);
  return c;
}

// resetGame 다음에 부름 (main.boot): 허수아비/몬스터 배치, 주인공 설정
export function startSandbox(sb) {
  const h = game.hero;
  const cx = PEN.x + PEN.size / 2, cy = PEN.y + PEN.size / 2;
  game.sandbox = { ...sb, timer: 0.8, anchor: { x: cx, y: cy }, respawn: 0 };
  dev.god = true;
  dev.infiniteMana = true;
  game.waveTransition = Infinity; // 웨이브 없음
  game.demoTipTimer = 0;
  h.facing = 0;
  if (sb.mode === 'skill') {
    h.skillLevels[sb.id] = sb.lv;
    h.slot1 = sb.id;
    DUMMY_SPOTS.forEach(([dx, dy]) => dummy(cx + dx, cy + dy));
  } else {
    spawnTarget();
  }
}

function spawnTarget() {
  const sb = game.sandbox, { x, y } = sb.anchor;
  const boss = sb.id === 'boss';
  const c = new Monster(boss ? 1.0 : 0.4, sb.id, { pos: { x: x + (boss ? 320 : 240), y }, hunt: true });
  c.hp = c.maxHp = DUMMY_HP;
  c.sandboxTarget = true;
  game.cows.push(c);
  // 주술사 치유·광신 오라 같은 '동료에게 하는 행동'도 보이게 다친 허수아비 둘
  if (!game.cows.some((k) => k.anchor)) {
    [[260, -70], [260, 70]].forEach(([dx, dy]) => { const d = dummy(x + dx, y + dy); d.hp = Math.round(DUMMY_HP / 2); });
  }
}

const heroBusy = (h) => h.whirlwindTimer > 0 || h.leapTimer > 0 || h.rushTimer > 0 || h.smashTimer > 0 || h.attackTimer > 0;

// 매 틱 (game.fixedUpdate): 허수아비 제자리·체력 유지, 스킬 반복 시전 / 몬스터 다시 내보내기
export function updateSandbox(dt) {
  const sb = game.sandbox, h = game.hero;
  game.cows.forEach((c) => {
    if (c.state === 'dead') return;
    if (c.hp < c.maxHp * 0.3) c.hp = c.maxHp; // 안 죽게
    if (c.anchor && !(c.knockback > 0)) { // 밀려나도 천천히 제자리로
      const nx = c.x + (c.anchor.x - c.x) * 0.08, ny = c.y + (c.anchor.y - c.y) * 0.08;
      Body.setPosition(c.body, { x: nx, y: ny });
      c.x = nx; c.y = ny;
    }
  });
  if (sb.mode === 'monster') {
    Body.setPosition(h.body, sb.anchor); Body.setVelocity(h.body, { x: 0, y: 0 }); h.x = sb.anchor.x; h.y = sb.anchor.y;
    if (!game.cows.some((c) => c.sandboxTarget && c.state !== 'dead')) {
      sb.respawn += dt;
      if (sb.respawn >= RESPAWN_DELAY) { sb.respawn = 0; spawnTarget(); }
    }
    return;
  }
  // 스킬: 대기시간이 끝나고 동작이 끝나면 제자리로 돌아와 앞(허수아비 쪽)을 보고 다시 시전
  sb.timer -= dt;
  if (sb.timer > 0 || heroBusy(h)) return;
  Body.setPosition(h.body, sb.anchor); Body.setVelocity(h.body, { x: 0, y: 0 }); h.x = sb.anchor.x; h.y = sb.anchor.y;
  input.mouseScreen = null; // 커서 대신 바라보는 방향으로
  h.facing = 0;
  trySlot(1);
  const s = SKILLS[sb.id];
  sb.timer = Math.max(s.cd(), 0) + CAST_GAP;
}
