// 아이템 표시 규칙 (Step 6에서 이름/색/라벨 규칙을 전부 여기로 모음)

// 바닥 아이템은 아이콘 대신 글자 칩으로 표시 - 장비는 미감정이라 회색, 물약/재료는 색으로 구분
export function groundLabelForGear(gear) {
  if (gear.category === 'weapon') return '무기';
  if (gear.category === 'accessory') return '장신구';
  return '방어구'; // 갑옷/각반/신발/방패
}
