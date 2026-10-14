// 휴리스틱 봇 판단 수치 (src/bot/heuristic.js) - 게임 밸런스가 아니라 봇의 버릇
//   healAt/manaAt: 체력·마나가 최대치의 이 비율 아래면 물약 / dodgePad: 위험 원에서 이만큼 더 떨어지면 안전
//   lineWatch: 돌진 줄을 살피는 거리, lineWidth: 줄에서 옆으로 이만큼 안이면 비킴 / shotWatch: 이 거리 안 투사체만 피함
//   castRange*: 가장 가까운 적이 이 안이면 스킬 / sorcKeep: 마법사가 유지하는 거리 / edge: 맵 끝에서 이만큼은 피함
//   lootRange: 적이 없을 때 주우러 가는 거리 / homeRadius: 적이 없으면 맵 가운데에서 이만큼 안으로 / flowWait: 화면 넘기기 전 기다림(초)
//   stuckTime/unstuckTime: 이만큼 제자리면 옆으로 이만큼 움직여 빠져나옴
//   meleeLos/shotRadius: 적이 이 거리보다 멀고 사이를 구조물이 막으면(투사체 반지름 기준) 쏘지 않고 돌아감
//   avoidLook: 가려는 쪽 이 거리 안 구조물은 둘레로 비켜 감 / approachPad: 적이 사거리 + 이만큼보다 멀면 직접 걸어감(구조물 비켜서)
//   crowdRadius/crowdCount: 이 반경 안 적이 이만큼 이상이고 체력이 crowdHp 아래면 무리 반대쪽으로 retreatTime초 빠짐(달리기), 그 뒤 retreatCd초는 다시 안 빠짐(계속 도망만 다니지 않게)
export const BOT = {
  healAt: 0.4, manaAt: 0.2, dodgePad: 14,
  lineWatch: 420, lineWidth: 46, shotWatch: 180,
  castRangeWarrior: 170, castRangeSorc: 380, sorcKeep: 170, edge: 150,
  lootRange: 650, homeRadius: 260, flowWait: 1.5,
  stuckTime: 1.0, unstuckTime: 0.5,
  avoidLook: 60, approachPad: 30, meleeLos: 70, shotRadius: 6,
  crowdRadius: 110, crowdCount: 4, crowdHp: 0.65, retreatTime: 1.0, retreatCd: 4
};
