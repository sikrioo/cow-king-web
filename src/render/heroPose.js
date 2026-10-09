// 주인공 자세 계산 (그림 없음): 평소·이동·공격·스킬 동작별 손 위치와 칼날 각도 - heroSprites.drawPlayer가 그림
//   무기별 공격: 한손 휘두르기 / 창 찌르기 / 양손 무기 머리 위로 휩쓸기 / 대검 등에 멤 → 끌어 올려 내리치기
import { SMASH_DURATION, SMASH_IMPACT_TIME } from '../data/balance.js';
import { WEAPON_HEAVY } from '../data/items.js';
import { clamp01, lerpAngle, easeOutCubic } from '../util.js';
import { game } from '../state.js';

// 창 찌르기 자세 (공격 진행 0~1): 살짝 당김 → 앞으로 쭉 내지름 → 거둬들임. 칼날(창끝)은 늘 바라보는 방향
//   side: 손이 몸 어느 쪽에서 출발하는지 (+1 오른쪽 / 0 가운데)
function thrustPose(h, at, side) {
  const pull = easeOutCubic(clamp01(at / 0.3));
  const jab = easeOutCubic(clamp01((at - 0.3) / 0.25));
  const back = clamp01((at - 0.7) / 0.3);
  return {
    handAngle: h.facing + side * (1 - jab * 0.85),
    handDist: h.r * (0.6 - pull * 0.25 + jab * 0.95 - back * 0.55),
    bladeAngle: h.facing,
    bladeScale: 1.25 + jab * 0.25,
    trail: jab > 0 && back < 1 ? { thrust: true, len: 3.4, alpha: Math.min(0.45, jab * 0.5) * (1 - back) } : null
  };
}

// 등에 멘 대검이 늘어진 각도: 바라보는 쪽 반대(뒤)에서 GREATSWORD_HANG만큼 더 아래로 → 오른쪽을 보면 7시, 왼쪽을 보면 5시 방향
//   손잡이는 어깨 위로 나오고 칼날은 등을 따라 아래 뒤로 (공격은 이 각도에서 시작해 뒤로 끌어 올렸다가 머리 위를 지나 내리침)
export const GREATSWORD_HANG = 0.97;

// 양손 무기를 휘두를 방향: 칼이 언제나 화면 위쪽(머리 위)을 지나가게 - 주인공의 오른쪽(+1)/왼쪽(-1) 중 화면 위에 가까운 쪽
//   (예전엔 늘 오른쪽으로 돌아서, 오른쪽을 볼 때는 화면 아래를 지나 올려 치는 것처럼 보였음)
export function overheadSide(facing) {
  const up = -Math.PI / 2;
  const d = (a) => { const x = Math.abs(a - up) % (Math.PI * 2); return x > Math.PI ? Math.PI * 2 - x : x; };
  return d(facing + Math.PI / 2) <= d(facing - Math.PI / 2) ? 1 : -1;
}

// 주무기가 양손 무기인지 (대검 등 - 보조 칸이 잠김)
export function isTwoHanded(h = game.hero) {
  const w = h.equipment && h.equipment.weaponMain;
  return !!(w && w !== 'LOCKED' && w.handedness === 'two');
}

export function getAbstractHeroPose(t, speedN, h = game.hero) {
  // 왼손(보조)에 실제로 무기가 들려있을 때만 "쌍수"로 보고 양손 다 휘두름 - 방패/빈손이면 주무기 쪽만 동작
  const offGear = h.equipment.weaponOff;
  const dualWield = !!(offGear && offGear !== 'LOCKED' && offGear.category === 'weapon');
  const drift = Math.sin(h.moveStep) * speedN * 0.08;
  const pose = {
    bodyTwist: Math.sin(t * 1.4) * 0.008,
    left:  { handAngle: h.facing - 1.02 + drift, handDist: h.r * 0.40, bladeAngle: h.facing - 0.62 + drift, bladeScale: 0.95, trail: null },
    right: { handAngle: h.facing + 1.02 - drift, handDist: h.r * 0.40, bladeAngle: h.facing + 0.62 - drift, bladeScale: 0.95, trail: null }
  };

  if (h.leapTimer > 0) {
    pose.left  = { handAngle: h.facing - 0.24, handDist: h.r * 0.62, bladeAngle: h.facing - 0.10, bladeScale: 1.05, trail: null };
    pose.right = { handAngle: h.facing + 0.24, handDist: h.r * 0.62, bladeAngle: h.facing + 0.10, bladeScale: 1.05, trail: null };
  } else if (h.rushTimer > 0) {
    pose.bodyTwist = 0;
    pose.left  = { handAngle: h.facing - 0.20, handDist: h.r * 0.74, bladeAngle: h.facing - 0.08, bladeScale: 1.08, trail: null };
    pose.right = { handAngle: h.facing + 0.20, handDist: h.r * 0.74, bladeAngle: h.facing + 0.08, bladeScale: 1.08, trail: null };
  } else if (h.smashTimer > 0) {
    const elapsed = SMASH_DURATION - h.smashTimer;
    const p = Math.min(elapsed / SMASH_IMPACT_TIME, 1);
    const open = (1 - p) * 1.20 + 0.22;
    pose.bodyTwist = (1 - p) * -0.08;
    pose.left  = { handAngle: h.facing - open, handDist: h.r * (0.44 + p * 0.28), bladeAngle: h.facing - open * 0.82, bladeScale: 1.02, trail: null };
    pose.right = { handAngle: h.facing + open, handDist: h.r * (0.44 + p * 0.28), bladeAngle: h.facing + open * 0.82, bladeScale: 1.02, trail: null };
  } else if (h.whirlwindTimer > 0) {
    const a = h.whirlAngle;
    pose.bodyTwist = Math.sin(a * 2) * 0.045;
    if (dualWield) {
      pose.left  = { handAngle: a, handDist: h.r * 0.75, bladeAngle: a + 0.15, bladeScale: 1.02, trail: { from: a - 0.55, to: a + 0.14, alpha: 0.18 } };
    } else {
      // 한손무기 + 방패(또는 빈손) - 왼손은 회전시키지 않고 몸 앞에 붙여서 버팀
      pose.left = { handAngle: h.facing - Math.PI * 0.6, handDist: h.r * 0.40, bladeAngle: h.facing - Math.PI * 0.6, bladeScale: 1.0, trail: null };
    }
    pose.right = { handAngle: a + Math.PI, handDist: h.r * 0.75, bladeAngle: a + Math.PI + 0.15, bladeScale: 1.02, trail: { from: a + Math.PI - 0.55, to: a + Math.PI + 0.14, alpha: 0.18 } };
  } else if (h.attackTimer > 0) {
    // h.currentAttackDuration은 콤보로 빨라진 실제 스윙 시간(공격속도 스탯 반영) - 기존 ATTACK_DURATION 대신 사용
    const at = 1 - h.attackTimer / h.currentAttackDuration;
    const wind = easeOutCubic(clamp01(at / 0.18));
    const hit = easeOutCubic(clamp01((at - 0.18) / 0.72));
    const settle = easeOutCubic(clamp01((at - 0.82) / 0.18));

    const l0 = h.facing - 1.55 - wind * 0.16;
    const l1 = h.facing + 0.58;
    const r0 = h.facing + 1.55 + wind * 0.16;
    const r1 = h.facing - 0.58;
    const ra = lerpAngle(r0, r1, hit);
    const ext = h.r * (0.50 + hit * 0.28 - settle * 0.10);

    pose.bodyTwist = -0.09 + hit * 0.18 - settle * 0.09;
    if (dualWield) {
      const la = lerpAngle(l0, l1, hit);
      pose.left = {
        handAngle: la - 0.15,
        handDist: ext,
        bladeAngle: la,
        bladeScale: 1.04,
        trail: { from: la - 0.55, to: la - 0.06, alpha: Math.min(0.30, hit * 0.34) }
      };
    } else {
      // 한손무기 + 방패(또는 빈손) - 왼손은 휘두르지 않고 몸 앞으로 살짝 당겨 막는 자세만
      const braceAngle = h.facing - Math.PI * 0.62;
      pose.left = {
        handAngle: braceAngle,
        handDist: h.r * (0.42 + hit * 0.06),
        bladeAngle: braceAngle,
        bladeScale: 1.0,
        trail: null
      };
    }
    pose.right = {
      handAngle: ra + 0.15,
      handDist: ext,
      bladeAngle: ra,
      bladeScale: 1.04,
      trail: { from: ra + 0.55, to: ra + 0.06, alpha: Math.min(0.30, hit * 0.34) }
    };
  }

  // 한손 창: 기본 공격은 휘두르기 대신 찌르기
  if (h.attackTimer > 0 && !isTwoHanded(h) && h.equipment && h.equipment.weaponMain && h.equipment.weaponMain.variant === 'spear'
    && !(h.leapTimer > 0) && !(h.rushTimer > 0) && !(h.smashTimer > 0) && !(h.whirlwindTimer > 0)) {
    pose.right = thrustPose(h, 1 - h.attackTimer / h.currentAttackDuration, 0.9);
  }

  // 양손 무기 (스킬 동작 중이 아닐 때): 평소엔 몸 앞에 비스듬히 세워 들고, 공격은 뒤로 크게 젖혔다가 앞으로 넓게 휩쓺
  const mainW = h.equipment && h.equipment.weaponMain;
  const heavy = isTwoHanded(h) && WEAPON_HEAVY[mainW.variant];
  if (heavy && !(h.leapTimer > 0) && !(h.rushTimer > 0) && !(h.smashTimer > 0) && !(h.whirlwindTimer > 0) && !(h.flurryTimer > 0)) {
    // 손 위치(handDist)는 몸 가장자리(반지름 ≈ 1배) 밖 - 안쪽이면 손이 몸 한가운데(얼굴)에 겹쳐 보임
    // 대검: 평소엔 등에 멤(칼날이 어깨 너머 뒤로). 공격 = 더 들어 올림 → 멈칫(딜레이) → 뒤에서 머리 위를 지나 앞으로 크게 내리침 → 앞 아래로 늘어짐
    //   피해가 들어가는 순간 = windup 지점 (combat.updatePendingSwing)과 맞춤
    const side = overheadSide(h.facing); // 칼이 머리 위(화면 위쪽)를 지나는 방향
    const carry = h.facing + side * (Math.PI + GREATSWORD_HANG); // 등에 늘어진 각도 (메고 있을 때와 같음)
    if (h.attackTimer > 0) {
      const at = 1 - h.attackTimer / h.currentAttackDuration, w = heavy.windup;
      const raise = easeOutCubic(clamp01(at / (w * 0.5)));               // 늘어진 칼을 뒤로 끌어 올리기 (0 ~ 0.5w)
      const strike = easeOutCubic(clamp01((at - w * 0.77) / 0.22));      // 0.5w ~ 0.77w 멈칫, 그다음 빠르게 내리침 - windup 지점에서 칼이 거의 정면
      const back = h.facing + side * (Math.PI - 0.15);
      const end = h.facing - side * 0.4;
      const a = strike > 0 ? back + (end - back) * strike : carry + (back - carry) * raise; // 각도를 그대로 보간 → 머리 위를 지나 휩쓺
      pose.bodyTwist = side * (-0.14 * raise * (1 - strike) + strike * 0.22);
      pose.right = { handAngle: h.facing + side * (1.2 - strike * 1.3), handDist: h.r * (0.95 + strike * 0.15), bladeAngle: a, bladeScale: 1.0,
        trail: strike > 0 ? { from: a + side * 0.9, to: a + side * 0.06, alpha: Math.min(0.4, strike * 0.5) * (1 - clamp01((at - w - 0.2) / 0.2)) } : null };
    } else {
      pose.carry = true; // 메고 있음 - 손은 기본(빈손) 자세 그대로, 칼은 drawPlayer가 등에 그림
    }
  } else if (isTwoHanded(h) && !(h.leapTimer > 0) && !(h.rushTimer > 0) && !(h.smashTimer > 0) && !(h.whirlwindTimer > 0)) {
    if (h.attackTimer > 0 && mainW.variant === 'spear') {
      pose.right = thrustPose(h, 1 - h.attackTimer / h.currentAttackDuration, 0.6); // 양손 창: 두 손으로 자루를 잡고 찌르기
    } else if (h.attackTimer > 0) {
      const at = 1 - h.attackTimer / h.currentAttackDuration;
      const wind = easeOutCubic(clamp01(at / 0.25));
      const hit = easeOutCubic(clamp01((at - 0.25) / 0.6));
      const side = overheadSide(h.facing); // 머리 위(화면 위쪽)를 지나 휩쓺
      const r0 = h.facing + side * (1.7 + wind * 0.45), r1 = h.facing - side * 1.3;
      const ra = r0 + (r1 - r0) * hit;
      pose.bodyTwist = side * (-0.12 * wind + hit * 0.24);
      pose.right = { handAngle: ra + side * 0.5, handDist: h.r * (0.95 + hit * 0.15), bladeAngle: ra, bladeScale: 1.0,
        trail: { from: ra + side * 0.75, to: ra + side * 0.08, alpha: Math.min(0.34, hit * 0.4) } };
    } else {
      const drift = Math.sin(h.moveStep) * speedN * 0.06;
      pose.right = { handAngle: h.facing + 0.9 + drift, handDist: h.r * 0.95, bladeAngle: h.facing - 0.55 + drift * 0.5, bladeScale: 1.0, trail: null };
    }
  }

  return pose;
}

