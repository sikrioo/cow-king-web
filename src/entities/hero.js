// 주인공: 매 틱 갱신(쿨다운/버프 감소, 이동 관성·스태미나, 스킬 진행 중 잠금 분기)과 모션 반응(흔들림/기울기)
import {
  ATTACK_DURATION, WHIRLWIND_MANA_DRAIN, MOVE_START_ACCEL, MOVE_CRUISE_ACCEL, MOVE_TURN_ACCEL,
  MOVE_REVERSE_ACCEL, MOVE_BRAKE, MOVE_FACING_RESPONSE, WALK_SPEED, RUN_SPEED, MAX_MANA, MANA_REGEN, MAX_STAMINA,
  STAMINA_DRAIN, STAMINA_REGEN, HERO_BASE_HP, MOVE_ARRIVE_RADIUS, CLICK_ATTACK_RANGE_SLACK, HERO_SLOW_MULT, expForLevel
} from '../data/balance.js';
import { clamp01, lerpAngle, moveToward2D } from '../util.js';
import { World, Bodies, Body, world } from '../core/physics.js';
import { game, input } from '../state.js';
import { TEAM_HERO } from './actor.js';
import { emitMoveReaction } from '../systems/fx.js';
import { updateWhirlwind, updateLeap, updateRush, updateGroundSmash } from '../systems/skills.js';
import { unarmedStats } from '../systems/gear.js';
import { emptyResist, emptyDot } from '../systems/elements.js';
import { tryPlayerAttack, getWeaponRange, getCowHitRadius } from '../systems/combat.js';

// 주인공 생성 - 벽 다음에 만들어야 물리 바디 id/월드 순서가 레거시와 같음 (boot()에서 호출)
export function createHero() {
  const hero = {
    body: Bodies.circle(0, 0, 17, { frictionAir: 0.15, friction: 0, restitution: 0.1, label: 'player' }),
    x: 0, y: 0, r: 17,
    facing: 0,
    hp: HERO_BASE_HP, maxHp: HERO_BASE_HP,
    mana: MAX_MANA, maxMana: MAX_MANA,
    stamina: MAX_STAMINA, maxStamina: MAX_STAMINA,
    running: false,
    invuln: 0,
    attackTimer: 0,
    attackCooldown: 0,
    currentAttackDuration: ATTACK_DURATION,
    combo: 0,
    comboTimer: 0,
    knockback: 0,
    flash: 0,
    alive: true,
    warcryCooldown: 0,
    whirlwindTimer: 0,
    whirlwindCooldown: 0,
    whirlAngle: 0,
    leapTimer: 0,
    leapCooldown: 0,
    leapFrom: { x: 0, y: 0 },
    leapTo: { x: 0, y: 0 },
    slowTimer: 0, // 둔화(냉기) 남은 시간
    burn: emptyDot(), // 화상 { dps, timer, tick }
    poison: emptyDot(), // 중독
    resist: emptyResist(), // 원소 저항 (장비에서, 상한 data/elements.RESIST_CAP)
    bonusMaxHp: 0,
    vitalityTimer: 0,
    speedMult: 1,
    speedBuffTimer: 0,
    attackBonus: 0,
    attackBuffTimer: 0,
    defenseChance: 0,
    defenseBuffTimer: 0,
    equipment: { armor: null, weaponMain: null, weaponOff: null, greaves: null, boots: null, accessory1: null, accessory2: null },
    gearAtkSpeed: 0,
    gearAtkPower: 0,
    gearDefense: 0,
    gearEvasion: 0,
    gearArmor: 0,
    armorReduction: 0,
    weaponStats: { main: unarmedStats(), off: null },
    offHandNext: false, // 쌍수: 다음 기본 공격을 보조무기로
    attackCooldownMax: 0,
    gearSpeedMult: 1,
    gearMaxHp: 0,
    gearMaxMana: 0,
    materials: 0,
    inventory: [],
    rushCooldown: 0,
    rushTimer: 0,
    rushFrom: { x: 0, y: 0 },
    rushTo: { x: 0, y: 0 },
    rushHitSet: null,
    smashCooldown: 0,
    smashTimer: 0,
    smashHitDone: false,
    slot1: 'attack',
    slot2: 'warcry',
    potions: { heal: 2, mana: 2 }, // 가방과 별개로 보관하는 생명/마나 물약 (1·2키 / 화면 버튼으로 마심)
    potionCd: { heal: 0, mana: 0 }, // 종류별 대기시간 (생명 마신 직후에도 마나는 바로 마실 수 있게)
    moveOffsetX: 0,
    moveOffsetY: 0,
    moveOffsetVX: 0,
    moveOffsetVY: 0,
    moveLean: 0,
    moveLeanV: 0,
    moveFxCooldown: 0,
    moveReaction: 0,
    renderBreath: 0,
    moveSpeedN: 0,
    moveInputActive: false,
    moveStep: 0,
    level: 1,
    exp: 0,
    expToNext: expForLevel(1),
    statPoints: 0,
    levelStats: { atkPower: 0, defense: 0, evasion: 0, atkSpeed: 0, moveSpeed: 0, health: 0, mana: 0 },
    team: TEAM_HERO
  };
  Body.setInertia(hero.body, Infinity);
  World.add(world, hero.body);
  return hero;
}

// 클릭 공격: 사거리 밖이면 다가갈 방향을 돌려주고, 사거리 안이면 멈춰서 적을 보고 기본 공격
// 버튼을 뗀 상태면 한 번 휘두른 뒤 목표 해제 (자동 공격 없음)
function clickAttackStep() {
  const c = input.attackTarget;
  if (!c || c.state === 'dead' || !game.cows.includes(c)) { input.attackTarget = null; return null; }
  const tx = c.x - game.hero.x, ty = c.y - game.hero.y;
  const d = Math.hypot(tx, ty) || 1;
  const reach = getWeaponRange() + getCowHitRadius(c) - CLICK_ATTACK_RANGE_SLACK;
  if (d > reach) return { x: tx / d, y: ty / d };
  game.hero.facing = Math.atan2(ty, tx);
  if (game.hero.attackCooldown <= 0) {
    tryPlayerAttack();
    if (!input.attackHeld) input.attackTarget = null;
  }
  return null;
}

export function updatePlayer(dt) {
  game.hero.x = game.hero.body.position.x;
  game.hero.y = game.hero.body.position.y;

  if (game.hero.flash > 0) game.hero.flash -= dt;
  if (game.hero.invuln > 0) game.hero.invuln -= dt;
  if (game.hero.attackCooldown > 0) game.hero.attackCooldown -= dt;
  if (game.hero.attackTimer > 0) game.hero.attackTimer -= dt;
  if (game.hero.comboTimer > 0) {
    game.hero.comboTimer -= dt;
    if (game.hero.comboTimer <= 0) game.hero.combo = 0;
  }
  if (game.hero.warcryCooldown > 0) game.hero.warcryCooldown -= dt;
  if (game.hero.whirlwindCooldown > 0) game.hero.whirlwindCooldown -= dt;
  if (game.hero.leapCooldown > 0) game.hero.leapCooldown -= dt;
  if (game.hero.rushCooldown > 0) game.hero.rushCooldown -= dt;
  if (game.hero.smashCooldown > 0) game.hero.smashCooldown -= dt;
  if (game.hero.potionCd.heal > 0) game.hero.potionCd.heal -= dt;
  if (game.hero.potionCd.mana > 0) game.hero.potionCd.mana -= dt;
  if (game.hero.slowTimer > 0) game.hero.slowTimer -= dt;
  if (game.hero.vitalityTimer > 0) {
    game.hero.vitalityTimer -= dt;
    if (game.hero.vitalityTimer <= 0) {
      game.hero.bonusMaxHp = 0;
      game.hero.hp = Math.min(game.hero.hp, game.hero.maxHp + game.hero.gearMaxHp);
    }
  }
  if (game.hero.speedBuffTimer > 0) { game.hero.speedBuffTimer -= dt; if (game.hero.speedBuffTimer <= 0) game.hero.speedMult = 1; }
  if (game.hero.attackBuffTimer > 0) { game.hero.attackBuffTimer -= dt; if (game.hero.attackBuffTimer <= 0) game.hero.attackBonus = 0; }
  if (game.hero.defenseBuffTimer > 0) { game.hero.defenseBuffTimer -= dt; if (game.hero.defenseBuffTimer <= 0) game.hero.defenseChance = 0; }
  if (game.hero.moveFxCooldown > 0) game.hero.moveFxCooldown -= dt;
  if (game.hero.moveReaction > 0) game.hero.moveReaction = Math.max(0, game.hero.moveReaction - dt * 4.2);
  game.hero.renderBreath += dt * (game.hero.moveSpeedN > 0.08 ? 4.0 : 1.35);
  game.hero.mana = Math.min(game.hero.maxMana, game.hero.mana + MANA_REGEN * dt);

  if (!game.hero.alive) {
    Body.setVelocity(game.hero.body, { x: 0, y: 0 });
    updatePlayerMotionReaction(dt, 0, 0);
    return;
  }

  if (game.hero.leapTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateLeap(dt);
    return; // 도약 중엔 일반 조작 불가
  }

  if (game.hero.rushTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateRush(dt);
    return; // 돌진 중엔 일반 조작 불가
  }

  if (game.hero.smashTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateGroundSmash(dt);
    return; // 강타 중엔 이동을 잠깐 잠금
  }

  if (game.hero.whirlwindTimer > 0) {
    game.hero.whirlwindTimer -= dt;
    game.hero.mana -= WHIRLWIND_MANA_DRAIN * dt;
    if (game.hero.mana <= 0) { game.hero.mana = 0; game.hero.whirlwindTimer = 0; }
    else updateWhirlwind(dt);
  }

  if (game.hero.knockback > 0) {
    game.hero.knockback -= dt;
    updatePlayerMotionReaction(dt, 0, 0);
    return; // 넉백 중엔 조작이 물리 속도를 덮어쓰지 않음
  }

  let dx = 0, dy = 0, moving, wantsRun;
  if (input.joystick.active && input.joystick.magnitude > 0.08) {
    input.moveTarget = null; // 조이스틱을 쓰면 클릭 이동/공격 취소
    input.attackTarget = null;
    const len = Math.hypot(input.joystick.dx, input.joystick.dy) || 1;
    dx = input.joystick.dx / len;
    dy = input.joystick.dy / len;
    moving = true;
    wantsRun = input.joystick.magnitude > 0.72; // 조이스틱을 크게 기울이면 달리기
  } else {
    if (input.keys['arrowleft'] || input.keys['a']) dx -= 1;
    if (input.keys['arrowright'] || input.keys['d']) dx += 1;
    if (input.keys['arrowup'] || input.keys['w']) dy -= 1;
    if (input.keys['arrowdown'] || input.keys['s']) dy += 1;
    if (dx || dy) { input.moveTarget = null; input.attackTarget = null; } // 키보드로 움직이면 클릭 이동/공격 취소
    else if (input.attackTarget) {
      const step = clickAttackStep();
      if (step) { dx = step.x; dy = step.y; }
    } else if (input.moveTarget) {
      // 클릭 이동: 목표 쪽으로 (도착하면 멈춤, 끄는 중이면 목표가 계속 갱신됨)
      const tx = input.moveTarget.x - game.hero.x, ty = input.moveTarget.y - game.hero.y;
      const d = Math.hypot(tx, ty);
      if (d <= MOVE_ARRIVE_RADIUS) { if (!input.mouseMoveHeld) input.moveTarget = null; }
      else { dx = tx / d; dy = ty / d; }
    }
    moving = !!(dx || dy);
    wantsRun = !!input.keys['shift'];
  }

  if (moving && wantsRun && game.hero.stamina > 0) {
    game.hero.running = true;
    game.hero.stamina = Math.max(0, game.hero.stamina - STAMINA_DRAIN * dt);
  } else {
    game.hero.running = false;
    game.hero.stamina = Math.min(game.hero.maxStamina, game.hero.stamina + STAMINA_REGEN * dt);
  }

  // -----------------------------------------------------------
  // 관성 이동 (다른 에이전트 버전에서 이식 - 즉시 최고속도 대신 가감속)
  // -----------------------------------------------------------
  if (moving) {
    const inputLen = Math.hypot(dx, dy) || 1;
    dx /= inputLen;
    dy /= inputLen;
  }

  const slowMul = game.hero.slowTimer > 0 ? HERO_SLOW_MULT : 1;
  const speedPxPerSec = (game.hero.running ? RUN_SPEED : WALK_SPEED) *
    slowMul * game.hero.speedMult * game.hero.gearSpeedMult;
  const targetSpeed = moving ? speedPxPerSec / 60 : 0;

  const curVX = game.hero.body.velocity.x;
  const curVY = game.hero.body.velocity.y;
  const curSpeed = Math.hypot(curVX, curVY);

  let nextVX = curVX;
  let nextVY = curVY;
  let align = 1;
  let turnAmount = 0;

  if (moving) {
    const targetVX = dx * targetSpeed;
    const targetVY = dy * targetSpeed;

    if (curSpeed > 0.04) {
      const cvx = curVX / curSpeed;
      const cvy = curVY / curSpeed;
      align = cvx * dx + cvy * dy;
      turnAmount = Math.abs(cvx * dy - cvy * dx);
    }

    let accel;
    if (curSpeed < 0.04) {
      accel = MOVE_START_ACCEL;
    } else if (align < -0.25) {
      accel = MOVE_REVERSE_ACCEL;
    } else if (turnAmount > 0.15) {
      accel = MOVE_TURN_ACCEL + turnAmount * 2.0;
    } else {
      const progress = clamp01(curSpeed / Math.max(targetSpeed, 0.001));
      accel = MOVE_START_ACCEL + (MOVE_CRUISE_ACCEL - MOVE_START_ACCEL) * Math.pow(progress, 0.7);
    }

    if (game.hero.running) accel *= 0.94;

    const moved = moveToward2D(curVX, curVY, targetVX, targetVY, accel * dt);
    nextVX = moved.x;
    nextVY = moved.y;

    const nextSpeed = Math.hypot(nextVX, nextVY);
    if (nextSpeed > 0.05) {
      const targetFacing = Math.atan2(nextVY, nextVX);
      game.hero.facing = lerpAngle(game.hero.facing, targetFacing, 1 - Math.exp(-MOVE_FACING_RESPONSE * dt));
    }

    if (curSpeed > RUN_SPEED / 60 * 0.42 && (align < 0.35 || turnAmount > 0.72)) {
      const d = curSpeed > 0.001 ? { x: curVX / curSpeed, y: curVY / curSpeed } : { x: dx, y: dy };
      emitMoveReaction(d.x, d.y, align < -0.15 ? 1.0 : 0.72);
    }
  } else {
    const released = game.hero.moveInputActive;
    const moved = moveToward2D(curVX, curVY, 0, 0, MOVE_BRAKE * dt);
    nextVX = moved.x;
    nextVY = moved.y;

    if (released && curSpeed > WALK_SPEED / 60 * 0.55) {
      const d = { x: curVX / curSpeed, y: curVY / curSpeed };
      emitMoveReaction(d.x, d.y, Math.min(1, curSpeed / (RUN_SPEED / 60)));
    }
  }

  // 물리 엔진이 매 틱 공기 저항(frictionAir)만큼 속도를 깎으므로 미리 나눠서 넣음 → 엔진을 거친 뒤 의도한 속도(nextV)가 됨
  // (예전엔 이 보정이 없어서 가속과 저항이 맞서는 지점(설정 속도의 약 1/4)에서 멈췄고 달리기도 빨라지지 않았음)
  const keep = 1 - game.hero.body.frictionAir;
  Body.setVelocity(game.hero.body, { x: nextVX / keep, y: nextVY / keep });

  const accelX = (nextVX - curVX) / Math.max(dt, 0.0001);
  const accelY = (nextVY - curVY) / Math.max(dt, 0.0001);
  updatePlayerMotionReaction(dt, accelX, accelY);

  const effectiveMax = Math.max((game.hero.running ? RUN_SPEED : WALK_SPEED) / 60, 0.001);
  const visualSpeed = Math.hypot(nextVX, nextVY);
  game.hero.moveSpeedN += (clamp01(visualSpeed / effectiveMax) - game.hero.moveSpeedN) * (1 - Math.exp(-8 * dt));
  game.hero.moveStep += visualSpeed * dt * 16;

  game.hero.moveInputActive = moving;
}

export function updatePlayerMotionReaction(dt, accelX, accelY) {
  const force = 28;
  const spring = 105;
  const damping = 17;

  game.hero.moveOffsetVX += (-accelX * force - game.hero.moveOffsetX * spring - game.hero.moveOffsetVX * damping) * dt;
  game.hero.moveOffsetVY += (-accelY * force - game.hero.moveOffsetY * spring - game.hero.moveOffsetVY * damping) * dt;
  game.hero.moveOffsetX += game.hero.moveOffsetVX * dt;
  game.hero.moveOffsetY += game.hero.moveOffsetVY * dt;

  const offsetLen = Math.hypot(game.hero.moveOffsetX, game.hero.moveOffsetY);
  if (offsetLen > 7) {
    game.hero.moveOffsetX = game.hero.moveOffsetX / offsetLen * 7;
    game.hero.moveOffsetY = game.hero.moveOffsetY / offsetLen * 7;
  }

  const fx = Math.cos(game.hero.facing);
  const fy = Math.sin(game.hero.facing);
  const lateralAccel = fx * accelY - fy * accelX;
  const leanTarget = Math.max(-0.16, Math.min(0.16, -lateralAccel * 0.012));

  const leanSpring = 95;
  const leanDamping = 16;
  game.hero.moveLeanV += ((leanTarget - game.hero.moveLean) * leanSpring - game.hero.moveLeanV * leanDamping) * dt;
  game.hero.moveLean += game.hero.moveLeanV * dt;
}
