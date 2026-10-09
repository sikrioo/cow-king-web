// 관리자 페이지 공용 도우미: 요소 만들기, 표, 숫자 표시
export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  children.flat().forEach((c) => { if (c != null) e.append(c instanceof Node ? c : String(c)); });
  return e;
}

// cols: [{ key|get, label, num(오른쪽 정렬), fmt }], rows: 객체 배열
export function table(cols, rows) {
  const head = el('tr', {}, cols.map((c) => el('th', { class: c.num ? 'n' : '' }, c.label)));
  const body = rows.map((r) => el('tr', {}, cols.map((c) => {
    const v = c.get ? c.get(r) : r[c.key];
    const shown = c.fmt ? c.fmt(v, r) : v;
    const td = el('td', { class: c.num ? 'n' : '' });
    if (shown instanceof Node) td.append(shown); else td.innerHTML = shown == null ? '<span class="dim">-</span>' : String(shown);
    return td;
  })));
  return el('div', { class: 'wrap' }, el('table', {}, el('thead', {}, head), el('tbody', {}, body)));
}

export const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
export const num = (v, d = 2) => (Number.isInteger(v) ? String(v) : (+v.toFixed(d)).toString());
export const h2 = (t) => el('h2', {}, t);
export const note = (t) => el('p', { class: 'note', html: t });
export const src = (path) => `<code>${path}</code>`;
export const tag = (t, color) => `<span class="tag" style="color:${color || 'inherit'}">${t}</span>`;
// 비율 막대 + 숫자
export const barPct = (v, max = 1) => `<span class="bar" style="width:${Math.round((v / (max || 1)) * 80)}px"></span>${pct(v, 1)}`;

export function select(label, options, value, onChange) {
  const s = el('select', { onchange: (e) => onChange(e.target.value) }, options.map(([v, t]) => {
    const o = el('option', { value: v }, t);
    if (String(v) === String(value)) o.selected = true;
    return o;
  }));
  return el('label', {}, label, s);
}
