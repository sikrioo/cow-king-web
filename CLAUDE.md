# COW KING (jhsoft-game-cow-king)

디아블로 카우 레벨 모티브의 브라우저 액션 RPG 데모. Canvas 2D + Matter.js, **이미지 에셋 없음**(전부 코드로 그림), PC + 모바일(터치), UI 텍스트는 한국어.

## 지금 하는 일
단일 HTML(`legacy/cow_pen.html`)을 모듈 구조로 리팩토링 중.
**리팩토링 단계를 시작/재개하기 전에 반드시 `docs/REFACTOR_BRIEF.md`를 읽을 것.**
검증 기준은 `docs/BEHAVIOR_BASELINE.md`, 기존 코드 위치는 `docs/CODE_MAP.md`.

## 명령어 (Step 1 이후 유효)
- `npm run dev` 개발 서버 / `npm run build` 빌드 / `npm test` Vitest
- 레거시 검증: `node legacy/tools/smoke.cjs`, `node legacy/tools/baseline.cjs --check`

## 절대 규칙
1. **리팩토링 중 게임플레이·밸런스 수치·화면을 바꾸지 않는다.** 이상해 보여도 고치지 말고 보고만 한다.
2. 숫자와 콘텐츠는 `src/data/`에만 둔다. 코드에 튜닝용 숫자를 박지 않는다.
3. `render/`·`ui/`는 게임 상태를 **읽기만** 한다(예외: `ui/menu.js`는 `state.ui`만 변경). 게임 상태 변경은 `systems/`·`entities/`.
4. 순환 import 금지. 의존 방향: `data < util/core/state < systems/entities < render/ui/input < game/main`.
5. **과한 구조화 금지**: ECS, 이벤트 버스, DI 컨테이너, 프레임워크, TypeScript 전환 안 함. 파일은 ~400줄 넘을 때 쪼갠다.
6. 커밋은 단계(위험한 단계는 영역) 단위, **커밋 전 `npm test` + `npm run build` 통과**.
7. 골든(`docs/baseline.golden.json`) 불일치는 테스트를 고쳐서 해결하지 않는다. 동작이 바뀐 것이므로 코드를 되돌린다.
8. 애매하면 추측하지 말고 멈추고 사용자에게 질문한다. `docs/REFACTOR_BRIEF.md`의 STOP 지점에서는 반드시 보고한다.
9. 디아블로 데이터(d2data 등)는 **구조만 참고**하고 값·이름·문구는 복사하지 않는다.
10. 실제 브라우저 플레이는 사용자만 확인할 수 있다. "확인하지 못했다"를 보고서에 명시한다.

## 자주 밟는 함정 (상세는 BRIEF §11)
- 초기화 순서/TDZ: 모듈 로드 중 `resetGame()` 호출 금지, 부팅은 `boot()`에서.
- 캔버스 `textAlign` 등 상태 누수: 그리기 블록마다 `ctx.save()/restore()`.
- 감정 대상은 인덱스가 아니라 객체 참조. 메뉴 클릭 영역은 그릴 때마다 재등록.
- 몬스터 상태 점유 상태머신(`fusing`/`zapping`/`telegraph`)은 매 틱 `return`.
- 히트 판정은 몬스터 중심 + `getCowHitRadius`.
