// 관리자 - 직업·스킬·레벨업 카드: 직업 시작 수치, 스킬 표(분류·카드 등장 레벨·마나·대기시간·효과·레벨 보너스), 마법 피해 표, 카드
import { CLASSES, CLASS_ORDER } from '../../data/classes.js';
import {
  SKILL_META, SKILL_TYPE_LABEL, SKILL_UNLOCK_LEVEL, SKILL_MAX_LEVEL, SKILL_LEVEL_UP, SKILL_LEVEL_STAT, SKILL_STATS, SPELLS,
  SPELL_LEVEL_SCALE, COMMON_SKILLS
} from '../../data/skills.js';
import {
  CARD_CHOICES, CARD_REROLLS, CARD_WEIGHT, CARD_RARITY, CARD_RARITY_ORDER, UPGRADE_MAX_PICKS, UPGRADE_ORDER, UPGRADE_CARDS,
  FILLER_CARDS, FILLER_ORDER
} from '../../data/cards.js';
import * as B from '../../data/balance.js';
import { el, table, h2, note, src, tag, num, pct } from '../ui.js';
import { openSkillDetail } from '../detail.js';
import { MASTERIES, MASTERY_ORDER, MASTERY_MAX_LEVEL, MASTERY_STAT } from '../../data/masteries.js';
import { GEAR_VARIANT_LABEL } from '../../data/items.js';

// 전사 스킬 수치는 data/balance.js 상수 (마법은 SPELLS, 투지·순간이동은 SKILL_STATS)
const WARRIOR = {
  attack:    { mana: 0, cd: '무기 속도', effect: '무기 피해 (공격속도 영향)' },
  warcry:    { mana: B.WARCRY_MANA_COST, cd: B.WARCRY_COOLDOWN, effect: `반경 ${B.WARCRY_RADIUS} 밀치기 + 기절 1초` },
  whirlwind: { mana: B.WHIRLWIND_MANA_COST, cd: B.WHIRLWIND_COOLDOWN, effect: `${B.WHIRLWIND_DURATION}초 회전, 반경 ${B.WHIRLWIND_RADIUS}, 같은 적 ${B.WHIRLWIND_TICK}초마다 무기 피해` },
  leap:      { mana: B.LEAP_MANA_COST, cd: B.LEAP_COOLDOWN, effect: `${B.LEAP_DISTANCE} 도약, 착지 반경 ${B.LEAP_RADIUS} 무기 피해` },
  rush:      { mana: B.RUSH_MANA_COST, cd: B.RUSH_COOLDOWN, effect: `${B.RUSH_DISTANCE} 돌진, 무기 피해 + ${B.RUSH_DAMAGE_BONUS}` },
  smash:     { mana: B.SMASH_MANA_COST, cd: B.SMASH_COOLDOWN, effect: `반경 ${B.SMASH_RADIUS} 무기 피해 + ${B.SMASH_DAMAGE_BONUS}, 기절 0.35초` }
};

function skillInfo(id) {
  if (WARRIOR[id]) return WARRIOR[id];
  if (id === 'energyshield') { const s = SPELLS[id]; return { mana: s.mana, cd: s.cooldown, effect: `${s.duration}초 동안 받는 피해 ${pct(s.absorb)}를 마나로 (피해 1당 마나 ${s.manaPerDmg})` }; }
  if (id === 'blizzard') { const s = SPELLS[id]; return { mana: s.mana, cd: s.cooldown, effect: `${s.delay}초 동안 지역이 생기고 ${s.duration}초 동안 ${s.tick}초마다 반경 ${s.radius} 냉기 ${s.damage}, 사거리 ${s.range}` }; }
  if (id === 'firewave') { const s = SPELLS[id]; return { mana: s.mana, cd: s.cooldown, effect: `폭 ${s.width} 곧은 불의 벽이 ${s.travel}초 동안 앞으로 ${s.range}까지(점점 느려짐), 지나가는 적 화염 ${s.damage} + 화상 + 밀어냄` }; }
  if (id === 'discharge') { const s = SPELLS[id]; return { mana: s.mana, cd: s.cooldown, effect: `내 주변 반경 ${s.radius} 번개 ${s.damage} + 경직 ${s.stagger}초 (보스는 피해만)` }; }
  if (id === 'balllightning') { const s = SPELLS[id]; return { mana: s.mana, cd: s.cooldown, effect: `사거리 ${s.range} 구체 ${s.duration}초: ${s.arcEvery}초마다 반경 ${s.arcRadius} 안 ${s.targets}명에게 번개 ${s.arcDamage}, 사라질 때 반경 ${s.burstRadius} 폭발 ${s.burst} (다시 누르면 바로 폭발, Lv${s.twoAt}부터 2개)` }; }
  if (id === 'flamepillar') { const s = SPELLS[id]; return { mana: s.mana, cd: s.cooldown, effect: `${s.delay}초 뒤 반경 ${s.radius} 곳곳에 불기둥 ${s.count}개(${s.interval}초 간격), 기둥마다 화염 ${s.damage}, 사거리 ${s.range}` }; }
  if (SPELLS[id]) {
    const s = SPELLS[id];
    const effect = id === 'orb' ? `조각 피해 ${s.shardDamage} (${s.shardEvery}초마다), 끝에서 ${s.burst}개` : `피해 ${s.damage}${s.explode ? `, 폭발 ${s.explode}` : ''}${s.radius && !s.speed ? `, 반경 ${s.radius}` : ''}${s.jumps ? `, 튕김 ${s.jumps}` : ''}`;
    return { mana: s.mana, cd: s.cooldown, effect };
  }
  const s = SKILL_STATS[id];
  if (id === 'fortify') return { mana: s.mana, cd: s.cooldown, effect: `${s.duration}초 동안 최대 체력 +${pct(s.life)}` };
  if (id === 'teleport') return { mana: s.mana, cd: s.cooldown, effect: `최대 ${s.range}px 순간이동` };
  if (id === 'flurry') return { mana: s.mana, cd: s.cooldown, effect: `${s.hits}번 × 무기 피해 ${pct(s.ratio)} (${s.interval}초 간격), 제자리` };
  if (id === 'concuss') return { mana: s.mana, cd: s.cooldown, effect: `앞쪽 무기 피해 + ${s.bonus}, 기절 ${s.stun}초` };
  if (id === 'berserk') return { mana: s.mana, cd: s.cooldown, effect: `${s.duration}초: 주는 피해 +${pct(s.power)}, 공격속도 +${pct(s.speed)}, 받는 피해 +${pct(s.taken)}` };
  if (id === 'decoy') return { mana: s.mana, cd: s.cooldown, effect: `${s.duration}초 미끼 (체력 = 내 최대 체력 × ${pct(s.life)}), ${s.taunt}px 안 몬스터가 공격` };
  return { mana: s ? s.mana : '-', cd: s ? s.cooldown : '-', effect: '' };
}

const levelUpText = (id) => Object.entries(SKILL_LEVEL_UP[id] || {}).map(([k, v]) => {
  const st = SKILL_LEVEL_STAT[k];
  return `${st.label} ${st.neg ? '-' : '+'}${st.pct ? pct(v) : v}${st.add ? '%p' : ''}`;
}).join(', ');

export function renderSkills(root) {
  root.append(
    h2('직업'),
    note(src('src/data/classes.js')),
    table([
      { label: '직업', get: (k) => CLASSES[k].label },
      { label: '체력', num: true, get: (k) => CLASSES[k].hp },
      { label: '마나', num: true, get: (k) => CLASSES[k].mana },
      { label: '마나 회복/초', num: true, get: (k) => CLASSES[k].manaRegen },
      { label: '기본 공격', get: (k) => (CLASSES[k].basic === 'bolt' ? '마력탄' : '근접 무기') },
      { label: '시작 슬롯', get: (k) => CLASSES[k].slots.map((s) => SKILL_META[s].label).join(' / ') },
      { label: '배울 수 있는 스킬', get: (k) => [...CLASSES[k].skills, ...COMMON_SKILLS].map((s) => SKILL_META[s].label).join(', ') }
    ], CLASS_ORDER)
  );

  const rows = [];
  CLASS_ORDER.forEach((c) => CLASSES[c].skills.forEach((id) => rows.push({ id, cls: CLASSES[c].label })));
  COMMON_SKILLS.forEach((id) => rows.push({ id, cls: '공통' }));
  root.append(
    h2('스킬'),
    note(`'미리보기' = 실제 게임 코드로 허수아비 앞에서 반복 시전 + 데이터(JSON) + 동작 코드. 메타 ${src('src/data/skills.js')} · 전사 수치 ${src('src/data/balance.js')} · 동작 ${src('src/systems/skills.js')} 등. 대기시간은 시전속도(기본 공격은 공격속도) 영향. 레벨 보너스는 Lv1보다 레벨마다 더해짐 (최대 Lv${SKILL_MAX_LEVEL})`),
    table([
      { label: '스킬', get: (r) => SKILL_META[r.id].label },
      { label: '상세', get: (r) => el('button', { onclick: () => openSkillDetail(r.id) }, '미리보기') },
      { label: '분류', get: (r) => tag(SKILL_TYPE_LABEL[SKILL_META[r.id].type]) },
      { label: '직업', key: 'cls' },
      { label: '카드 등장 Lv', num: true, get: (r) => SKILL_UNLOCK_LEVEL[r.id] },
      { label: '마나', num: true, get: (r) => skillInfo(r.id).mana },
      { label: '대기(초)', num: true, get: (r) => skillInfo(r.id).cd },
      { label: '효과(Lv1)', get: (r) => skillInfo(r.id).effect },
      { label: '레벨당', get: (r) => levelUpText(r.id) }
    ], rows)
  );

  const heroLv = [1, 10, 20, 30], skillLv = [1, 3, 5];
  const spellIds = Object.keys(SPELLS);
  root.append(
    h2('마법 피해 표 (주인공 레벨 × 스킬 레벨)'),
    note(`피해 = 기본 × (1 + ${SPELL_LEVEL_SCALE} × (주인공 레벨 − 1)) × (1 + 스킬 피해 보너스). 원소 마스터리·몬스터 저항은 별도. 얼음보주는 조각 하나 기준`),
    table([
      { label: '마법', get: (id) => SKILL_META[id].label },
      ...heroLv.flatMap((h) => skillLv.map((s) => ({
        label: `Lv${h}·S${s}`, num: true,
        get: (id) => {
          const base = id === 'orb' ? SPELLS.orb.shardDamage : SPELLS[id].damage;
          return Math.round(base * (1 + SPELL_LEVEL_SCALE * (h - 1)) * (1 + (SKILL_LEVEL_UP[id].damage || 0) * (s - 1)));
        }
      })))
    ], spellIds)
  );

  root.append(
    h2('레벨업 카드'),
    note(`레벨업마다 ${CARD_CHOICES}장 중 하나, 다시 뽑기 판마다 ${CARD_REROLLS}회. 뽑힐 비중: 새 스킬 ${CARD_WEIGHT.newSkill} · 스킬 강화 ${CARD_WEIGHT.skillUp} · 강화 카드 한 장당 ${CARD_WEIGHT.upgrade}. ${src('src/data/cards.js')}`),
    table([
      { label: '등급', get: (k) => tag(CARD_RARITY[k].label, CARD_RARITY[k].color) },
      { label: '비중', num: true, get: (k) => CARD_RARITY[k].weight },
      { label: '확률', num: true, get: (k) => pct(CARD_RARITY[k].weight / CARD_RARITY_ORDER.reduce((s, x) => s + CARD_RARITY[x].weight, 0)) },
      { label: '수치 배율', num: true, get: (k) => `×${CARD_RARITY[k].mult}` }
    ], CARD_RARITY_ORDER),
    table([
      { label: '강화 카드', get: (id) => UPGRADE_CARDS[id].label },
      { label: '능력치', get: (id) => UPGRADE_CARDS[id].statLabel },
      ...CARD_RARITY_ORDER.map((r) => ({
        label: CARD_RARITY[r].label, num: true,
        get: (id) => { const u = UPGRADE_CARDS[id], v = u.amount * CARD_RARITY[r].mult; return u.unit === 'pct' ? `+${pct(v)}` : u.unit === 'perSec' ? `+${num(v, 1)}/초` : `+${Math.round(v)}`; }
      })),
      { label: '직업', get: (id) => (UPGRADE_CARDS[id].classes || ['전체']).map((c) => (CLASSES[c] ? CLASSES[c].label : c)).join(', ') },
      { label: '최대', num: true, get: () => `${UPGRADE_MAX_PICKS}회` }
    ], UPGRADE_ORDER),
    h2('마스터리 (패시브)'),
    note(`레벨업 카드로 Lv1~${MASTERY_MAX_LEVEL}. 카드 한 장당 비중 ${CARD_WEIGHT.mastery} (강화 카드 ${CARD_WEIGHT.upgrade}보다 30% 드묾). 무기 마스터리는 주무기가 그 종류일 때만. ${src('src/data/masteries.js')} · 계산 ${src('util.masteryBonus')}`),
    table([
      { label: '마스터리', get: (id) => MASTERIES[id].label },
      { label: '직업', get: (id) => MASTERIES[id].classes.map((c) => CLASSES[c].label).join(', ') },
      { label: '조건', get: (id) => (MASTERIES[id].weapon ? `${GEAR_VARIANT_LABEL[MASTERIES[id].weapon]} 주무기` : '') },
      { label: '레벨당', get: (id) => Object.entries(MASTERIES[id].per).map(([k, v]) => `${MASTERY_STAT[k]} +${pct(v)}`).join(', ') },
      { label: `Lv${MASTERY_MAX_LEVEL}`, get: (id) => Object.entries(MASTERIES[id].per).map(([k, v]) => `${MASTERY_STAT[k]} +${pct(v * MASTERY_MAX_LEVEL)}`).join(', ') }
    ], MASTERY_ORDER),
    note(`채우기 카드(뽑을 카드가 모자랄 때): ${FILLER_ORDER.map((k) => `${FILLER_CARDS[k].label} - ${FILLER_CARDS[k].desc}`).join(' · ')}`)
  );
  root.append(el('div'));
}
