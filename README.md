# COW KING

디아블로 카우 레벨을 모티브로 한 브라우저 액션 RPG 데모입니다.
Canvas 2D + Matter.js로 만들었고, 이미지 파일 없이 모든 그래픽을 코드로 그립니다. PC와 모바일(터치)에서 동작합니다.

## 실행

Node.js 22.12 이상이 필요합니다 (Vite 8 · Vitest 5 요구사항).

```bash
npm install
npm run dev      # 개발 서버 (브라우저에서 표시된 주소로 접속)
npm run build    # dist/ 에 배포용 빌드
npm run preview  # 빌드 결과 미리보기
npm test         # 자동 테스트 (Vitest)
```

## 조작

| 동작 | PC | 모바일 |
|---|---|---|
| 이동 / 달리기 | WASD·방향키 / Shift | 왼쪽 조이스틱 |
| 슬롯1 스킬 (길게 = 반복 시전) | Space, 좌클릭 | 슬롯1 버튼 |
| 슬롯2 스킬 (길게 = 반복 시전) | E, 우클릭 | 슬롯2 버튼 |
| 슬롯 스킬 전환 | Q / R | ⟳ 버튼 |
| 생명 / 마나 물약 | 1 / 2 | 물약 버튼 |
| 캐릭터 메뉴 (장비/스탯/가방/강화) | I | 장비 버튼 |
| 메뉴에서 강화 / 스탯 투자 | 1~7 / Z~M | 화면 버튼 |
| 일시정지 | P, ESC | Ⅱ 버튼 |
| 조작 도움말 | H | 도움말 버튼 |
| 레벨 업 (테스트용) | L | - |

사망하거나 승리한 뒤에는 아무 행동 키나 누르면 다시 시작합니다. 최고 기록은 브라우저에 저장됩니다.

## 구조

```
index.html          캔버스 + 모바일 버튼
src/
  main.js           부팅
  game.js           게임 흐름 (새 게임, 상태, 매 틱 갱신 순서, 키 처리)
  input.js          키 매핑 테이블과 입력 이벤트
  state.js          게임 상태 (game / ui / input)
  data/             밸런스 수치·몬스터·아이템·스킬·드랍·맵·색 (숫자는 여기에만)
  entities/         몬스터(일반 AI + 종류별 행동), 주인공, 바닥 아이템
  systems/          전투, 스킬, 장비, 드랍, 물약, 성장, 웨이브, 이펙트
  world/            목장(아레나)
  render/           그리기 (몬스터, 주인공, 이펙트, HUD …)
  ui/               캔버스 메뉴, 오버레이, HTML 버튼, 아이템 표시 규칙
  core/             캔버스, 물리 엔진, 고정 타임스텝 루프
tests/              자동 테스트
legacy/             리팩토링 전 단일 HTML 원본과 검증 도구 (삭제하지 말 것)
docs/               리팩토링 지시서, 동작 기준, 레거시 코드 지도, 골든 데이터
```

자주 하는 확장:
- **몬스터 추가**: `src/data/monsters.js`에 항목 하나. 특수 행동이 있으면 `src/entities/behaviors.js`에 훅 하나.
- **몬스터 무기 추가**: `src/render/monsterWeapons.js`에 그림 함수 하나 + `src/data/monsters.js`의 `MONSTER_WEAPONS` 목록
- **아이템 표시 변경**: `src/ui/itemView.js`
- **드랍 확률**: `src/data/drops.js`
- **스킬 해금 규칙**: `src/systems/progression.js`의 `isSkillUnlocked`

## 테스트

`npm test`는 다음을 확인합니다.
- 같은 입력을 넣었을 때 게임 진행이 기록해 둔 스냅샷과 같은지 (일반 플레이, 몬스터 11종, 모바일 조작). 동작을 일부러 바꿨다면 `npx vitest run -u`로 스냅샷 갱신
- `docs/baseline.golden.json`(리팩토링 전 원본에서 뽑은 기록)과 수치·규칙 비교. 이후 의도적으로 바꾼 값은 `tests/golden.overrides.js`에 기록
- 장비 아이템의 `uid` 고유성과 직렬화
