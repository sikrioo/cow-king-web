// 드랍 굴리기와 줍기
import { INVENTORY_SIZE, POTION_MAX } from '../data/balance.js';
import { DROP_RATES, DROP_SCATTER, POTION_DROP_WEIGHTS, DISCARD_ITEM_LIFE } from '../data/drops.js';
import { ITEM_STYLE } from '../data/items.js';
import { game, ui } from '../state.js';
import { Item } from '../entities/drop.js';
import { spawnHitParticles, floatText } from './fx.js';
import { rollGearItem } from './gear.js';
import { applyItem } from './potions.js';
import { unidentifiedTitle } from '../ui/itemView.js';
import { MONSTERS } from '../data/monsters.js';

// 가방 장비 버리기: 주인공 발밑에 떨어뜨림 (다시 주울 수 있음, DISCARD_ITEM_LIFE초 뒤 사라짐)
export function discardFromInventory(index) {
  const gear = game.hero.inventory[index];
  if (!gear) return null;
  game.hero.inventory.splice(index, 1);
  if (ui.identifyingItem === gear) ui.identifyingItem = null;
  const it = new Item(game.hero.x, game.hero.y + 8, 'gear', gear);
  it.life = DISCARD_ITEM_LIFE;
  it.dropped = true;
  game.items.push(it);
  return gear;
}

// 죽은 몬스터의 드랍 출처 (data/drops.js DROP_RATES 키)
export function dropSource(c) {
  if (c.mapBoss) return 'mapBoss';
  if (c.kind === 'boss' || (MONSTERS[c.kind] && MONSTERS[c.kind].boss)) return 'boss';
  return c.kind !== 'normal' ? 'elite' : 'normal';
}

// source: 드랍 출처 키 (예전 호출 호환: true = elite, false = normal), ilvl: 장비 아이템 레벨(죽은 몬스터 레벨)
export function dropLoot(x, y, source, count, ilvl = 1) {
  const src = typeof source === 'string' ? source : source ? 'elite' : 'normal';
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * DROP_SCATTER;
    const px = x + Math.cos(ang) * dist, py = y + Math.sin(ang) * dist;

    const rates = DROP_RATES[src] || DROP_RATES.normal;
    // 파밍 맵 난이도: 장비 드랍 확률 배율(최대 1), 높은 등급 비중 배율 (목장은 1 = 기본)
    if (Math.random() < Math.min(1, rates.gear * game.run.gearDropMul)) {
      game.items.push(new Item(px, py, 'gear', rollGearItem({ source: src, ilvl, rarityBoost: game.run.rarityBoost })));
      continue;
    }
    if (Math.random() < rates.material) {
      game.items.push(new Item(px, py, 'material'));
      continue;
    }
    if (rates.consumable < 1 && Math.random() > rates.consumable) continue; // 확률 1이면 굴리지 않음 (난수 소비도 그대로)
    game.items.push(new Item(px, py, rollConsumableType()));
  }
}

export function updateItems(dt) {
  for (let i = game.items.length - 1; i >= 0; i--) {
    const it = game.items[i];
    if (it.spawnT < 1) it.spawnT = Math.min(it.spawnT + dt * 6, 1);
    it.life -= dt;
    if (it.warnCd > 0) it.warnCd -= dt;
    if (it.life <= 0) { game.items.splice(i, 1); continue; }
    if (game.hero.alive) {
      const d = Math.hypot(game.hero.x - it.x, game.hero.y - it.y);
      // 방금 버린 장비는 발에서 한 번 벗어난 뒤에야 다시 주움 (버리자마자 다시 줍지 않게)
      if (it.dropped) {
        if (d > game.hero.r + 26) it.dropped = false;
        else continue;
      }
      if (d <= game.hero.r + 16) {
        if (it.type === 'gear') {
          if (game.hero.inventory.length >= INVENTORY_SIZE) {
            if (!(it.warnCd > 0)) { floatText(game.hero.x, game.hero.y - 40, '인벤토리 가득!', '#ff5b52'); it.warnCd = 1.5; } // 매 프레임 도배되지 않게 간격 둠
            continue; // 바닥에 그대로 둠
          }
          game.hero.inventory.push(it.gearData);
          // 미감정 상태로 줍는 것이므로 등급은 아직 알려주지 않음 (감정해야 공개됨)
          floatText(it.x, it.y - 30, `${unidentifiedTitle(it.gearData)} 획득`, '#c9c9c9');
          spawnHitParticles(it.x, it.y, '#9a9a9a', 8);
        } else if (it.type === 'material') {
          game.hero.materials++;
          floatText(it.x, it.y - 30, `재료 +1 (보유 ${game.hero.materials})`, '#c9c9c9');
          spawnHitParticles(it.x, it.y, '#c9c9c9', 6);
        } else if (it.type === 'heal' || it.type === 'mana') {
          if (game.hero.potions[it.type] >= POTION_MAX) {
            if (!(it.warnCd > 0)) { floatText(game.hero.x, game.hero.y - 40, '물약 가득!', '#ff5b52'); it.warnCd = 1.5; }
            continue; // 바닥에 그대로 둠
          }
          game.hero.potions[it.type] += 1;
          floatText(it.x, it.y - 30, `${it.type === 'heal' ? '생명' : '마나'} 물약 +1 (${game.hero.potions[it.type]})`, ITEM_STYLE[it.type].color);
          spawnHitParticles(it.x, it.y, ITEM_STYLE[it.type].color, 8);
        } else {
          applyItem(it.type);
          spawnHitParticles(it.x, it.y, ITEM_STYLE[it.type].color, 8);
        }
        game.shake = Math.min(game.shake + 2, 12);
        game.items.splice(i, 1);
      }
    }
  }
}

export function rollConsumableType() {
  const entries = Object.entries(POTION_DROP_WEIGHTS);
  let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [type, w] of entries) { r -= w; if (r <= 0) return type; }
  return 'heal';
}
