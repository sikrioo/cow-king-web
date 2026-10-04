# REFACTOR_BRIEF — 작업 지시서

> 읽는 순서: **이 문서 → `BEHAVIOR_BASELINE.md`(검증 기준) → `CODE_MAP.md`(기존 코드 위치)**.
> 이 문서는 작업자(Claude Code 등)가 이전 대화 맥락을 모른다는 전제로 쓰였다. **배경과 이유까지 읽고** 시작할 것.
> **STOP** 표시 지점에서는 반드시 작업을 멈추고 사용자에게 보고한 뒤 확인을 받는다.

---

## 1. 한 줄 목적

`legacy/cow_pen.html`(단일 파일 ~4,270줄, 전역 상태)을 **게임 동작을 한 치도 바꾸지 않고** 모듈 구조로 옮겨서,
앞으로 **몬스터 추가 / 스킬트리 / 아이템 렌더링 변경 / 디아블로식 옵션 변동성 / 디아블로식 데이터 구조 적용**이 쉬워지게 한다.

## 2. 배경

- **게임**: COW KING — 디아블로의 카우 레벨을 모티브로 한 캐주얼+매니악 브라우저 액션 RPG 데모. Canvas 2D + Matter.js, **이미지 에셋 없이 전부 코드로 그림**, PC + 모바일(터치), UI 텍스트는 한국어.
- **게임의 핵심 축**: 몬스터, **파밍**(드랍률·등급·옵션 변동성·강화 변동성, 감정 전/후의 기쁨과 실망 — "RPG의 탈을 쓴 카지노 슬롯"), 스킬 빌드, 트레이드, PVP.
  현재 데모 범위는 *파밍 + 몬스터 다양성*까지이고 스킬 빌드/트레이드/PVP는 후속이다.
- **개발 이력**: 한 파일에서 빠르게 반복 개발했다. 지금 들어 있는 것: 2슬롯 스킬(길게 누르기 반복 시전, 6종 스킬, 레벨 해금), 아이템 감정 시스템, 4탭 캐릭터 메뉴(장비/스탯/가방/강화),
  몬스터 11종(+보스), 무기 5종·방패·쌍수 판정, 생명/마나 물약, 타이틀/일시정지/최고기록, 전투 수치 ×3 스케일 밸런스.
- **작업자 사용자 성향**: 과한 구조화를 싫어한다. **"적절한 수준"**이 요구사항이다.

## 3. 왜 바꾸나 (실제로 겪은 문제)

| 문제 | 실제 사례 |
|---|---|
| 변경이 여러 곳에 흩어짐 | 몬스터 1종 추가 시 생성자, `KIND_STYLE`, `KILL_EXP`, 엘리트 풀, `Cow.update`, `Cow.draw`, 포즈 매핑 등 **8곳 가까이** 수정 |
| 같은 것을 여러 곳에서 그림 | 아이콘→글자 전환 시 바닥/가방/상세 **3곳**을 각각 수정 |
| 전역 상태 + 초기화 순서 의존 | `WEAPON_VARIANTS`가 `resetGame()` 최초 호출보다 **아래**에 선언돼 "초기화 전 접근" 에러(TDZ). 최상위 `let` 상태 변수 37개 |
| 캔버스 상태 누수 | 스탯 목록에서 켠 `ctx.textAlign='right'`를 안 되돌려서 장비 메뉴 글자가 화면 밖으로 밀림 |
| 자동 테스트 없음 | 지금까지 임시 스크립트로만 검증 → 이번에 `legacy/tools/`로 정식화 |
| 밸런스 숫자가 코드 전체에 흩어짐 | 수치 조정 때마다 여러 위치를 grep |

## 4. 앞으로 필요한 확장 (구조가 대비해야 할 것 — 이번에 구현하지는 않는다)

1. **몬스터 종류 추가** (이후: 속성 조합/챔피언 개념)
2. **스킬트리** — 지금은 `SKILL_UNLOCK_LEVEL` + `isSkillUnlocked()`가 임시 자리(해금 판정 한 곳)
3. **아이템 렌더링 변경** — 표시 로직이 한 곳에 있어야 함
4. **디아블로식 옵션 변동성** — 기본 아이템 + affix(접두/접미) + 아이템 레벨 + 가중치 롤
5. **트레저 클래스식 드랍 테이블**
6. **트레이드** — 아이템이 직렬화 가능한 순수 데이터 + 고유 `uid`
7. **PVP/멀티** — 플레이어를 전역 싱글톤이 아닌 인스턴스로, `team`으로 적대 판정

참고 자료: https://github.com/blizzhackers/d2data (D2R 데이터 JSON). **구조(테이블 설계)만 참고**하고, 거기 있는 데이터 값·이름·문구를 복사해 오지 말 것(블리자드 저작물).

## 5. 이미 합의된 결정 (재논의하지 말 것)

| 주제 | 결정 |
|---|---|
| 도구 | ES Modules + **Vite**, 언어는 **JavaScript 유지**(TS 전환 안 함), 물리는 npm `matter-js@0.20.0`(CDN 제거), 테스트는 **Vitest** |
| 플레이어 vs 몬스터 | **분리 유지** + 얇은 공통 뼈대 `entities/actor.js`(몸체·체력·`team`·넉백·피격 플래시). 플레이어는 전역이 아니라 `state.hero` 인스턴스 |
| 몬스터 | 종류별 수치는 `data/monsters.js`, 특수 행동은 `entities/behaviors.js`의 훅. `Cow.update`의 `if (kind === ...)` 체인을 없앤다 |
| 아이템 | 순수 데이터(메서드 없음, JSON 직렬화 가능) + `uid`. 굴리기·장착·감정·강화는 `systems/`, 표시는 `ui/itemView.js` 한 곳 |
| 맵 | `data/maps.js`(정의) + `world/arena.js`(벽·스폰 위치·테마). 지금은 목장 하나 |
| UI | 3층: `render/hud`(캔버스 HUD), `ui/menu`(캔버스 메뉴 — 상태를 읽고 시스템을 호출), `ui/dom`(HTML 버튼) |
| 입력 | 키/마우스/터치 → "의도"로 변환(`input.js`), 게임 로직은 의도만 소비 |
| 하지 않음 | ECS, 이벤트 버스, DI 컨테이너, React/프레임워크, TypeScript 전환, 디아블로 데이터 복사 |

## 6. 범위 밖 (절대 하지 말 것)

- **게임플레이·밸런스 수치·화면 변경 금지.** (수치가 이상해 보여도 고치지 말고 보고만)
- 새 기능 추가 금지 (affix 시스템, 트레저 클래스 완전 구현, 스킬트리 구현 등은 **후속 작업**).
  단, 아래 "허용되는 작은 추가"는 가능: 아이템 `uid`, `ui/itemView.js`, `data/drops.js`(현재 드랍 확률 구조를 그대로 옮긴 것).
- 테스트용 기능(`L`키 레벨업, `giveTestStash()`)은 **유지**한다. 나중에 제거할 것이므로 `config`의 `DEV` 플래그로 묶는 것은 허용(기본 동작 동일).
- 골든 불일치를 **테스트 수정으로 해결하지 말 것.** 불일치 = 동작이 바뀐 것이므로 원인을 찾아 코드를 되돌린다.

## 7. 목표 구조

```
index.html                  캔버스 + HTML 버튼 껍데기
src/
  main.js                   부트: 컨텍스트/물리 초기화 → 입력 연결 → 루프 시작 (≤100줄 목표)
  game.js                   상태 흐름(title → playing → gameover/victory, paused), resetGame, 승패 기록
  state.js                  게임 상태 한 곳 (game / ui / input 그룹)
  util.js                   수학/색 유틸
  save.js                   localStorage (키 cowking_release_meta_v1 유지, try/catch)
  config.js                 DEV 플래그 등 엔진 설정
  core/
    context.js              canvas, ctx, resize
    physics.js              Matter engine/world
    loop.js                 고정 타임스텝 루프
  data/                     ★ 순수 데이터 (로직 없음, 거의 import 없음)
    balance.js  monsters.js  items.js  skills.js  maps.js  drops.js
  entities/
    actor.js                공통 뼈대
    hero.js                 플레이어 생성/업데이트(이동 관성·스태미나 등)
    monster.js              몬스터 공통 AI
    behaviors.js            종류별 특수 행동 훅
    drop.js                 바닥 아이템
  systems/
    combat.js  skills.js  gear.js  loot.js  progression.js  waves.js  potions.js
  world/arena.js
  input.js
  render/
    renderer.js  sprites.js  arena.js  fx.js  hud.js  items.js
  ui/
    menu.js  overlays.js  dom.js  itemView.js
tests/                      Vitest: 골든 비교, 스모크
legacy/                     원본 단일 파일 + 검증 도구 (삭제하지 말 것)
docs/
```

**원칙**
1. 숫자·콘텐츠는 `data/`에만. 코드에 튜닝용 숫자를 두지 않는다.
2. 규칙(`systems/`)은 상태를 바꾸고, 그리기(`render/`, `ui/`)는 **읽기만** 한다. (예외: `ui/menu.js`는 자기 UI 상태(`state.ui`)만 바꾸고, 게임 상태는 `systems/` 함수 호출로만 바꾼다.)
3. **순환 import 금지.** 생기면 함수를 더 낮은 층으로 내리거나 호출 쪽에서 인자로 넘긴다. 억지로 동적 import 하지 말 것.
4. 권장 계층(왼쪽이 아래): `data` < `util·core·state` < `systems/{combat,progression,gear,potions}` < `entities` < `systems/{loot,waves,skills}` < `render·ui·input` < `game·main`.
   어길 때는 이유를 보고서에 적는다.
5. 파일이 ~400줄을 넘으면 분리를 검토한다. 처음부터 잘게 쪼개지는 말 것(예: `behaviors.js`, `menu.js`는 한 파일로 시작해 커지면 폴더로).

## 8. 모든 단계 공통 규칙

- **단계 = 최소 1개 이상의 커밋.** 위험한 단계(3, 5)는 더 잘게(영역별로) 커밋. 커밋 전에 `npm test`와 `npm run build` 통과.
- 코드를 옮길 때는 **복사 후 삭제**(이동)를 원칙으로 하고, 이동 중에 로직을 "개선"하지 않는다. 개선하고 싶은 점은 보고서의 "발견한 문제"에 적는다.
- 이름 변경은 기계적 치환으로(의미 변경 없이). 한 커밋에 이동과 변경을 섞지 않는다.
- 막히거나 애매하면 **추측하지 말고 멈추고 질문**한다.
- 각 단계 끝에 `BEHAVIOR_BASELINE.md`의 자동 확인을 돌리고 결과를 보고한다.

## 9. 단계별 지시

배치 구성: **A = Step 0~2 (안전, 파일 이동 위주) → STOP**, **B = Step 3~4 (상태 정리 + 그리기 분리) → STOP**, **C = Step 5~6 (규칙/엔티티 분리 + 마무리) → STOP**.

> 순서 근거: `render/`를 옮기려면 상태가 먼저 `state.js`에 정리돼 있어야 하고(전역 변수를 import로 공유할 수 없음, 특히 `cows = []` 같은 재할당),
> `ui/menu`는 `systems/` 함수를 호출하므로 systems가 분리된 뒤(Step 6)에 옮겨야 순환 import가 안 생긴다.

### Step 0 — 저장소 준비
- `git init -b main`(이미 있으면 생략). 이 문서 묶음을 커밋하고 `git tag v0-singlefile`.
- `.gitignore`에 `node_modules/`, `dist/`. `npm init -y && npm i matter-js@0.20.0`(레거시 도구용).
- **검증**: `node legacy/tools/smoke.cjs` → `"ok":true`, `node legacy/tools/baseline.cjs --check` → `BASELINE OK`.
- 커밋: `chore: 레거시 단일 파일, 검증 도구, 기준선 문서`

### Step 1 — Vite로 감싸기 (동작 변화 0)
- Vite + Vitest 설치(devDependencies), `npm run dev / build / test` 스크립트.
- `index.html`: 레거시의 `<body>` 마크업만 옮기고, `<style>` 내용은 `src/styles.css`로, 인라인 `<script>` 전체를 `src/main.js`(`type="module"`)로 옮긴다. CDN `<script src=...matter...>`는 제거하고 `src/main.js` 맨 위에 `import Matter from 'matter-js'`.
- **하지 말 것**: 코드 로직 수정, 파일 분리.
- 주의: 모듈 스크립트의 최상위 `const/let`은 전역이 아니다. 인라인 `onclick=` 같은 전역 참조가 없는지 `grep`으로 확인(레거시는 전부 `addEventListener`).
- **검증**: `main.js` == 레거시 스크립트 + import 한 줄 (`diff`로 증명), `npm run dev`로 뜨고, `npm run build` 성공, 콘솔 에러 없음.
- (선택, 사용자가 원할 때만) `vite-plugin-singlefile`로 더블클릭 가능한 단일 HTML 빌드 추가.

### Step 2 — `data/` 분리 + 골든 테스트
- `CODE_MAP.md`의 "최종 목적지" 열대로 상수/테이블을 `src/data/*.js`로 이동(`export const`). `data/`는 로직을 갖지 않는다(`expForLevel` 같은 순수 파생 함수만 예외).
- `Cow` 생성자 안에 흩어진 종류별 hp/속도/데미지/크기와 엘리트 풀, `KILL_EXP`, `KIND_STYLE`을 `data/monsters.js`로 모으고 생성자가 이를 **읽도록** 바꾼다.
- 스킬은 이름/색/해금 레벨 같은 메타만 `data/skills.js`로(동작을 묶는 `SKILLS`의 `try` 바인딩은 Step 5까지 그대로).
- **테스트**: `tests/baseline.data.test.js` — `docs/baseline.golden.json`을 읽어서 data 모듈로 계산 가능한 `exact` 키(`monsters`, `baseDamage/hitsToKill`, `progression`, `weaponRange`, `rarity`, `statDef`, `dropConstants`, `potions`의 상수 부분)를 비교. 숫자를 테스트 코드에 복사하지 말 것.
- **검증**: `npm test`, `npm run build` 통과. `main.js`에 튜닝용 상수가 남아 있지 않음(`grep`으로 확인해 보고).
- 커밋 예: `refactor: 밸런스/몬스터/아이템 데이터를 src/data로 분리 (동작 변경 없음)`
- **STOP (배치 A)**: 사용자에게 보고 → 사용자가 `npm run dev`로 `BEHAVIOR_BASELINE.md` §3 체크리스트 중 흐름/전투 항목을 직접 확인.

### Step 3 — `state.js` / `core/` 도입 (가장 위험, 가장 기계적)
- `core/context.js`(canvas, ctx, resize), `core/physics.js`(engine, world, 벽 생성), `state.js`를 만든다.
- 최상위 `let` 상태 변수 37개를 그룹으로 이동(이름은 참고 — 합리적으로 조정 가능, 단 매핑을 보고서에 남길 것):
  - `game`: `gameState, paused, wave, waveTransition, kills, cows, items, hazards, lightningBolts, shockwaves, particles, floatTexts, shake, hitstop, impactFlash, waveBannerTimer, demoTipTimer, runRecorded`, `releaseMeta`
  - `ui`: `showInventory, invPanelTab, selectedInvIndex, hoverInvIndex, invSlotRects, invTabRects, invButtons, invToast, invReveal, titleCows, titleTime`, 감정 진행 상태(`identifyingItem, identifyTimer`)
  - `input`: `keys, holdSlot1, holdSlot2, joystick`
  - 루프 내부(`accumulator, lastTime`)는 `core/loop.js`
  - `player` 객체는 우선 이름 유지(`state.js`에서 export) — `hero` 개명은 Step 5.
- **재할당 주의**: `cows = []`, `items = []`, `particles = []` 같은 재할당은 다른 모듈에서 import한 바인딩으로는 불가능하므로 `game.cows = []`(속성 대입)로 바꾼다.
- 모듈 로드 중에 `resetGame()`을 호출하지 말 것(초기화 순서 버그의 원인). 부팅 코드는 `boot()`에서 명시적으로 호출.
- **테스트**: `tests/smoke.test.js` — 새 코드용 스모크(레거시 `smoke.cjs`와 같은 시나리오: 타이틀→시작→무작위 입력 약 9,000프레임, `L` 레벨업, 일시정지, 장비창 열고 클릭 난사). 예외/NaN 없음. 방법은 `BEHAVIOR_BASELINE.md` §1 참조.
- **검증**: `main.js` 최상위에 상태용 `let`이 0개, 스모크/골든/빌드 통과.
- 영역별(게임/ui/input)로 나눠 **여러 커밋**.

### Step 4 — `render/` + `ui/overlays` 분리 (읽기 전용 코드 이동)
- `drawXxx`만 옮긴다. `updateXxx`(상태 갱신)와 `spawnXxx`(생성)는 아직 `main.js`에 남기거나 임시 위치(`systems/fx` 후보)에 둔다. (같은 영역에 섞여 있으니 주의: `particles`, `shockwaves`, `hazards`, `lightningBolts`, `floatTexts`)
- 목적지는 `CODE_MAP.md` 참조: `render/sprites.js`(몬스터·주인공 그리기), `render/arena.js`, `render/fx.js`, `render/hud.js`, `render/items.js`(바닥 아이템), `render/renderer.js`(`render(t)`의 프레임 그리기 순서를 한 곳에), `ui/overlays.js`(타이틀·카운트다운·웨이브 배너·팁·일시정지).
- `render/*`는 상태를 **읽기만** 한다. draw 안에서 상태를 바꾸는 코드가 있으면 보고서에 적고 최소 변경으로 분리.
- 미사용 `drawSkillIcon`은 `grep`으로 확인 후 삭제.
- `ui/menu`(캔버스 메뉴)와 HTML 동기화(`updateSkillButtonsUI`, `updatePotionButtonsUI`)는 **아직 옮기지 않는다**(Step 6).
- **검증**: 스모크/골든/빌드, `render/*`에 `game.* =` 등 상태 대입이 없음(`grep`).
- **STOP (배치 B)**: 사용자 수동 확인 — `BEHAVIOR_BASELINE.md` §3의 시각 관련 항목(몬스터/주인공/이펙트/HUD/타이틀/일시정지).

### Step 5 — `entities/` + `systems/` 분리
권장 순서(결합이 낮은 것부터, 단계마다 커밋):
1. `systems/potions.js`, `systems/progression.js`(`gainExp`, 스탯 투자, 스킬 해금 판정 `isSkillUnlocked` — **해금 판정은 반드시 이 한 곳**)
2. `systems/gear.js`(`rollGearItem`, `equipItem`, `recalcGearStats`, `tryUpgradeSlot`, `tryIdentify`/`updateIdentify`/`revealIdentifiedGear`, 시작 장비·테스트 가방), 감정 대상은 **객체 참조**로 유지
3. `systems/loot.js` + `entities/drop.js`(`Item`, `dropLoot`, `rollRarity`, `rollConsumableType`, 줍기 `updateItems`)
4. `systems/combat.js`(`damageCow`, `killCow`, `hitPlayer`, `bossSlam`, `spawnColdNova`, `skillDamageCow`, 콤보). `entities/actor.js`에 `team`과 공통 뼈대, `combat.canHit(attacker, target)`(현재 동작: 플레이어는 몬스터만 침)
5. `systems/skills.js`(`try*/update*`, 슬롯, 길게 누르기 시전, 전환) + `data/skills.js`의 메타와 결합
6. `entities/monster.js` + `entities/behaviors.js`: `class Cow` → `Monster`. **일반 AI(추격·근접·배회·스턴·넉백)는 `monster.js`, 종류별 특수 처리는 `behaviors[kind]` 훅**.
   훅의 최소 형태(필요한 것만 쓸 것):
   ```js
   behaviors[kind] = {
     update(monster, dt, game) { return false; }, // true를 반환하면 이번 틱의 일반 AI를 건너뜀(상태 점유)
     onDeath(monster, game) {},                    // 예: 냉기 노바, 자폭 폭발
     drawExtras(monster, ctx, t) {},               // 예: 오라, 점화/충전 경고
     // 필요 시: 일반 추격/후퇴를 대체하는 이동 규칙 (주술사/번개)
   };
   ```
   **처리 순서는 `CODE_MAP.md`의 "Cow.update 처리 순서"를 그대로 보존**한다.
7. `entities/hero.js`: 플레이어 생성(`createHero`), `updatePlayer`(이동 관성, 스태미나, 쿨다운 감소, 잠금 상태 분기), 모션 반응. `player` → `hero` 개명(기계적 치환). `state.hero`로 접근.
8. `systems/waves.js`(`pickCowKind`, `startNextWave`), `world/arena.js` + `data/maps.js`(PEN 계산, 벽, 스폰 위치, 테마색)
- **테스트**: 이제 로직이 import 가능하므로 골든의 나머지 `exact` 키(`start`, `slot2OptionsByLevel`, `equipRules`, `identify`, `potions`의 동작, `whirlwind`, `waveSizes`)와 `statistical`(드랍/등급 분포: RNG를 주입 가능하게 하고 시드 고정, ±1.0%p)을 Vitest로 비교.
  RNG 주입은 허용되는 작은 변경(`util.js`의 `rng()`; 기본은 `Math.random`).
- **검증**: 골든 전부, 스모크, 빌드. 순환 import가 없음(`madge` 같은 도구 또는 수동 확인).

### Step 6 — 입력/메뉴/게임 흐름 + 마무리
- `ui/itemView.js`: `itemLabel`, `itemColor`, `groundLabelForGear` 등 **아이템 표시 규칙을 한 곳**에. 바닥 칩/가방/상세/장비/강화 화면이 전부 이것을 사용하도록.
- `ui/menu.js`(캔버스 메뉴: 상태는 `state.ui`, 동작은 `systems/` 호출), `ui/dom.js`(HTML 버튼 바인딩, 쿨다운/개수 동기화, `title-mode` 클래스).
- `input.js`: 키 매핑을 **한 테이블**로. 키/마우스/터치/조이스틱 → 의도(`holdSlot1/2`, 일회성 커맨드: 물약, 슬롯 전환, 메뉴 토글, 일시정지…). 게임 로직은 의도만 소비. 메뉴가 열려 있으면 `1~7`=강화, 닫혀 있으면 `1/2`=물약(현재 동작).
- `game.js`: 상태 머신(title/playing/gameover/victory + paused), `resetGame`, 승패 기록(`save.js`). `main.js`는 부팅만(≤100줄 목표).
- `data/drops.js`: `dropLoot`의 확률 구조(장비 10% → 재료 7% → 소모품 20%(물약 가중치))를 **현재 동작 그대로** 데이터 테이블로. (트레저 클래스 완전 구현은 범위 밖 — 나중에 이 테이블을 확장)
- 아이템 `uid` 부여(생성 시). 다른 동작에 영향이 없어야 한다.
- `README.md` 갱신(실행/빌드/구조/조작), `CLAUDE.md`를 실제 구조에 맞게 갱신, `git tag v1-modular`.
- **검증**: 골든 전부, 스모크, 빌드, 파일 길이 점검(~400줄 초과 파일 목록과 사유 보고).
- **STOP (배치 C)**: 사용자가 `BEHAVIOR_BASELINE.md` §3 **전체** 체크리스트를 확인.

## 10. 보고 양식 (각 단계 끝, STOP 지점)

1. **변경 요약**: 무엇을 어디로 옮겼는지(파일 목록), 커밋 목록
2. **검증 결과**: 실행한 명령과 출력 요약(`npm test`, `npm run build`, 골든, 스모크)
3. **확인하지 못한 것**: 특히 "실제 브라우저 플레이는 확인하지 못했다"
4. **발견한 문제**: 고치지 않고 적어둔 기존 버그/이상한 수치/개선 아이디어
5. **다음 단계에 필요한 결정**이 있으면 질문

## 11. 알려진 함정 (이미 한 번씩 겪은 것들)

1. **초기화 순서/TDZ**: 최상위 `const`를 쓰는 함수가 그 선언보다 먼저 실행되면 에러. 모듈에서는 순환 import와 import 시점 부작용이 같은 문제를 만든다. 부팅은 `boot()`에서 명시적으로.
2. **캔버스 상태 누수**: `textAlign`, `textBaseline`, `globalAlpha`, `lineWidth`를 바꾸면 되돌려야 한다. 탭/패널 단위로 `ctx.save()/restore()`로 감쌀 것.
3. **감정 대상은 인덱스가 아니라 객체 참조**(`identifyingItem`). 인벤토리 배열이 `splice`로 바뀌어도 안전해야 한다.
4. **메뉴 클릭 영역은 그릴 때마다 재등록**(`invButtons`, `invSlotRects`, `invTabRects`)하고, 입력은 직전 프레임의 영역을 쓴다.
5. **메뉴가 열려 있으면 월드는 정지, 감정 진행만 계속**(`fixedUpdate` 분기 순서는 `CODE_MAP.md`).
6. **히트 판정**은 몬스터 중심 + `getCowHitRadius`(고정 오프셋 타격점으로 되돌리지 말 것).
7. `hitPlayer`의 무적시간(0.55초, 회피 시 0.25초)이 지속 피해 틱을 자연스럽게 제한한다 — 의미 보존.
8. 줍기 불가 경고는 `warnCd`로 1.5초 간격(매 프레임 도배 금지).
9. 몬스터가 40마리 이상 나올 수 있다. 몬스터마다 `ctx.filter`나 매 프레임 그라데이션 생성을 남발하지 말 것(과거에 `ctx.filter` 때문에 성능 문제가 있었다).
10. `localStorage`는 항상 `try/catch`(사용 불가 환경에서도 게임이 돌아야 함). 저장 키 `cowking_release_meta_v1` 유지.
11. 모바일: `touch-action:none`, 포인터 이벤트, HTML 버튼은 `pressAction` 패턴(비플레이 상태면 재시작, 일시정지면 무시).
12. 첫 로드는 타이틀 화면: 초기화 후 `gameState='title'`.
13. 상태를 점유하는 몬스터 상태머신(`fusing`, `zapping`, `telegraph` 등)은 **매 틱 `return`**해야 일반 AI가 덮어쓰지 않는다.

## 12. 완료 정의 (Definition of Done)

- [ ] `npm run dev / build / test` 모두 동작, CDN 의존 없음
- [ ] 골든(`exact` 완전 일치, `statistical` 허용 오차 이내) 전부 통과, 새 스모크 통과
- [ ] 사용자가 `BEHAVIOR_BASELINE.md` §3 전체 체크리스트 확인 완료
- [ ] 몬스터 1종을 추가하는 데 `data/monsters.js` 한 항목(+필요 시 `behaviors.js` 훅 하나)만 고치면 된다 — **실제로 임시 몬스터를 하나 추가해 보고 지워서 증명**(보고서에 수정한 파일 수 기록)
- [ ] 아이템 표시 방식은 `ui/itemView.js` 한 곳만 고치면 모든 화면에 반영된다
- [ ] 최상위 상태 변수 없음, 순환 import 없음, `main.js` ≤ 100줄 목표
- [ ] `README.md`, `CLAUDE.md`가 실제 구조와 일치, 태그 `v1-modular`

## 부록 — 후속 로드맵 (이번 범위 아님)

접두/접미 affix 시스템과 아이템 레벨, 트레저 클래스식 드랍 테이블, 스킬트리(스킬 포인트·선행 조건), 몬스터 속성 조합(챔피언팩), 트레이드(저장/서버), PVP.
