// 휴리스틱 봇 판단 수치 (src/bot/heuristic.js) - 게임 밸런스가 아니라 봇의 버릇
//   healAt/manaAt: 체력·마나가 최대치의 이 비율 아래면 물약 / dodgePad: 위험 원에서 이만큼 더 떨어지면 안전
//   lineWatch: 돌진 줄을 살피는 거리, lineWidth: 줄에서 옆으로 이만큼 안이면 비킴 / shotWatch: 이 거리 안 투사체만 피함
//   castRange*: 가장 가까운 적이 이 안이면 스킬 / sorcKeep: 마법사가 유지하는 거리 / edge: 맵 끝에서 이만큼은 피함
//   lootRange: 적이 없을 때 주우러 가는 거리 / homeRadius: 적이 없으면 맵 가운데에서 이만큼 안으로 / flowWait: 화면 넘기기 전 기다림(초)
//   stuckTime/unstuckTime: 이만큼 제자리면 옆으로 이만큼 움직여 빠져나옴
//   meleeLos/shotRadius: 적이 이 거리보다 멀고 사이를 구조물이 막으면(투사체 반지름 기준) 쏘지 않고 돌아감
//   avoidLook: 가려는 쪽 이 거리 안 구조물은 둘레로 비켜 감 / approachPad: 적이 사거리 + 이만큼보다 멀면 직접 걸어감(구조물 비켜서)
//   crowdRadius/crowdCount: 이 반경 안 적이 이만큼 이상이고 체력이 crowdHp 아래면 무리 반대쪽으로 retreatTime초 빠짐(달리기), 그 뒤 retreatCd초는 다시 안 빠짐(계속 도망만 다니지 않게)
export const BOT = {
  healAt: 0.4, manaAt: 0.2, dodgePad: 14,
  lineWatch: 420, lineWidth: 46, shotWatch: 180,
  castRangeWarrior: 170, castRangeSorc: 380, sorcKeep: 170, edge: 150,
  lootRange: 650, homeRadius: 260, flowWait: 1.5,
  stuckTime: 1.0, unstuckTime: 0.5,
  avoidLook: 60, approachPad: 30, meleeLos: 70, shotRadius: 6,
  crowdRadius: 110, crowdCount: 4, crowdHp: 0.65, retreatTime: 1.0, retreatCd: 4,
  // 생존 (src/bot/heuristic.js survive): 체력이 surviveHp 아래인데 바로 마실 생명 물약이 없으면 - 바닥 생명 물약(potionRange 안)으로, 없으면 가장 덜 위험한 쪽으로 달림
  //   escapeDirs방향 × escapeStep 앞을 재 보고 적 위협 합(가중치 / 거리)이 가장 작은 쪽. 보스·예고 중인 적은 위협이 큼
  surviveHp: 0.35, potionRange: 500, escapeDirs: 16, escapeStep: 90, threatBoss: 3, threatCharging: 2, threatRanged: 0.6,
  // 먼저 잡을 적 (치유·소환·저주·원거리 마법) - priorityRange 안이고 가는 길이 막히지 않으면 가장 가까운 적보다 먼저
  priorityKinds: ['priest', 'shaman', 'skeletonJailer', 'demonCurser', 'ratKeeper', 'pyro'], priorityRange: 320
};

// 봇 성장 관리 (src/bot/upkeep.js, upkeepEvery초마다)
//   build: 스탯 포인트 비율 (이 비율대로 고르게 - 레벨 스탯 키) / skills: 슬롯에 넣을 스킬 우선순위 (배운 것 중 앞에서 둘, 오라·무기 특수기 제외)
//   gear: 장비 점수 가중치 - 능력치 키는 STAT_DEF 단위(% 옵션은 소수, 고정 수치는 ×10 정수), dps = 무기 평균 피해/초(마법사는 0), armor = 방어력
//   equipMargin: 지금 장비보다 점수가 이 비율 이상 높아야 바꿔 낌(왔다 갔다 방지)
export const BOT_UPKEEP = { upkeepEvery: 1, equipMargin: 0.05 };
export const BOT_BUILD = {
  warrior: {
    build: { health: 4, atkPower: 3, accuracy: 2, defense: 1, atkSpeed: 1 },
    skills: ['whirlwind', 'smash', 'leap', 'concuss', 'heavenbolt', 'holyhammer', 'flurry', 'rush', 'berserk', 'fortify', 'warcry'],
    gear: { dps: 1.2, armor: 0.6, atkPower: 1, health: 0.7, mana: 0.1, atkSpeed: 120, castSpeed: 30, defense: 120, evasion: 110, accuracy: 80, moveSpeed: 60,
      lifeLeech: 250, manaLeech: 60, crushBlow: 150, knockback: 8, fireDmg: 0.8, coldDmg: 0.8, lightningDmg: 0.8, poisonDmg: 0.8,
      skillAll: 30, skillWarrior: 30, skillWeapon: 10 }
  },
  sorc: {
    build: { health: 4, mana: 2, castSpeed: 3, evasion: 1 },
    skills: ['meteor', 'blizzard', 'chain', 'fireball', 'balllightning', 'orb', 'thunderstrike', 'firewave', 'flamepillar', 'frostnova', 'discharge', 'energyshield'],
    gear: { dps: 0, armor: 0.6, atkPower: 0, health: 0.8, mana: 0.5, atkSpeed: 60, castSpeed: 150, defense: 100, evasion: 120, accuracy: 0, moveSpeed: 80,
      lifeLeech: 0, manaLeech: 0, crushBlow: 0, knockback: 0, fireDmg: 0, coldDmg: 0, lightningDmg: 0, poisonDmg: 0,
      skillAll: 30, skillSorc: 30, skillFire: 15, skillCold: 15, skillLightning: 15 }
  }
};
