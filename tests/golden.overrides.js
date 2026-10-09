// 골든(docs/baseline.golden.json = 레거시 동작 기록) 대비 **의도적으로 바꾼** 값 목록.
// 골든 파일은 레거시 그대로 둔다(legacy/tools/baseline.cjs --check가 계속 통과하도록). 바꾼 이유와 날짜를 같이 적을 것.
export const GOLDEN_OVERRIDES = {
  // 2026-10-05: '방어력'과 '블락률'이 같은 수치인데 화면마다 이름이 달라서 '블락률'로 통일 (사용자 결정 A)
  'exact.statDef.defense.label': '블락률',
  // 2026-10-07: 스킬은 레벨이 아니라 레벨업 카드(뱀서식)로 배움 (사용자 결정) - 카드를 안 고른 새 캐릭터는 레벨과 상관없이 시작 스킬만
  'exact.slot2OptionsByLevel': { 1: ['warcry'], 2: ['warcry'], 3: ['warcry'], 4: ['warcry'], 5: ['warcry'] },
  // 2026-10-08: 개발자 모드 테스트 가방에 원소별 테스트 무기 4개 추가 (사용자 결정: 전사로 면역 몬스터 시험)
  'exact.start.testStashCount': 12, // 2026-10-09: + 대검(무기 종류마다 하나씩 넣는 테스트 가방)
  // 2026-10-09: 옵션 개수는 등급별 접사 규칙(data/affixes.js AFFIX_RULES - 일반 0 / 매직 1~2 / 레어 3~6 / 레전드 5~6)으로 바뀌어 RARITY_DEF의 statMin/statMax 제거 (사용자 결정: 디아식 접사 체계)
  'exact.rarity.normal.statMin': undefined,
  'exact.rarity.normal.statMax': undefined,
  'exact.rarity.magic.statMin': undefined,
  'exact.rarity.magic.statMax': undefined,
  'exact.rarity.rare.statMin': undefined,
  'exact.rarity.rare.statMax': undefined,
  'exact.rarity.legendary.statMin': undefined,
  'exact.rarity.legendary.statMax': undefined
};

// 골든에 없던 항목을 **새로 추가**한 경우 (부모 경로는 있어야 함). 값은 현재 단위(×10)
export const GOLDEN_ADDITIONS = {
  // 2026-10-06: 원소 1단계 - 독 카우 추가 (사용자 결정: 기존 원소 몬스터 3종 + 독 카우 1종)
  'exact.monsters.venom': { hp: 60, meleeDmg: 30, scaleRatio: 1 },
  // 2026-10-06: 화염술사 카우(메테오) 추가
  'exact.monsters.pyro': { hp: 50, meleeDmg: 30, scaleRatio: 1 },
  // 2026-10-07: 마법사 캐릭터 스킬 해금 레벨
  'exact.progression.skillUnlockLevel.bolt': 1,
  'exact.progression.skillUnlockLevel.fireball': 1,
  'exact.progression.skillUnlockLevel.frostnova': 2,
  'exact.progression.skillUnlockLevel.chain': 4,
  'exact.progression.skillUnlockLevel.orb': 6,
  // 2026-10-07: 시전속도 (스킬 대기시간, 장비 옵션 10~25% + 스탯 포인트 3%)
  'exact.statDef.castSpeed': { label: '시전속도', min: 0.10, max: 0.25, fmtAtMax: '+25%' },
  'exact.progression.perPoint.castSpeed': 0.03,
  // 2026-10-08: 물리 스킬 투지(전사), 공통 스킬 순간이동 - 새 스킬 카드가 나오는 레벨
  'exact.progression.skillUnlockLevel.fortify': 3,
  'exact.progression.skillUnlockLevel.teleport': 3,
  // 2026-10-09: 새 스킬 - 전사 난타·뇌진탕·버서커·더미, 마법사 에너지 쉴드·화염기둥·눈보라
  // 2026-10-09: 대검(양손 전용, 사거리 가장 김) 추가 (사용자 요청)
  'exact.weaponRange.greatsword': 78,
  'exact.progression.skillUnlockLevel.flurry': 2,
  'exact.progression.skillUnlockLevel.concuss': 4,
  'exact.progression.skillUnlockLevel.berserk': 6,
  'exact.progression.skillUnlockLevel.decoy': 7,
  'exact.progression.skillUnlockLevel.energyshield': 3,
  'exact.progression.skillUnlockLevel.flamepillar': 5,
  'exact.progression.skillUnlockLevel.blizzard': 8,
  // 2026-10-08: 무기 원소 피해 옵션 (지금은 드랍 안 됨 - 개발자 테스트 무기에만)
  'exact.statDef.fireDmg': { label: '화염 피해', min: 15, max: 40, fmtAtMax: '+40' },
  'exact.statDef.coldDmg': { label: '냉기 피해', min: 15, max: 40, fmtAtMax: '+40' },
  'exact.statDef.lightningDmg': { label: '번개 피해', min: 15, max: 40, fmtAtMax: '+40' },
  'exact.statDef.poisonDmg': { label: '독 피해', min: 15, max: 40, fmtAtMax: '+40' }
};

// 2026-10-05: 체력/피해 ×10 정수화 - 레거시 기록의 체력·피해 계열 값을 새 단위로 환산해서 비교 (몇 대에 죽는지 등은 그대로)
export const LEGACY_HP_SCALE = 10;
function scaleLegacy(g) {
  const S = LEGACY_HP_SCALE;
  const e = g.exact;
  Object.values(e.monsters).forEach((m) => { m.hp *= S; m.meleeDmg *= S; });
  e.baseDamage *= S;
  e.hitsToKill = Object.fromEntries(Object.entries(e.hitsToKill).map(([d, v]) => [String(d * S), v])); // 키 = 데미지
  e.progression.perPoint.atkPower = +(e.progression.perPoint.atkPower * S).toFixed(6);
  e.progression.perPoint.health *= S;
  for (const k of ['atkPower', 'health']) {
    e.statDef[k].min *= S; e.statDef[k].max *= S;
    e.statDef[k].fmtAtMax = '+' + (Number(e.statDef[k].fmtAtMax.slice(1)) * S);
  }
  e.start.maxHp *= S;
  return g;
}

// golden 깊은 복사본에 단위 환산 + override 적용
export function applyOverrides(golden) {
  const g = scaleLegacy(JSON.parse(JSON.stringify(golden)));
  for (const [path, value] of Object.entries(GOLDEN_OVERRIDES)) {
    const keys = path.split('.');
    let o = g;
    for (const k of keys.slice(0, -1)) {
      if (!(k in o)) throw new Error('override 경로 없음: ' + path);
      o = o[k];
    }
    if (!(keys[keys.length - 1] in o)) throw new Error('override 경로 없음: ' + path);
    o[keys[keys.length - 1]] = value;
  }
  for (const [path, value] of Object.entries(GOLDEN_ADDITIONS)) {
    const keys = path.split('.');
    let o = g;
    for (const k of keys.slice(0, -1)) {
      if (!(k in o)) throw new Error('추가 경로의 부모 없음: ' + path);
      o = o[k];
    }
    if (keys[keys.length - 1] in o) throw new Error('이미 있는 항목 - GOLDEN_OVERRIDES로: ' + path);
    o[keys[keys.length - 1]] = value;
  }
  return g;
}
