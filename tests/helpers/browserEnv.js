// 새 모듈 코드를 Node에서 돌리기 위한 최소 브라우저 스텁. legacy/tools/_sandbox.cjs와 같은 방식/같은 동작으로 맞춘다
// (레거시와 나란히 돌려서 결과를 비교하기 때문에 스텁의 동작 차이가 곧 결과 차이가 됨)
// - Canvas 2D: 어떤 메서드든 no-op, 숫자 인자에 NaN/Infinity가 들어오면 throw
// - rAF 콜백은 frame()으로 직접 호출, Math.random은 시드 고정

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCtxStub() {
  return new Proxy({}, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return (s) => ({ width: String(s).length * 7 });
      if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => ({ addColorStop() {} });
      return (...a) => {
        a.forEach((x) => { if (typeof x === 'number' && !Number.isFinite(x)) throw new Error('NaN/Infinity passed to ctx.' + String(p)); });
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

const KEYS = ['document', 'window', 'localStorage', 'performance', 'requestAnimationFrame', 'innerWidth', 'innerHeight'];

// 전역을 스텁으로 바꾸고 env를 돌려준다. 끝나면 env.restore()
export function installBrowserEnv({ seed, width = 1024, height = 768 }) {
  const winHandlers = {}; const canvasHandlers = {}; const elCache = {};
  let rafCb = null; let now = 0;
  const ctx = makeCtxStub();
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
  const values = {
    document, window, localStorage, performance: { now: () => now },
    requestAnimationFrame: (fn) => { rafCb = fn; return 1; }, innerWidth: width, innerHeight: height
  };
  const saved = KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  for (const k of KEYS) Object.defineProperty(globalThis, k, { value: values[k], configurable: true, writable: true });
  const origRandom = Math.random;
  if (seed !== null && seed !== undefined) Math.random = mulberry32(seed);

  return {
    canvas, elCache, winHandlers, canvasHandlers,
    frame(n = 1) { for (let i = 0; i < n; i++) { now += 1000 / 60; rafCb(now); } },
    key(key, down = true) { (winHandlers[down ? 'keydown' : 'keyup'] || []).forEach((h) => h({ key, preventDefault() {} })); },
    pointer(type, x, y, button = 0) { (canvasHandlers[type] || []).forEach((h) => h({ button, clientX: x, clientY: y, preventDefault() {} })); },
    windowPointerUp(button = 0) { (winHandlers.pointerup || []).forEach((h) => h({ button })); },
    restore() {
      Math.random = origRandom;
      for (const [k, desc] of saved) { if (desc) Object.defineProperty(globalThis, k, desc); else delete globalThis[k]; }
    }
  };
}
