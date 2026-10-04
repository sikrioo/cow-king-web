// 주인공: 매 틱 갱신(쿨다운/버프 감소, 이동 관성·스태미나, 스킬 진행 중 잠금 분기)과 모션 반응(흔들림/기울기)
import {
  WHIRLWIND_MANA_DRAIN, MOVE_START_ACCEL, MOVE_CRUISE_ACCEL, MOVE_TURN_ACCEL, MOVE_REVERSE_ACCEL, MOVE_BRAKE,
  MOVE_FACING_RESPONSE, WALK_SPEED, RUN_SPEED, MANA_REGEN, STAMINA_DRAIN, STAMINA_REGEN
} from '../data/balance.js';
import { clamp01, lerpAngle, moveToward2D } from '../util.js';
import { Body } from '../core/physics.js';
import { input, player } from '../state.js';
import { emitMoveReaction } from '../systems/fx.js';
import { updateWhirlwind, updateLeap, updateRush, updateGroundSmash } from '../systems/skills.js';

export function updatePlayer(dt) {
  player.x = player.body.position.x;
  player.y = player.body.position.y;

  if (player.flash > 0) player.flash -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackTimer > 0) player.attackTimer -= dt;
  if (player.comboTimer > 0) {
    player.comboTimer -= dt;
    if (player.comboTimer <= 0) player.combo = 0;
  }
  if (player.warcryCooldown > 0) player.warcryCooldown -= dt;
  if (player.whirlwindCooldown > 0) player.whirlwindCooldown -= dt;
  if (player.leapCooldown > 0) player.leapCooldown -= dt;
  if (player.rushCooldown > 0) player.rushCooldown -= dt;
  if (player.smashCooldown > 0) player.smashCooldown -= dt;
  if (player.potionCd.heal > 0) player.potionCd.heal -= dt;
  if (player.potionCd.mana > 0) player.potionCd.mana -= dt;
  if (player.slowTimer > 0) player.slowTimer -= dt;
  if (player.vitalityTimer > 0) {
    player.vitalityTimer -= dt;
    if (player.vitalityTimer <= 0) {
      player.bonusMaxHp = 0;
      player.hp = Math.min(player.hp, player.maxHp + player.gearMaxHp);
    }
  }
  if (player.speedBuffTimer > 0) { player.speedBuffTimer -= dt; if (player.speedBuffTimer <= 0) player.speedMult = 1; }
  if (player.attackBuffTimer > 0) { player.attackBuffTimer -= dt; if (player.attackBuffTimer <= 0) player.attackBonus = 0; }
  if (player.defenseBuffTimer > 0) { player.defenseBuffTimer -= dt; if (player.defenseBuffTimer <= 0) player.defenseChance = 0; }
  if (player.moveFxCooldown > 0) player.moveFxCooldown -= dt;
  if (player.moveReaction > 0) player.moveReaction = Math.max(0, player.moveReaction - dt * 4.2);
  player.renderBreath += dt * (player.moveSpeedN > 0.08 ? 4.0 : 1.35);
  player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN * dt);

  if (!player.alive) {
    Body.setVelocity(player.body, { x: 0, y: 0 });
    updatePlayerMotionReaction(dt, 0, 0);
    return;
  }

  if (player.leapTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateLeap(dt);
    return; // 도약 중엔 일반 조작 불가
  }

  if (player.rushTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateRush(dt);
    return; // 돌진 중엔 일반 조작 불가
  }

  if (player.smashTimer > 0) {
    updatePlayerMotionReaction(dt, 0, 0);
    updateGroundSmash(dt);
    return; // 강타 중엔 이동을 잠깐 잠금
  }

  if (player.whirlwindTimer > 0) {
    player.whirlwindTimer -= dt;
    player.mana -= WHIRLWIND_MANA_DRAIN * dt;
    if (player.mana <= 0) { player.mana = 0; player.whirlwindTimer = 0; }
    else updateWhirlwind(dt);
  }

  if (player.knockback > 0) {
    player.knockback -= dt;
    updatePlayerMotionReaction(dt, 0, 0);
    return; // 넉백 중엔 조작이 물리 속도를 덮어쓰지 않음
  }

  let dx = 0, dy = 0, moving, wantsRun;
  if (input.joystick.active && input.joystick.magnitude > 0.08) {
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
    moving = !!(dx || dy);
    wantsRun = !!input.keys['shift'];
  }

  if (moving && wantsRun && player.stamina > 0) {
    player.running = true;
    player.stamina = Math.max(0, player.stamina - STAMINA_DRAIN * dt);
  } else {
    player.running = false;
    player.stamina = Math.min(player.maxStamina, player.stamina + STAMINA_REGEN * dt);
  }

  // -----------------------------------------------------------
  // 관성 이동 (다른 에이전트 버전에서 이식 - 즉시 최고속도 대신 가감속)
  // -----------------------------------------------------------
  if (moving) {
    const inputLen = Math.hypot(dx, dy) || 1;
    dx /= inputLen;
    dy /= inputLen;
  }

  const slowMul = player.slowTimer > 0 ? 0.55 : 1;
  const speedPxPerSec = (player.running ? RUN_SPEED : WALK_SPEED) *
    slowMul * player.speedMult * player.gearSpeedMult;
  const targetSpeed = moving ? speedPxPerSec / 60 : 0;

  const curVX = player.body.velocity.x;
  const curVY = player.body.velocity.y;
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

    if (player.running) accel *= 0.94;

    const moved = moveToward2D(curVX, curVY, targetVX, targetVY, accel * dt);
    nextVX = moved.x;
    nextVY = moved.y;

    const nextSpeed = Math.hypot(nextVX, nextVY);
    if (nextSpeed > 0.05) {
      const targetFacing = Math.atan2(nextVY, nextVX);
      player.facing = lerpAngle(player.facing, targetFacing, 1 - Math.exp(-MOVE_FACING_RESPONSE * dt));
    }

    if (curSpeed > RUN_SPEED / 60 * 0.42 && (align < 0.35 || turnAmount > 0.72)) {
      const d = curSpeed > 0.001 ? { x: curVX / curSpeed, y: curVY / curSpeed } : { x: dx, y: dy };
      emitMoveReaction(d.x, d.y, align < -0.15 ? 1.0 : 0.72);
    }
  } else {
    const released = player.moveInputActive;
    const moved = moveToward2D(curVX, curVY, 0, 0, MOVE_BRAKE * dt);
    nextVX = moved.x;
    nextVY = moved.y;

    if (released && curSpeed > WALK_SPEED / 60 * 0.55) {
      const d = { x: curVX / curSpeed, y: curVY / curSpeed };
      emitMoveReaction(d.x, d.y, Math.min(1, curSpeed / (RUN_SPEED / 60)));
    }
  }

  Body.setVelocity(player.body, { x: nextVX, y: nextVY });

  const accelX = (nextVX - curVX) / Math.max(dt, 0.0001);
  const accelY = (nextVY - curVY) / Math.max(dt, 0.0001);
  updatePlayerMotionReaction(dt, accelX, accelY);

  const effectiveMax = Math.max((player.running ? RUN_SPEED : WALK_SPEED) / 60, 0.001);
  const visualSpeed = Math.hypot(nextVX, nextVY);
  player.moveSpeedN += (clamp01(visualSpeed / effectiveMax) - player.moveSpeedN) * (1 - Math.exp(-8 * dt));
  player.moveStep += visualSpeed * dt * 16;

  player.moveInputActive = moving;
}

export function updatePlayerMotionReaction(dt, accelX, accelY) {
  const force = 28;
  const spring = 105;
  const damping = 17;

  player.moveOffsetVX += (-accelX * force - player.moveOffsetX * spring - player.moveOffsetVX * damping) * dt;
  player.moveOffsetVY += (-accelY * force - player.moveOffsetY * spring - player.moveOffsetVY * damping) * dt;
  player.moveOffsetX += player.moveOffsetVX * dt;
  player.moveOffsetY += player.moveOffsetVY * dt;

  const offsetLen = Math.hypot(player.moveOffsetX, player.moveOffsetY);
  if (offsetLen > 7) {
    player.moveOffsetX = player.moveOffsetX / offsetLen * 7;
    player.moveOffsetY = player.moveOffsetY / offsetLen * 7;
  }

  const fx = Math.cos(player.facing);
  const fy = Math.sin(player.facing);
  const lateralAccel = fx * accelY - fy * accelX;
  const leanTarget = Math.max(-0.16, Math.min(0.16, -lateralAccel * 0.012));

  const leanSpring = 95;
  const leanDamping = 16;
  player.moveLeanV += ((leanTarget - player.moveLean) * leanSpring - player.moveLeanV * leanDamping) * dt;
  player.moveLean += player.moveLeanV * dt;
}
