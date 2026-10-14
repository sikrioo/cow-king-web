// 전술 조언자 연결 (2026-10-14 사용자: 의사결정 모델 JEV를 붙여 보고 싶음 - https://typesafe.ai)
//   매 틱 조작은 휴리스틱 봇이 하고, 조언자는 interval초마다 "지금 전술"만 정함 (응답이 늦어도 게임은 안 멈춤 - 마지막 답을 씀)
//   ask(질문) → Promise<{ tactic, confidence }>  tactic: 'fight'(그대로) | 'retreat'(무리에서 빠짐) | 'loot'(줍기 먼저) | 'hold'(제자리에서만 싸움)
//   confidence가 minConfidence보다 낮으면 무시(= 'fight'). 실제 JEV API 호출은 ask 안에서 - 키·형식이 정해지면 그 함수만 만들면 됨
import { toJSON } from './observe.js';

export const TACTICS = ['fight', 'retreat', 'loot', 'hold'];

// 조언자에게 보낼 질문: 선택지(타입) + 판단에 필요한 요약 + 게임 규칙 한 줄씩
export function buildQuestion(obs) {
  const o = toJSON(obs);
  const near = o.monsters.filter((m) => !m.prop).sort((a, b) => a.dist - b.dist).slice(0, 12);
  return {
    question: '카우 킹 봇의 다음 몇 초 전술을 고르시오',
    choices: TACTICS,
    rules: [
      'fight: 가까운 적을 공격, 스킬은 준비되면 사용',
      'retreat: 적 무리 반대쪽으로 달려서 빠짐 (체력이 낮고 둘러싸였을 때)',
      'loot: 바닥 아이템을 먼저 주움 (적이 멀 때)',
      'hold: 움직이지 않고 사거리 안 적만 공격',
      '물리 공격은 빗나갈 수 있고 마법은 항상 맞음, 구조물은 지나갈 수 없고 투사체를 막음'
    ],
    state: {
      hero: o.hero, act: o.act, wave: o.wave,
      monsters: near.map(({ kind, dist, hp, maxHp, ranged, threat, boss }) => ({ kind, dist, hp, maxHp, ranged, threat, boss })),
      dangers: o.dangers.length, shots: o.shots.length, items: o.items.length
    }
  };
}

// 조언자 상태 (bot.js가 매 틱 tickAdvisor)
const adv = { ask: null, interval: 1, minConfidence: 0.6, t: 0, pending: false, tactic: 'fight', last: null, errors: 0 };

export function setAdvisor(ask, opts = {}) {
  adv.ask = ask || null;
  adv.interval = opts.interval || 1;
  adv.minConfidence = opts.minConfidence != null ? opts.minConfidence : 0.6;
  adv.t = 0; adv.pending = false; adv.tactic = 'fight'; adv.last = null;
}

export function tickAdvisor(obs, dt) {
  if (!adv.ask) return 'fight';
  adv.t -= dt;
  if (adv.t <= 0 && !adv.pending && obs.screen === 'playing') {
    adv.t = adv.interval;
    adv.pending = true;
    Promise.resolve().then(() => adv.ask(buildQuestion(obs)))
      .then((r) => {
        adv.last = r;
        adv.tactic = r && TACTICS.includes(r.tactic) && (r.confidence == null || r.confidence >= adv.minConfidence) ? r.tactic : 'fight';
      })
      .catch(() => { adv.errors++; adv.tactic = 'fight'; })
      .finally(() => { adv.pending = false; });
  }
  return adv.tactic;
}

export function advisorState() { return { tactic: adv.tactic, last: adv.last, errors: adv.errors, on: !!adv.ask }; }
