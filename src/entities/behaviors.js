// 몬스터 종류별 특수 행동 훅. 종류 하나 = 항목 하나 (필요한 훅만 쓴다)
//   init(m)                      생성 직후 종류별 타이머 초기화
//   update(m, dt)                특수 처리. true를 반환하면 상태 점유 중 → 이번 틱의 일반 AI(스턴/넉백/추격/근접/배회)를 건너뜀
//   steer(m, dxP, dyP, distP, auraMult)  일반 추격/후퇴를 대체하는 이동 규칙. true면 이번 틱 이동 처리 끝
//   ranged                       true면 근접 추격/공격을 하지 않음 (원거리·지원형)
//   onDeath(m)                   처치 시 연출/효과. true를 반환하면 기본 드랍을 건너뜀(자체 드랍)
//   drawUnder(m, ctx, t, style)  몸 아래(링보다 먼저) 그리는 오라/경고
//   drawOver(m, ctx, t, style)   몸 위에 그리는 것. 있으면 기본 체력바 대신 그림
//   interrupt(m)                 기절·경직이 걸려 하던 특수 행동이 끊길 때 정리(대기시간 등) - systems/cc.js
// 상태를 점유하는 상태머신(fusing/zapping/telegraph…)은 매 틱 true를 반환해야 일반 AI가 상태를 덮어쓰지 않는다.
import {
  BOSS_SLAM_COOLDOWN, CHARGE_DAMAGE, EXPLODER_BLAST_DAMAGE, ZAP_DAMAGE, SHAMAN_HEAL, CHARGE_RANGE,
  CHARGE_TELEGRAPH, CHARGE_DISTANCE, CHARGE_DURATION, CHARGE_RECOVER, CHARGE_COOLDOWN, CHARGE_WIDTH,
  EXPLODER_FUSE_TIME, EXPLODER_FUSE_RANGE, EXPLODER_BLAST_RADIUS, ZAP_RANGE, ZAP_TELEGRAPH, ZAP_COOLDOWN,
  ZAP_BEAM_LENGTH, ZAP_BEAM_WIDTH, AURA_RADIUS, AURA_SPEED_MULT, VENOM_CLOUD_TRIGGER_RANGE, VENOM_CLOUD_COOLDOWN
} from '../data/balance.js';
import { distToSegment, getHitPoint, hash01 } from '../util.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { recordRun } from '../save.js';
import { killCow, spawnColdNova, bossSlam, hitPlayer } from '../systems/combat.js';
import { spawnHitParticles, spawnFireHazard, spawnPoisonCloud, spawnLightningBolt, spawnShockwave } from '../systems/fx.js';
import { rollLightning } from '../systems/elements.js';
import { MONSTER_CHILL_MOVE_MULT } from '../data/elements.js';
import { BOSS_SLOW_SCALE } from '../data/balance.js';
import { isBossCow, isSheep } from '../systems/cc.js';
import { frostAuraSlow } from '../systems/auras.js';
import { dropLoot } from '../systems/loot.js';
import { clampToPen } from '../world/arena.js';
import { spellBehaviors } from './spellBehaviors.js';
import { rangedBehaviors } from './rangedBehaviors.js';
import { demonBehaviors } from './demonBehaviors.js';

// 광신 오라: 광신 카우 자신 또는 오라 반경 안의 아군은 이동이 빨라짐
// (이동 배율이 쓰이는 모든 곳에 같이 들어가므로 둔화(냉기)도 여기서 곱함 - 보스는 둔화 절반)
export function getAuraSpeedMult(cow) {
  const chill = cow.chillTimer > 0 ? (isBossCow(cow) ? 1 - (1 - MONSTER_CHILL_MOVE_MULT) * BOSS_SLOW_SCALE : MONSTER_CHILL_MOVE_MULT) : 1;
  let fan = cow.kind === 'fanatic' && !isSheep(cow);
  for (const other of game.cows) {
    if (fan) break;
    if (other === cow || other.kind !== 'fanatic' || other.state === 'dead' || isSheep(other)) continue; // 양이 되면 오라 꺼짐
    if (Math.hypot(other.x - cow.x, other.y - cow.y) <= AURA_RADIUS) fan = true;
  }
  const frost = frostAuraSlow(cow); // 주인공 빙결 오라 - 광신 오라와 더해서 계산
  if (!frost) return (fan ? AURA_SPEED_MULT : 1) * chill;
  return Math.max(0.1, 1 + (fan ? AURA_SPEED_MULT - 1 : 0) - frost) * chill;
}

export const behaviors = {
  boss: {
    init(m) { m.specialTimer = BOSS_SLAM_COOLDOWN; },
    update(m, dt) {
      m.specialTimer -= dt;
      if (m.specialTimer <= 0) {
        m.specialTimer = BOSS_SLAM_COOLDOWN;
        bossSlam(m);
      }
      return false;
    },
    onDeath(m) {
      game.gameState = 'victory';
      recordRun('victory');
      game.shake = Math.min(game.shake + 12, 12);
      spawnShockwave(m.x, m.y, 220, '#c98bef');
      dropLoot(m.x, m.y, 'boss', 4, m.level);
      return true;
    },
    drawOver(m, ctx, t, style) {
      const wp = getHitPoint(m);
      const gemR = 9 + Math.sin(t * 5) * 2;

      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(t * 5) * 0.08;
      ctx.fillStyle = '#4dfff0';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, gemR * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(wp.x, wp.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#4dfff0';
      ctx.fillRect(-gemR, -gemR, gemR * 2, gemR * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-gemR, -gemR, gemR * 2, gemR * 2);
      ctx.restore();

      const w = 74;
      const barY = m.y - 34 * m.scale - 96;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(m.x - w / 2, barY, w, 8);
      ctx.fillStyle = style.ring;
      ctx.fillRect(m.x - w / 2, barY, w * (m.hp / m.maxHp), 8);
    }
  },

  // 버닝소울 - 돌아다니는 동안 주기적으로 발밑에 불바닥을 남김
  burning: {
    init(m) { m.fireDropTimer = 0.5 + Math.random() * 0.4; },
    update(m, dt) {
      if (m.state !== 'stunned') {
        m.fireDropTimer -= dt;
        if (m.fireDropTimer <= 0) {
          m.fireDropTimer = 0.55;
          spawnFireHazard(m.x, m.y);
        }
      }
      return false;
    }
  },

  // 주술사 - 근처에서 가장 많이 다친 아군에게 주기적으로 소량 치유를 걸어줌 (우선 처치 대상으로 만드는 용도)
  shaman: {
    ranged: true,
    init(m) { m.healCooldown = 1 + Math.random() * 1.5; },
    update(m, dt) {
      m.healCooldown -= dt;
      if (m.healCooldown <= 0) {
        let target = null, worstRatio = 1;
        game.cows.forEach((c) => {
          if (c === m || c.state === 'dead') return;
          if (Math.hypot(c.x - m.x, c.y - m.y) > 170) return;
          const ratio = c.hp / c.maxHp;
          if (c.hp < c.maxHp && ratio < worstRatio) { worstRatio = ratio; target = c; }
        });
        if (target) {
          target.hp = Math.min(target.maxHp, target.hp + SHAMAN_HEAL);
          spawnShockwave(target.x, target.y, 36, '#9f6bff');
          spawnHitParticles(target.x, target.y, '#c9a8ff', 5);
          m.healCooldown = 3.2;
        } else {
          m.healCooldown = 1.2; // 치유할 대상이 없으면 금방 다시 체크
        }
      }
      return false;
    },
    // 근접하지 않고 플레이어가 가까이 오면 뒷걸음질쳐서 거리를 유지 (후방 지원형)
    steer(m, dxP, dyP, distP, auraMult) {
      const kiteDistance = 130;
      if (game.hero.alive && distP < kiteDistance && distP > 0.001) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (-dxP / distP) * m.speed * auraMult / 60, y: (-dyP / distP) * m.speed * auraMult / 60 });
        m.facing = dxP > 0 ? -1 : 1; // 물러나면서도 플레이어 쪽을 바라봄
        return true;
      }
      return false;
    },
    drawUnder(m, ctx, t, style) {
      ctx.save();
      ctx.globalAlpha = 0.10 + Math.sin(t * 2.2) * 0.04;
      ctx.fillStyle = style.ring;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 170, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // 번개카우 - 사정거리 안에 들어오면 잠깐 충전한 뒤 번개를 쏨 (충전 중 플레이어가 피하면 빗나감)
  shocker: {
    ranged: true,
    init(m) { m.zapCooldown = 0.8 + Math.random() * 1.2; },
    interrupt(m) { if (m.state === 'zapping') m.zapCooldown = ZAP_COOLDOWN; }, // 충전 취소
    update(m, dt) {
      if (m.zapCooldown > 0) m.zapCooldown -= dt;
      if (m.state === 'zapping') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (Math.abs(m.zapTargetX - m.x) > 1) m.facing = m.zapTargetX > m.x ? 1 : -1;
        if (m.stateElapsed >= ZAP_TELEGRAPH) {
          // 충전 시작 시점에 고정된 방향으로 긴 직선 빔을 쏨 - 유도가 아니라 그 방향으로 쭉 지나감
          const aimAngle = Math.atan2(m.zapTargetY - m.y, m.zapTargetX - m.x);
          const boltEndX = m.x + Math.cos(aimAngle) * ZAP_BEAM_LENGTH;
          const boltEndY = m.y + Math.sin(aimAngle) * ZAP_BEAM_LENGTH;
          spawnLightningBolt(m.x, m.y, boltEndX, boltEndY);
          spawnHitParticles(m.x, m.y, '#fff066', 5);
          if (game.hero.alive && distToSegment(game.hero.x, game.hero.y, m.x, m.y, boltEndX, boltEndY) <= ZAP_BEAM_WIDTH) {
            hitPlayer(m.x, m.y, { lightning: rollLightning(ZAP_DAMAGE) }); // 번개: 피해가 들쭉날쭉
          }
          m.zapCooldown = ZAP_COOLDOWN;
          m.setState('idle', 0.4);
        }
        return true;
      }
      if (m.zapCooldown <= 0 && game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= ZAP_RANGE) {
        m.zapTargetX = game.hero.x;
        m.zapTargetY = game.hero.y;
        m.setState('zapping', 0);
        Body.setVelocity(m.body, { x: 0, y: 0 });
        return true;
      }
      return false;
    },
    steer(m, dxP, dyP, distP, auraMult) {
      // 사정거리 밖이면 들어올 때까지 접근함 (너무 멀면 영영 못 쏘니까)
      if (game.hero.alive && distP > ZAP_RANGE && distP < m.aggroRange) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (dxP / distP) * m.speed * auraMult / 60, y: (dyP / distP) * m.speed * auraMult / 60 });
        if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
        return true;
      }
      // 근접하지 않고 플레이어가 가까이 오면 뒷걸음질쳐서 거리를 유지 (원거리형)
      const kiteDistance = 170;
      if (game.hero.alive && distP < kiteDistance && distP > 0.001) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (-dxP / distP) * m.speed * auraMult / 60, y: (-dyP / distP) * m.speed * auraMult / 60 });
        m.facing = dxP > 0 ? -1 : 1; // 물러나면서도 플레이어 쪽을 바라봄
        return true;
      }
      return false;
    },
    drawUnder(m, ctx, t) {
      // 그림에서는 게임 난수를 쓰지 않음 (화면 밖 몬스터는 안 그리므로 화면 크기에 따라 게임 결과가 달라짐) - 시간·개체 해시
      const f = Math.floor(t * 30);
      if (m.state === 'zapping' && hash01(f, m.phase * 1000, 0) < 0.6) {
        // 충전 중 - 뿔 끝에서 지지직거리는 스파크
        ctx.save();
        ctx.globalAlpha = 0.5 + hash01(f, m.phase * 1000, 1) * 0.4;
        ctx.strokeStyle = '#fff9b0';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          const ang = hash01(f, m.phase * 1000, 2 + i) * Math.PI * 2;
          const len = 10 + hash01(f, m.phase * 1000, 4 + i) * 14;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y - 22 * m.scale);
          ctx.lineTo(m.x + Math.cos(ang) * len, m.y - 22 * m.scale + Math.sin(ang) * len);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  },

  // 자폭잼민이 - 플레이어에게 바짝 붙으면 점화되어 잠시 후 폭발
  exploder: {
    update(m, dt) {
      if (m.state === 'fusing') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= EXPLODER_FUSE_TIME) {
          killCow(m);
        }
        return true; // 터지기 전까지는 매 프레임 여기서 끝 - 아래 일반 AI가 상태를 덮어쓰지 않게 함
      } else if (game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= EXPLODER_FUSE_RANGE) {
        m.setState('fusing', 0);
        Body.setVelocity(m.body, { x: 0, y: 0 });
        return true;
      }
      return false;
    },
    onDeath(m) {
      spawnShockwave(m.x, m.y, EXPLODER_BLAST_RADIUS, '#ff5b3d');
      spawnHitParticles(m.x, m.y, '#ff8a3d', 14);
      game.shake = Math.min(game.shake + 7, 12);
      game.impactFlash = Math.max(game.impactFlash, 0.10);
      if (game.hero.alive && Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= EXPLODER_BLAST_RADIUS) {
        hitPlayer(m.x, m.y, EXPLODER_BLAST_DAMAGE);
      }
      return false;
    },
    drawUnder(m, ctx) {
      if (m.state === 'fusing') {
        const pulse = Math.sin((m.stateElapsed / EXPLODER_FUSE_TIME) * Math.PI * 7) * 0.5 + 0.5;
        ctx.save();
        ctx.globalAlpha = 0.25 + pulse * 0.45;
        ctx.fillStyle = '#ff2d2d';
        ctx.beginPath();
        ctx.arc(m.x, m.y, EXPLODER_BLAST_RADIUS * (0.3 + m.stateElapsed / EXPLODER_FUSE_TIME * 0.7), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  },

  // 돌진 카우 - 예고선(telegraph) → 직선 돌진(charging) → 경직(recover)
  charger: {
    init(m) { m.chargeCooldownTimer = 1 + Math.random() * 2; },
    interrupt(m) { if (m.state === 'telegraph' || m.state === 'charging') m.chargeCooldownTimer = CHARGE_COOLDOWN; }, // 예고·돌진 취소
    update(m, dt) {
      if (m.chargeCooldownTimer > 0) m.chargeCooldownTimer -= dt;

      if (m.state === 'telegraph') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= CHARGE_TELEGRAPH) {
          m.state = 'charging';
          m.stateElapsed = 0;
          m.chargeStart = { x: m.x, y: m.y };
          m.chargeHitDone = false;
        }
        return true; // 예고 중엔 제자리에 멈춰서 경고만 함
      }

      if (m.state === 'charging') {
        m.stateElapsed += dt;
        const t = Math.min(m.stateElapsed / CHARGE_DURATION, 1);
        const nx = m.chargeStart.x + (m.chargeTarget.x - m.chargeStart.x) * t;
        const ny = m.chargeStart.y + (m.chargeTarget.y - m.chargeStart.y) * t;
        Body.setPosition(m.body, { x: nx, y: ny });
        Body.setVelocity(m.body, { x: 0, y: 0 });
        m.x = nx; m.y = ny;

        if (!m.chargeHitDone && game.hero.alive && Math.hypot(game.hero.x - nx, game.hero.y - ny) < CHARGE_WIDTH) {
          hitPlayer(nx, ny, CHARGE_DAMAGE);
          m.chargeHitDone = true;
        }

        if (t >= 1) {
          m.state = 'recover';
          m.stateElapsed = 0;
          m.chargeCooldownTimer = CHARGE_COOLDOWN;
        }
        return true;
      }

      if (m.state === 'recover') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= CHARGE_RECOVER) m.setState('idle', 0.3);
        return true;
      }

      if (m.chargeCooldownTimer <= 0 && game.hero.alive) {
        const dToPlayer = Math.hypot(game.hero.x - m.x, game.hero.y - m.y);
        if (dToPlayer <= CHARGE_RANGE && dToPlayer > 40) {
          const ang = Math.atan2(game.hero.y - m.y, game.hero.x - m.x);
          m.chargeDir = { x: Math.cos(ang), y: Math.sin(ang) };
          m.chargeTarget = clampToPen(m.x + m.chargeDir.x * CHARGE_DISTANCE, m.y + m.chargeDir.y * CHARGE_DISTANCE, m.r + 6);
          m.facing = m.chargeDir.x >= 0 ? 1 : -1;
          m.setState('telegraph', 0);
          Body.setVelocity(m.body, { x: 0, y: 0 });
          return true;
        }
      }
      return false;
    },
    drawUnder(m, ctx, t) {
      if (m.state === 'telegraph') {
        const dx = m.chargeTarget.x - m.x, dy = m.chargeTarget.y - m.y;
        const dist = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const pulse = 0.3 + Math.sin(t * 22) * 0.15;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(ang);
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.fillRect(0, -CHARGE_WIDTH / 2, dist, CHARGE_WIDTH);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -CHARGE_WIDTH / 2, dist, CHARGE_WIDTH);
        ctx.restore();
      }
    }
  },

  // 독 카우 - 주인공이 가까이 오면 주기적으로 독 구름을 뿜고, 죽을 때도 뿜음 (구름 안에 있으면 중독)
  venom: {
    init(m) { m.cloudCooldown = 1 + Math.random(); },
    update(m, dt) {
      if (m.cloudCooldown > 0) m.cloudCooldown -= dt;
      if (m.cloudCooldown <= 0 && m.state !== 'stunned' && game.hero.alive &&
          Math.hypot(game.hero.x - m.x, game.hero.y - m.y) <= VENOM_CLOUD_TRIGGER_RANGE) {
        spawnPoisonCloud(m.x, m.y);
        spawnHitParticles(m.x, m.y, '#7fe05a', 6);
        m.cloudCooldown = VENOM_CLOUD_COOLDOWN;
      }
      return false;
    },
    onDeath(m) {
      spawnPoisonCloud(m.x, m.y);
      return false;
    }
  },

  // 냉기 카우 - 죽을 때 냉기 노바
  cold: {
    onDeath(m) {
      spawnColdNova(m.x, m.y);
      return false;
    }
  },

  // 광신 카우 - 주변 아군 이동속도 오라 (효과는 getAuraSpeedMult)
  fanatic: {
    drawUnder(m, ctx, t, style) {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(t * 3) * 0.05;
      ctx.fillStyle = style.ring;
      ctx.beginPath();
      ctx.arc(m.x, m.y, AURA_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
};

// 마법 쓰는 몬스터(entities/spellBehaviors.js)도 같은 표에
Object.assign(behaviors, spellBehaviors);
Object.assign(behaviors, rangedBehaviors); // 활 쏘는 몬스터 (entities/rangedBehaviors.js)
Object.assign(behaviors, demonBehaviors); // 악마 카우 종족 (entities/demonBehaviors.js)
