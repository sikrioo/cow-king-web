// 최고 기록 저장 (localStorage, 키 유지, 사용 불가 환경에서도 게임이 돌도록 try/catch)
import { game } from './state.js';

export const SAVE_KEY = 'cowking_release_meta_v1';

export function loadReleaseMeta() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved && typeof saved === 'object') game.releaseMeta = { ...game.releaseMeta, ...saved };
  } catch (_) {}
}

export function saveReleaseMeta() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game.releaseMeta)); } catch (_) {}
}

export function recordRun(kind) {
  if (game.runRecorded) return;
  game.runRecorded = true;
  game.releaseMeta.runs += 1;
  game.releaseMeta.bestWave = Math.max(game.releaseMeta.bestWave || 0, game.wave || 0);
  game.releaseMeta.bestKills = Math.max(game.releaseMeta.bestKills || 0, game.kills || 0);
  if (kind === 'victory') game.releaseMeta.clears += 1;
  saveReleaseMeta();
}
