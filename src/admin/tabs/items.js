// 관리자 - 장비·접사: 등급, 베이스(무기 피해·방어력), 능력치 정의, 접사 계열·티어 표, 후보 계산기(부위·아이템 레벨·등급 → 나올 수 있는 접사와 확률)
import {
  RARITY_DEF, WEAPON_BASE, TWO_HAND_DAMAGE_MULT, TWO_HAND_SPEED_MULT, GEAR_BASE_ARMOR, STAT_DEF, GEAR_CATEGORY_LABEL,
  GEAR_VARIANT_LABEL, OPTION_ROLL_SKEW, ROLL_QUALITY
} from '../../data/items.js';
import { AFFIXES, AFFIX_RULES, MAX_ITEM_LEVEL } from '../../data/affixes.js';
import { el, table, h2, note, src, tag, pct, select, barPct } from '../ui.js';

const rarityTag = (r) => tag(RARITY_DEF[r].label, RARITY_DEF[r].color);
const fmtStat = (k, v) => STAT_DEF[k].fmt(v);
const rangeText = (mods) => Object.entries(mods).map(([k, [a, b]]) => `${STAT_DEF[k].label} ${fmtStat(k, a)}~${fmtStat(k, b).replace(/^\+/, '')}`).join(' + ');
const ruleText = (r) => {
  const x = AFFIX_RULES[r];
  if (x.compose) return `1~2개 (접두만 ${x.compose.prefix} · 접미만 ${x.compose.suffix} · 둘 다 ${x.compose.both}), 매직 전용 단계 허용`;
  const counts = Object.keys(x.count);
  return counts.length === 1 && counts[0] === '0' ? '옵션 없음' : `${counts.join('/')}개 균등, 방향당 최대 ${x.maxPerSide}${x.alvlBonus ? `, 접사 레벨 +${x.alvlBonus}` : ''}`;
};

const state = { cat: 'weapon', ilvl: 10, rarity: 'rare' };

export function renderItems(root) {
  const rarities = Object.keys(RARITY_DEF);
  root.append(
    h2('등급'),
    note(`${src('src/data/items.js')} RARITY_DEF · 접사 규칙 ${src('src/data/affixes.js')} AFFIX_RULES · 출처별 등급 비중은 드랍 탭`),
    table([
      { label: '등급', get: rarityTag },
      { label: '일반 카우 비중', num: true, get: (r) => RARITY_DEF[r].weight },
      { label: '베이스 배율(피해·방어력)', num: true, get: (r) => `×${RARITY_DEF[r].mult}` },
      { label: '접사', get: ruleText }
    ], rarities)
  );

  root.append(
    h2('무기 베이스'),
    note(`피해 min~max(×10 정수), 초당 공격. 양손이면 피해 ×${TWO_HAND_DAMAGE_MULT}, 속도 ×${TWO_HAND_SPEED_MULT}. 등급 배율·강화가 곱해짐`),
    table([
      { label: '무기', get: (v) => GEAR_VARIANT_LABEL[v] || v },
      { label: '피해', num: true, get: (v) => `${WEAPON_BASE[v].min}~${WEAPON_BASE[v].max}` },
      { label: '초당 공격', num: true, get: (v) => WEAPON_BASE[v].aps },
      { label: '양손 피해', num: true, get: (v) => `${Math.round(WEAPON_BASE[v].min * TWO_HAND_DAMAGE_MULT)}~${Math.round(WEAPON_BASE[v].max * TWO_HAND_DAMAGE_MULT)}` }
    ], Object.keys(WEAPON_BASE)),
    h3('방어구 기본 방어력'),
    table([{ label: '부위', get: (k) => GEAR_CATEGORY_LABEL[k] || k }, { label: '방어력', num: true, get: (k) => GEAR_BASE_ARMOR[k] }], Object.keys(GEAR_BASE_ARMOR))
  );

  root.append(
    h2('능력치 (옵션이 올리는 것)'),
    note(`이름·표시만. 실제 수치는 접사 단계가 정함. 굴림: 단계 범위 안 위치 = 난수^${OPTION_ROLL_SKEW} (꽝 ≤ ${pct(ROLL_QUALITY.dud)}, 최상 ≥ ${pct(ROLL_QUALITY.top)})`),
    table([
      { label: '키', key: 'k' },
      { label: '이름', get: (r) => STAT_DEF[r.k].label },
      { label: '단위', get: (r) => (STAT_DEF[r.k].flat ? '정수(×10)' : '비율') },
      { label: '원소', get: (r) => STAT_DEF[r.k].element || '' }
    ], Object.keys(STAT_DEF).map((k) => ({ k })))
  );

  // 접사 계열·티어
  const families = [...new Set(AFFIXES.map((a) => a.family))];
  root.append(
    h2('접사 (계열 × 단계)'),
    note(`${src('src/data/affixes.js')} · 같은 아이템의 같은 방향엔 같은 그룹 하나만. 접사 레벨 = 아이템 레벨(+등급 보너스)이 이 값 이상이어야 후보. 최대 아이템 레벨 ${MAX_ITEM_LEVEL}. ★ = 매직 전용`),
    table([
      { label: '계열', get: (a) => (a.tier === 1 ? `<b>${a.family}</b>` : '') },
      { label: '방향', get: (a) => (a.side === 'prefix' ? '접두' : '접미') },
      { label: '그룹', key: 'group' },
      { label: '부위', get: (a) => a.types.map((t) => GEAR_CATEGORY_LABEL[t]).join(', ') },
      { label: '단계', num: true, get: (a) => `${a.tier}${a.magicOnly ? '★' : ''}` },
      { label: '접사 레벨', num: true, key: 'alvl' },
      { label: '수치', get: (a) => rangeText(a.mods) },
      { label: '가중치', num: true, key: 'weight' }
    ], families.flatMap((f) => AFFIXES.filter((a) => a.family === f)))
  );

  // 후보 계산기
  const out = el('div');
  const draw = () => {
    out.innerHTML = '';
    const rule = AFFIX_RULES[state.rarity];
    const alvl = Math.min(MAX_ITEM_LEVEL, state.ilvl + (rule.alvlBonus || 0));
    const pool = AFFIXES.filter((a) => a.types.includes(state.cat) && a.alvl <= alvl && (!a.magicOnly || rule.magicOnlyAllowed));
    ['prefix', 'suffix'].forEach((side) => {
      const list = pool.filter((a) => a.side === side);
      const total = list.reduce((s, a) => s + a.weight, 0);
      out.append(el('h3', {}, `${side === 'prefix' ? '접두' : '접미'} 후보 ${list.length}개 (그룹 ${new Set(list.map((a) => a.group)).size}개)`));
      if (!list.length) { out.append(note('없음')); return; }
      out.append(table([
        { label: '접사', get: (a) => `${a.family} ${a.tier}단계${a.magicOnly ? '★' : ''}` },
        { label: '수치', get: (a) => rangeText(a.mods) },
        { label: '첫 번째로 뽑힐 확률', get: (a) => barPct(a.weight / total, Math.max(...list.map((x) => x.weight)) / total) }
      ], list.sort((a, b) => b.weight - a.weight)));
    });
    out.append(note(`접사 레벨 ${alvl}. 확률은 '그 방향에서 첫 접사를 뽑을 때' 기준 - 하나 뽑힌 뒤엔 같은 그룹이 빠져 다음 확률이 바뀜 (정확한 분포는 시뮬레이터 탭)`));
  };
  const cats = Object.keys(GEAR_CATEGORY_LABEL);
  root.append(
    h2('후보 계산기'),
    el('div', { class: 'controls' },
      select('부위', cats.map((c) => [c, GEAR_CATEGORY_LABEL[c]]), state.cat, (v) => { state.cat = v; draw(); }),
      select('아이템 레벨', Array.from({ length: MAX_ITEM_LEVEL }, (_, i) => [i + 1, i + 1]), state.ilvl, (v) => { state.ilvl = +v; draw(); }),
      select('등급', rarities.map((r) => [r, RARITY_DEF[r].label]), state.rarity, (v) => { state.rarity = v; draw(); })),
    out
  );
  draw();
}

function h3(t) { return el('h3', {}, t); }
