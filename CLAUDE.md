# COW KING (jhsoft-game-cow-king)

디아블로 카우 레벨 모티브의 브라우저 액션 RPG 데모. Canvas 2D + Matter.js, **이미지 에셋 없음**(전부 코드로 그림), PC + 모바일(터치), UI 텍스트는 한국어.

## 현재 상태
단일 HTML(`legacy/cow_pen.html`)을 동작 변경 없이 모듈 구조로 옮기는 리팩토링 완료(태그 `v1-modular`).
경위와 결정 사항은 `docs/REFACTOR_BRIEF.md`, 동작 기준은 `docs/BEHAVIOR_BASELINE.md`, 레거시 코드 지도는 `docs/CODE_MAP.md`.
다음 예정: 강화 탭을 가방 탭으로 통합 + 버리기(장착 장비는 장비 탭에서 강화/해제, 버리기 = 발밑에 떨어뜨림).

## 할 일
미룬 기능·아이디어·결정 대기는 `docs/TODO.md` 한곳에 (수습생의 마법, 무기 옵션 출혈·방어 깨기 등). 새로 미루는 것도 여기에 날짜와 함께 추가.

## 명령어
- `npm run dev` 개발 서버 / `npm run build` 빌드 / `npm test` Vitest
- 관리자 페이지: 개발 서버에서 `/admin.html` (배포본은 `admin.html?dev=1`). `src/data`와 생성 코드를 그대로 import해서 표·시뮬레이터로 보여줌(읽기 전용). 코드 `src/admin/`(탭별 `tabs/*.js`). 데이터 항목을 추가하면 해당 탭에도 표시되는지 확인할 것
  상세 서랍(`admin/detail.js`): 미리보기 = 게임 샌드박스(`systems/sandbox.js`, `index.html?dev=1&sandbox=skill&id=..&lv=..` / `sandbox=monster&id=..`) iframe + 데이터 JSON + 실제 소스에서 잘라 온 코드(`admin/source.js`, Vite `?raw`). 새 스킬은 `SKILL_CODE`에 함수 이름 추가 (빠지면 tests/admin.test.js 실패)
- 레거시 자체 점검: `node legacy/tools/smoke.cjs`, `node legacy/tools/baseline.cjs --check`

## 구조 (의존 방향: 위가 아래를 import, 역방향 금지)
```
main.js            부팅만 (boot: 화면/목장 → createHero → 입력 연결 → resetGame → 타이틀 → 루프)
game.js            상태(title/hub/playing/gameover/victory + paused), fixedUpdate 순서, 키 의도 처리
session.js         새 캐릭터(newCharacter) → 맵 선택(goHub) → 맵 입장(enterMap) 흐름. resetGame = 새 캐릭터 + 목장
input.js           KEY_INTENTS(키 → 의도 한 테이블), 키보드/캔버스/조이스틱 리스너
render/            그리기만 (renderer.js = 프레임 그리기 순서·월드/화면 좌표 구분, monster/heroSprites, arena, ground(바닥 무늬 조각 캐시), fx, hud, minimap, items)
ui/                overlays(타이틀·배너·일시정지), dom(HTML 버튼·동기화), itemView(아이템 표시 규칙 한 곳), menu/(캔버스 메뉴)
entities/          monster(일반 AI) + behaviors(종류별 훅), hero(createHero/updatePlayer), drop(바닥 아이템), actor(team)
systems/           combat, skills, gear, loot, potions, progression, waves, fx(이펙트 생성/갱신)
world/arena.js     지금 맵(currentMap/setMap) 배치(고정 크기 data/maps.js)·벽·안쪽 좌표
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
- 캐릭터(직업): `data/classes.js`(체력·마나·스킬 목록·시작 슬롯·기본 공격·생김새). 시작 화면 카드로 고름(`ui.selectedClass`), `resetGame`의 `applyClass`가 적용. 기본 공격은 `skills.tryBasicAttack`(전사 근접 / 마법사 마력탄).
- 마법사 스킬: 수치 `data/skills.js`의 `SPELLS`, 동작 `systems/sorcSkills.js`, 등록 `systems/skills.js`의 `SKILLS`. 주인공 → 몬스터 원소 피해는 `systems/elementCombat.js`(`damageCowPacket`: 몬스터 저항 `resist`, 화상/중독/둔화). 투사체 `team: 'hero'`면 몬스터를 맞힘.
- 속도 규칙: 기본 공격(전사 근접/마법사 마력탄)은 공격속도(`util.attackSpeedMul`), 그 밖의 스킬은 시전속도(`util.castSpeedMul`, 대기시간만 줄임 - 지속/동작 시간은 그대로). 둘 다 상한 2배.
- 스킬 분류: `data/skills.js`의 `SKILL_META[id].type` = physical(전사) / magic(마법사) / common(모든 캐릭터, `COMMON_SKILLS`). 슬롯은 2개뿐 - 공통 스킬도 Q/R 전환 목록(`skills.learnableSkills`)으로 슬롯1/2에 넣음(사용자 결정: 우클릭 순간이동).
  마법 수치는 `SPELLS`, 그 밖의 새 스킬 수치는 `SKILL_STATS`(대기시간은 `hero.spellCd`). 물리 보조 `systems/physSkills.js`(투지), 공통 `systems/commonSkills.js`(순간이동). 등록은 `systems/skills.js`의 `SKILLS`.
- 스킬 해금 규칙: `systems/progression.js`의 `isSkillUnlocked` 한 곳(= 스킬 레벨 1 이상).
- 레벨업 카드(뱀서식): 레벨업마다 카드 3장 중 하나 - 새 스킬 배우기/스킬 레벨 +1/강화 카드(능력치·원소, 등급 일반/희귀/전설)/채우기 카드.
  강화 카드 합계는 `hero.cardBonus` → 능력치는 `gear.recalcGearStats`가 읽음. (원소 강화 카드는 원소 마스터리로 통일 - 2026-10-09) 동작 `systems/levelCards.js`, 수치 `data/cards.js`, 화면 `ui/cardPick.js`.
  고르는 동안 `game.cardOffer`가 있고 게임이 멈춤. 스킬 레벨 보너스는 `data/skills.js`의 `SKILL_LEVEL_UP` → `util.skillMul/skillBonus`로 각 스킬에서 곱함. 스탯 포인트는 그대로 유지(사용자 결정). 슬롯은 2개 + Q/R 전환 유지.
  마스터리(패시브, Lv1~5): `data/masteries.js` - 원소(마법사: 화염·냉기·번개)·무기 종류별(전사: 검·도끼·메이스·단검·창, 주무기가 그 종류일 때만). 계산은 `util.masteryBonus` 한 곳(원소 피해·화상·둔화·번개 하한 / 무기 피해·공격속도·사거리·기절). 강화 카드보다 30% 드묾.
  새 카드 종류(수습생의 마법 등)는 `rollCards`의 뽑기 풀에 추가.
- 아이템 표시: `ui/itemView.js` 한 곳. 장비는 순수 데이터 + `uid` + 접사 기록(`affixes`) + 능력치 합계(`stats`).
- 아이템 생성(디아식 핵심만, 고유 이름·세트 없음): `systems/itemGen.js`. 접사 = `data/affixes.js`(접두/접미, 그룹 중복 금지, 티어별 접사 레벨·수치·가중치, 부위 제한, 매직 전용 최상위 티어, 하이브리드). 등급별 개수 `AFFIX_RULES`(일반 0 / 매직 1~2 / 레어 3~6 / 레전드 5~6).
  아이템 레벨 = 몬스터 레벨(`util.monsterLevel`: 난이도 `mlvl` + 웨이브/맵 + 엘리트·보스) → 붙을 수 있는 티어. 드랍 테이블 `data/drops.js`(출처 normal/elite/boss/mapBoss별 드랍 종류·등급 비중, `loot.dropSource`). 새 옵션 = `STAT_DEF`(능력치 이름) + affixes 계열 하나 + 적용 코드(recalcGearStats 등).
- 스탯 키 `defense`는 **블락률**(데미지를 통째로 막을 확률)이다. 골든 호환 때문에 키 이름 유지.
- 무기 기본 속성: `data/items.js`의 `WEAPON_BASE`(종류별 피해 min~max, 초당 공격 aps) + 양손 배율. 계산 `systems/gear.js`의 `weaponStats` → `hero.weaponStats {main, off}`, 피해 굴림 `combat.heroHitDamage`. 쌍수는 주/보조 번갈아. 맨손은 `BASE_DAMAGE`/`ATTACK_COOLDOWN`.
- 원소(화염/냉기/번개/독): 수치·색 `data/elements.js`, 규칙 `systems/elements.js`(피해 묶음 `{phys, fire, cold, lightning, poison}` → 물리=방어력, 원소=저항(상한 75%), 화상/중독 지속 피해, 둔화). `hitPlayer`는 숫자(물리) 또는 묶음을 받음. 몬스터 근접 원소는 `data/monsters.js`의 `element`. 1단계(10-06) 주인공이 받는 쪽, 마법사(10-07)로 몬스터 저항·상태 추가. 남은 것: 무기 원소 피해 옵션·주인공 저항 옵션.
- 방어력(피해 감소): 방어구 기본값 `data/items.js`의 `GEAR_BASE_ARMOR`(옵션 아님, ×등급 배율 ×강화), 공식 상수 `data/balance.js`의 `ARMOR_K`/`ARMOR_MAX_REDUCTION`, 계산 `systems/gear.js`의 `gearArmor`/`armorReduction`. 피격 순서: 회피 → 블락 → 방어력 감소(최소 1). 원소 저항(2안)은 나중에 `hitPlayer`에 공격 종류를 붙여 확장.
- 조준: `systems/aim.js` 한 곳(자동 조준·커서 흡착, G 토글) - 시전 직전 facing + 지점 `hero.aimX/aimY`(지점 스킬). 적을 겨누면 안 되는 스킬은 SKILL_META `aim: 'free'`.
- 주인공이 받는 피해 마지막 단계: `elements.heroDamageTaken`(버서커 증가·에너지 쉴드 흡수) - hitPlayer와 지속 피해 둘 다 거침. 주는 피해 배율: `util.berserkMul`.
- 미끼(전사 더미): 몬스터 일반 AI의 추적·근접 대상만 바뀜(`physSkills.decoyFor/hitDecoy`). 종류별 특수 행동은 주인공 그대로.
- 피아 판정(PVP): `systems/combat.js`의 `canHit` + `team`.
- 군중 제어(변이·기절·경직): `systems/cc.js`의 `applyCC(c, kind, time)` 한 곳(변이는 `applyPoly` - 엘리트 절반·반복 감소, 양 배회는 `Monster.sheepWander`, 양으로 죽으면 `c.sheepDead` → onDeath 생략) - 우선순위 `CC_RANK`(변이 > 기절 > 경직), 보스(카우킹·맵 보스) 면역(둔화만 절반), 걸리면 특수 행동이 끊김(behaviors `interrupt` 훅). `c.stunTimer`를 직접 쓰지 말 것.
- 무기 특수기(전사, 던진 무기): `systems/weaponThrows.js`(game.throws, 종류별 이동 함수 `UPDATE`) + 그림 `render/throwFx.js`. 수치 `SKILL_STATS`, 메타 `SKILL_META[id].weapon/offhand/mastery` - 그 마스터리 `SPECIAL_MASTERY_LEVEL`(3) 이상이면 카드에 나옴. 던진 동안 `hero.weaponOut/shieldOut`(기본 공격 못 함, 손에서 안 그림). 출혈은 `elementCombat.bleedCow`. 특수기마다 원소(`SKILL_STATS[id].elem/elemRatio`: 검·대검 화염, 도끼·창 번개, 단검 독, 방패·메이스 냉기). 그 무기를 들었을 때만 카드·Q/R에 보임(`util.specialUsable`, 무기를 바꾸면 `skills.validateSkillSlots`가 슬롯에서 뺌).
- 스킬 기획 정의서 v0.1(2026-10-10) 진행 상황·결정은 `docs/TODO.md` '스킬 기획 정의서' 항목.

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
- 개발자 모드(`config.isDevMode()`: 개발 서버·테스트는 항상, 배포본은 `?dev=1`): ` 키/DEV 버튼 패널(`ui/devPanel.js`, 동작은 `systems/dev.js`, 치트 플래그는 `state.dev`). `L`키 레벨업과 `giveTestStash()`도 개발자 모드에서만.

## 자주 밟는 함정
- 초기화 순서: 모듈 로드 중 아무것도 실행하지 않는다. 부팅·리스너 등록은 `boot()`에서. 주인공 바디는 벽 다음에 생성.
- 그리기에서 `Math.random()`을 쓰는 곳이 있다(화면 흔들림, 번개 빔 지그재그) - 그리기 순서를 바꾸면 게임 난수 순서도 바뀐다. 새 그리기 코드에서는 `Math.random()` 대신 `util.hash01`(결정적)을 쓸 것. 특히 몬스터 그림은 화면 밖이면 안 그려지므로 난수를 쓰면 화면 크기에 따라 게임 결과가 달라진다.
- 키는 `input.keyOf(e)`로 읽는다(글자/숫자는 e.code) - 한글 입력 상태에서도 동작해야 함.
- 캔버스 `textAlign` 등 상태 누수: 그리기 블록마다 `ctx.save()/restore()`.
- 감정 대상은 인덱스가 아니라 객체 참조. 메뉴 클릭 영역은 그릴 때마다 재등록, 입력은 직전 프레임 영역 사용.
- 히트 판정: 근접은 몬스터 중심(발) + `getCowHitRadius`. 투사체·폭발·클릭은 그림 기준 `combat.cowEdgeDist`(몸통 원 = 발에서 위로 40*scale, 반지름 30*scale + 발밑 원) - 소 그림의 몸통은 발보다 위에 그려진다. `hitPlayer` 무적시간이 지속 피해 틱을 제한한다.
- 맵은 화면보다 크다(카메라): 월드 좌표 그림은 renderer의 applyCamera 블록 안, HUD·배너는 밖. 화면 밖 몬스터는 그리지 않으므로 그림 코드가 게임 상태/난수를 건드리면 화면 크기에 따라 결과가 달라진다.
- 맵 구조: 타이틀(직업) → 맵 선택(`ui/mapSelect.js`) → 목장(mode 'wave', 난이도마다 1웨이브부터) / 파밍 맵(mode 'farm', 인스턴스 - 들어갈 때마다 `systems/mapRun.js`가 무리 배치). 둘 다 난이도 `data/difficulty.js` 선택, 면역 무리는 맵에 `immune`이 있을 때만(목장 없음 - 전사가 웨이브에서 막히지 않게) → 죽음/승리/나가기(T 두 번) → 맵 선택. 캐릭터(레벨·장비·가방·카드)는 유지(영구 저장은 서버 이후). 지금 맵의 배율은 `game.run`(목장은 전부 1). 맵 추가 = `data/maps.js` 항목 + `MAP_ORDER`.
- 웨이브 몬스터는 `hunt`(어그로 밖이어도 주인공 쪽으로 이동). 생성 위치 규칙은 `systems/waves.js`, 수치는 `data/balance.js`의 WAVE_*/HUNT_*.
- 몬스터 40마리 이상도 나온다: 몬스터마다 `ctx.filter`나 매 프레임 그라데이션 생성 금지.
- `localStorage`는 항상 try/catch, 저장 키 `cowking_release_meta_v1` 유지.
