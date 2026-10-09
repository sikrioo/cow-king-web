// 관리자 - 시뮬레이터: 게임과 같은 코드(systems/loot.dropLoot, systems/itemGen)로 몬스터 N마리 처치 → 드랍·장비 분포, 장비 견본
// 관리자 페이지 안에서만 game 상태(game.run, game.items)를 잠깐 씀 (게임은 이 페이지에서 돌지 않음)
import { DIFFICULTY, DIFFICULTY_ORDER } from '../../data/difficulty.js';
import { MAPS, MAP_ORDER } from '../../data/maps.js';
import { ELITE_KINDS } from '../../data/monsters.js';
import { RARITY_DEF } from '../../data/items.js';
import { AFFIXES } from '../../data/affixes.js';
import { game } from '../../state.js';
import { dropLoot } from '../../systems/loot.js';
import { rollGearItem } from '../../systems/itemGen.js';
import { monsterLevel } from '../../util.js';
import { gearTitle, optionText, statKeysInOrder } from '../../ui/itemView.js';
import { el, table, h2, note, src, tag, pct, num, select, barPct } from '../ui.js';

const BY_ID = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));
const state = { diff: 'normal', map: 'ranch', wave: 3, kind: 'normal', n: 5000 };

function sourceOf(kind) { return kind === 'mapBoss' ? 'mapBoss' : kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'normal'; }

function simulate() {
  const d = DIFFICULTY[state.diff];
  game.run = { mapId: state.map, mode: MAPS[state.map].mode, difficulty: state.diff, hpMul: d.hp, dmgMul: d.dmg, expMul: d.exp, gearDropMul: d.gearDrop, rarityBoost: d.rarity, cleared: false, total: 0 };
  const src = sourceOf(state.kind);
  const kindForLevel = src === 'elite' ? ELITE_KINDS[0] : src === 'boss' ? 'boss' : 'normal';
  const ilvl = monsterLevel(game.run, state.wave, kindForLevel, src === 'mapBoss');
  const picks = src === 'boss' ? 4 : src === 'mapBoss' ? MAPS.barn.boss.drops : 1;
  const types = {}, rarity = {}, tiers = {}, fam = {};
  let gearN = 0, affN = 0;
  const samples = [];
  for (let i = 0; i < state.n; i++) {
    game.items = [];
    dropLoot(0, 0, src, picks, ilvl);
    game.items.forEach((it) => {
      types[it.type] = (types[it.type] || 0) + 1;
      if (it.type !== 'gear') return;
      const g = it.gearData;
      gearN++;
      rarity[g.rarity] = (rarity[g.rarity] || 0) + 1;
      affN += g.affixes.length;
      g.affixes.forEach((a) => { const def = BY_ID[a.id]; tiers[def.tier] = (tiers[def.tier] || 0) + 1; fam[def.family] = (fam[def.family] || 0) + 1; });
      if (samples.length < 12 && g.affixes.length) samples.push(g);
    });
  }
  game.items = [];
  return { ilvl, picks, types, rarity, tiers, fam, gearN, affN, samples };
}

function itemCard(g) {
  g.identified = true;
  return el('div', { class: 'item' },
    el('b', { style: `color:${RARITY_DEF[g.rarity].color}` }, gearTitle(g, { hand: true })),
    el('span', { class: 'dim' }, `아이템 레벨 ${g.ilvl}`),
    ...statKeysInOrder(g).map((k) => el('div', {}, optionText(g, k, g.stats[k], { detail: true }))));
}

export function renderSim(root) {
  const out = el('div');
  const run = () => {
    out.innerHTML = '';
    const t0 = performance.now();
    const r = simulate();
    const kills = state.n;
    const allDrops = Object.values(r.types).reduce((s, v) => s + v, 0);
    out.append(
      note(`몬스터 레벨(아이템 레벨) <b>${r.ilvl}</b> · 한 마리당 ${r.picks}번 굴림 · ${kills.toLocaleString()}마리 처치 · ${Math.round(performance.now() - t0)}ms`),
      h2('떨어진 것'),
      table([
        { label: '종류', get: (k) => k },
        { label: '개수', num: true, get: (k) => r.types[k] },
        { label: '처치당', get: (k) => barPct(r.types[k] / kills, Math.max(...Object.values(r.types)) / kills) }
      ], Object.keys(r.types).sort((a, b) => r.types[b] - r.types[a])),
      note(`처치당 드랍 ${num(allDrops / kills)}개, 장비 ${num(r.gearN / kills, 3)}개 (장비 하나 얻는 데 평균 ${r.gearN ? num(kills / r.gearN, 1) : '-'}마리)`),
      h2('장비 등급'),
      table([
        { label: '등급', get: (k) => tag(RARITY_DEF[k].label, RARITY_DEF[k].color) },
        { label: '개수', num: true, get: (k) => r.rarity[k] || 0 },
        { label: '장비 중', get: (k) => barPct((r.rarity[k] || 0) / (r.gearN || 1)) },
        { label: '이 등급 하나에 처치 수', num: true, get: (k) => (r.rarity[k] ? Math.round(kills / r.rarity[k]) : '-') }
      ], Object.keys(RARITY_DEF)),
      h2('접사 단계 / 계열'),
      note(`장비 하나당 평균 접사 ${r.gearN ? num(r.affN / r.gearN) : 0}개`),
      el('div', { class: 'grid' },
        table([{ label: '단계', get: (k) => `${k}단계` }, { label: '비율', get: (k) => barPct(r.tiers[k] / (r.affN || 1)) }], Object.keys(r.tiers).sort()),
        table([{ label: '계열', key: 'k' }, { label: '비율', get: (x) => barPct(x.v / (r.affN || 1), Math.max(...Object.values(r.fam)) / (r.affN || 1)) }],
          Object.entries(r.fam).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v })))),
      h2('견본 (옵션 있는 장비 12개)'),
      el('div', { class: 'grid' }, r.samples.map(itemCard))
    );
  };
  const one = el('div', { class: 'grid' });
  const rollOne = () => {
    one.innerHTML = '';
    const d = DIFFICULTY[state.diff];
    for (let i = 0; i < 6; i++) one.append(itemCard(rollGearItem({ ilvl: +state.oneIlvl || 10, rarityBoost: d.rarity, source: sourceOf(state.kind) })));
  };
  state.oneIlvl = state.oneIlvl || 15;
  root.append(
    h2('드랍 시뮬레이터'),
    note(`게임과 같은 코드 ${src('systems/loot.dropLoot')} → ${src('systems/itemGen.rollGearItem')}으로 굴림. 데이터를 고치면 새로고침만 하면 반영`),
    el('div', { class: 'controls' },
      select('난이도', DIFFICULTY_ORDER.map((k) => [k, DIFFICULTY[k].label]), state.diff, (v) => { state.diff = v; }),
      select('맵', MAP_ORDER.map((k) => [k, MAPS[k].name]), state.map, (v) => { state.map = v; }),
      select('웨이브(목장)', [1, 2, 3, 4, 5, 6].map((w) => [w, w]), state.wave, (v) => { state.wave = +v; }),
      select('출처', Object.entries({ normal: '일반 카우', elite: '엘리트', boss: '카우킹', mapBoss: '파밍 맵 우두머리' }), state.kind, (v) => { state.kind = v; }),
      select('처치 수', [[1000, '1,000'], [5000, '5,000'], [20000, '20,000'], [100000, '100,000']], state.n, (v) => { state.n = +v; }),
      el('button', { onclick: run }, '돌리기')),
    out,
    h2('장비 하나씩 뽑아 보기'),
    el('div', { class: 'controls' },
      select('아이템 레벨', Array.from({ length: 30 }, (_, i) => [i + 1, i + 1]), state.oneIlvl, (v) => { state.oneIlvl = +v; }),
      el('button', { onclick: rollOne }, '6개 뽑기')),
    one
  );
  run();
  rollOne();
}
