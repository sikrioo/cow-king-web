// ZzFX - Zuper Zmall Zound Zynth (MIT License, Copyright 2019 Frank Force - https://github.com/KilledByAPixel/ZzFX)
// 이 프로젝트에 맞게 옮김 (2026-10-14): 읽기 쉽게 풀어 씀, 난수(randomness)는 빼고 잡음은 결정적(sin) - 게임 난수(Math.random)를 쓰지 않음
//   높낮이 흔들기는 재생 속도로 (audio/sfx.js). 결과 = 소리 샘플(Float32Array) → sfx.js가 AudioBuffer로
// params (ZzFX 순서): [volume, randomness(무시), frequency, attack, sustain, release, shape(0 sin 1 삼각 2 톱니 3 tan 4 잡음), shapeCurve,
//   slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]
const MASTER = 0.3;

export function zzfxSamples(params, sampleRate = 44100) {
  let [volume = 1, , frequency = 220, attack = 0, sustain = 0, release = 0.1, shape = 0, shapeCurve = 1,
    slide = 0, deltaSlide = 0, pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0, bitCrush = 0,
    delay = 0, sustainVolume = 1, decay = 0, tremolo = 0] = params;
  const PI2 = Math.PI * 2, R = sampleRate, sign = (v) => (v > 0 ? 1 : -1);
  const startSlide = (slide *= 500 * PI2 / R / R);
  let startFrequency = (frequency *= PI2 / R);
  const b = [];
  let t = 0, tm = 0, i = 0, j = 1, r = 0, c = 0, s = 0;
  attack = attack * R + 9; decay *= R; sustain *= R; release *= R; delay *= R;
  deltaSlide *= 500 * PI2 / R ** 3; modulation *= PI2 / R; pitchJump *= PI2 / R; pitchJumpTime *= R; repeatTime = repeatTime * R | 0;
  const length = attack + decay + sustain + release + delay | 0;
  for (; i < length; b[i++] = s) {
    if (!(++c % (bitCrush * 100 | 0))) {
      s = shape ? shape > 1 ? shape > 2 ? shape > 3
        ? Math.sin((t % PI2) ** 3)
        : Math.max(Math.min(Math.tan(t), 1), -1)
        : 1 - (2 * t / PI2 % 2 + 2) % 2
        : 1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2)
        : Math.sin(t);
      const env = i < attack ? i / attack
        : i < attack + decay ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
        : i < attack + decay + sustain ? sustainVolume
        : i < length - delay ? (length - i - delay) / release * sustainVolume : 0;
      s = (repeatTime ? 1 - tremolo + tremolo * Math.sin(PI2 * i / repeatTime) : 1) * sign(s) * Math.abs(s) ** shapeCurve * volume * MASTER * env;
      s = delay ? s / 2 + (delay > i ? 0 : (i < length - delay ? 1 : (length - i) / delay) * b[i - delay | 0] / 2) : s;
    }
    const f = (frequency += slide += deltaSlide) * Math.cos(modulation * tm++);
    t += f - f * noise * (1 - (Math.sin(i) + 1) * 1e9 % 2); // 잡음: 결정적
    if (j && ++j > pitchJumpTime) { frequency += pitchJump; startFrequency += pitchJump; j = 0; }
    if (repeatTime && !(++r % repeatTime)) { frequency = startFrequency; slide = startSlide; j = j || 1; }
  }
  return new Float32Array(b);
}
