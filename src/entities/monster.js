// 몬스터 공통: 물리 바디 + 일반 AI(스턴/넉백 → 추격·근접 공격 → 대기/배회)
// 종류별 수치는 data/monsters.js, 특수 행동은 entities/behaviors.js 훅 (this.behavior)
import { MONSTERS, weaponFor } from '../data/monsters.js';
import { World, Bodies, Body, world } from '../core/physics.js';
import { game } from '../state.js';
import { TEAM_MONSTER } from './actor.js';
import { getAuraSpeedMult, behaviors } from './behaviors.js';
import { hitPlayer } from '../systems/combat.js';
import { HUNT_SPEED_MULT, HOME_WANDER_RADIUS } from '../data/balance.js';
import { randomPointInPen, clampToPen } from '../world/arena.js';
import { monsterLevel } from '../util.js';
import { decoyFor, hitDecoy } from '../systems/physSkills.js';
import { emptyDot } from '../systems/elements.js';
import { updateCowStatuses } from '../systems/elementCombat.js';
import { updateCC } from '../systems/cc.js';
import { reflectThorns, frostAuraSlow } from '../systems/auras.js';
import { spawnHitParticles } from '../systems/fx.js';
import { SPELLS } from '../data/skills.js';

export class Monster {
  // opts.pos: 생성 위치(없으면 목장 안 무작위), opts.hunt: 웨이브 몬스터 - 주인공을 못 봤어도 주인공 쪽으로 몰려감
  // 파밍 맵(systems/mapRun.js): opts.hpMul/dmgMul(난이도 배율), opts.resist(개체 저항 - 면역 무리), opts.home(이 근처만 배회),
  //   opts.dropCount(죽을 때 드랍 횟수 - 우두머리), opts.mapBoss(우두머리 표시)
  constructor(scale, kind = 'normal', opts = {}) {
    this.kind = kind;

    // 종류별 수치는 data/monsters.js (모르는 종류는 normal 수치)
    const def = MONSTERS[kind] || MONSTERS.normal;
    const { hp, speedMul, aggroMul, scaleMul } = def;

    this.scale = scale * scaleMul;
    const p = opts.pos || randomPointInPen();
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
    this.weapon = weaponFor(kind, this.phase); // 그림용 - 난수 소비 없음
    this.speed = (34 + Math.random() * 18) * speedMul;
    const hpMul = opts.hpMul || 1;
    this.hp = hpMul === 1 ? hp : Math.max(1, Math.round(hp * hpMul));
    this.maxHp = this.hp;
    this.deadTimer = 0;
    this.deadPos = null;
    this.attackHit = false;
    this.attackingPlayer = false;
    this.flash = 0;
    this.knockback = 0;
    this.stunTimer = 0;
    this.aggroRange = 150 * aggroMul;
    this.meleeRange = 46 * this.scale + 16 + (def.reach || 0); // reach: 창 같은 긴 무기 (해골 창병)
    this.hitAt = def.hitAt || 0.12;           // 근접 공격이 맞는 순간(초) - 큰 무기는 늦게 (해골 전사)
    this.attackTime = def.attackTime || 0.6;  // 근접 공격 동작 길이
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
    this.castCooldown = Infinity; // pyro 전용 (마법 간격, 메테오/화염 벽 각자 쿨다운, 지금 시전 중인 마법)
    this.meteorCooldown = Infinity;
    this.wallCooldown = Infinity;
    this.castSpell = null;
    this.castX = 0;
    this.castY = 0;
    this.zapTargetX = 0;
    this.zapTargetY = 0;
    this.dmg = opts.dmgMul && opts.dmgMul !== 1 ? Math.max(1, Math.round(def.dmg * opts.dmgMul)) : def.dmg; // 근접 공격력 (난이도 배율)
    if (opts.resist) this.resist = opts.resist; // 개체 저항 (util.resistOf가 종류 기본값보다 먼저 봄)
    this.home = opts.home || null;
    this.dropCount = opts.dropCount != null ? opts.dropCount : 1; // 0 = 드랍 없음 (소환된 해골)
    this.mapBoss = !!opts.mapBoss;
    this.level = monsterLevel(game.run, game.wave, kind, this.mapBoss); // 떨군 장비의 아이템 레벨
    this.hunt = !!opts.hunt;
    this.burn = emptyDot(); // 주인공 원소 공격으로 걸리는 상태 (systems/elementCombat.js)
    this.poison = emptyDot();
    this.bleed = emptyDot(); // 출혈 (무기 특수기 관통창 - systems/weaponThrows.js)
    this.chillTimer = 0;
    this.element = def.element || null; // 근접 공격 원소 (없으면 물리)
    this.cloudCooldown = Infinity; // venom 전용
    this.whirlHitCd = 0;
    this.team = TEAM_MONSTER;
    this.behavior = behaviors[kind] || null;
    if (this.behavior && this.behavior.init) this.behavior.init(this);
  }

  // 파밍 맵 몬스터: 무리 자리(home) 근처에서만 배회 (맵 전체로 흩어지지 않게)
  homeWanderPoint() {
    const a = Math.random() * Math.PI * 2, r = Math.random() * HOME_WANDER_RADIUS;
    return clampToPen(this.home.x + Math.cos(a) * r, this.home.y + Math.sin(a) * r, this.r + 10);
  }

  // 양(변이): 느리게 무작위로 돌아다님 - 방향은 wanderTurn초마다 바뀜 (게임 난수)
  sheepWander(dt) {
    const s = SPELLS.polymorph;
    this.sheepT = (this.sheepT || 0) - dt;
    if (!this.sheepDir || this.sheepT <= 0) {
      const a = Math.random() * Math.PI * 2;
      this.sheepDir = { x: Math.cos(a), y: Math.sin(a) };
      this.sheepT = s.wanderTurn * (0.6 + Math.random() * 0.8);
    }
    const sp = this.speed * s.wanderMul / 60;
    Body.setVelocity(this.body, { x: this.sheepDir.x * sp, y: this.sheepDir.y * sp });
    if (Math.abs(this.sheepDir.x) > 0.1) this.facing = this.sheepDir.x > 0 ? 1 : -1;
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

    updateCowStatuses(this, dt); // 화상/중독 피해, 둔화 시간
    if (this.state === 'dead') return;

    // 기절·경직·변이(systems/cc.js) 중엔 종류별 특수 행동도 일반 AI도 멈춤. 풀리면 잠깐 서 있다가 다시 움직임
    updateCC(this, dt);
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.state = 'stunned';
      this.stateElapsed += dt;
      if (this.knockback > 0) this.knockback -= dt;
      else if (this.ccKind === 'poly') this.sheepWander(dt);
      else Body.setVelocity(this.body, { x: 0, y: 0 });
      if (this.stunTimer <= 0) {
        if (this.ccKind === 'poly') spawnHitParticles(this.x, this.y - 30 * this.scale, '#f2f2f2', 10); // 다시 소로 - 펑 연기
        this.setState('idle', 0.2);
      }
      return;
    }

    // 종류별 특수 처리 (보스 슬램/불바닥/치유/번개/자폭/돌진). true면 상태 점유 중 → 아래 일반 AI는 이번 틱에 실행 안 함
    const b = this.behavior;
    if (b && b.update && b.update(this, dt)) return;

    if (this.knockback > 0) {
      this.knockback -= dt;
      this.stateElapsed += dt;
      return; // 넉백 중엔 AI가 속도를 덮어쓰지 않음
    }

    this.stateElapsed += dt;
    const auraMult = getAuraSpeedMult(this);

    // 노리는 대상: 미끼(전사 '더미')가 가까우면 미끼, 아니면 주인공 (종류별 특수 행동은 주인공 그대로)
    const decoy = decoyFor(this);
    const dxP = (decoy ? decoy.x : game.hero.x) - this.x, dyP = (decoy ? decoy.y : game.hero.y) - this.y;
    const distP = Math.hypot(dxP, dyP);
    const playerNear = decoy ? true : game.hero.alive && distP < this.aggroRange;

    // 종류별 이동 규칙 (번개: 사거리 밖이면 접근 + 가까우면 후퇴, 주술사: 가까우면 후퇴)
    if (b && b.steer && b.steer(this, dxP, dyP, distP, auraMult)) return;

    const isRangedKiter = !!(b && b.ranged);

    // 웨이브 몬스터는 넓은 맵에서 주인공 쪽으로 빠르게 몰려옴 (어그로 범위에 들어오면 아래 일반 추격)
    if (this.hunt && game.hero.alive && !playerNear) {
      this.state = 'walk';
      const sp = this.speed * auraMult * HUNT_SPEED_MULT / 60;
      Body.setVelocity(this.body, { x: (dxP / distP) * sp, y: (dyP / distP) * sp });
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      return;
    }

    if (playerNear && distP > this.meleeRange && !isRangedKiter) {
      this.state = 'walk';
      Body.setVelocity(this.body, { x: (dxP / distP) * this.speed * auraMult / 60, y: (dyP / distP) * this.speed * auraMult / 60 });
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      return;
    }

    if (playerNear && distP <= this.meleeRange && !isRangedKiter) {
      Body.setVelocity(this.body, { x: 0, y: 0 });
      if (this.state !== 'attack') { this.setState('attack', this.attackTime); this.attackHit = false; this.attackingPlayer = true; }
      const atkMul = 1 - frostAuraSlow(this); // 빙결 오라: 공격 동작도 느려짐
      if (atkMul < 1) this.stateElapsed -= dt * (1 - atkMul);
      if (Math.abs(dxP) > 1) this.facing = dxP > 0 ? 1 : -1;
      if (!this.attackHit && this.stateElapsed > this.hitAt && this.stateElapsed < this.hitAt + 0.1) {
        if (distP <= this.meleeRange + 10) {
          const dmg = this.element ? { [this.element]: this.dmg } : this.dmg;
          if (decoy) hitDecoy(dmg);
          else {
            const taken = hitPlayer(this.x, this.y, dmg);
            reflectThorns(this, taken); // 가시 오라: 받은 만큼 되돌려 줌
            if (b && b.onMeleeHit) b.onMeleeHit(this, taken); // 종류별 (도살자 기절)
          }
          this.attackHit = true;
        }
      }
      this.timer -= dt * atkMul;
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
          this.target = this.home ? this.homeWanderPoint() : randomPointInPen();
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
