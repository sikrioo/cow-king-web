// 스모크 테스트: 타이틀 → 시작 → 약 150초 분량의 무작위 입력(이동/스킬/물약/레벨업/일시정지/장비창 클릭 난사).
// 통과 기준: 예외 없음 + NaN/Infinity 없음. (정확한 수치 검증은 baseline.cjs)
// 사용: node legacy/tools/smoke.cjs [html경로] [seed]
const path = require('path');
const { createSandbox, mulberry32 } = require('./_sandbox.cjs');

const htmlPath = process.argv[2] || path.join(__dirname, '..', 'cow_pen.html');
const seed = Number(process.argv[3] || 1234);
const footer = `globalThis.__peek = () => ({ gameState, wave, kills, level: player.level, hp: player.hp, alive: player.alive, cows: cows.length, inventory: player.inventory.length });`;
const env = createSandbox({ htmlPath, footer, seed });
const rnd = mulberry32(seed + 1);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

let failure = null; let frames = 0;
try {
  env.frame(60);                       // 타이틀 화면
  env.key(' '); env.key(' ', false);   // Space로 시작
  const dirs = ['w', 'a', 's', 'd']; let cur = null; let spaceDown = false; let eDown = false; let invOpen = false;
  for (let i = 0; i < 9000; i++, frames++) {
    if (i % 45 === 0) { if (cur) env.key(cur, false); cur = pick(dirs); env.key(cur); }
    if (i % 20 === 0) { spaceDown ? env.key(' ', false) : env.key(' '); spaceDown = !spaceDown; }
    if (i % 33 === 0) { eDown ? env.key('e', false) : env.key('e'); eDown = !eDown; }
    if (i % 150 === 0) env.key('q');
    if (i % 210 === 0) env.key('r');
    if (i % 170 === 0) env.key('1');
    if (i % 230 === 0) env.key('2');
    if ([600, 1500, 2400, 3300].includes(i)) env.key('l');           // 테스트용 레벨업 → 스킬 해금 경로 통과
    if (i % 17 === 0) env.pointer('pointerdown', 500, 300, 0);
    if (i % 29 === 0) env.pointer('pointerdown', 500, 300, 2);
    if (i % 50 === 0) env.windowPointerUp(0);
    if (i === 5200) env.key('p');
    if (i === 5260) env.key('p');
    // 장비창: 열고 패널 영역에 클릭/호버를 난사 (탭/버튼/목록 전부 경유)
    if (i === 4000 || i === 7000) { env.key('i'); invOpen = true; }
    if (invOpen && ((i >= 4000 && i < 4400) || (i >= 7000 && i < 7300))) {
      const x = 300 + rnd() * 424, y = 60 + rnd() * 650;
      env.pointer('pointermove', x, y);
      if (i % 3 === 0) env.pointer('pointerdown', x, y, 0);
    }
    if (i === 4400 || i === 7300) { env.key('i'); invOpen = false; }
    env.frame(1);
  }
} catch (e) { failure = e; }
const peek = failure ? null : env.sandbox.__peek();
console.log(JSON.stringify({ ok: !failure, frames, seed, state: peek }));
if (failure) { console.error(failure.stack); process.exit(1); }
