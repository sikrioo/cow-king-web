// 입력: 키보드/마우스/터치/조이스틱 → 의도(intent). 게임 로직은 의도만 받아 처리 (game.js의 handleKeyDown/slotPress)
// 이동/달리기처럼 누르고 있는 상태는 input.keys / input.joystick으로 매 틱 읽음
import { LEVEL_STAT_KEYS, CLICK_PICK_PADDING } from './data/balance.js';
import { canvas } from './core/context.js';
import { game, ui, input } from './state.js';
import { screenToWorld } from './world/camera.js';
import { clampToPen } from './world/arena.js';
import { cowEdgeDist } from './systems/combat.js';
import { invPanelHandlePoint, menuPointerMove } from './ui/menu/panel.js';

export const JOY_RADIUS = 42;

export const joyBase = document.getElementById('joystick-base');

export const joyKnob = document.getElementById('joystick-knob');

function rememberMouse(e) {
  const rect = canvas.getBoundingClientRect();
  input.mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function eventWorld(e) {
  const rect = canvas.getBoundingClientRect();
  return screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
}

// 월드 좌표 아래의 적 (겹치면 가장 가까운 것)
function cowAt(w) {
  let best = null, bestD = Infinity;
  game.cows.forEach((c) => {
    if (c.state === 'dead' || c.team === game.hero.team) return;
    const d = cowEdgeDist(c, w.x, w.y); // 그림의 몸통/발밑 기준
    if (d <= CLICK_PICK_PADDING && d < bestD) { best = c; bestD = d; }
  });
  return best;
}

// 클릭 지점(화면) → 이동 목표(월드, 목장 안쪽). marker: 클릭 표시를 새로 띄울지 (끄는 중엔 위치만 갱신)
function setMoveTarget(e, marker) {
  const w = eventWorld(e);
  input.moveTarget = clampToPen(w.x, w.y, game.hero.r);
  if (marker || !ui.moveMarker) ui.moveMarker = { x: input.moveTarget.x, y: input.moveTarget.y, t0: performance.now() };
  else { ui.moveMarker.x = input.moveTarget.x; ui.moveMarker.y = input.moveTarget.y; }
}

export function joyMove(clientX, clientY) {
  const dx = clientX - input.joystick.baseX;
  const dy = clientY - input.joystick.baseY;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, JOY_RADIUS);
  const angle = Math.atan2(dy, dx);
  input.joystick.dx = Math.cos(angle) * clamped;
  input.joystick.dy = Math.sin(angle) * clamped;
  input.joystick.magnitude = clamped / JOY_RADIUS;
  joyKnob.style.transform = `translate(${input.joystick.dx}px, ${input.joystick.dy}px)`;
}

export function joyEnd() {
  input.joystick.active = false;
  input.joystick.id = null;
  input.joystick.dx = 0; input.joystick.dy = 0; input.joystick.magnitude = 0;
  joyKnob.style.transform = 'translate(0px, 0px)';
}

// 키 → 의도 (한 테이블). 같은 키라도 상태에 따라 뜻이 달라지는 것은 game.js의 handleKeyDown이 해석:
//   num: 메뉴 닫힘 → 1/2 = 생명/마나 물약, 메뉴 열림 → 1~7 = 장비 칸 강화
//   stat: 메뉴 열림 → Z~M, 쉼표 = 스탯 투자 (어느 스탯인지는 data/balance.js의 LEVEL_STAT_KEYS)
//   이동: W/A/S/D·방향키, 달리기: Shift - 의도가 아니라 누름 상태(input.keys)로 매 틱 읽음
export const KEY_INTENTS = {
  escape: 'back',        // 메뉴 닫기 / 일시정지 토글
  p: 'pause',
  l: 'debugLevelUp',     // 개발자 모드: 한 레벨 업
  '`': 'devPanel',       // 개발자 모드: 패널 열기/닫기
  ' ': 'slot1',          // 길게 누르면 반복 시전
  e: 'slot2',
  f: 'slot3',            // 공통 슬롯
  q: 'cycleSlot1',       // 슬롯 스킬 전환
  r: 'cycleSlot2',
  i: 'toggleMenu',
  h: 'help',             // 도움말 창
  1: 'num', 2: 'num', 3: 'num', 4: 'num', 5: 'num', 6: 'num', 7: 'num',
  ...Object.fromEntries(Object.keys(LEVEL_STAT_KEYS).map((k) => [k, 'stat']))
};

// 키 이름 정규화: 글자/숫자 키는 물리 위치(e.code)로 읽음 - 한글 입력 상태에서도 W가 'ㅈ'이 아니라 'w'
// (keydown/keyup 모두 같은 규칙이라 키가 눌린 채로 남지 않음). 그 밖의 키는 e.key 소문자 (' ', 'escape', 'shift', 'arrowup' …)
export function keyOf(e) {
  const m = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(e.code || '');
  if (m) return (m[1] || m[2]).toLowerCase();
  return e.key.toLowerCase();
}

// 이벤트 리스너 연결. actions: { keyDown(intent, key, e), slotPress(slotNum), pickCard(i), rerollCards() } - 처리는 game.js / systems/levelCards.js
export function bindInput(actions) {
  window.addEventListener('keydown', (e) => {
    const k = keyOf(e);
    input.keys[k] = true;
    actions.keyDown(KEY_INTENTS[k] || null, k, e);
  });
  window.addEventListener('keyup', (e) => {
    const k = keyOf(e);
    input.keys[k] = false;
    if (KEY_INTENTS[k] === 'slot1') input.holdSlot1 = false;
    if (KEY_INTENTS[k] === 'slot2') input.holdSlot2 = false;
  });

  // 마우스: 좌클릭 = 그 지점으로 이동(누른 채 끌면 커서를 따라감) / 적이면 그 적 공격, Shift+좌클릭 = 제자리에서 커서 방향 기본 공격,
  //        우클릭 = 슬롯2 (길게 = 반복). 스킬은 커서 방향으로 시전
  // 터치/펜: 화면 탭 = 슬롯1 (모바일 이동은 조이스틱)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (ui.showInventory) return; // 인벤토리 열려있을 땐 별도 핸들러가 처리
    if (game.cardOffer && game.gameState === 'playing') {
      // 레벨업 카드: 카드를 누르면 고름, '다시 뽑기' 버튼 (다른 곳은 무시)
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const inside = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      const i = ui.cardRects.findIndex(inside);
      if (i >= 0) actions.pickCard(i);
      else if (inside(ui.cardRerollRect)) actions.rerollCards();
      return;
    }
    if (game.gameState === 'title') {
      // 시작 화면: 카드 = 캐릭터 고르기만, '게임 시작' 버튼을 눌러야 시작 (다른 곳 클릭은 무시)
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const inside = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
      const card = ui.titleCardRects.find(inside);
      if (card) ui.selectedClass = card.key;
      else if (inside(ui.titleStartRect)) actions.slotPress(1);
      return;
    }
    const mouse = e.pointerType !== 'touch' && e.pointerType !== 'pen';
    if (mouse) rememberMouse(e);
    if (mouse && e.button === 0 && e.shiftKey && game.gameState === 'playing' && !game.paused) {
      // 디아블로식 제자리 공격: 클릭 명령은 취소, 누르고 있는 동안 커서 방향으로 계속 (skills.updateSkillSlots)
      input.moveTarget = null;
      input.mouseMoveHeld = false;
      input.attackTarget = null;
      input.standAttackHeld = true;
      return;
    }
    if (mouse && e.button === 0 && !e.shiftKey && game.gameState === 'playing' && !game.paused) {
      const cow = cowAt(eventWorld(e));
      if (cow) {
        // 적 클릭: 그 적에게 가서 공격 (누르고 있는 동안 계속)
        input.attackTarget = cow;
        input.attackHeld = true;
        input.moveTarget = null;
        return;
      }
      input.attackTarget = null;
      setMoveTarget(e, true);
      input.mouseMoveHeld = true;
      return;
    }
    actions.slotPress(e.button === 2 ? 2 : 1); // 타이틀/게임오버에서는 시작
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') rememberMouse(e);
    if (ui.showInventory || game.cardOffer || game.gameState !== 'playing') return;
    // 적 위에서는 커서 모양으로 공격 가능함을 알림
    if (e.pointerType !== 'touch') canvas.style.cursor = cowAt(eventWorld(e)) ? 'crosshair' : 'default';
    if (!input.mouseMoveHeld || game.paused) return;
    setMoveTarget(e, false);
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button === 2) input.holdSlot2 = false;
    else { input.holdSlot1 = false; input.mouseMoveHeld = false; input.attackHeld = false; input.standAttackHeld = false; }
  });
  canvas.addEventListener('pointerleave', () => { input.holdSlot1 = false; input.holdSlot2 = false; input.mouseMoveHeld = false; input.attackHeld = false; input.standAttackHeld = false; ui.hoverInvIndex = null; ui.hoverEquipSlot = null; });

  // 메뉴가 열려 있으면 캔버스 포인터는 메뉴로 (호버 미리보기 / 클릭)
  canvas.addEventListener('pointermove', (e) => {
    if (!ui.showInventory) return;
    const rect = canvas.getBoundingClientRect();
    menuPointerMove(e.clientX - rect.left, e.clientY - rect.top);
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!ui.showInventory) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    invPanelHandlePoint(mx, my);
  });

  // 모바일 가상 조이스틱
  joyBase.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joyBase.setPointerCapture(e.pointerId);
    input.joystick.active = true;
    input.joystick.id = e.pointerId;
    const rect = joyBase.getBoundingClientRect();
    input.joystick.baseX = rect.left + rect.width / 2;
    input.joystick.baseY = rect.top + rect.height / 2;
    joyMove(e.clientX, e.clientY);
  });
  joyBase.addEventListener('pointermove', (e) => {
    if (input.joystick.active && e.pointerId === input.joystick.id) { e.preventDefault(); joyMove(e.clientX, e.clientY); }
  });
  joyBase.addEventListener('pointerup', (e) => { if (e.pointerId === input.joystick.id) joyEnd(); });
  joyBase.addEventListener('pointercancel', (e) => { if (e.pointerId === input.joystick.id) joyEnd(); });
}
