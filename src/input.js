// 입력: 키보드/마우스/터치/조이스틱 → 의도(intent). 게임 로직은 의도만 받아 처리 (game.js의 handleKeyDown/slotPress)
// 이동/달리기처럼 누르고 있는 상태는 input.keys / input.joystick으로 매 틱 읽음
import { LEVEL_STAT_KEYS } from './data/balance.js';
import { canvas } from './core/context.js';
import { ui, input } from './state.js';
import { invPanelHandlePoint, menuPointerMove } from './ui/menu/panel.js';

export const JOY_RADIUS = 42;

export const joyBase = document.getElementById('joystick-base');

export const joyKnob = document.getElementById('joystick-knob');

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
//   stat: 메뉴 열림 → Z~M = 스탯 투자 (어느 스탯인지는 data/balance.js의 LEVEL_STAT_KEYS)
//   이동: W/A/S/D·방향키, 달리기: Shift - 의도가 아니라 누름 상태(input.keys)로 매 틱 읽음
export const KEY_INTENTS = {
  escape: 'back',        // 메뉴 닫기 / 일시정지 토글
  p: 'pause',
  l: 'debugLevelUp',     // 테스트용: 한 레벨 업 (나중에 제거)
  ' ': 'slot1',          // 길게 누르면 반복 시전
  e: 'slot2',
  q: 'cycleSlot1',       // 슬롯 스킬 전환
  r: 'cycleSlot2',
  i: 'toggleMenu',
  1: 'num', 2: 'num', 3: 'num', 4: 'num', 5: 'num', 6: 'num', 7: 'num',
  ...Object.fromEntries(Object.keys(LEVEL_STAT_KEYS).map((k) => [k, 'stat']))
};

// 이벤트 리스너 연결. actions: { keyDown(intent, key, e), slotPress(slotNum) } - 의도 처리는 game.js
export function bindInput(actions) {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    input.keys[k] = true;
    actions.keyDown(KEY_INTENTS[k] || null, k, e);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    input.keys[k] = false;
    if (KEY_INTENTS[k] === 'slot1') input.holdSlot1 = false;
    if (KEY_INTENTS[k] === 'slot2') input.holdSlot2 = false;
  });

  // 좌클릭(또는 터치) = 슬롯1 길게 누르기, 우클릭 = 슬롯2 길게 누르기
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (ui.showInventory) return; // 인벤토리 열려있을 땐 별도 핸들러가 처리
    actions.slotPress(e.button === 2 ? 2 : 1);
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button === 2) input.holdSlot2 = false;
    else input.holdSlot1 = false;
  });
  canvas.addEventListener('pointerleave', () => { input.holdSlot1 = false; input.holdSlot2 = false; ui.hoverInvIndex = null; });

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
