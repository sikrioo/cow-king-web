// 관리자 - 실제 소스 코드 보기: Vite의 ?raw로 src 파일을 글자 그대로 불러와 함수/객체 항목을 찾아 잘라냄 (읽기 전용)
// 코드를 고치면 새로고침만으로 반영. 이름이 바뀌어 못 찾으면 null (tests/admin.test.js가 목록 전체를 검사)
const RAW = import.meta.glob('../**/*.js', { query: '?raw', import: 'default' });
let cache = null;

async function sources() {
  if (!cache) {
    const entries = await Promise.all(Object.entries(RAW).map(async ([p, load]) => [p.replace(/^\.\.\//, 'src/'), await load()]));
    cache = Object.fromEntries(entries);
  }
  return cache;
}

// start 위치부터 첫 '{'의 짝 '}'까지 (문자열·주석 속 괄호는 드묾 - 단순 세기)
function block(text, start) {
  const open = text.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) {
      // 바로 위 주석 줄도 같이 (설명)
      let s = text.lastIndexOf('\n', start - 1) + 1;
      while (s > 0) {
        const prev = text.lastIndexOf('\n', s - 2) + 1;
        if (!text.slice(prev, s).trim().startsWith('//')) break;
        s = prev;
      }
      return { code: text.slice(s, i + 1), line: text.slice(0, s).split('\n').length };
    }
  }
  return null;
}

// 함수 찾기: "function name(" (export 여부 무관)
export async function findFunction(name) {
  const all = await sources();
  const re = new RegExp(`^(export )?(async )?function ${name}\\(`, 'm');
  for (const [file, text] of Object.entries(all)) {
    const m = re.exec(text);
    if (m) { const b = block(text, m.index); if (b) return { file, ...b, name }; }
  }
  return null;
}

// 객체 항목 찾기: 파일 안의 "  key: {" (예: behaviors의 몬스터 종류) 또는 클래스 메서드 "  name("
export async function findEntry(file, key, { method = false } = {}) {
  const all = await sources();
  const text = all[file];
  if (!text) return null;
  const re = method ? new RegExp(`^  ${key}\\(`, 'm') : new RegExp(`^  ${key}: \\{`, 'm');
  const m = re.exec(text);
  if (!m) return null;
  const b = block(text, m.index);
  return b ? { file, ...b, name: key } : null;
}
