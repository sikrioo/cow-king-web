// 캔버스 캐릭터 메뉴: 열기/닫기, 탭, 클릭 처리, 패널 그리기
// 메뉴는 자기 UI 상태(state.ui)만 바꾸고 게임 상태는 systems/ 함수 호출로만 바꾼다.
// 클릭 영역(invButtons/invSlotRects/invTabRects)은 그릴 때마다 다시 등록하고, 입력은 직전 프레임의 영역을 쓴다.
import { canvas } from '../../core/context.js';
import { game, ui } from '../../state.js';
import { drawBagTab } from './bagTab.js';
import { pointInRect } from './common.js';
import { drawEquipTab } from './equipTab.js';
import { drawStatsTab } from './statsTab.js';
import { drawUpgradeTab } from './upgradeTab.js';

export function setInventoryOpen(open) {
  ui.showInventory = open;
  if (!open) { ui.selectedInvIndex = null; ui.hoverInvIndex = null; }
  const dim = open ? '0.15' : '1';
  const pe = open ? 'none' : 'auto';
  ['joystick-base', 'action-buttons', 'potion-buttons'].forEach((id) => {
    const el = document.getElementById(id);
    el.style.opacity = dim;
    el.style.pointerEvents = pe;
  });
}

export function invPanelHandlePoint(mx, my) {
  for (const tab of INV_TABS) {
    const r = ui.invTabRects[tab.key];
    if (r && pointInRect(mx, my, r)) { ui.invPanelTab = tab.key; ui.hoverInvIndex = null; return; }
  }
  for (const b of ui.invButtons) {
    if (pointInRect(mx, my, b)) { b.fn(); return; }
  }
  if (ui.invPanelTab === 'bag') {
    const hit = ui.invSlotRects.find((r) => pointInRect(mx, my, r));
    // 클릭하면 그 칸을 고정, 같은 칸을 다시 누르면 고정 해제 - 마우스를 옮겨도 선택이 바뀌지 않음
    if (hit) ui.selectedInvIndex = (ui.selectedInvIndex === hit.index) ? null : hit.index;
  }
}

export const INV_TABS = [
  { key: 'equip', label: '장비' },
  { key: 'stats', label: '스탯' },
  { key: 'bag', label: '가방' },
  { key: 'upgrade', label: '강화' }
];

export function drawInventoryPanel(ctx) {
  // 뒤쪽 웨이브 배너/HUD 텍스트가 비쳐 보이지 않도록 화면 전체를 먼저 어둡게 덮음
  ctx.fillStyle = 'rgba(4,6,5,0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const w = Math.min(420, canvas.width - 24);
  const h = Math.min(640, canvas.height - 16);
  const x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;

  ctx.fillStyle = 'rgba(8,8,8,0.98)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ui.invSlotRects = [];
  ui.invTabRects = {};
  ui.invButtons = [];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('캐릭터 메뉴', x + 16, y + 24);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('I 또는 우측 상단 장비 버튼으로 닫기', x + 16, y + 40);
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`재료 ${game.hero.materials}개`, x + w - 16, y + 24);
  if (ui.invToast && performance.now() < ui.invToast.until) {
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = ui.invToast.color;
    ctx.fillText(ui.invToast.text, x + w - 16, y + 41);
  }
  ctx.textAlign = 'left';

  const tabY = y + 50, tabH = 28, tabGap = 6;
  const tabW = (w - 32 - tabGap * (INV_TABS.length - 1)) / INV_TABS.length;
  INV_TABS.forEach((tab, i) => {
    const r = { x: x + 16 + i * (tabW + tabGap), y: tabY, w: tabW, h: tabH };
    ui.invTabRects[tab.key] = r;
    const active = ui.invPanelTab === tab.key;
    ctx.fillStyle = active ? 'rgba(255,224,102,0.25)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = active ? '#ffe066' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = active ? '#ffe066' : '#bbb';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tab.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const contentTop = tabY + tabH + 20;
  const bottom = y + h - 12;
  // 내용이 패널 밖으로 삐져나가지 않도록 패널 안쪽으로만 그림
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, contentTop - 12, w - 4, y + h - contentTop + 10);
  ctx.clip();
  if (ui.invPanelTab === 'equip') drawEquipTab(ctx, x, contentTop, w);
  else if (ui.invPanelTab === 'stats') drawStatsTab(ctx, x, contentTop, w);
  else if (ui.invPanelTab === 'bag') drawBagTab(ctx, x, contentTop, w, bottom);
  else drawUpgradeTab(ctx, x, contentTop, w);
  ctx.restore();
}
