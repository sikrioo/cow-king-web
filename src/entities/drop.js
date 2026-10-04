// 바닥 아이템 (소모품/장비/재료)

export class Item {
  constructor(x, y, type, gearData = null) {
    this.x = x;
    this.y = y;
    this.type = type; // 'heal'|'vitality'|'speed'|'attack'|'defense'|'gear'
    this.gearData = gearData;
    this.life = 14;
    this.bob = Math.random() * 10;
    this.spawnT = 0;
  }
}
