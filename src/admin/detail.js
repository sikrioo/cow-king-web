// 관리자 - 상세 보기(오른쪽 서랍): 실제 게임 미리보기 창(샌드박스 iframe) + 데이터(JSON) + 관련 코드, 몬스터 모습 카드(움직이는 그림)
import { MONSTERS, MONSTER_LABEL, MONSTER_WEAPONS, weaponFor, ELITE_KINDS } from '../data/monsters.js';
import { SKILL_META, SKILL_UNLOCK_LEVEL, SKILL_LEVEL_UP, SKILL_MAX_LEVEL, SPELLS, SKILL_STATS } from '../data/skills.js';
import { drawCow } from '../render/monsterSprites.js';
import { findFunction, findEntry } from './source.js';
import { el, select } from './ui.js';

// 스킬 → 관련 함수 (동작 코드). 이름이 바뀌면 tests/admin.test.js가 알려 줌
export const SKILL_CODE = {
  attack: ['tryPlayerAttack', 'damageCow'], warcry: ['tryWarCry', 'warCryHitCow'], whirlwind: ['tryWhirlwind', 'updateWhirlwind', 'whirlwindHit'],
  leap: ['tryLeap', 'updateLeap', 'leapLand', 'leapHitCow'], rush: ['tryRush', 'updateRush'], smash: ['tryGroundSmash', 'updateGroundSmash'],
  fortify: ['tryFortify', 'updateSkillBuffs'], flurry: ['tryFlurry', 'updateFlurry'], concuss: ['tryConcuss'], berserk: ['tryBerserk', 'berserkMul', 'heroDamageTaken'],
  decoy: ['tryDecoy', 'decoyFor', 'hitDecoy', 'updateSkillBuffs'], energyshield: ['tryEnergyShield', 'heroDamageTaken'], blizzard: ['tryBlizzard', 'updateGroundSpells'],
  flamepillar: ['tryFlamePillar', 'updateGroundSpells'], firewave: ['tryFireWave', 'updateFireWave'], bolt: ['tryBolt', 'spellDamage'], fireball: ['tryFireballSpell'], frostnova: ['tryFrostNova'],
  chain: ['tryChain'], orb: ['tryOrb'], teleport: ['tryTeleport'], discharge: ['tryDischarge', 'applyCC'],
  balllightning: ['tryBallLightning', 'updateBall', 'burstBall'],
  spinblade: ['trySpinBlade', 'updateSpinBlade', 'strike'], skyfall: ['trySkyfall', 'updateSkyfall'], whirlaxe: ['tryWhirlAxe', 'updateWhirlAxe'],
  shieldbounce: ['tryShieldBounce', 'updateShieldBounce'], rollmace: ['tryRollMace', 'updateRollMace'], piercespear: ['tryPierceSpear', 'updatePierceSpear', 'bleedCow'],
  vitalthrow: ['tryVitalThrow', 'updateVitalThrow']
};
// 몬스터 → 종류별 행동 훅이 있는 파일 (없으면 공통 AI만)
export const BEHAVIOR_FILES = ['src/entities/behaviors.js', 'src/entities/spellBehaviors.js'];

const fnText = (v) => (typeof v === 'function' ? v.toString() : v);
export function jsonBlock(obj) {
  return el('pre', { class: 'code' }, JSON.stringify(obj, (k, v) => fnText(v), 2));
}
function codeBlock(found, missing) {
  if (!found) return el('p', { class: 'note' }, `코드를 찾지 못함: ${missing}`);
  return el('div', {}, el('div', { class: 'codehead' }, `${found.file}:${found.line}`), el('pre', { class: 'code' }, found.code));
}

// 서랍 열기 (하나만): 제목 + 내용, Esc/닫기
export function openDrawer(title, ...nodes) {
  document.querySelectorAll('.drawer').forEach((d) => d.remove());
  const close = () => { d.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const d = el('div', { class: 'drawer' }, el('div', { class: 'drawer-head' }, el('b', {}, title), el('button', { onclick: close }, '닫기 ✕')), el('div', { class: 'drawer-body' }, nodes));
  document.body.append(d);
  document.addEventListener('keydown', onKey);
}

// 샌드박스 미리보기 창 (실제 게임 코드가 도는 iframe)
function preview(params) {
  const url = () => `./index.html?dev=1&${new URLSearchParams(params).toString()}`;
  const frame = el('iframe', { class: 'preview', src: url(), title: '미리보기' });
  const link = el('a', { href: url(), target: '_blank' }, '새 창으로 열기');
  const reload = () => { frame.src = url(); link.href = url(); };
  return { frame, link, reload };
}

async function codeSection(names) {
  const box = el('div', {}, el('p', { class: 'note' }, '코드 불러오는 중…'));
  const found = await Promise.all(names.map((n) => findFunction(n)));
  box.innerHTML = '';
  found.forEach((f, i) => box.append(codeBlock(f, names[i])));
  return box;
}

export async function openSkillDetail(id) {
  const params = { sandbox: 'skill', id, lv: 1 };
  const p = preview(params);
  const lvSel = select('스킬 레벨', Array.from({ length: SKILL_MAX_LEVEL }, (_, i) => [i + 1, `Lv${i + 1}`]), 1, (v) => { params.lv = v; p.reload(); });
  const data = { meta: SKILL_META[id], cardFromLevel: SKILL_UNLOCK_LEVEL[id], perLevel: SKILL_LEVEL_UP[id], numbers: SPELLS[id] || SKILL_STATS[id] || '전사 스킬 수치는 data/balance.js (직업·스킬 탭 표 참고)' };
  const code = el('div');
  openDrawer(`${SKILL_META[id].label} - 미리보기 · 데이터 · 코드`,
    el('div', { class: 'controls' }, lvSel, p.link),
    p.frame,
    el('p', { class: 'note' }, '주인공 무적·마나 무한, 기본 카우 허수아비(안 죽음) 앞에서 대기시간마다 다시 시전. 실제 게임 코드로 돎'),
    el('h3', {}, '데이터'), jsonBlock(data),
    el('h3', {}, '코드'), code);
  code.append(await codeSection(SKILL_CODE[id] || []));
}

export async function openMonsterDetail(kind) {
  const p = preview({ sandbox: 'monster', id: kind });
  const data = { label: MONSTER_LABEL[kind], ...MONSTERS[kind], elite: ELITE_KINDS.includes(kind), weapons: MONSTER_WEAPONS[kind] };
  const code = el('div');
  openDrawer(`${MONSTER_LABEL[kind] || kind} - 미리보기 · 데이터 · 코드`,
    el('div', { class: 'controls' }, p.link),
    p.frame,
    el('p', { class: 'note' }, '주인공(무적)에게 모든 행동을 함. 죽거나 터지면 다시 나옴. 옆의 다친 허수아비 둘은 치유·오라 같은 동료 행동 확인용'),
    el('h3', {}, '데이터'), jsonBlock(data),
    el('h3', {}, '종류별 행동 코드'), code);
  for (const f of BEHAVIOR_FILES) {
    const found = await findEntry(f, kind);
    if (found) { code.append(codeBlock(found)); }
  }
  if (!code.children.length) code.append(el('p', { class: 'note' }, '종류별 행동 없음 - 공통 AI만 사용'));
  code.append(el('h3', {}, '공통 AI (모든 몬스터)'), codeBlock(await findEntry('src/entities/monster.js', 'update', { method: true }), 'Monster.update'));
}

// 몬스터 모습 카드: 대기 → 걷기 → 공격 → 기절을 반복하는 작은 캔버스 (게임과 같은 그림 함수 drawCow)
const STATES = [['idle', 1.6], ['walk', 1.6], ['attack', 0.5], ['attack', 0.5], ['stunned', 1.0]];
const CYCLE = STATES.reduce((s, [, d]) => s + d, 0);
const cards = new Set();
let looping = false;

function drawCard(cv, kind, t) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const def = MONSTERS[kind];
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#25331f';
  ctx.fillRect(0, 0, cv.width, cv.height);
  let at = t % CYCLE, state = 'idle', elapsed = 0;
  for (const [s, d] of STATES) { if (at < d) { state = s; elapsed = at; break; } at -= d; }
  const scale = 0.42 * Math.min(def.scaleMul, 1.5);
  const x = cv.width / 2, y = cv.height - 18;
  if (def.ring) {
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(t * 4) * 0.25;
    ctx.strokeStyle = def.ring;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 30 * scale + 8, (30 * scale + 8) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  drawCow(ctx, x, y, scale, state, t, 1, elapsed, def.colors, weaponFor(kind, 0));
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px sans-serif';
  ctx.fillText(state, 6, 14);
}

function loop(ms) {
  const t = ms / 1000;
  for (const c of cards) { if (!c.cv.isConnected) cards.delete(c); else drawCard(c.cv, c.kind, t); }
  if (cards.size) requestAnimationFrame(loop); else looping = false;
}

export function monsterCard(kind) {
  const cv = el('canvas', { width: 170, height: 130 });
  cards.add({ cv, kind });
  if (!looping && typeof requestAnimationFrame !== 'undefined') { looping = true; requestAnimationFrame(loop); }
  return el('div', { class: 'item mcard' }, cv,
    el('b', { style: `color:${MONSTERS[kind].ring || 'inherit'}` }, MONSTER_LABEL[kind] || kind),
    el('button', { onclick: () => openMonsterDetail(kind) }, '미리보기 · 데이터 · 코드'));
}
