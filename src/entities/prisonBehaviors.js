// 뼈 감옥 (2026-10-14 사용자: 플레이어의 진로를 가두는 적 - PoE 참고) - behaviors.js의 behaviors에 합쳐짐 (훅 규칙은 behaviors.js 맨 위)
//   해골 감옥지기(skeletonJailer): 거리를 두고(MONSTER_MOVE) 지팡이를 들어 castTime초 주문 → 그 순간 주인공 자리에 뼈 창살(boneBar) bars개를 둥글게 부름
//     뼈 창(JAILER_SPEAR): 평소엔 가끔, 주인공이 갇히면 빠르게 쏨 - 창살 틈으로 들어감 (강령술사처럼 가두고 쏨, 2026-10-14 사용자)
//   뼈 창살(boneBar): 움직이지 않는 작은 '몬스터'(prop) - warn초 동안은 땅의 고리만(밟고 나갈 수 있음) → 솟아올라 duration초 동안 막음 → 무너짐
//     주인공의 모든 공격으로 부술 수 있음(부수면 그 칸이 열림), 몬스터 투사체는 통과(창살 틈 - 사용자), 경험치·드랍 없음, CC 면역
// 수치 data/balance.js PRISON, 그림 render/prisonSprites.js
import { PRISON, JAILER_SPEAR } from '../data/balance.js';
import { spawnProjectile } from '../systems/projectiles.js';
import { Body } from '../core/physics.js';
import { game } from '../state.js';
import { killCow } from '../systems/combat.js';
import { spawnHitParticles, spawnShockwave } from '../systems/fx.js';
import { clampToPen } from '../world/arena.js';
import { sfx } from '../audio/sfx.js';

const stop = (m) => Body.setVelocity(m.body, { x: 0, y: 0 });
// 주인공이 이미 갇혀 있는지 (살아 있는 창살의 감옥 안)
const heroJailed = () => game.cows.some((c) => c.kind === 'boneBar' && c.state !== 'dead' && c.prison && Math.hypot(game.hero.x - c.prison.x, game.hero.y - c.prison.y) < c.prison.r);

export const prisonBehaviors = {
  skeletonJailer: {
    ranged: true,
    init(m) { m.prisonCd = PRISON.firstCd + Math.random(); m.spearCd = JAILER_SPEAR.spearCd; },
    interrupt(m) { if (m.state === 'casting') m.prisonCd = PRISON.cooldown * 0.5; },
    update(m, dt) {
      m.prisonCd -= dt;
      const h = game.hero;
      if (m.state === 'casting') {
        m.stateElapsed += dt;
        stop(m);
        if (m.stateElapsed >= PRISON.castTime) {
          // 그 순간 주인공 자리를 가운데로 창살을 둥글게 (맵 끝이면 안쪽으로)
          const c = clampToPen(h.x, h.y, PRISON.radius + 20);
          const prison = { x: c.x, y: c.y, r: PRISON.radius };
          for (let i = 0; i < PRISON.bars; i++) {
            const a = (i / PRISON.bars) * Math.PI * 2;
            game.pendingSpawns.push({ kind: 'boneBar', x: c.x + Math.cos(a) * PRISON.radius, y: c.y + Math.sin(a) * PRISON.radius, summoner: m, props: { prison, barAngle: a, raw: true } });
          }
          m.setState('idle', 0.3);
        }
        return true;
      }
      if (!h.alive) return false;
      // 뼈 창: 갇혀 있으면 빠르게
      m.spearCd -= dt;
      const dist = Math.hypot(h.x - m.x, h.y - m.y), jailed = heroJailed();
      if (m.spearCd <= 0 && dist <= JAILER_SPEAR.range) {
        m.spearCd = jailed ? JAILER_SPEAR.jailedCd : JAILER_SPEAR.spearCd;
        const oy = m.y - 40 * m.scale, a = Math.atan2(h.y - oy, h.x - m.x);
        spawnProjectile({ kind: 'bonespear', x: m.x, y: oy, dirX: Math.cos(a), dirY: Math.sin(a), speed: JAILER_SPEAR.speed, range: JAILER_SPEAR.range + 60, radius: JAILER_SPEAR.radius, packet: { phys: JAILER_SPEAR.damage }, color: '#e8e2d0' });
        if (Math.abs(h.x - m.x) > 1) m.facing = h.x > m.x ? 1 : -1;
      }
      if (m.prisonCd > 0) return false;
      if (dist > PRISON.range || jailed) return false;
      m.prisonCd = PRISON.cooldown;
      m.setState('casting', 0);
      stop(m);
      return true;
    }
  },

  boneBar: {
    init(m) { // 감옥지기가 부르면 props(prison·barAngle·raw)가 덮어씀, 혼자 생기면(관리자 미리보기) 자기 자리가 감옥 테두리
      m.age = 0; m.risen = false;
      if (!m.prison) { m.prison = { x: m.x - PRISON.radius, y: m.y, r: PRISON.radius }; m.barAngle = 0; m.raw = true; }
    },
    update(m, dt) {
      if (m.raw) { // 처음 한 번: 움직이지 않게(정적) + 솟기 전엔 통과(센서), 생성 때 밀려난 자리는 제자리로
        m.raw = false;
        Body.setStatic(m.body, true);
        m.body.isSensor = true;
        const x = m.prison.x + Math.cos(m.barAngle) * m.prison.r, y = m.prison.y + Math.sin(m.barAngle) * m.prison.r;
        Body.setPosition(m.body, { x, y }); m.x = x; m.y = y;
      }
      m.age += dt;
      m.state = 'idle';
      if (!m.risen && m.age >= PRISON.warn) {
        m.risen = true;
        m.body.isSensor = false; // 이제 막음
        spawnHitParticles(m.x, m.y, '#e8e2d0', 4);
        if (m.barAngle === 0) { sfx('prison', m); spawnShockwave(m.prison.x, m.prison.y, m.prison.r + 10, '#e8e2d0'); game.shake = Math.min(game.shake + 3, 12); }
      }
      if (m.age >= PRISON.warn + PRISON.duration) killCow(m); // 무너짐 (prop - 경험치·드랍 없음)
      return true;
    },
    drawOver() {} // 기본 체력바 없음 (금 간 정도로 보여 줌 - render/prisonSprites.js)
  }
};
