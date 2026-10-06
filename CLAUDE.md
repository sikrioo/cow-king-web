# COW KING (jhsoft-game-cow-king)

디아블로 카우 레벨 모티브의 브라우저 액션 RPG 데모. Canvas 2D + Matter.js, **이미지 에셋 없음**(전부 코드로 그림), PC + 모바일(터치), UI 텍스트는 한국어.

## 현재 상태
단일 HTML(`legacy/cow_pen.html`)을 동작 변경 없이 모듈 구조로 옮기는 리팩토링 완료(태그 `v1-modular`).
경위와 결정 사항은 `docs/REFACTOR_BRIEF.md`, 동작 기준은 `docs/BEHAVIOR_BASELINE.md`, 레거시 코드 지도는 `docs/CODE_MAP.md`.
다음 예정: 강화 탭을 가방 탭으로 통합 + 버리기(장착 장비는 장비 탭에서 강화/해제, 버리기 = 발밑에 떨어뜨림).

## 명령어
- `npm run dev` 개발 서버 / `npm run build` 빌드 / `npm test` Vitest
- 레거시 자체 점검: `node legacy/tools/smoke.cjs`, `node legacy/tools/baseline.cjs --check`

## 구조 (의존 방향: 위가 아래를 import, 역방향 금지)
```
main.js            부팅만 (boot: 화면/목장 → createHero → 입력 연결 → resetGame → 타이틀 → 루프)
game.js            새 게임(resetGame), 상태(title/playing/gameover/victory + paused), fixedUpdate 순서, 키 의도 처리
input.js           KEY_INTENTS(키 → 의도 한 테이블), 키보드/캔버스/조이스틱 리스너
render/            그리기만 (renderer.js = 프레임 그리기 순서·월드/화면 좌표 구분, monster/heroSprites, arena, ground(바닥 무늬 조각 캐시), fx, hud, minimap, items)
ui/                overlays(타이틀·배너·일시정지), dom(HTML 버튼·동기화), itemView(아이템 표시 규칙 한 곳), menu/(캔버스 메뉴)
entities/          monster(일반 AI) + behaviors(종류별 훅), hero(createHero/updatePlayer), drop(바닥 아이템), actor(team)
systems/           combat, skills, gear, loot, potions, progression, waves, fx(이펙트 생성/갱신)
world/arena.js     목장 배치(고정 크기 data/maps.js)·벽·안쪽 좌표
world/camera.js    카메라(주인공 추적, 맵 끝 멈춤, 작은 화면 줌) - 보기 전용, 게임 결과에 영향 금지
state.js           game / ui / input 상태 그룹 (주인공은 game.hero)
core/              context(canvas), physics(Matter 엔진·별칭), loop(고정 타임스텝)
util.js save.js config.js
data/              숫자·콘텐츠만: balance, monsters, items, elements, skills, drops, maps, palette
```
- 실제 계층은 brief 권장과 조금 다름(순환을 피하려고): combat → loot, hero → skills, systems/loot → ui/itemView(데이터만 쓰는 말단).
- 새 import를 추가하면 순환이 없는지 확인할 것.

## 확장할 때 고칠 곳
- 몬스터 추가: `data/monsters.js` 항목 하나(+ 엘리트로 나오게 하려면 같은 파일 `ELITE_KINDS`) + 특수 행동이 있으면 `entities/behaviors.js` 훅 하나.
  훅: `init / update(true=상태 점유) / steer / ranged / onDeath(true=자체 드랍) / drawUnder / drawOver`. 상태 점유 중(fusing/zapping/telegraph/casting…)엔 매 틱 true.
  마법형 몬스터 훅은 `entities/spellBehaviors.js`(behaviors에 합쳐짐), 마법 자체(메테오/파이어볼/화염 벽)는 `systems/spells.js`.
- 투사체: `systems/projectiles.js`의 `spawnProjectile({kind, x, y, dirX, dirY, speed, range, radius, packet, explodeRadius, color})` - 지금은 몬스터→주인공만. 그림은 `render/fx.js` drawProjectiles.
- 몬스터 무기: `render/monsterWeapons.js` 그림 함수 + `WEAPON_DRAW` 등록 + `data/monsters.js`의 `MONSTER_WEAPONS`. 개체별 선택은 `weaponFor(kind, phase)` - 게임 난수 소비 금지(그림 때문에 게임 결과가 바뀌면 안 됨).
- 스킬 해금 규칙(스킬트리): `systems/progression.js`의 `isSkillUnlocked` 한 곳.
- 아이템 표시: `ui/itemView.js` 한 곳. 드랍 확률: `data/drops.js`. 장비는 순수 데이터 + `uid`.
- 스탯 키 `defense`는 **블락률**(데미지를 통째로 막을 확률)이다. 골든 호환 때문에 키 이름 유지.
- 무기 기본 속성: `data/items.js`의 `WEAPON_BASE`(종류별 피해 min~max, 초당 공격 aps) + 양손 배율. 계산 `systems/gear.js`의 `weaponStats` → `hero.weaponStats {main, off}`, 피해 굴림 `combat.heroHitDamage`. 쌍수는 주/보조 번갈아. 맨손은 `BASE_DAMAGE`/`ATTACK_COOLDOWN`.
- 원소(화염/냉기/번개/독): 수치·색 `data/elements.js`, 규칙 `systems/elements.js`(피해 묶음 `{phys, fire, cold, lightning, poison}` → 물리=방어력, 원소=저항(상한 75%), 화상/중독 지속 피해, 둔화). `hitPlayer`는 숫자(물리) 또는 묶음을 받음. 몬스터 근접 원소는 `data/monsters.js`의 `element`. 1단계(10-06)는 주인공이 받는 쪽만 - 무기/스킬 원소와 저항 옵션, 몬스터 저항은 2·3단계.
- 방어력(피해 감소): 방어구 기본값 `data/items.js`의 `GEAR_BASE_ARMOR`(옵션 아님, ×등급 배율 ×강화), 공식 상수 `data/balance.js`의 `ARMOR_K`/`ARMOR_MAX_REDUCTION`, 계산 `systems/gear.js`의 `gearArmor`/`armorReduction`. 피격 순서: 회피 → 블락 → 방어력 감소(최소 1). 원소 저항(2안)은 나중에 `hitPlayer`에 공격 종류를 붙여 확장.
- 피아 판정(PVP): `systems/combat.js`의 `canHit` + `team`.

## 규칙
1. 숫자와 콘텐츠는 `src/data/`에만 둔다. 체력·피해·공격력은 **정수**(×10 스케일, 고정 수치 옵션은 STAT_DEF의 flat). 코드에 튜닝용 숫자를 박지 않는다(남아 있는 직접 숫자는 옮길 대상).
2. `render/`·`ui/`는 게임 상태를 **읽기만** 한다(예외: `ui/menu/`는 `state.ui`만 바꾸고 게임 상태는 systems 함수로). 상태 변경은 `systems/`·`entities/`·`game.js`.
3. 순환 import 금지. 생기면 함수를 아래 계층으로 내리거나 호출하는 쪽에서 인자로 넘긴다(억지 동적 import 금지).
4. **과한 구조화 금지**: ECS, 이벤트 버스, DI 컨테이너, 프레임워크, TypeScript 전환 안 함. 파일은 ~400줄 넘으면 쪼갠다.
5. 커밋 전 `npm test` + `npm run build` 통과.
6. 디아블로 데이터(d2data 등)는 **구조만 참고**하고 값·이름·문구는 복사하지 않는다.
7. 애매하면 추측하지 말고 사용자에게 묻는다. 실제 브라우저 플레이는 사용자만 확인할 수 있으니 "확인하지 못했다"를 보고에 쓴다.

## 테스트
- `tests/smoke.test.js`: 같은 시드·같은 입력으로 게임을 돌려 상태 지문을 **스냅샷**(`tests/__snapshots__/`)과 비교(일반/몬스터 11종/모바일 시나리오) + 체력은 항상 정수.
  → 동작을 **의도적으로** 바꾼 경우에만 사용자 확인 후 `npx vitest run -u`로 갱신. 의도하지 않은 불일치는 코드를 되돌린다.
  (이력: v1-modular까지는 레거시와 상태+그리기 동일, ×10 정수화 1단계(9ec9ee6)까지 레거시와 상태 동일을 확인한 뒤 스냅샷 기준으로 전환)
- `tests/baseline.*.test.js`: `docs/baseline.golden.json`과 비교. 동작을 바꾸지 않는 작업에서 불일치가 나면 코드를 되돌린다(테스트 수정 금지). 사용자가 결정한 **의도적 변경**은 골든 파일을 고치지 말고 `tests/golden.overrides.js`에 경로·값·이유·날짜를 추가한다 (골든은 레거시 기록으로 유지 → `legacy/tools/baseline.cjs --check`도 계속 통과).
- 테스트용 기능 `L`키 레벨업, `giveTestStash()`는 나중에 제거 예정(유지 중).

## 자주 밟는 함정
- 초기화 순서: 모듈 로드 중 아무것도 실행하지 않는다. 부팅·리스너 등록은 `boot()`에서. 주인공 바디는 벽 다음에 생성.
- 그리기에서 `Math.random()`을 쓰는 곳이 있다(화면 흔들림, 번개 빔 지그재그) - 그리기 순서를 바꾸면 게임 난수 순서도 바뀐다. 새 그리기 코드에서는 `Math.random()` 대신 `util.hash01`(결정적)을 쓸 것. 특히 몬스터 그림은 화면 밖이면 안 그려지므로 난수를 쓰면 화면 크기에 따라 게임 결과가 달라진다.
- 키는 `input.keyOf(e)`로 읽는다(글자/숫자는 e.code) - 한글 입력 상태에서도 동작해야 함.
- 캔버스 `textAlign` 등 상태 누수: 그리기 블록마다 `ctx.save()/restore()`.
- 감정 대상은 인덱스가 아니라 객체 참조. 메뉴 클릭 영역은 그릴 때마다 재등록, 입력은 직전 프레임 영역 사용.
- 히트 판정은 몬스터 중심 + `getCowHitRadius`. `hitPlayer` 무적시간이 지속 피해 틱을 제한한다.
- 맵은 화면보다 크다(카메라): 월드 좌표 그림은 renderer의 applyCamera 블록 안, HUD·배너는 밖. 화면 밖 몬스터는 그리지 않으므로 그림 코드가 게임 상태/난수를 건드리면 화면 크기에 따라 결과가 달라진다.
- 웨이브 몬스터는 `hunt`(어그로 밖이어도 주인공 쪽으로 이동). 생성 위치 규칙은 `systems/waves.js`, 수치는 `data/balance.js`의 WAVE_*/HUNT_*.
- 몬스터 40마리 이상도 나온다: 몬스터마다 `ctx.filter`나 매 프레임 그라데이션 생성 금지.
- `localStorage`는 항상 try/catch, 저장 키 `cowking_release_meta_v1` 유지.
