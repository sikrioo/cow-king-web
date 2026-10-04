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
