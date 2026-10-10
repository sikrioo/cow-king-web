// 개발자 패널 (HTML, index.html의 #dev-panel). ` 키 또는 DEV 버튼으로 열고 닫음
// 버튼 연결과 몬스터 소환 버튼 생성은 처음 열 때 한 번 (부팅/테스트 환경에서는 DOM을 건드리지 않음)
import { ELITE_KINDS } from '../data/monsters.js';
import { RARITY_DEF } from '../data/items.js';
import { ELEMENTS, ELEMENT_DEF } from '../data/elements.js';
import { BOSS_WAVE } from '../data/balance.js';
import { ui } from '../state.js';
import { CLASSES, CLASS_ORDER } from '../data/classes.js';
import {
  devLevelUp, devMaxLevel, devSkipCards, devStatPoints, devFill, devToggle, devKillAll, devJumpWave, devSpawn,
  devGiveGear, devMaterials, devPotions
} from '../systems/dev.js';

let built = false;
const spawnImmune = new Set(); // 소환할 때 붙일 면역 (여러 개 가능)
let panelActions = { newGameAs: () => {} };

const TOGGLES = [
  ['god', '무적'],
  ['infiniteMana', '마나 무한'],
  ['noCooldown', '스킬 대기시간 0']
];

function button(parent, label, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(b); });
  parent.appendChild(b);
  return b;
}

function row(body, title) {
  const r = document.createElement('div');
  r.className = 'dev-row';
  const t = document.createElement('b');
  t.textContent = title;
  r.appendChild(t);
  body.appendChild(r);
  return r;
}

function build() {
  const body = document.getElementById('dev-body');
  const cls = row(body, '새 게임');
  CLASS_ORDER.forEach((k) => button(cls, `${CLASSES[k].label}로 시작`, () => panelActions.newGameAs(k)));

  const ch = row(body, '캐릭터');
  button(ch, '레벨 +1', () => devLevelUp(1));
  button(ch, '레벨 +5', () => devLevelUp(5));
  button(ch, '최대 레벨+스킬', devMaxLevel);
  button(ch, '카드 건너뛰기', devSkipCards);
  button(ch, '스탯 +5', () => devStatPoints(5));
  button(ch, '체력·마나 가득', devFill);
  // 그림 비교: 주인공 손 - 3/4 시점(위를 보면 앞 손이 몸에 가려짐) / 탑뷰(늘 보임)
  const view = button(ch, '손: 3/4 시점', () => { ui.heroTopView = !ui.heroTopView; view.textContent = `손: ${ui.heroTopView ? '탑뷰' : '3/4 시점'}`; view.classList.toggle('on', ui.heroTopView); });

  const cheat = row(body, '치트');
  TOGGLES.forEach(([flag, label]) => {
    const b = button(cheat, `${label}: 끔`, () => { const on = devToggle(flag); b.textContent = `${label}: ${on ? '켬' : '끔'}`; b.classList.toggle('on', on); });
  });

  const prog = row(body, '웨이브');
  for (let w = 1; w <= BOSS_WAVE; w++) button(prog, w === BOSS_WAVE ? `${w} (보스)` : `${w}`, () => devJumpWave(w));
  button(prog, '몬스터 전부 제거', devKillAll);

  const imm = row(body, '면역 (켜고 소환)');
  [['phys', '물리'], ...ELEMENTS.map((el) => [el, ELEMENT_DEF[el].label])].forEach(([key, label]) => {
    const b = button(imm, `${label}: 끔`, () => {
      if (spawnImmune.has(key)) spawnImmune.delete(key); else spawnImmune.add(key);
      const on = spawnImmune.has(key);
      b.textContent = `${label}: ${on ? '켬' : '끔'}`;
      b.classList.toggle('on', on);
    });
  });
  const spawn = row(body, '소환');
  ['normal', ...ELITE_KINDS, 'boss'].forEach((k) => button(spawn, k, () => devSpawn(k, [...spawnImmune])));

  const tools = row(body, '도구');
  // 관리자 페이지 (게임 데이터 보기·시뮬레이터·미리보기) - 새 탭. 배포본은 ?dev=1을 붙여야 열림
  button(tools, '관리자 페이지 열기 ↗', () => { try { window.open('./admin.html?dev=1', '_blank'); } catch (_) { /* 팝업 막힘 */ } });

  const items = row(body, '아이템');
  Object.keys(RARITY_DEF).forEach((r) => button(items, `${RARITY_DEF[r].label} 장비`, () => devGiveGear(r)));
  button(items, '재료 +10', () => devMaterials(10));
  button(items, '물약 가득', devPotions);
  built = true;
}

export function toggleDevPanel() {
  if (!built) build();
  ui.devPanelOpen = !ui.devPanelOpen;
  document.getElementById('dev-panel').classList.toggle('open', ui.devPanelOpen);
}

// 부팅: 개발자 모드면 DEV 버튼 보이기. actions = { newGameAs(classKey) }
export function bindDevButton(actions) {
  panelActions = actions;
  document.body.classList.add('dev-mode');
  document.getElementById('btn-dev').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleDevPanel(); });
  document.getElementById('dev-close').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); toggleDevPanel(); });
}

