// 자동 플레이 봇 (2026-10-14 사용자: 조작하지 않고 구경) - 켜면 매 틱(game.js tickHook) 관측 → 판단 → 행동
//   판단(policy)은 바꿔 끼울 수 있음: 기본 = 휴리스틱(bot/heuristic.js), 외부 의사결정 모델(JEV 등)은 setPolicy로
//   개발자 모드에서 window.cowBot = { observe(), act(행동), setPolicy(fn), setBot(on), stats(), setAdvisor(ask, opts), advisor(), question() } - 콘솔·외부 스크립트에서 실험
//   켜기: 주소 ?bot=1 (개발자 모드) 또는 개발자 패널 '봇' 버튼
import { game, ui } from '../state.js';
import { observe, toJSON } from './observe.js';
import { applyAction, releaseInput, IDLE } from './act.js';
import { decide } from './heuristic.js';
import { upkeep } from './upkeep.js';
import { setAdvisor, tickAdvisor, advisorState, buildQuestion } from './advisor.js';

let policy = decide;
let mem = {};
let lastObs = null;
const stats = { ticks: 0, deaths: 0, runs: 0, bestAct: 0, bestWave: 0, kills: 0 }; // kills: 판을 넘어 누적
let lastKills = 0;
let lastScreen = null;

export function botTick(dt) {
  if (!ui.botOn) return;
  const obs = observe();
  lastObs = obs;
  // 기록 (보고서·화면 표시용)
  stats.ticks++;
  if (obs.screen !== lastScreen) {
    if (obs.screen === 'gameover') stats.deaths++;
    if (obs.screen === 'playing' && lastScreen !== 'playing') stats.runs++;
    lastScreen = obs.screen;
  }
  const k = game.kills || 0; // 새 판이면 0으로 돌아감 → 늘어난 만큼만 더함
  if (k > lastKills) stats.kills += k - lastKills;
  lastKills = k;
  if (obs.screen === 'playing') { stats.bestAct = Math.max(stats.bestAct, obs.act); stats.bestWave = Math.max(stats.bestWave, obs.wave); }
  upkeep(mem, dt); // 스탯·감정·장비·강화·슬롯 (bot/upkeep.js)
  mem.tactic = tickAdvisor(obs, dt); // 전술 조언자(JEV 등)가 있으면 그 답 - 없으면 'fight' (bot/advisor.js)
  applyAction(policy(obs, mem, dt) || IDLE, obs);
}

export function setBot(on) {
  ui.botOn = !!on;
  mem = {};
  if (!on) releaseInput();
  return ui.botOn;
}

// 판단 바꾸기: fn(관측, 기억, dt) → 행동. null이면 휴리스틱으로 되돌림
export function setPolicy(fn) { policy = fn || decide; mem = {}; }

export function botStats() { return { ...stats }; }

export const botApi = {
  observe: () => toJSON(lastObs || observe()),
  act: (a) => applyAction({ ...IDLE, ...a }, lastObs || observe()),
  setPolicy, setBot, stats: botStats,
  // 전술 조언자: setAdvisor(async (질문) => ({ tactic, confidence }), { interval, minConfidence }) / question(): 지금 보낼 질문 미리 보기
  setAdvisor, advisor: advisorState, question: () => buildQuestion(lastObs || observe())
};
