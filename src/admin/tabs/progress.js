// 관리자 - 성장: 레벨별 필요 경험치, 몬스터 경험치(난이도 배율), 레벨업에 필요한 처치 수, 스탯 포인트
import { MAX_LEVEL, POINTS_PER_LEVEL, LEVEL_STAT_PER_POINT, expForLevel, HERO_BASE_HP, MAX_MANA } from '../../data/balance.js';
import { MONSTERS, MONSTER_LABEL } from '../../data/monsters.js';
import { DIFFICULTY, DIFFICULTY_ORDER } from '../../data/difficulty.js';
import { STAT_DEF } from '../../data/items.js';
import { table, h2, note, src, tag } from '../ui.js';

export function renderProgress(root) {
  const levels = Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 1);
  let total = 0;
  const rows = levels.map((lv) => { total += expForLevel(lv); return { lv, need: expForLevel(lv), total }; });
  const normalExp = MONSTERS.normal.exp;
  root.append(
    h2('레벨별 필요 경험치'),
    note(`${src('data/balance.js expForLevel')} · 최대 Lv${MAX_LEVEL} · 레벨업마다 스탯 ${POINTS_PER_LEVEL}포인트 + 레벨업 카드 1장. 처치 수는 일반 카우(경험치 ${normalExp}) 기준`),
    table([
      { label: '레벨', get: (r) => `${r.lv} → ${r.lv + 1}` },
      { label: '필요', num: true, key: 'need' },
      { label: '누적', num: true, key: 'total' },
      ...DIFFICULTY_ORDER.map((d) => ({ label: `처치 수(${DIFFICULTY[d].label})`, num: true, get: (r) => Math.ceil(r.need / Math.round(normalExp * DIFFICULTY[d].exp)) }))
    ], rows)
  );

  root.append(
    h2('몬스터 경험치'),
    table([
      { label: '몬스터', get: (k) => MONSTER_LABEL[k] || k },
      ...DIFFICULTY_ORDER.map((d) => ({ label: tag(DIFFICULTY[d].label, DIFFICULTY[d].color), num: true, get: (k) => Math.round(MONSTERS[k].exp * DIFFICULTY[d].exp) }))
    ], Object.keys(MONSTERS))
  );

  root.append(
    h2('스탯 포인트 1점당'),
    note(`전사 기본 체력 ${HERO_BASE_HP}, 기본 마나 ${MAX_MANA} (마법사는 직업 탭)`),
    table([
      { label: '스탯', get: (k) => STAT_DEF[k].label },
      { label: '1점', num: true, get: (k) => STAT_DEF[k].fmt(LEVEL_STAT_PER_POINT[k]) },
      { label: '10점', num: true, get: (k) => STAT_DEF[k].fmt(LEVEL_STAT_PER_POINT[k] * 10) }
    ], Object.keys(LEVEL_STAT_PER_POINT))
  );
}
