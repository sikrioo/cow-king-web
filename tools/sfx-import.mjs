// 효과음 가져오기: tools/sfx-sources.json의 원본(.ogg)을 public/sfx/이름.mp3로 변환 (아이폰 사파리 호환), 모노·96kbps
//   사용: node tools/sfx-import.mjs <묶음을 푼 폴더>   (폴더 안에 impact/ rpg/ ui/ oga80/ - docs/ASSETS.md의 다운로드 주소)
//   ffmpeg 필요. 이미 있는 파일은 덮어씀
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) { console.error('사용: node tools/sfx-import.mjs <묶음을 푼 폴더>'); process.exit(1); }
const map = JSON.parse(readFileSync(join(root, 'tools/sfx-sources.json'), 'utf8'));
const out = join(root, 'public/sfx');
mkdirSync(out, { recursive: true });
let n = 0;
for (const [name, rel] of Object.entries(map)) {
  if (name.startsWith('_')) continue;
  const from = join(src, rel);
  if (!existsSync(from)) { console.error('없음:', rel); process.exitCode = 1; continue; }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', from, '-ac', '1', '-b:a', '96k', join(out, `${name}.mp3`)]);
  n++;
}
console.log(`${n}개 변환 → public/sfx/`);
