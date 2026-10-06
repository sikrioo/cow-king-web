// 브라우저 없이 게임을 돌리기 위한 최소 스텁 (legacy/tools/_sandbox.cjs와 같은 방식).
// 레거시 HTML(vm)과 새 모듈 코드(전역 스텁) 양쪽이 **같은 스텁**을 쓰게 해서 결과 차이가 곧 코드 차이가 되게 한다.
// - Canvas 2D: 어떤 메서드든 no-op, 숫자 인자에 NaN/Infinity가 들어오면 throw
// - 그리기 기록: drawSampleEvery 프레임마다 그 프레임의 ctx 호출/속성 대입을 해시로 누적 (env.drawHash)
// - rAF 콜백은 frame()으로 직접 호출, Math.random은 시드 고정
import fs from 'node:fs';
import vm from 'node:vm';
import Matter from 'matter-js';

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 32bit 누적 해시
function makeRecorder() {
  const r = { on: false, hash: 0x811c9dc5, calls: 0 };
  r.add = (s) => {
    let h = r.hash;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    r.hash = h >>> 0; r.calls++;
  };
  return r;
}
const argStr = (x) => (typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean' || x == null ? String(x) : typeof x);

function makeCtxStub(rec) {
  return new Proxy({}, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return (s) => { if (rec.on) rec.add('measureText(' + s + ')'); return { width: String(s).length * 7 }; };
      if (p === 'createRadialGradient' || p === 'createLinearGradient') {
        return (...a) => { if (rec.on) rec.add(String(p) + '(' + a.map(argStr).join(',') + ')'); return { addColorStop: (o, c) => { if (rec.on) rec.add('stop(' + o + ',' + c + ')'); } }; };
      }
      return (...a) => {
        a.forEach((x) => { if (typeof x === 'number' && !Number.isFinite(x)) throw new Error('NaN/Infinity passed to ctx.' + String(p)); });
        if (rec.on) rec.add(String(p) + '(' + a.map(argStr).join(',') + ')');
      };
    },
    set(t, p, v) { if (rec.on) rec.add(String(p) + '=' + argStr(v)); t[p] = v; return true; }
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

// 스텁 묶음 + 입력/프레임 조작 함수
function createStubs({ width = 1024, height = 768, drawSampleEvery = 50 } = {}) {
  const winHandlers = {}; const canvasHandlers = {}; const elCache = {};
  let rafCb = null; let now = 0; let frameNo = 0;
  const rec = makeRecorder();
  const ctx = makeCtxStub(rec);
  const canvas = { width, height, style: {}, getContext: () => ctx, addEventListener: (e, f) => { (canvasHandlers[e] ||= []).push(f); }, getBoundingClientRect: () => ({ left: 0, top: 0, width, height }) };
  const document = {
    getElementById: (id) => { if (id === 'c') return canvas; return (elCache[id] ||= makeEl()); },
    querySelector: (sel) => { const id = sel.split(' ')[0].replace('#', ''); return (elCache[id] ||= makeEl()); },
    body: { classList: { add() {}, remove() {}, toggle() {} } }, documentElement: { requestFullscreen: () => Promise.resolve() },
    fullscreenElement: null, exitFullscreen: () => Promise.resolve()
  };
  const window = { innerWidth: width, innerHeight: height, addEventListener: (e, f) => { (winHandlers[e] ||= []).push(f); } };
  const storage = {};
  const localStorage = { getItem: (k) => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } };
  const globals = {
    document, window, localStorage, performance: { now: () => now },
    requestAnimationFrame: (fn) => { rafCb = fn; return 1; }, innerWidth: width, innerHeight: height
  };
  const env = {
    globals, canvas, elCache,
    get drawHash() { return rec.hash.toString(16) + ':' + rec.calls; },
    frame(n = 1) {
      for (let i = 0; i < n; i++) {
        now += 1000 / 60; frameNo++;
        rec.on = frameNo % drawSampleEvery === 0;
        rafCb(now);
        rec.on = false;
      }
    },
    key(key, down = true) { (winHandlers[down ? 'keydown' : 'keyup'] || []).forEach((h) => h({ key, preventDefault() {} })); },
    keyEvent(down, evt) { (winHandlers[down ? 'keydown' : 'keyup'] || []).forEach((h) => h({ preventDefault() {}, ...evt })); },
    pointer(type, x, y, button = 0) { (canvasHandlers[type] || []).forEach((h) => h({ button, clientX: x, clientY: y, preventDefault() {} })); },
    pointerEvent(type, evt) { (canvasHandlers[type] || []).forEach((h) => h(evt)); },
    windowPointerUp(button = 0) { (winHandlers.pointerup || []).forEach((h) => h({ button })); }
  };
  return env;
}

// 새 모듈 코드용: 전역을 스텁으로 바꾼다. 끝나면 env.restore()
export function installBrowserEnv({ seed, ...opts }) {
  const env = createStubs(opts);
  const keys = Object.keys(env.globals);
  const saved = keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  for (const k of keys) Object.defineProperty(globalThis, k, { value: env.globals[k], configurable: true, writable: true });
  const origRandom = Math.random;
  if (seed !== null && seed !== undefined) Math.random = mulberry32(seed);
  env.restore = () => {
    Math.random = origRandom;
    for (const [k, desc] of saved) { if (desc) Object.defineProperty(globalThis, k, desc); else delete globalThis[k]; }
  };
  return env;
}

// 레거시 단일 HTML용: 인라인 <script>를 vm에서 같은 스텁으로 실행. footer로 내부 상태를 꺼낼 함수를 붙인다
export function runLegacyHtml({ htmlPath, footer = '', seed, ...opts }) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script>([\s\S]*)<\/script>/); // 인라인 스크립트만 (CDN <script src=...>는 제외)
  if (!m) throw new Error('inline <script> not found in ' + htmlPath);
  const env = createStubs(opts);
  let M = Math;
  if (seed !== null && seed !== undefined) { M = Object.create(Math); M.random = mulberry32(seed); }
  const sandbox = { ...env.globals, Matter, console, Math: M, Infinity, NaN, Date, Array, Object, JSON };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(m[1] + '\n' + footer, sandbox, { filename: 'cow_pen.inline.js' });
  env.sandbox = sandbox;
  return env;
}
