// 몬스터 공통: 물리 바디 + 일반 AI(스턴/넉백 → 추격·근접 공격 → 대기/배회)
// 종류별 수치는 data/monsters.js, 특수 행동은 entities/behaviors.js 훅 (this.behavior)
import { MONSTERS } from '../data/monsters.js';
import { World, Bodies, Body, world } from '../core/physics.js';
import { game } from '../state.js';
import { TEAM_MONSTER } from './actor.js';
import { getAuraSpeedMult, behaviors } from './behaviors.js';
import { hitPlayer } from '../systems/combat.js';
import { randomPointInPen } from '../world/arena.js';

export class Monster {
  constructor(scale, kind = 'normal') {
    this.kind = kind;

    // 종류별 수치는 data/monsters.js (모르는 종류는 normal 수치)
    const def = MONSTERS[kind] || MONSTERS.normal;
    const { hp, speedMul, aggroMul, scaleMul } = def;

    this.scale = scale * scaleMul;
    const p = randomPointInPen();
    const r = 22 * this.scale + 6;
    this.r = r;
    this.body = Bodies.circle(p.x, p.y, r, { frictionAir: 0.25, friction: 0, restitution: 0.1, label: 'cow' });
    Body.setInertia(this.body, Infinity);
    World.add(world, this.body);

    this.x = p.x; this.y = p.y;
    this.target = randomPointInPen();
    this.state = 'idle';
    this.timer = 0.5 + Math.random() * 1.5;
    this.stateElapsed = 0;
    this.facing = 1;
    this.phase = Math.random() * 10;
    this.speed = (34 + Math.random() * 18) * speedMul;
    this.hp = hp;
    this.maxHp = hp;
    this.deadTimer = 0;
    this.deadPos = null;
    this.attackHit = false;
    this.attackingPlayer = false;
    this.flash = 0;
    this.knockback = 0;
    this.stunTimer = 0;
    this.aggroRange = 150 * aggroMul;
    this.meleeRange = 46 * this.scale + 16;
    // 종류별 특수 타이머 - 기본은 사용 안 함(Infinity), 해당 종류는 behaviors[kind].init에서 설정
    this.specialTimer = Infinity;
    this.chargeCooldownTimer = Infinity;
    this.chargeDir = { x: 1, y: 0 };
    this.chargeTarget = { x: 0, y: 0 };
    this.chargeStart = { x: 0, y: 0 };
    this.chargeHitDone = false;
    this.fireDropTimer = Infinity;
    this.fuseTimer = Infinity; // exploder 전용 - 점화되면 카운트다운 시작
    this.healCooldown = Infinity;
    this.zapCooldown = Infinity;
    this.zapTargetX = 0;
    this.zapTargetY = 0;
    this.dmg = def.dmg;
    this.whirlHitCd = 0;
    this.team = TEAM_MONSTER;
    this.behavior = behaviors[kind] || null;
    if (this.behavior && this.behavior.init) this.behavior.init(this);
  }

  setState(state, duration) {
    this.state = state;
    this.timer = duration;
    this.stateElapsed = 0;
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;

    if (this.state === 'dead') {
      this.deadTimer -= dt;
      return;
    }

    this.x = this.body.position.x;
    this.y = this.body.position.y;

    // 종류별 특수 처리 (보스 슬램/불바닥/치유/번개/자폭/돌진). true면 상태 점유 중 → 아래 일반 AI는 이번 틱에 실행 안 함
    const b = this.behavior;
    if (b && b.update && b.update(this, dt)) return;

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.state = 'stunned';
      this.stateElapsed += dt;
      if (this.knockback > 0) this.knockback -= dt;
      else Body.setVelocity(this.body, { x: 0, y: 0 });
      return; // 기절 중엔 배회/추격/공격 불가
    }

    if (this.knockback > 0) {
      this.knockback -= dt;
      this.stateElapsed += dt;
      return; // 넉백 중엔 AI가 속도를 덮어쓰지 않음
    }

    this.stateElapsed += dt;
    const auraMult = getAuraSpeedMult(this);

    const dxP = game.hero.x - this.x, dyP = game.hero.y - this.y;
    const distP = Math.hypot(dxP, dyP);
    const playerNear = game.hero.alive && distP < this.aggroRange;

    // 종류별 이동 규칙 (번개: 사거리 밖이면 접근 + 가까우면 후퇴, 주술사: 가까우면 후퇴)
    if (b && b.steer && b.steer(this, dxP, dyP, distP, auraMult)) return;

    const isRangedKiter = !!(b && b.ranged);

    if (playerNear && distP > this.meleeRange && !isRangedKiter) {
      this.state = 'walk';
      Body.setVelocity(this.body, { x: (dxP / distP) * this.speed * auraMult / 60, y: (dyP / distP) * this.speed * auraMult / 60 });
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      return;
    }

    if (playerNear && distP <= this.meleeRange && !isRangedKiter) {
      Body.setVelocity(this.body, { x: 0, y: 0 });
      if (this.state !== 'attack') { this.setState('attack', 0.6); this.attackHit = false; this.attackingPlayer = true; }
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      if (!this.attackHit && this.stateElapsed > 0.12 && this.stateElapsed < 0.22) {
        if (distP <= this.meleeRange + 10) { hitPlayer(this.x, this.y, this.dmg); this.attackHit = true; }
      }
      this.timer -= dt;
      if (this.timer <= 0) this.setState('idle', auraMult > 1 ? 0.08 : 0.18);
      return;
    }

    if (this.state === 'idle') {
      Body.setVelocity(this.body, { x: 0, y: 0 });
      this.timer -= dt;
      if (this.timer <= 0) {
        if (Math.random() < 0.3) {
          this.setState('attack', 0.6);
          this.attackingPlayer = false;
        } else {
          this.target = randomPointInPen();
          this.setState('walk', 999);
        }
      }
    } else if (this.state === 'walk') {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        Body.setVelocity(this.body, { x: 0, y: 0 });
        this.setState('idle', 0.6 + Math.random() * 1.6);
      } else {
        Body.setVelocity(this.body, { x: (dx / dist) * this.speed * auraMult / 60, y: (dy / dist) * this.speed * auraMult / 60 });
        if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
      }
    } else if (this.state === 'attack') {
      Body.setVelocity(this.body, { x: 0, y: 0 });
      this.timer -= dt;
      if (this.timer <= 0) this.setState('idle', 0.6 + Math.random() * 1.4);
    }
  }
}
