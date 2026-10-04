// 게임 상태 한 곳. 다른 모듈은 이 객체들의 속성을 읽고/바꾼다 (바인딩 재할당 대신 game.cows = [] 처럼 속성 대입)
import { MAX_MANA, MAX_STAMINA, ATTACK_DURATION, expForLevel } from './data/balance.js';

// 월드/진행 상태
export const game = {
  gameState: 'playing',
  paused: false,
  wave: 0,
  waveTransition: 0,
  kills: 0,
  cows: [],
  items: [],
  hazards: [],
  lightningBolts: [],
  shockwaves: [],
  particles: [],
  floatTexts: [],
  shake: 0,
  hitstop: 0,
  impactFlash: 0,
  waveBannerTimer: 0,
  demoTipTimer: 0,
  runRecorded: false,
  releaseMeta: { bestWave: 0, bestKills: 0, clears: 0, runs: 0 }
};

// 화면/메뉴 상태 (장비창 탭·선택·클릭 영역, 타이틀 연출, 감정 진행)
export const ui = {
  showInventory: false,
  invPanelTab: 'equip', // 'equip' | 'stats' | 'bag' | 'upgrade'
  selectedInvIndex: null, // 클릭해서 고정한 가방 칸
  hoverInvIndex: null, // 마우스를 올려둔 가방 칸(미리보기용)
  invSlotRects: [],
  invTabRects: {},
  invButtons: [], // 그릴 때마다 채워지는 클릭 버튼 목록 {x,y,w,h,fn}
  invToast: null, // 메뉴 안에서 잠깐 보여주는 안내 {text,color,until}
  invReveal: null, // 방금 감정된 아이템 강조 {item,color,until}
  titleCows: [],
  titleTime: 0,
  identifyingItem: null, // 인덱스가 아니라 객체 참조 - 중간에 다른 칸이 장착/정리돼 배열이 밀려도 안전
  identifyTimer: 0
};

// 입력 상태 (눌린 키, 슬롯 길게 누르기, 가상 조이스틱)
export const input = {
  keys: {},
  holdSlot1: false,
  holdSlot2: false,
  joystick: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, magnitude: 0 }
};

// 주인공 (Step 5에서 entities/hero.js의 createHero로 옮길 예정)
export const player = {
  body: null, // boot()에서 생성
  x: 0, y: 0, r: 17,
  facing: 0,
  hp: 15, maxHp: 15,
  mana: MAX_MANA, maxMana: MAX_MANA,
  stamina: MAX_STAMINA, maxStamina: MAX_STAMINA,
  running: false,
  invuln: 0,
  attackTimer: 0,
  attackCooldown: 0,
  currentAttackDuration: ATTACK_DURATION,
  combo: 0,
  comboTimer: 0,
  knockback: 0,
  flash: 0,
  alive: true,
  warcryCooldown: 0,
  whirlwindTimer: 0,
  whirlwindCooldown: 0,
  whirlAngle: 0,
  leapTimer: 0,
  leapCooldown: 0,
  leapFrom: { x: 0, y: 0 },
  leapTo: { x: 0, y: 0 },
  slowTimer: 0,
  bonusMaxHp: 0,
  vitalityTimer: 0,
  speedMult: 1,
  speedBuffTimer: 0,
  attackBonus: 0,
  attackBuffTimer: 0,
  defenseChance: 0,
  defenseBuffTimer: 0,
  equipment: { armor: null, weaponMain: null, weaponOff: null, greaves: null, boots: null, accessory1: null, accessory2: null },
  gearAtkSpeed: 0,
  gearAtkPower: 0,
  gearDefense: 0,
  gearEvasion: 0,
  gearSpeedMult: 1,
  gearMaxHp: 0,
  gearMaxMana: 0,
  materials: 0,
  inventory: [],
  rushCooldown: 0,
  rushTimer: 0,
  rushFrom: { x: 0, y: 0 },
  rushTo: { x: 0, y: 0 },
  rushHitSet: null,
  smashCooldown: 0,
  smashTimer: 0,
  smashHitDone: false,
  slot1: 'attack',
  slot2: 'warcry',
  potions: { heal: 2, mana: 2 }, // 가방과 별개로 보관하는 생명/마나 물약 (1·2키 / 화면 버튼으로 마심)
  potionCd: { heal: 0, mana: 0 }, // 종류별 대기시간 (생명 마신 직후에도 마나는 바로 마실 수 있게)
  moveOffsetX: 0,
  moveOffsetY: 0,
  moveOffsetVX: 0,
  moveOffsetVY: 0,
  moveLean: 0,
  moveLeanV: 0,
  moveFxCooldown: 0,
  moveReaction: 0,
  renderBreath: 0,
  moveSpeedN: 0,
  moveInputActive: false,
  moveStep: 0,
  level: 1,
  exp: 0,
  expToNext: expForLevel(1),
  statPoints: 0,
  levelStats: { atkPower: 0, defense: 0, evasion: 0, atkSpeed: 0, moveSpeed: 0, health: 0, mana: 0 }
};
