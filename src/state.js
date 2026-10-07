// 게임 상태 한 곳. 다른 모듈은 이 객체들의 속성을 읽고/바꾼다 (바인딩 재할당 대신 game.cows = [] 처럼 속성 대입)

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
  meteors: [], // 떨어지는 중인 메테오 (systems/spells.js)
  projectiles: [], // 날아가는 투사체 (systems/projectiles.js)
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
  releaseMeta: { bestWave: 0, bestKills: 0, clears: 0, runs: 0 },
  hero: null, // 주인공 - boot()에서 createHero()로 생성 (entities/hero.js)
  itemSeq: 0 // 아이템 uid 발급 카운터 (새 게임에서도 이어서 증가 - 한 실행 안에서 uid가 겹치지 않게)
};

// 화면/메뉴 상태 (장비창 탭·선택·클릭 영역, 타이틀 연출, 감정 진행)
export const ui = {
  showInventory: false,
  showHelp: false, // 도움말 창
  helpPausedGame: false, // 도움말을 열면서 일시정지시켰는지 (닫을 때 원래대로)
  invPanelTab: 'equip', // 'equip' | 'stats' | 'bag' | 'upgrade'
  selectedInvIndex: null, // 클릭해서 고정한 가방 칸
  hoverInvIndex: null, // 마우스를 올려둔 가방 칸(미리보기용)
  selectedEquipSlot: null, // 가방 탭 '착용 중'에서 고정한 슬롯 이름
  hoverEquipSlot: null,
  invSlotRects: [],
  invTabRects: {},
  invButtons: [], // 그릴 때마다 채워지는 클릭 버튼 목록 {x,y,w,h,fn}
  invToast: null, // 메뉴 안에서 잠깐 보여주는 안내 {text,color,until}
  invReveal: null, // 방금 감정된 아이템 강조 {item,color,until}
  titleCows: [],
  titleTime: 0,
  identifyingItem: null, // 인덱스가 아니라 객체 참조 - 중간에 다른 칸이 장착/정리돼 배열이 밀려도 안전
  identifyTimer: 0,
  moveMarker: null, // 클릭 이동 표시 {x, y, t0} (그리기 전용)
  devPanelOpen: false,
  selectedClass: 'warrior', // 시작 화면에서 고른 캐릭터 (data/classes.js)
  titleCardRects: [], // 시작 화면 캐릭터 카드 클릭 영역 (그릴 때마다 갱신)
  titleStartRect: null // 시작 화면 '게임 시작' 버튼 영역
};

// 개발자 모드 치트 (systems/dev.js, 패널은 ui/devPanel.js)
export const dev = {
  god: false,          // 무적 (피해 안 받음)
  infiniteMana: false, // 마나 항상 가득
  noCooldown: false    // 스킬 대기시간 0
};

// 입력 상태 (눌린 키, 슬롯 길게 누르기, 가상 조이스틱)
export const input = {
  keys: {},
  holdSlot1: false,
  holdSlot2: false,
  moveTarget: null, // 클릭 이동 목표 {x, y} (월드 좌표) - WASD/조이스틱을 쓰면 취소
  mouseMoveHeld: false, // 좌클릭을 누른 채 끄는 중 (커서를 계속 따라감)
  attackTarget: null, // 클릭한 적 - 사거리까지 걸어가서 공격. 누르고 있는 동안(attackHeld)은 계속, 떼면 한 번 치고 끝
  attackHeld: false,
  standAttackHeld: false, // Shift+좌클릭: 제자리에서 커서 방향으로 기본 공격 (누르는 동안 계속)
  mouseScreen: null, // 마지막 마우스 위치(캔버스 px) - PC에서 스킬/공격을 커서 방향으로. 터치만 쓰면 null
  joystick: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, magnitude: 0 }
};
