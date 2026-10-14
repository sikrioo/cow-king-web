// 효과음 (2026-10-14 사용자: 사운드 작업 1단계 - 효과음). 소리를 내기만 함 - 게임 상태를 바꾸지 않음(그림처럼 출력)
//   sfx(이름, 위치?) 한 줄로 부름 (systems·entities의 그 순간에). 무엇을 어떻게 낼지는 data/sfx.js
//   - 브라우저는 첫 입력 전엔 소리를 막음 → main.js가 첫 클릭·키에 unlockAudio
//   - 같은 소리는 gap초 안에 다시 안 냄, 동시에 maxVoices개까지 (40마리를 동시에 때려도 몇 개만)
//   - 높낮이를 살짝 흔듦: 게임 난수 대신 순번 + hash01 (게임 결과·테스트에 영향 없음)
//   - 위치를 주면 화면 밖은 작게. 소리 장치가 없으면(테스트·Node) 아무것도 안 함
//   파일은 public/sfx/이름.mp3 (출처·라이선스 docs/ASSETS.md), 합성음은 audio/zzfx.js
import { SFX, SFX_MIX, SFX_DIR } from '../data/sfx.js';
import { zzfxSamples } from './zzfx.js';
import { game } from '../state.js';
import { hash01 } from '../util.js';

let ac = null, master = null, active = 0, seq = 0;
let inView = null; // 화면 안인지 (main.js가 카메라 함수를 넘김 - 여기서 카메라를 불러오면 캔버스가 없는 관리자 페이지가 깨짐)
export function setSfxView(fn) { inView = fn; }
const files = {};   // 파일 이름 → AudioBuffer (불러오는 중이면 null)
const synths = {};  // 소리 이름 → AudioBuffer (합성)
const last = {};    // 소리 이름 → 마지막으로 낸 시각

function load(name) {
  if (name in files) return;
  files[name] = null;
  fetch(`${SFX_DIR}${name}.mp3`).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((buf) => { files[name] = buf; }).catch(() => {});
}

// 첫 입력 때 (한 번 만든 뒤엔 멈춘 걸 다시 켜기만)
export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return;
  try { ac = new AC(); } catch (_) { return; }
  master = ac.createGain();
  master.connect(ac.destination);
  applyVolume();
  for (const [name, d] of Object.entries(SFX)) {
    if (d.synth) {
      const data = zzfxSamples(d.synth, ac.sampleRate);
      const buf = ac.createBuffer(1, Math.max(1, data.length), ac.sampleRate);
      buf.getChannelData(0).set(data);
      synths[name] = buf;
    } else d.files.forEach(load);
  }
}

// 음량·음소거 (game.releaseMeta.sfxVolume / sfxMuted - 저장은 save.js)
export function applyVolume() {
  if (!master) return;
  const m = game.releaseMeta || {};
  master.gain.value = m.sfxMuted ? 0 : (m.sfxVolume != null ? m.sfxVolume : SFX_MIX.volume);
}

// 소리 내기. at = { x, y } (월드 좌표 - 화면 밖이면 작게)
export function sfx(name, at = null) {
  if (!ac || ac.state !== 'running') return;
  const d = SFX[name];
  if (!d || (game.releaseMeta && game.releaseMeta.sfxMuted)) return;
  const now = ac.currentTime;
  if (now - (last[name] != null ? last[name] : -9) < (d.gap != null ? d.gap : SFX_MIX.gap) || active >= SFX_MIX.maxVoices) return; // 0초도 '낸 적 있음'
  seq++;
  const buf = d.synth ? synths[name] : files[d.files[Math.floor(hash01(seq, 17, 3) * d.files.length)]];
  if (!buf) return; // 아직 불러오는 중
  last[name] = now;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const p = d.pitch != null ? d.pitch : SFX_MIX.pitch;
  src.playbackRate.value = (d.rate || 1) * (1 + (hash01(seq, 5, 11) - 0.5) * 2 * p);
  const g = ac.createGain();
  g.gain.value = (d.vol != null ? d.vol : 1) * (at && inView && !inView(at.x, at.y, 0) ? SFX_MIX.offscreen : 1);
  src.connect(g);
  g.connect(master);
  active++;
  src.onended = () => { active--; };
  src.start();
}
