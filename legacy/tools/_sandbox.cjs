// 레거시 단일 HTML(legacy/cow_pen.html)을 브라우저 없이 Node(vm)에서 돌려보는 공용 샌드박스.
// - Canvas/DOM은 스텁. canvas 메서드에 NaN/Infinity가 들어오면 즉시 예외(그리기 버그 조기 발견).
// - seed를 주면 Math.random을 시드 고정 PRNG로 바꿔서 재현 가능하게 함.
// 사용: node legacy/tools/smoke.cjs   /   node legacy/tools/baseline.cjs
const fs = require('fs');
const vm = require('vm');
const Matter = require('matter-js');

function extractScript(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script>([\s\S]*)<\/script>/); // 인라인 스크립트만 (CDN <script src=...>는 제외)
  if (!m) throw new Error('inline <script> not found in ' + htmlPath);
  return m[1];
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCtxStub(strict) {
  return new Proxy({}, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return (s) => ({ width: String(s).length * 7 });
      if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => ({ addColorStop() {} });
      return (...a) => {
        if (strict) a.forEach((x) => { if (typeof x === 'number' && !Number.isFinite(x)) throw new Error('NaN/Infinity passed to ctx.' + String(p)); });
      };
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}

function makeEl() {
  const listeners = {};
  return {
    style: {}, classList: { add() {}, remove() {}, toggle() {} }, textContent: '',
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
    _fire(ev, evt) { (listeners[ev] || []).forEach((fn) => fn(evt)); },
    setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
  };
}

function createSandbox({ htmlPath, footer = '', seed = null, width = 1024, height = 768, strictCtx = true }) {
  const code = extractScript(htmlPath) + '\n' + footer;
  const winHandlers = {}; const canvasHandlers = {}; const elCache = {};
  let rafCb = null; let now = 0;
  const ctx = makeCtxStub(strictCtx);
  const canvas = { width, height, getContext: () => ctx, addEventListener: (e, f) => { (canvasHandlers[e] ||= []).push(f); }, getBoundingClientRect: () => ({ left: 0, top: 0, width, height }) };
  const document = {
    getElementById: (id) => { if (id === 'c') return canvas; return (elCache[id] ||= makeEl()); },
    querySelector: (sel) => { const id = sel.split(' ')[0].replace('#', ''); return (elCache[id] ||= makeEl()); },
    body: { classList: { add() {}, remove() {}, toggle() {} } }, documentElement: { requestFullscreen: () => Promise.resolve() },
    fullscreenElement: null, exitFullscreen: () => Promise.resolve()
  };
  const window = { innerWidth: width, innerHeight: height, addEventListener: (e, f) => { (winHandlers[e] ||= []).push(f); } };
  const storage = {};
  const localStorage = { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } };
  let M = Math;
  if (seed !== null) { M = Object.create(Math); M.random = mulberry32(seed); }
  const sandbox = {
    document, window, Matter, localStorage, console, Math: M, Infinity, NaN, Date, Array, Object, JSON,
    performance: { now: () => now }, innerWidth: width, innerHeight: height,
    requestAnimationFrame: (fn) => { rafCb = fn; return 1; }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'cow_pen.inline.js' });
  const env = {
    sandbox, winHandlers, canvasHandlers, elCache, canvas,
    frame(n = 1) { for (let i = 0; i < n; i++) { now += 1000 / 60; rafCb(now); } },
    key(key, down = true) { (winHandlers[down ? 'keydown' : 'keyup'] || []).forEach((h) => h({ key, preventDefault() {} })); },
    pointer(type, x, y, button = 0) { (canvasHandlers[type] || []).forEach((h) => h({ button, clientX: x, clientY: y, preventDefault() {} })); },
    windowPointerUp(button = 0) { (winHandlers.pointerup || []).forEach((h) => h({ button })); }
  };
  return env;
}

module.exports = { createSandbox, mulberry32 };
