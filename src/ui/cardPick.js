// 레벨업 카드 화면 (game.cardOffer가 있을 때). 그리기만 - 고르기/다시 뽑기는 systems/levelCards.js (입력: game.handleKeyDown, input.js)
// 넓은 화면은 가로 3장, 좁은 화면(모바일 세로)은 세로로 쌓음. 클릭 영역은 그릴 때마다 ui.cardRects / ui.cardRerollRect에 다시 등록
import { canvas, ctx } from '../core/context.js';
import { game, ui } from '../state.js';
import { SKILL_META, SKILL_LEVEL_UP, SKILL_LEVEL_STAT, SKILL_STATS, SKILL_TYPE_LABEL } from '../data/skills.js';
import { FILLER_CARDS, UPGRADE_CARDS, CARD_RARITY, UPGRADE_MAX_PICKS } from '../data/cards.js';

const TYPE_STYLE = {
  newSkill: { tag: '새 스킬', color: '#9be39b' },
  skillUp:  { tag: '스킬 강화', color: '#ffe066' },
  filler:   { tag: '보급', color: '#c9c3e8' }
};

// 레벨업 보너스 한 줄: "피해 +15% → +30%" (Lv1 대비 누적). add면 기본값에 더한 실제 값("체력 증가 36% → 42%"), neg면 감소("-8%")
function bonusLines(card) {
  const up = SKILL_LEVEL_UP[card.id] || {};
  return Object.keys(up).map((key) => {
    const st = SKILL_LEVEL_STAT[key];
    const fmt = (lv) => {
      const v = up[key] * Math.max(0, lv - 1);
      if (st.add) return `${Math.round((SKILL_STATS[card.id][key] + v) * 100)}%`;
      if (st.neg) return `-${Math.round(v * 100)}%`;
      return st.pct ? `+${Math.round(v * 100)}%` : `+${v}`;
    };
    return `${st.label} ${fmt(card.from)} → ${fmt(card.to)}`;
  });
}

// 강화 수치 표시: 12% / 40 / 1.5/초
export function formatUpgrade(unit, v) {
  if (unit === 'pct') return `+${Math.round(v * 100)}%`;
  if (unit === 'perSec') return `+${Math.round(v * 10) / 10}/초`;
  return `+${Math.round(v)}`;
}

// 카드 종류 표시 (강화 카드는 등급 이름·색)
function cardStyle(card) {
  if (card.type === 'upgrade') { const r = CARD_RARITY[card.rarity]; return { tag: `강화 · ${r.label}`, color: r.color }; }
  const st = TYPE_STYLE[card.type];
  const meta = SKILL_META[card.id];
  return meta ? { tag: `${st.tag} · ${SKILL_TYPE_LABEL[meta.type]}`, color: st.color } : st; // 스킬 카드는 분류(물리/마법/공통)도
}

function cardText(card) {
  if (card.type === 'upgrade') {
    const u = UPGRADE_CARDS[card.id];
    const picks = game.hero.cardPicks[card.id] || 0;
    return { title: u.label, level: `${picks + 1}/${UPGRADE_MAX_PICKS}`, lines: [`${u.statLabel} ${formatUpgrade(u.unit, card.amount)}`], swatch: u.color };
  }
  if (card.type === 'filler') {
    const f = FILLER_CARDS[card.id];
    return { title: f.label, level: '', lines: [f.desc], swatch: f.color };
  }
  const meta = SKILL_META[card.id];
  if (card.type === 'newSkill') return { title: meta.label, level: 'NEW · Lv.1', lines: [meta.desc], swatch: meta.color };
  return { title: meta.label, level: `Lv.${card.from} → Lv.${card.to}`, lines: bonusLines(card), swatch: meta.color };
}

// 글자 단위 줄바꿈 (한국어는 띄어쓰기가 적어서)
function wrap(text, maxW) {
  const out = [];
  let line = '';
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch.trim() ? ch : ''; }
    else line += ch;
  }
  if (line) out.push(line);
  return out;
}

export function drawCardOffer(t) {
  const offer = game.cardOffer;
  if (!offer) return;
  const W = canvas.width, H = canvas.height;
  const wide = W >= 620;
  const n = offer.cards.length;
  const gap = wide ? 14 : 10;
  const cw = wide ? Math.min(210, (W - 32 - gap * (n - 1)) / n) : Math.min(W - 32, 380);
  const ch = wide ? 220 : 92;
  const totalH = wide ? ch : n * ch + (n - 1) * gap;
  const top = Math.max(84, (H - totalH) / 2 + 10);

  ctx.save();
  ctx.fillStyle = 'rgba(4,8,5,0.72)';
  ctx.fillRect(0, 0, W, H);

  // 제목
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe066';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`LEVEL UP!  Lv.${game.hero.level}`, W / 2, top - 44);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const more = game.hero.pendingCards > 0 ? ` · 이어서 ${game.hero.pendingCards}번 더` : '';
  ctx.fillText(`카드를 하나 고르세요 (1 / 2 / 3 · 클릭/탭)${more}`, W / 2, top - 20);

  ui.cardRects = [];
  offer.cards.forEach((card, i) => {
    const x = wide ? (W - (n * cw + (n - 1) * gap)) / 2 + i * (cw + gap) : (W - cw) / 2;
    const y = wide ? top : top + i * (ch + gap);
    ui.cardRects.push({ x, y, w: cw, h: ch });
    drawCard(card, i, x, y, cw, ch, wide, t);
  });

  // 다시 뽑기
  const bw = 180, bh = 34;
  const bx = (W - bw) / 2, by = top + totalH + 16;
  const left = game.hero.cardRerolls;
  ui.cardRerollRect = left > 0 ? { x: bx, y: by, w: bw, h: bh } : null;
  ctx.globalAlpha = left > 0 ? 1 : 0.4;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`다시 뽑기 (R) · 남은 ${left}`, W / 2, by + bh / 2);
  ctx.restore();
}

function drawCard(card, i, x, y, w, h, wide, t) {
  const style = cardStyle(card);
  const txt = cardText(card);
  const glow = 0.5 + Math.sin(t * 3 + i) * 0.5;
  ctx.save();
  ctx.fillStyle = '#16211a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = txt.swatch;
  ctx.fillRect(x, y, wide ? w : 8, wide ? 8 : h); // 스킬 색 띠
  ctx.strokeStyle = style.color;
  ctx.globalAlpha = 0.6 + glow * 0.4;
  ctx.lineWidth = card.rarity === 'legendary' ? 3 : 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.globalAlpha = 1;

  const pad = wide ? 14 : 18;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // 번호 + 종류
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = style.color;
  ctx.fillText(`[${i + 1}] ${style.tag}`, x + pad, y + (wide ? 30 : 20));
  // 이름 + 레벨
  ctx.font = `bold ${wide ? 20 : 17}px sans-serif`;
  ctx.fillStyle = '#f2ecd8';
  ctx.fillText(txt.title, x + pad, y + (wide ? 58 : 42));
  if (txt.level) {
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = style.color;
    if (wide) ctx.fillText(txt.level, x + pad, y + 78);
    else { ctx.textAlign = 'right'; ctx.fillText(txt.level, x + w - 12, y + 42); ctx.textAlign = 'left'; }
  }
  // 설명
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  const lines = txt.lines.flatMap((l) => wrap(l, w - pad * 2));
  const ly = y + (wide ? 104 : 62), lh = wide ? 18 : 15;
  lines.slice(0, wide ? 6 : 2).forEach((l, k) => ctx.fillText(l, x + pad, ly + k * lh));
  ctx.restore();
}
