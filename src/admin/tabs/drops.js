// 관리자 - 드랍·난이도·맵: 출처별 드랍 확률(난이도 반영), 등급 분포, 소모품·장비 분류 비중, 난이도 표, 맵 표
import { DROP_RATES, POTION_DROP_WEIGHTS, GEAR_CATEGORY_WEIGHTS } from '../../data/drops.js';
import { DIFFICULTY, DIFFICULTY_ORDER } from '../../data/difficulty.js';
import { RARITY_DEF, POTION_LABEL, GEAR_CATEGORY_LABEL } from '../../data/items.js';
import { MAPS, MAP_ORDER } from '../../data/maps.js';
import { MONSTER_LABEL } from '../../data/monsters.js';
import { el, table, h2, note, src, tag, pct, select, barPct } from '../ui.js';

const SOURCE_LABEL = { normal: '일반 카우', elite: '엘리트', boss: '카우킹', mapBoss: '파밍 맵 우두머리' };
const IMMUNE_NAME = { phys: '물리', fire: '화염', cold: '냉기', lightning: '번개', poison: '독' };
const state = { diff: 'normal' };

// 한 번 굴릴 때 실제 확률: 장비 → 재료 → 소모품 순서 (앞이 빗나가야 다음), 장비엔 난이도 배율 (systems/loot.dropLoot와 같은 순서)
function dropOdds(src, d) {
  const r = DROP_RATES[src];
  const gear = Math.min(1, r.gear * d.gearDrop);
  const material = (1 - gear) * r.material;
  const consumable = (1 - gear) * (1 - r.material) * r.consumable;
  return { gear, material, consumable, none: 1 - gear - material - consumable };
}
function rarityOdds(src, d) {
  const q = DROP_RATES[src].quality;
  const w = Object.keys(RARITY_DEF).map((k) => [k, (k === 'normal' ? 1 : d.rarity) * q[k]]);
  const total = w.reduce((s, [, v]) => s + v, 0);
  return Object.fromEntries(w.map(([k, v]) => [k, v / total]));
}
const share = (weights) => { const t = Object.values(weights).reduce((s, v) => s + v, 0); return (k) => weights[k] / t; };

export function renderDrops(root) {
  const out = el('div');
  const sources = Object.keys(DROP_RATES);
  const draw = () => {
    out.innerHTML = '';
    const d = DIFFICULTY[state.diff];
    out.append(
      h2(`출처별 드랍 (${d.label})`),
      note(`몬스터 한 마리가 죽을 때 굴리는 횟수: 일반·엘리트 1번, 카우킹 4번, 우두머리 ${MAPS.barn.boss.drops}번. ${src('src/data/drops.js')} · 순서 ${src('systems/loot.dropLoot')}`),
      table([
        { label: '출처', get: (s) => SOURCE_LABEL[s] || s },
        { label: '장비', get: (s) => barPct(dropOdds(s, d).gear) },
        { label: '재료', get: (s) => barPct(dropOdds(s, d).material) },
        { label: '소모품', get: (s) => barPct(dropOdds(s, d).consumable) },
        { label: '없음', get: (s) => barPct(dropOdds(s, d).none) }
      ], sources),
      h2(`장비 등급 분포 (${d.label})`),
      note(`출처별 비중 × 일반 외 등급엔 난이도 배율 ×${d.rarity}`),
      table([
        { label: '출처', get: (s) => SOURCE_LABEL[s] || s },
        ...Object.keys(RARITY_DEF).map((r) => ({ label: tag(RARITY_DEF[r].label, RARITY_DEF[r].color), num: true, get: (s) => pct(rarityOdds(s, d)[r], 1) }))
      ], sources),
      h2('일반 카우 한 마리당 장비 기대값'),
      table([
        { label: '난이도', get: (k) => tag(DIFFICULTY[k].label, DIFFICULTY[k].color) },
        ...Object.keys(RARITY_DEF).map((r) => ({ label: RARITY_DEF[r].label, num: true, get: (k) => pct(dropOdds('normal', DIFFICULTY[k]).gear * rarityOdds('normal', DIFFICULTY[k])[r], 2) })),
        { label: '레전드 1개당 처치 수', num: true, get: (k) => Math.round(1 / (dropOdds('normal', DIFFICULTY[k]).gear * rarityOdds('normal', DIFFICULTY[k]).legendary)) }
      ], DIFFICULTY_ORDER)
    );
  };
  root.append(el('div', { class: 'controls' }, select('난이도', DIFFICULTY_ORDER.map((k) => [k, DIFFICULTY[k].label]), state.diff, (v) => { state.diff = v; draw(); })), out);
  draw();

  const potion = share(POTION_DROP_WEIGHTS), cat = share(GEAR_CATEGORY_WEIGHTS);
  root.append(
    h2('소모품 / 장비 분류 비중'),
    el('div', { class: 'grid' },
      table([{ label: '소모품', get: (k) => POTION_LABEL[k] || k }, { label: '확률', get: (k) => barPct(potion(k)) }], Object.keys(POTION_DROP_WEIGHTS)),
      table([{ label: '장비 분류', get: (k) => GEAR_CATEGORY_LABEL[k] || k }, { label: '확률', get: (k) => barPct(cat(k)) }], Object.keys(GEAR_CATEGORY_WEIGHTS)))
  );

  root.append(
    h2('난이도'),
    note(`${src('src/data/difficulty.js')} · 목장·파밍 맵 공통. 면역 무리는 맵에 면역 종류가 있을 때만`),
    table([
      { label: '난이도', get: (k) => tag(DIFFICULTY[k].label, DIFFICULTY[k].color) },
      { label: '몬스터 기본 레벨', num: true, get: (k) => DIFFICULTY[k].mlvl },
      { label: '권장 Lv', num: true, get: (k) => DIFFICULTY[k].level },
      { label: '체력', num: true, get: (k) => `×${DIFFICULTY[k].hp}` },
      { label: '근접 공격', num: true, get: (k) => `×${DIFFICULTY[k].dmg}` },
      { label: '경험치', num: true, get: (k) => `×${DIFFICULTY[k].exp}` },
      { label: '장비 드랍', num: true, get: (k) => `×${DIFFICULTY[k].gearDrop}` },
      { label: '높은 등급', num: true, get: (k) => `×${DIFFICULTY[k].rarity}` },
      { label: '면역 무리', num: true, get: (k) => pct(DIFFICULTY[k].immunePack) }
    ], DIFFICULTY_ORDER)
  );

  root.append(
    h2('맵'),
    note(`${src('src/data/maps.js')} · 파밍 맵은 들어갈 때마다 새로 배치(인스턴스)`),
    table([
      { label: '맵', get: (k) => MAPS[k].name },
      { label: '종류', get: (k) => (MAPS[k].mode === 'farm' ? tag('파밍', '#ffb347') : tag('레벨업·웨이브', '#9be39b')) },
      { label: '크기', num: true, get: (k) => MAPS[k].size },
      { label: '레벨 보탬', num: true, get: (k) => MAPS[k].mlvl || (MAPS[k].mode === 'wave' ? '웨이브마다' : 0) },
      { label: '무리', get: (k) => (MAPS[k].packs ? `${MAPS[k].packs}개 × ${MAPS[k].packSize[0]}~${MAPS[k].packSize[1]}마리` : '웨이브') },
      { label: '몬스터 구성', get: (k) => { const m = MAPS[k].kinds; if (!m) return '웨이브 규칙(몬스터 탭)'; const s = share(m); return Object.keys(m).map((x) => `${MONSTER_LABEL[x]} ${pct(s(x))}`).join(', '); } },
      { label: '면역', get: (k) => (MAPS[k].immune ? MAPS[k].immune.map((i) => IMMUNE_NAME[i]).join('·') : '') },
      { label: '우두머리', get: (k) => (MAPS[k].boss ? `${MONSTER_LABEL[MAPS[k].boss.kind]} 체력 ×${MAPS[k].boss.hpMul}, 드랍 ${MAPS[k].boss.drops}번` : '') }
    ], MAP_ORDER)
  );
}
