// 마법 쓰는 몬스터의 행동 훅 - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위 설명)
import {
  METEOR_RANGE, METEOR_CAST_TIME, METEOR_COOLDOWN, PYRO_KITE_DISTANCE, PYRO_CAST_GAP, PYRO_METEOR_MIN_DIST,
  PYRO_WALL_MAX_DIST, FIREBALL_CAST_TIME, FIRE_WALL_CAST_TIME, FIRE_WALL_COOLDOWN
} from '../data/balance.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { spawnHitParticles } from '../systems/fx.js';
import { spawnMeteor, castFireball, spawnFireWall } from '../systems/spells.js';
import { killCow } from '../systems/combat.js';
import { spawnProjectile } from '../systems/projectiles.js';
import { NECRO_CORPSE_RANGE, NECRO_BONE_FAN, NECRO_BONE_FAN_P2, NECRO_BONE_SPREAD, NECRO_BLAST_CD, NECRO_BLAST_PICK, NECRO_BLAST_MAX, NECRO_BLOAT, NECRO_BLAST_RADIUS, NECRO_BLAST_DAMAGE, NECRO_PHASE2_HP, NECRO_MAX_MINIONS_P2 } from '../data/balance.js';
import { hitPlayer } from '../systems/combat.js';
import { spawnShockwave, floatText } from '../systems/fx.js';
import { NECRO_RANGE, NECRO_KITE, NECRO_SUMMON_CD, NECRO_CAST_TIME, NECRO_SUMMON_COUNT, NECRO_MAX_MINIONS, NECRO_BONE_CD, NECRO_BONE_DAMAGE, NECRO_BONE_SPEED, NECRO_BONE_RADIUS } from '../data/balance.js';
import { bossDown } from '../systems/acts.js';

const CAST_TIME = { meteor: METEOR_CAST_TIME, fireball: FIREBALL_CAST_TIME, wall: FIRE_WALL_CAST_TIME };

// 거리별 마법 고르기: 멀면 메테오(드물게), 가까우면 화염 벽(길 막기), 그 외 파이어볼
function pickSpell(m, dist) {
  if (dist >= PYRO_METEOR_MIN_DIST && m.meteorCooldown <= 0) return 'meteor';
  if (dist <= PYRO_WALL_MAX_DIST && m.wallCooldown <= 0) return 'wall';
  return 'fireball';
}

function release(m) {
  const h = game.hero;
  if (m.castSpell === 'meteor') {
    spawnMeteor(m.castX, m.castY); // 시전 시작 순간 위치에 떨어짐 (경고 원 보고 피함)
    m.meteorCooldown = METEOR_COOLDOWN;
  } else if (m.castSpell === 'wall') {
    spawnFireWall(m.x, m.y, h.x, h.y);
    m.wallCooldown = FIRE_WALL_COOLDOWN;
  } else {
    castFireball(m.x, m.y - 10 * m.scale, h.x, h.y); // 놓는 순간의 주인공 쪽으로 곧게
  }
  m.castCooldown = PYRO_CAST_GAP;
}

// 해골 카우 킹: 살아 있는 부하 수
const maxMinions = (m) => (m.phase2 ? NECRO_MAX_MINIONS_P2 : NECRO_MAX_MINIONS);
const minionsOf = (m) => game.cows.filter((c) => c.summoner === m && c.state !== 'dead').length + game.pendingSpawns.filter((p) => p.summoner === m).length;

export const spellBehaviors = {
  // 해골 카우 (부하): 해골 카우 킹의 '시체 폭발'에 걸리면 bloatTimer초 동안 초록빛으로 부풀다 터짐
  skeleton: {
    update(c, dt) {
      if (!(c.bloatTimer > 0)) return false;
      c.bloatTimer -= dt;
      Body.setVelocity(c.body, { x: 0, y: 0 });
      if (c.bloatTimer <= 0) {
        spawnShockwave(c.x, c.y, NECRO_BLAST_RADIUS, '#7fffd4');
        spawnHitParticles(c.x, c.y - 20, '#e8e2d0', 12);
        game.shake = Math.min(game.shake + 4, 12);
        if (game.hero.alive && Math.hypot(game.hero.x - c.x, game.hero.y - c.y) <= NECRO_BLAST_RADIUS + game.hero.r * 0.5) hitPlayer(c.x, c.y, { phys: NECRO_BLAST_DAMAGE });
        killCow(c);
      }
      return true;
    },
    drawUnder(c, ctx, t) {
      if (!(c.bloatTimer > 0)) return;
      const p = 1 - c.bloatTimer / NECRO_BLOAT;
      ctx.save();
      ctx.globalAlpha = 0.25 + p * 0.4 + Math.sin(t * 30) * 0.1;
      ctx.fillStyle = '#7fffd4';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, NECRO_BLAST_RADIUS * (0.4 + p * 0.6), NECRO_BLAST_RADIUS * (0.4 + p * 0.6) * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  // 해골 카우 킹 (네크로맨서) - 거리를 두고 ① 해골 일으키기(근처 시체 자리 먼저) ② 뼈 창 3갈래 ③ 시체 폭발(주인공 근처 부하가 부풀다 터짐)
  //   체력 절반 아래면 2단계: 부하 최대치 증가, 뼈 창 5갈래. 죽으면 부하도 쓰러짐
  skeletonKing: {
    ranged: true,
    init(m) { m.summonCd = 1.2; m.boneCd = 2; m.blastCd = 5; },
    interrupt(m) { if (m.state === 'casting') m.summonCd = NECRO_SUMMON_CD * 0.5; },
    update(m, dt) {
      if (!m.phase2 && m.hp <= m.maxHp * NECRO_PHASE2_HP) { m.phase2 = true; floatText(m.x, m.y - 90 * m.scale, '죽음의 힘!', '#7fffd4'); spawnShockwave(m.x, m.y, 60 * m.scale, '#7fffd4'); }
      m.summonCd -= dt;
      m.boneCd -= dt;
      m.blastCd -= dt;
      if (m.state === 'casting') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (m.stateElapsed >= NECRO_CAST_TIME) {
          if (m.castKind === 'blast') { // 시체 폭발: 주인공 근처 부하가 부풀기 시작
            game.cows.filter((c) => c.summoner === m && c.state !== 'dead' && !(c.bloatTimer > 0) && Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= NECRO_BLAST_PICK)
              .slice(0, NECRO_BLAST_MAX).forEach((c) => { c.bloatTimer = NECRO_BLOAT; });
          } else { // 해골 일으키기: 근처 시체 자리 먼저, 모자라면 곁에서
            const n = Math.min(NECRO_SUMMON_COUNT, maxMinions(m) - minionsOf(m)); // 남은 자리만큼만
            for (let i = 0; i < n; i++) {
              const ci = game.corpses.findIndex((p) => Math.hypot(p.x - m.x, p.y - m.y) <= NECRO_CORPSE_RANGE);
              let x, y;
              if (ci >= 0) { ({ x, y } = game.corpses[ci]); game.corpses.splice(ci, 1); }
              else { const a = Math.random() * Math.PI * 2, r = m.r + 30 + Math.random() * 30; x = m.x + Math.cos(a) * r; y = m.y + Math.sin(a) * r; }
              game.pendingSpawns.push({ kind: 'skeleton', x, y, summoner: m });
              spawnHitParticles(x, y, '#7fffd4', 8);
            }
          }
          m.setState('idle', 0.3);
        }
        return true;
      }
      if (!game.hero.alive) return false;
      const dx = game.hero.x - m.x, dy = game.hero.y - m.y, dist = Math.hypot(dx, dy);
      const nearMinions = game.cows.some((c) => c.summoner === m && c.state !== 'dead' && !(c.bloatTimer > 0) && Math.hypot(c.x - game.hero.x, c.y - game.hero.y) <= NECRO_BLAST_PICK);
      if (m.blastCd <= 0 && nearMinions) { m.blastCd = NECRO_BLAST_CD; m.castKind = 'blast'; m.setState('casting', 0); Body.setVelocity(m.body, { x: 0, y: 0 }); return true; }
      if (m.summonCd <= 0 && dist < m.aggroRange && minionsOf(m) < maxMinions(m)) {
        m.summonCd = NECRO_SUMMON_CD;
        m.castKind = 'summon';
        m.setState('casting', 0);
        Body.setVelocity(m.body, { x: 0, y: 0 });
        return true;
      }
      if (m.boneCd <= 0 && dist <= NECRO_RANGE) { // 뼈 창 (곧게 - 옆으로 움직이면 피함)
        m.boneCd = NECRO_BONE_CD;
        const oy = m.y - 40 * m.scale, base = Math.atan2(game.hero.y - oy, game.hero.x - m.x), fan = m.phase2 ? NECRO_BONE_FAN_P2 : NECRO_BONE_FAN;
        for (let i = 0; i < fan; i++) { // 부채꼴 (가운데가 주인공)
          const a = base + (i - (fan - 1) / 2) * NECRO_BONE_SPREAD;
          spawnProjectile({ kind: 'bonespear', x: m.x, y: oy, dirX: Math.cos(a), dirY: Math.sin(a), speed: NECRO_BONE_SPEED, range: NECRO_RANGE + 80, radius: NECRO_BONE_RADIUS, packet: { phys: NECRO_BONE_DAMAGE }, color: '#e8e2d0' });
        }
        if (Math.abs(dx) > 1) m.facing = dx > 0 ? 1 : -1;
      }
      return false;
    },
    steer(m, dxP, dyP, distP, auraMult) {
      if (game.hero.alive && distP > NECRO_RANGE && distP < m.aggroRange) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (dxP / distP) * m.speed * auraMult / 60, y: (dyP / distP) * m.speed * auraMult / 60 });
        if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
        return true;
      }
      if (game.hero.alive && distP < NECRO_KITE && distP > 0.001) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (-dxP / distP) * m.speed * auraMult / 60, y: (-dyP / distP) * m.speed * auraMult / 60 });
        m.facing = dxP > 0 ? -1 : 1;
        return true;
      }
      return false;
    },
    onDeath(m) {
      game.cows.forEach((c) => { if (c.summoner === m && c.state !== 'dead') killCow(c); }); // 부하도 쓰러짐
      return bossDown(m); // 전리품 + 다음 막
    },
    // 발밑 초록 소용돌이 + 주문 중엔 커지는 룬 원 (난수 없음)
    drawUnder(m, ctx, t) {
      ctx.save();
      const R = 26 * m.scale;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#7fffd4';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.4, R, R * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (m.state === 'casting') {
        if (m.castKind === 'blast') ctx.strokeStyle = '#d6ff7f'; // 시체 폭발
        const p = Math.min(1, m.stateElapsed / NECRO_CAST_TIME), RR = R * (1 + p * 0.8);
        ctx.globalAlpha = 0.3 + p * 0.5;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.4, RR, RR * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#b8ffe8';
        for (let i = 0; i < 6; i++) {
          const a = -t * 3 + (i / 6) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(m.x + Math.cos(a) * RR, m.y + m.r * 0.4 + Math.sin(a) * RR * 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  },

  // 화염술사 카우 - 거리를 두고 마법: 멀면 메테오, 중간이면 파이어볼, 가까우면 화염 벽으로 길을 막고 물러남
  pyro: {
    ranged: true,
    init(m) {
      m.castCooldown = 1.2 + Math.random() * 1.2;
      m.meteorCooldown = 1 + Math.random() * 2;
      m.wallCooldown = 0;
    },
    interrupt(m) { if (m.state === 'casting') m.castCooldown = PYRO_CAST_GAP; }, // 시전 취소
    update(m, dt) {
      if (m.castCooldown > 0) m.castCooldown -= dt;
      if (m.meteorCooldown > 0) m.meteorCooldown -= dt;
      if (m.wallCooldown > 0) m.wallCooldown -= dt;
      if (m.state === 'casting') {
        m.stateElapsed += dt;
        Body.setVelocity(m.body, { x: 0, y: 0 });
        if (Math.abs(game.hero.x - m.x) > 1) m.facing = game.hero.x > m.x ? 1 : -1;
        if (m.stateElapsed >= CAST_TIME[m.castSpell]) {
          release(m);
          m.setState('idle', 0.4);
        }
        return true;
      }
      const dist = Math.hypot(game.hero.x - m.x, game.hero.y - m.y);
      if (m.castCooldown <= 0 && m.stunTimer <= 0 && m.knockback <= 0 && game.hero.alive && dist <= METEOR_RANGE) {
        m.castSpell = pickSpell(m, dist);
        m.castX = game.hero.x;
        m.castY = game.hero.y;
        m.setState('casting', 0);
        Body.setVelocity(m.body, { x: 0, y: 0 });
        spawnHitParticles(m.x, m.y - 30 * m.scale, '#ffb02e', 4);
        return true;
      }
      return false;
    },
    steer(m, dxP, dyP, distP, auraMult) {
      // 사정거리 밖이면 다가가고, 너무 가까우면 물러남 (원거리 마법형)
      if (game.hero.alive && distP > METEOR_RANGE && distP < m.aggroRange) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (dxP / distP) * m.speed * auraMult / 60, y: (dyP / distP) * m.speed * auraMult / 60 });
        if (Math.abs(dxP) > 1) m.facing = dxP > 0 ? 1 : -1;
        return true;
      }
      if (game.hero.alive && distP < PYRO_KITE_DISTANCE && distP > 0.001) {
        m.state = 'walk';
        Body.setVelocity(m.body, { x: (-dxP / distP) * m.speed * auraMult / 60, y: (-dyP / distP) * m.speed * auraMult / 60 });
        m.facing = dxP > 0 ? -1 : 1;
        return true;
      }
      return false;
    },
    // 시전 중: 발밑에 커지는 주문 원 + 회전하는 불씨 (난수 없음)
    drawUnder(m, ctx, t) {
      if (m.state !== 'casting') return;
      const p = Math.min(1, m.stateElapsed / (CAST_TIME[m.castSpell] || METEOR_CAST_TIME));
      const R = (18 + 22 * p) * Math.max(0.8, m.scale * 2.2);
      ctx.save();
      ctx.globalAlpha = 0.35 + p * 0.4;
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + m.r * 0.5, R, R * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd34d';
      for (let i = 0; i < 5; i++) {
        const a = t * 4 + i * (Math.PI * 2 / 5);
        ctx.beginPath();
        ctx.arc(m.x + Math.cos(a) * R, m.y + m.r * 0.5 + Math.sin(a) * R * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
};
