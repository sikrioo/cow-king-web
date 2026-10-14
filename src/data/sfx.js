// 효과음 (2026-10-14 사용자: 사운드 1단계 - 효과음, 오픈소스). 엔진 audio/sfx.js, 파일 public/sfx/이름.mp3 (출처·라이선스 docs/ASSETS.md, 변환 tools/sfx-import.mjs)
//   소리 하나 = { files: [파일 이름…](하나를 고름) 또는 synth: ZzFX 숫자(audio/zzfx.js 순서), vol 음량, gap 같은 소리 최소 간격(초), pitch 높낮이 흔들기(±비율), rate 재생 속도 }
//   파일 묶음에 없는 소리(휘두르기 바람, 마법 지직·냉기·신성, 레벨업 등)는 합성
export const SFX_DIR = './sfx/';
export const SFX_MIX = { volume: 0.7, maxVoices: 14, gap: 0.03, pitch: 0.06, offscreen: 0.35 };

export const SFX = {
  // ── 화면·아이템
  uiClick:     { files: ['ui_click_1', 'ui_click_2', 'ui_click_3'], vol: 0.45, gap: 0.05 },
  uiOpen:      { files: ['ui_open'], vol: 0.45 },
  uiClose:     { files: ['ui_close'], vol: 0.45 },
  uiError:     { files: ['ui_error'], vol: 0.35, gap: 0.3 },
  cardShow:    { files: ['card_show'], vol: 0.6 },
  cardPick:    { files: ['card_pick'], vol: 0.7 },
  levelUp:     { synth: [1, , 392, 0.02, 0.18, 0.35, 0, 1.6, , , 392, 0.07, 0.08, , , , , 0.8, 0.04], vol: 0.8, pitch: 0 },
  identify:    { files: ['identify'], vol: 0.7 },
  mapEnter:    { files: ['map_enter'], vol: 0.6 },
  dropNormal:  { files: ['drop_normal'], vol: 0.45, gap: 0.06 },
  dropMagic:   { files: ['drop_gem_1', 'drop_gem_2'], vol: 0.6, gap: 0.06 },
  dropLegend:  { files: ['bell_1', 'bell_2'], vol: 0.8, gap: 0.2 },
  pickupGear:  { files: ['pickup_gear'], vol: 0.6 },
  pickupMisc:  { files: ['pickup_misc', 'pickup_coin'], vol: 0.55 },
  potion:      { files: ['potion'], vol: 0.7 },
  upgradeOk:   { files: ['upgrade_ok'], vol: 0.7 },
  upgradeFail: { files: ['upgrade_fail'], vol: 0.6 },
  // ── 전사 전투
  swingLight:  { synth: [0.6, , 300, 0.01, 0.02, 0.08, 4, 1.4, -8, , , , , 1.6], vol: 0.5, gap: 0.05 },
  swingHeavy:  { synth: [0.8, , 180, 0.02, 0.04, 0.14, 4, 1.6, -5, , , , , 1.8], vol: 0.7, gap: 0.08 },
  miss:        { synth: [0.3, , 600, 0.01, 0.01, 0.06, 4, 1, -12, , , , , 2], vol: 0.35, gap: 0.08 },
  hitFlesh:    { files: ['hit_flesh_1', 'hit_flesh_2', 'hit_flesh_3'], vol: 0.55, gap: 0.035 },
  hitHeavy:    { files: ['hit_heavy_1', 'hit_heavy_2'], vol: 0.7, gap: 0.05 },
  hitBone:     { files: ['hit_bone_1', 'hit_bone_2'], vol: 0.6, gap: 0.035 },
  crush:       { files: ['crush'], vol: 0.8, gap: 0.1 },
  // ── 주인공 피격
  block:       { files: ['block_1', 'block_2'], vol: 0.6, gap: 0.08 },
  dodge:       { synth: [0.35, , 700, 0.01, 0.01, 0.07, 4, 1, -14, , , , , 2], vol: 0.35, gap: 0.1 },
  heroHurt:    { files: ['hero_hurt_1', 'hero_hurt_2'], vol: 0.7, gap: 0.12 },
  heroDeath:   { synth: [1, , 150, 0.05, 0.3, 0.8, 2, 2, -3, , , , , 0.3], vol: 0.9, pitch: 0 },
  // ── 몬스터 죽음
  cowDie:      { files: ['creature_hurt_1', 'creature_hurt_2', 'creature_die'], vol: 0.45, gap: 0.06 },
  boneBreak:   { files: ['bone_break'], vol: 0.55, gap: 0.06 },
  soulVanish:  { synth: [0.4, , 900, 0.02, 0.1, 0.4, 0, 1, -15, , , , , , , , 0.2, 0.5], vol: 0.5, gap: 0.08 },
  ratSqueak:   { synth: [0.4, , 1600, , 0.03, 0.05, 1, 1, 40], vol: 0.35, gap: 0.05 },
  snakeHiss:   { synth: [0.4, , 4000, 0.02, 0.2, 0.1, 4, 1, , , , , , 3], vol: 0.4, gap: 0.1 },
  // ── 마법·스킬
  bolt:        { synth: [0.5, , 700, 0.01, 0.04, 0.12, 0, 1.5, -20, , , , , , 4], vol: 0.4, gap: 0.05 },
  fireCast:    { files: ['fire_1', 'fire_2', 'fire_3'], vol: 0.55, gap: 0.08 },
  fireBoom:    { files: ['fire_boom'], vol: 0.7, gap: 0.08 },
  spellCast:   { files: ['spell_1', 'spell_2'], vol: 0.55, gap: 0.08 },
  meteor:      { files: ['stones_1', 'stones_2'], vol: 0.9, gap: 0.1 },
  frost:       { synth: [0.6, , 1400, 0.01, 0.1, 0.3, 1, 2, -6, , , , , 0.2, , , 0.1], vol: 0.55, gap: 0.08 },
  zap:         { synth: [0.7, , 1000, , 0.05, 0.15, 3, 1, , , , , 0.02, 1.5, 20, 0.1], vol: 0.5, gap: 0.06 },
  holy:        { synth: [0.7, , 880, 0.02, 0.15, 0.5, 0, 1, , , 440, 0.08, , , , , 0.1, 0.6], vol: 0.6, gap: 0.1 },
  holyStrike:  { files: ['bell_1'], vol: 0.7, gap: 0.1 },
  teleport:    { synth: [0.6, , 300, 0.02, 0.12, 0.2, 0, 1, 40, , , , , , , , , 0.5], vol: 0.6 },
  warcry:      { synth: [1, , 110, 0.02, 0.2, 0.3, 2, 2, -2, , , , , 0.5, 5], vol: 0.9 },
  whirl:       { synth: [0.5, , 250, 0.05, 0.2, 0.2, 4, 1, , , , , 0.1, 1.5], vol: 0.5, gap: 0.3 },
  dash:        { synth: [0.5, , 200, 0.01, 0.05, 0.15, 4, 1, 10, , , , , 1.2], vol: 0.6 },
  leapLand:    { files: ['hit_heavy_1'], vol: 0.8 },
  // ── 몬스터
  telegraph:   { synth: [0.4, , 200, 0.05, 0.25, 0.1, 2, 1, 8], vol: 0.45, gap: 0.2 },
  arrow:       { synth: [0.5, , 500, , 0.02, 0.12, 2, 1.5, -30], vol: 0.4, gap: 0.06 },
  boneShot:    { files: ['hit_bone_2'], vol: 0.5, gap: 0.06, rate: 1.4 },
  monsterSpell:{ files: ['spell_1'], vol: 0.4, gap: 0.1 },
  prison:      { files: ['chain', 'stones_1'], vol: 0.8, gap: 0.2 },
  roar:        { files: ['roar_1', 'roar_2', 'roar_3'], vol: 0.8, gap: 0.5 },
  summon:      { files: ['monster_1', 'monster_2'], vol: 0.6, gap: 0.5 },
  bossSlam:    { files: ['crush'], vol: 1, gap: 0.2, rate: 0.8 }
};

// 슬롯 스킬을 썼을 때 (systems/skills.js trySlot - 대기시간이 새로 걸리면). 기본 공격(전사 휘두르기·마력탄)은 그 함수에서
export const SKILL_SFX = {
  warcry: 'warcry', whirlwind: 'whirl', leap: 'swingHeavy', rush: 'dash', smash: 'swingHeavy', fortify: 'spellCast', flurry: 'swingLight',
  concuss: 'swingHeavy', berserk: 'warcry', decoy: 'spellCast', holyhammer: 'holy', heavenbolt: 'holy',
  spinblade: 'swingHeavy', skyfall: 'swingHeavy', whirlaxe: 'swingHeavy', shieldbounce: 'swingHeavy', rollmace: 'swingHeavy', piercespear: 'swingHeavy', vitalthrow: 'swingLight',
  fireball: 'fireCast', frostnova: 'frost', chain: 'zap', orb: 'frost', energyshield: 'spellCast', blizzard: 'frost', firewave: 'fireCast',
  flamepillar: 'fireCast', discharge: 'zap', balllightning: 'zap', polymorph: 'spellCast', meteor: 'spellCast', thunderstrike: 'zap',
  frostfield: 'frost', firetotem: 'fireCast', teleport: 'teleport', apprentice: 'spellCast'
};
