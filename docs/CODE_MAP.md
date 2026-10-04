# CODE_MAP — 레거시 단일 파일 지도

대상: `legacy/cow_pen.html` (약 4,270줄, 인라인 `<script>`는 120번째 줄부터). 
**줄 번호는 참고용(길 찾기)이고, 기준은 함수/상수 이름이다.** `grep -n "function 이름"`으로 찾을 것.

## 영역별 위치 (파일 위에서 아래 순서)

| 영역 | 이름들 | 최종 목적지 |
|---|---|---|
| HTML/CSS (1~119줄) | `#hint`, `#joystick-base`, `#potion-buttons`, `#action-buttons`(.skill-slot), `#btn-pause/#btn-full/#btn-inv`, `body.title-mode` 규칙 | `index.html`, `src/styles.css` |
| 부트/물리 | `canvas`, `ctx`, `engine`, `world`, `PEN`, `wallBodies`, `setupWalls`, `resize`, `PALETTE` | `core/context.js`, `core/physics.js`, `world/arena.js` |
| 스프라이트(몬스터) | `drawCow`, `drawStunDots`, `drawHorn`, `drawHalberd` | `render/sprites.js` |
| 아레나/수학 | `drawPen`, `randomPointInPen`, `clampToPen`, `getHitPoint`, `moveToward2D`, `clamp01`, `lerpAngle`, `easeOutCubic`, `distToSegment`, `getCowHitRadius`, `getAuraSpeedMult` | `render/arena.js`, `util.js`, (`getAuraSpeedMult`는 behaviors) |
| 이펙트 상태·로직 | `particles`, `shake`, `hitstop`, `impactFlash`, `spawnHitParticles`, `updateParticles`, `drawParticles`, `applyKnockback`, `hazards`/`spawnFireHazard`/`updateHazards`/`drawHazards`, `lightningBolts`/`spawnLightningBolt`/…, `shockwaves`/`spawnShockwave`/…, `floatTexts`/`floatText`/`spawnDamageNumber`/… , `hexToRgba` | 상태→`state.js`, 그리기→`render/fx.js`, 생성 함수→`systems`/`fx` |
| 저장/타이틀/일시정지 | `RELEASE_VERSION`, `SAVE_KEY`, `releaseMeta`, `saveReleaseMeta`, `recordRun`, `paused`, `setPaused`, `toggleFullscreen`, `titleCows`, `initTitleScene`, `updateTitleScene`, `drawTitleScene`, `drawTitleOverlay`, `drawStartCountdown`, `drawWavePresentation`, `drawDemoTip`, `drawPauseOverlay` | `save.js`, `game.js`, `ui/overlays.js` |
| 전투/스킬 상수 | `ATTACK_*`, `WEAPON_RANGE`, `ATTACK_ARC*`, `WARCRY_*`, `WHIRLWIND_*`, `LEAP_*`, `RUSH_*`, `SMASH_*`, `MOVE_*`, `WALK_SPEED`, `RUN_SPEED`, `MAX_MANA`…, `BOSS_*`, `CHARGE_*`, `EXPLODER_*`, `ZAP_*`, `AURA_*`, `COMBO_*` | `data/balance.js` |
| 몬스터 데이터 | `KIND_STYLE`, `FLASH_COLORS`, `KILL_EXP`, (Cow 생성자 안의 종류별 hp/속도/데미지), `pickCowKind` 안의 엘리트 풀 | `data/monsters.js` |
| 아이템 데이터 | `ITEM_STYLE`, `GEAR_SLOTS`, `GEAR_SLOT_LABEL`, `GEAR_CATEGORY_LABEL`, `GEAR_VARIANT_LABEL`, `WEAPON_VARIANTS`, `ACCESSORY_VARIANTS`, `STAT_DEF`, `RARITY_DEF`, `POTION_*`, `GEAR_DROP_CHANCE`, `MATERIAL_DROP_CHANCE`, `UPGRADE_SUCCESS_CHANCE`, `IDENTIFY_DURATION`, `INVENTORY_SIZE` | `data/items.js`, `data/balance.js` |
| 성장 | `MAX_LEVEL`, `POINTS_PER_LEVEL`, `expForLevel`, `LEVEL_STAT_PER_POINT`, `LEVEL_STAT_KEYS`, `gainExp`, `trySpendStatPoint` | `data/balance.js`, `systems/progression.js` |
| 감정 | `identifyingItem`, `identifyTimer`, `tryIdentify`, `updateIdentify`, `revealIdentifiedGear` | `systems/gear.js` (+ 연출 호출은 ui) |
| 플레이어 | `player`(객체 리터럴), `updatePlayer`(이동 관성·스태미나·쿨다운 감소·잠금 상태 분기) | `entities/hero.js` |
| 입력 | `keys`, keydown/keyup 리스너(익명), canvas `contextmenu/pointerdown/pointermove/pointerleave`, window `pointerup`, `joystick`/`joyMove`/`joyEnd`, `bindHoldSlot`, `bindCycle`, `pressAction`, 물약/일시정지/전체화면/장비 버튼 바인딩 | `input.js`, `ui/dom.js` |
| 전투 규칙 | `registerComboHit`, `tryPlayerAttack`, `damageCow`, `killCow`, `hitPlayer`, `bossSlam`, `spawnColdNova`, `skillDamageCow` | `systems/combat.js` |
| 스킬 | `tryWarCry/warCryHitCow`, `tryWhirlwind/updateWhirlwind/whirlwindHit`, `tryLeap/updateLeap/leapLand/leapHitCow`, `tryRush/updateRush`, `tryGroundSmash/updateGroundSmash`, `SKILL_ORDER`, `SKILLS`, `SKILL_UNLOCK_LEVEL`, `isSkillUnlocked`, `cycleSkillSlot`, `updateSkillSlots`, `holdSlot1/2` | `data/skills.js`(메타) + `systems/skills.js`(동작) |
| 아이템/드랍 | `class Item`, `items`, `dropLoot`, `rollRarity`, `rollGearItem`, `equipItem`, `giveStarterGear`, `giveTestStash`, `equipFromInventory`, `tryUpgradeSlot`, `recalcGearStats`, `updateItems`(줍기), `rollConsumableType`, `tryDrinkPotion`, `applyItem`, `groundLabelForGear`, `drawItems`, `gearDisplayName` | `systems/loot.js`, `systems/gear.js`, `systems/potions.js`, `entities/drop.js`, `render/items.js` |
| 주인공 렌더링 | `drawPlayer`, `getAbstractHeroPose`, `drawAbstractScarf`, `drawFloatingHandAndBlade`, `drawAbstractHeroBody`, `drawAbstractSword`, `drawHeldShield`, `drawAbstractSlashTrail`, `updatePlayerMotionReaction`, `emitMoveReaction` | `render/sprites.js`(그리기), `entities/hero.js`(모션 반응) |
| 몬스터 | `class Cow` — 생성자, `setState`, `update`(보스 슬램/버닝 불바닥/주술사 치유/번개 충전/자폭 점화/돌진 상태머신 → 스턴·넉백 → 일반 추격·근접), `draw` | `entities/monster.js` + `entities/behaviors.js` + `render/sprites.js` |
| HUD | `drawStatReadout`, `drawHUD`, `drawResourceOrb`, `drawStaminaBar`, `overlay`, `drawBuffIcons`, `drawComboCounter`, `drawSkillIcon`(미사용이면 삭제) | `render/hud.js` |
| 게임 흐름 | `cows`, `kills`, `gameState`, `wave`, `waveTransition`, `WAVE_GAP`, `waveBannerTimer`, `demoTipTimer`, `pickCowKind`, `startNextWave`, `resetGame` | `state.js`, `game.js`, `systems/waves.js` |
| 루프 | `STEP_MS`, `accumulator`, `lastTime`, `fixedUpdate`, `render`, `loop`, 맨 끝의 `resetGame(); gameState='title'; ...` | `core/loop.js`, `render/renderer.js`, `main.js` |
| 캐릭터 메뉴(캔버스) | `showInventory`, `setInventoryOpen`, `invPanelTab`, `selectedInvIndex`, `hoverInvIndex`, `invSlotRects`, `invTabRects`, `invButtons`, `invToast`, `invReveal`, `INV_TABS`, `drawInventoryPanel`, `drawEquipTab`, `drawStatsTab`, `drawBagTab`, `drawBagDetail`, `drawUpgradeTab`, `fitText`, `wrapStatLines`, `getCompareItemForGear`, `getInvViewIndex`, `showInvToast`, `invPanelHandlePoint`, `pointInRect` | `ui/menu.js`(→ 커지면 `ui/menu/` 폴더) |
| DOM 동기화 | `potCd/potCnt/potEl`, `updatePotionButtonsUI`, `cdSlot1/2`, `updateSkillButtonsUI` | `ui/dom.js` |

## `Cow.update`의 처리 순서 (바꾸면 안 되는 의미)

1. 사망 상태면 `deadTimer`만 감소하고 종료
2. 위치 동기화
3. 종류별 특수 처리 (이 안에서 `return`하면 아래 일반 AI는 이번 틱에 실행 안 됨):
   보스 슬램 타이머 → 버닝(불바닥) → 주술사(치유) → 번개(충전/발사) → 자폭(점화/폭발) → 돌진(telegraph/charging/recover)
4. 스턴 / 넉백 처리
5. 일반 AI: (번개: 사거리 밖이면 접근) → (주술사·번개: 가까우면 후퇴) → 추격 → 근접 공격(`attackHit` 타이밍 0.12~0.22초) → 대기/배회

**상태를 점유하는 상태머신(`fusing`, `zapping`, `telegraph`…)은 매 틱 `return`해야 한다.** 그렇지 않으면 일반 AI가 상태를 덮어쓴다 (실제로 겪은 버그).

## `fixedUpdate` 분기 순서

`title` → `showInventory`(월드 정지, 감정 진행만 계속) → `paused` → `hitstop` → `playing`(플레이어, 스킬 슬롯, 몬스터, 웨이브 진행, 아이템, 물리 스텝) → 공통(파티클/충격파/불바닥/번개/타이머 감소)
