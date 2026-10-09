// 관리자 - 몬스터: 종류별 수치, 난이도별 체력, 몬스터 레벨(=아이템 레벨), 웨이브 구성, 특수 공격
import {
  MONSTERS, MONSTER_LABEL, ELITE_KINDS, ELITE_MIN_WAVE, ELITE_CHANCE_BASE, ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX
} from '../../data/monsters.js';
import { DIFFICULTY, DIFFICULTY_ORDER, MLVL_BONUS, WAVE_MLVL_STEP } from '../../data/difficulty.js';
import { ELEMENT_DEF } from '../../data/elements.js';
import { MAPS } from '../../data/maps.js';
import * as B from '../../data/balance.js';
import { monsterLevel } from '../../util.js';
import { el, table, h2, note, src, tag, pct } from '../ui.js';
import { monsterCard, openMonsterDetail } from '../detail.js';

const elemTag = (e) => (e ? tag(ELEMENT_DEF[e].label, ELEMENT_DEF[e].color) : '<span class="dim">물리</span>');
const resistText = (r) => (r ? Object.entries(r).map(([k, v]) => tag(`${k === 'phys' ? '물리' : ELEMENT_DEF[k].label} ${v >= 1 ? '면역' : pct(v)}`, k === 'phys' ? '#ddd' : ELEMENT_DEF[k].color)).join('') : null);

export function renderMonsters(root) {
  const kinds = Object.keys(MONSTERS);
  root.append(
    h2('모습'),
    note(`게임과 같은 그림 함수(${src('render/monsterSprites.drawCow')})로 그림 - 대기·걷기·공격·기절 반복. 버튼 = 실제 게임에서 행동하는 미리보기 + 데이터 + 코드`),
    el('div', { class: 'cards' }, kinds.map(monsterCard)),
    h2('몬스터 종류'),
    note(`수치 ${src('src/data/monsters.js')} · 특수 행동 ${src('src/entities/behaviors.js')} · 체력·피해는 ×10 정수. 난이도 열은 체력 × 난이도 배율`),
    table([
      { label: '이름', get: (k) => `${MONSTER_LABEL[k] || k} <span class="dim">${k}</span>` },
      { label: '상세', get: (k) => el('button', { onclick: () => openMonsterDetail(k) }, '보기') },
      { label: '체력', num: true, get: (k) => MONSTERS[k].hp },
      ...DIFFICULTY_ORDER.slice(1).map((d) => ({ label: `체력(${DIFFICULTY[d].label})`, num: true, get: (k) => Math.round(MONSTERS[k].hp * DIFFICULTY[d].hp) })),
      { label: '근접 피해', num: true, get: (k) => MONSTERS[k].dmg },
      { label: '근접 원소', get: (k) => elemTag(MONSTERS[k].element) },
      { label: '저항', get: (k) => resistText(MONSTERS[k].resist) },
      { label: '크기', num: true, get: (k) => MONSTERS[k].scaleMul },
      { label: '속도', num: true, get: (k) => MONSTERS[k].speedMul },
      { label: '인식 범위', num: true, get: (k) => MONSTERS[k].aggroMul },
      { label: '경험치', num: true, get: (k) => MONSTERS[k].exp },
      { label: '구분', get: (k) => (k === 'boss' ? tag('보스', '#c98bef') : ELITE_KINDS.includes(k) ? tag('엘리트', '#ffcf4d') : tag('일반')) }
    ], kinds)
  );

  root.append(
    h2('몬스터 레벨 (= 떨군 장비의 아이템 레벨)'),
    note(`난이도 기본 레벨(mlvl) + 목장은 웨이브마다 +${WAVE_MLVL_STEP} / 파밍 맵은 맵 보탬 + 엘리트 +${MLVL_BONUS.elite} · 카우킹 +${MLVL_BONUS.boss} · 우두머리 +${MLVL_BONUS.mapBoss}. 아이템 레벨이 붙을 수 있는 접사 단계를 정함 (접사 탭). 계산 ${src('util.monsterLevel')}`),
    table([
      { label: '난이도', get: (d) => tag(DIFFICULTY[d].label, DIFFICULTY[d].color) },
      ...[1, 2, 3, 4, 5].map((w) => ({ label: `목장 ${w}웨이브`, num: true, get: (d) => monsterLevel({ difficulty: d, mapId: 'ranch' }, w, 'normal') })),
      { label: '목장 5웨이브 엘리트', num: true, get: (d) => monsterLevel({ difficulty: d, mapId: 'ranch' }, 5, 'fast') },
      { label: `카우킹(${B.BOSS_WAVE}웨이브)`, num: true, get: (d) => monsterLevel({ difficulty: d, mapId: 'ranch' }, B.BOSS_WAVE, 'boss') },
      { label: `${MAPS.barn.name} 일반`, num: true, get: (d) => monsterLevel({ difficulty: d, mapId: 'barn' }, 0, 'normal') },
      { label: `${MAPS.barn.name} 우두머리`, num: true, get: (d) => monsterLevel({ difficulty: d, mapId: 'barn' }, 0, MAPS.barn.boss.kind, true) }
    ], DIFFICULTY_ORDER)
  );

  const waves = Array.from({ length: B.BOSS_WAVE }, (_, i) => i + 1);
  root.append(
    h2('목장 웨이브 구성'),
    note(`마리 수 = 6 + 웨이브 × 4, 무리 ${B.WAVE_PACKS_MIN}~${B.WAVE_PACKS_MAX}곳. ${ELITE_MIN_WAVE}웨이브부터 마리마다 엘리트 확률 min(${ELITE_CHANCE_BASE} + 웨이브 × ${ELITE_CHANCE_PER_WAVE}, ${ELITE_CHANCE_MAX}) - 엘리트 ${ELITE_KINDS.length}종 균등. ${B.BOSS_WAVE}웨이브 = 카우킹 + 일반 4. ${src('src/systems/waves.js')}`),
    table([
      { label: '웨이브', key: 'w' },
      { label: '마리 수', num: true, get: (r) => (r.w === B.BOSS_WAVE ? '카우킹 + 4' : 6 + r.w * 4) },
      { label: '엘리트 확률(마리당)', num: true, get: (r) => (r.w === B.BOSS_WAVE ? '-' : r.w < ELITE_MIN_WAVE ? '0%' : pct(Math.min(ELITE_CHANCE_BASE + r.w * ELITE_CHANCE_PER_WAVE, ELITE_CHANCE_MAX))) }
    ], waves.map((w) => ({ w })))
  );

  const specials = [
    ['돌진 카우 돌진', B.CHARGE_DAMAGE], ['자폭 카우 폭발', B.EXPLODER_BLAST_DAMAGE], ['전기 카우 번개 빔', B.ZAP_DAMAGE],
    ['화염술사 메테오', B.METEOR_DAMAGE], ['화염술사 화염구', B.FIREBALL_DAMAGE], ['불바닥(틱)', B.FIRE_HAZARD_DAMAGE],
    ['독 구름(틱)', B.POISON_CLOUD_DAMAGE], ['카우킹 내려찍기', B.BOSS_SLAM_DAMAGE], ['주술사 치유량', B.SHAMAN_HEAL]
  ];
  root.append(
    h2('특수 공격'),
    note(`${src('src/data/balance.js')} · 근접 공격만 난이도 공격 배율을 받음 (특수 공격은 아직 고정)`),
    table([{ label: '공격', get: (r) => r[0] }, { label: '피해(묶음이면 원소별)', get: (r) => (typeof r[1] === 'object' ? JSON.stringify(r[1]) : r[1]) }], specials)
  );
  root.append(el('div'));
}
