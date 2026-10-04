// 골든(docs/baseline.golden.json = 레거시 동작 기록) 대비 **의도적으로 바꾼** 값 목록.
// 골든 파일은 레거시 그대로 둔다(legacy/tools/baseline.cjs --check가 계속 통과하도록). 바꾼 이유와 날짜를 같이 적을 것.
export const GOLDEN_OVERRIDES = {
  // 2026-10-05: '방어력'과 '블락률'이 같은 수치인데 화면마다 이름이 달라서 '블락률'로 통일 (사용자 결정 A)
  'exact.statDef.defense.label': '블락률'
};

// 2026-10-05: 체력/피해 ×10 정수화 - 레거시 기록의 체력·피해 계열 값을 새 단위로 환산해서 비교 (몇 대에 죽는지 등은 그대로)
export const LEGACY_HP_SCALE = 10;
function scaleLegacy(g) {
  const S = LEGACY_HP_SCALE;
  const e = g.exact;
  Object.values(e.monsters).forEach((m) => { m.hp *= S; m.meleeDmg *= S; });
  e.baseDamage *= S;
  e.hitsToKill = Object.fromEntries(Object.entries(e.hitsToKill).map(([d, v]) => [String(d * S), v])); // 키 = 데미지
  e.progression.perPoint.atkPower = +(e.progression.perPoint.atkPower * S).toFixed(6);
  e.progression.perPoint.health *= S;
  for (const k of ['atkPower', 'health']) {
    e.statDef[k].min *= S; e.statDef[k].max *= S;
    e.statDef[k].fmtAtMax = '+' + (Number(e.statDef[k].fmtAtMax.slice(1)) * S);
  }
  e.start.maxHp *= S;
  return g;
}

// golden 깊은 복사본에 단위 환산 + override 적용
export function applyOverrides(golden) {
  const g = scaleLegacy(JSON.parse(JSON.stringify(golden)));
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
