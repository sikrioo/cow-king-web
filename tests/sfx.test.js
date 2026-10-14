// 효과음 (2026-10-14): 모든 소리가 실제 파일·합성에 연결되고, 엔진이 가짜 오디오 장치에서 오류 없이 돌고, 게임 난수를 쓰지 않음
import { it, expect, vi } from 'vitest';
import fs from 'node:fs';

it('효과음 데이터: 파일은 public/sfx에 있고, 합성 숫자는 유효, 스킬 소리는 실제 효과음 이름', async () => {
  const { SFX, SKILL_SFX } = await import('../src/data/sfx.js');
  const { SKILL_META } = await import('../src/data/skills.js');
  const { zzfxSamples } = await import('../src/audio/zzfx.js');
  for (const [name, d] of Object.entries(SFX)) {
    expect(!!d.files !== !!d.synth, name).toBe(true); // 파일이나 합성 중 하나
    if (d.files) d.files.forEach((f) => expect(fs.existsSync(`public/sfx/${f}.mp3`), `${name}: ${f}`).toBe(true));
    if (d.synth) {
      const rnd = Math.random;
      Math.random = () => { throw new Error('합성에서 게임 난수 사용'); };
      try {
        const s = zzfxSamples(d.synth);
        expect(s.length, name).toBeGreaterThan(100);
        expect(s.every((v) => Number.isFinite(v) && Math.abs(v) <= 1.5), name).toBe(true);
      } finally { Math.random = rnd; }
    }
  }
  for (const [id, cue] of Object.entries(SKILL_SFX)) { expect(SKILL_META[id], id).toBeTruthy(); expect(SFX[cue], `${id} → ${cue}`).toBeTruthy(); }
});

// 가짜 오디오 장치: 소리를 낸 횟수만 셈
function fakeAudio() {
  const played = [];
  class Node { connect() { return this; } }
  class Ctx {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 44100; this.destination = new Node(); }
    createGain() { const g = new Node(); g.gain = { value: 1 }; return g; }
    createBuffer(ch, len) { const d = new Float32Array(len); return { getChannelData: () => d }; }
    createBufferSource() { const s = new Node(); s.playbackRate = { value: 1 }; s.start = () => played.push(s); return s; }
    decodeAudioData() { return Promise.resolve({ fake: true }); }
    resume() { this.state = 'running'; return Promise.resolve(); }
  }
  return { Ctx, played };
}

it('엔진: 첫 입력 전엔 조용, 켜면 소리를 냄, 같은 소리는 간격 안에 다시 안 냄, 음소거면 안 냄', async () => {
  vi.resetModules();
  const fa = fakeAudio();
  globalThis.window = { AudioContext: fa.Ctx };
  globalThis.fetch = () => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  try {
    const { sfx, unlockAudio } = await import('../src/audio/sfx.js');
    const { SFX } = await import('../src/data/sfx.js');
    const { game } = await import('../src/state.js');
    sfx('levelUp');
    expect(fa.played.length).toBe(0); // 아직 안 켬
    unlockAudio();
    await new Promise((r) => setTimeout(r, 10)); // 파일 불러오기
    for (const name of Object.keys(SFX)) { sfx(name, null, true); fa.played.forEach((p) => { if (p.onended) { p.onended(); p.onended = null; } }); } // 하나씩 내고 바로 끝냄
    expect(fa.played.length).toBe(Object.keys(SFX).length); // 모든 소리가 실제로 남
    const n = fa.played.length;
    sfx('hitFlesh'); sfx('hitFlesh'); // 같은 시각에 두 번 → 한 번
    const { SFX_ON } = await import('../src/data/sfx.js');
    expect(SFX_ON.every((k) => SFX[k])).toBe(true);
    const before = fa.played.length; sfx('swingLight'); expect(fa.played.length).toBe(before); // 꺼 둔 소리는 안 남
    expect(fa.played.length - n).toBeLessThanOrEqual(1);
    game.releaseMeta.sfxMuted = true;
    const m = fa.played.length;
    sfx('crush');
    expect(fa.played.length).toBe(m);
    game.releaseMeta.sfxMuted = false;
  } finally { delete globalThis.window; delete globalThis.fetch; }
});
