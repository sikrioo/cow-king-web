// 관리자 페이지 (admin.html): 게임 데이터(src/data)와 생성 코드를 그대로 import해서 보여줌 - 읽기 전용, 게임은 돌지 않음
// 개발 서버(npm run dev → /admin.html)에서는 항상, 배포본은 admin.html?dev=1 일 때만
import { isDevMode } from '../config.js';
import { el, table, h2, note, src } from './ui.js';
import { renderMonsters } from './tabs/monsters.js';
import { renderSkills } from './tabs/skills.js';
import { renderItems } from './tabs/items.js';
import { renderDrops } from './tabs/drops.js';
import { renderSim } from './tabs/sim.js';
import { renderProgress } from './tabs/progress.js';

const FILES = [
  ['src/data/monsters.js', '몬스터 수치·이름·엘리트 규칙'], ['src/data/classes.js', '직업'], ['src/data/skills.js', '스킬 메타·마법 수치·레벨 보너스'],
  ['src/data/cards.js', '레벨업 카드'], ['src/data/items.js', '장비 베이스·등급·능력치 이름'], ['src/data/affixes.js', '접사(옵션) 계열·단계'],
  ['src/data/drops.js', '드랍 테이블'], ['src/data/difficulty.js', '난이도·몬스터 레벨'], ['src/data/maps.js', '맵'],
  ['src/data/elements.js', '원소·상태 이상'], ['src/data/balance.js', '전투·이동·전사 스킬·특수 공격 등 그 밖의 수치']
];

function renderOverview(root) {
  root.append(
    h2('이 페이지'),
    note('게임이 실제로 쓰는 데이터 파일을 그대로 읽어서 보여줍니다 (복사본 아님). 값을 고치려면 아래 파일을 고치고 새로고침하면 바로 반영됩니다. 시뮬레이터는 게임과 같은 드랍·장비 생성 코드로 굴립니다.'),
    table([{ label: '파일', get: (r) => src(r[0]) }, { label: '내용', get: (r) => r[1] }], FILES)
  );
}

const TABS = [
  ['overview', '개요', renderOverview],
  ['monsters', '몬스터', renderMonsters],
  ['skills', '직업·스킬·카드', renderSkills],
  ['items', '장비·접사', renderItems],
  ['drops', '드랍·난이도·맵', renderDrops],
  ['sim', '시뮬레이터', renderSim],
  ['progress', '성장', renderProgress]
];

function show(id) {
  const tab = TABS.find((t) => t[0] === id) || TABS[0];
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.id === tab[0]));
  const view = document.getElementById('view');
  view.innerHTML = '';
  try {
    tab[2](view);
  } catch (err) {
    view.append(el('pre', { class: 'blocked' }, `이 탭을 그리다 오류: ${err.message}`));
    console.error(err);
  }
  try { history.replaceState(null, '', `${location.pathname}${location.search}#${tab[0]}`); } catch { /* 무시 */ }
}

function boot() {
  if (!isDevMode()) {
    document.getElementById('view').append(el('div', { class: 'blocked' }, '개발자 모드에서만 열 수 있어요 (주소 끝에 ?dev=1)'));
    return;
  }
  const nav = document.getElementById('tabs');
  TABS.forEach(([id, label]) => nav.append(el('button', { 'data-id': id, onclick: () => show(id) }, label)));
  show(location.hash.slice(1));
}
boot();
