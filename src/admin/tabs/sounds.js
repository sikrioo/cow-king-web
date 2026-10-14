// 관리자 - 효과음 (2026-10-14): 모든 효과음을 눌러서 들어 보기 (실제 게임 엔진 audio/sfx.js 그대로). 데이터 src/data/sfx.js, 파일 public/sfx, 출처 docs/ASSETS.md
import { SFX, SKILL_SFX, SFX_ON } from '../../data/sfx.js';
import { SKILL_META } from '../../data/skills.js';
import { unlockAudio, sfx } from '../../audio/sfx.js';
import { el, table, h2, note, src, tag } from '../ui.js';

// 처음 누를 때 소리를 켜고(브라우저 규칙), 파일을 불러오는 동안 한 번 더 시도
function play(name) {
  unlockAudio();
  sfx(name, null, true);
  setTimeout(() => sfx(name, null, true), 300);
}

export function renderSounds(root) {
  const skillsOf = (name) => Object.entries(SKILL_SFX).filter(([, v]) => v === name).map(([id]) => (SKILL_META[id] ? SKILL_META[id].label : id)).join(', ');
  root.append(
    h2('효과음'),
    note(`'재생'을 누르면 게임과 같은 엔진으로 냄 (처음 한 번은 브라우저가 소리를 켜느라 늦을 수 있음). 수치 ${src('src/data/sfx.js')} · 엔진 ${src('src/audio/sfx.js')} · 합성 ${src('src/audio/zzfx.js')} · 파일 public/sfx · 출처 docs/ASSETS.md · 게임에선 M 키로 켜고 끔`),
    table([
      { label: '이름', get: (k) => k },
      { label: '게임에서', get: (k) => (SFX_ON.includes(k) ? tag('켬', '#7fe05a') : tag('끔', '#777')) },
      { label: '재생', get: (k) => el('button', { onclick: () => play(k) }, '▶ 재생') },
      { label: '종류', get: (k) => (SFX[k].synth ? tag('합성(ZzFX)', '#9f6bff') : tag('파일', '#6bb8ff')) },
      { label: '파일', get: (k) => (SFX[k].files ? SFX[k].files.join(', ') : '') },
      { label: '음량', num: true, get: (k) => SFX[k].vol != null ? SFX[k].vol : 1 },
      { label: '최소 간격(초)', num: true, get: (k) => SFX[k].gap != null ? SFX[k].gap : '' },
      { label: '쓰는 스킬', get: skillsOf }
    ], Object.keys(SFX))
  );
}
