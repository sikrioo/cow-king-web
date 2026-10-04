// 골든(docs/baseline.golden.json = 레거시 동작 기록) 대비 **의도적으로 바꾼** 값 목록.
// 골든 파일은 레거시 그대로 둔다(legacy/tools/baseline.cjs --check가 계속 통과하도록). 바꾼 이유와 날짜를 같이 적을 것.
export const GOLDEN_OVERRIDES = {
  // 2026-10-05: '방어력'과 '블락률'이 같은 수치인데 화면마다 이름이 달라서 '블락률'로 통일 (사용자 결정 A)
  'exact.statDef.defense.label': '블락률'
};

// golden 깊은 복사본에 override 적용
export function applyOverrides(golden) {
  const g = JSON.parse(JSON.stringify(golden));
  for (const [path, value] of Object.entries(GOLDEN_OVERRIDES)) {
    const keys = path.split('.');
    let o = g;
    for (const k of keys.slice(0, -1)) {
      if (!(k in o)) throw new Error('override 경로 없음: ' + path);
      o = o[k];
    }
    if (!(keys[keys.length - 1] in o)) throw new Error('override 경로 없음: ' + path);
    o[keys[keys.length - 1]] = value;
  }
  return g;
}
