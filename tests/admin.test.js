// 관리자 페이지: 탭마다 그리기가 오류 없이 끝나고 데이터가 표에 들어가는지 (아주 작은 가짜 DOM으로)
import { it, expect, vi } from 'vitest';

// el/table이 쓰는 만큼만 흉내: append, innerHTML, className, setAttribute, addEventListener, textContent
class FakeNode {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this._html = ''; this.className = ''; this.style = {}; }
  append(...cs) { cs.forEach((c) => this.children.push(c)); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(t, f) { this.listeners[t] = f; }
  set innerHTML(v) { this._html = v; this.children = []; }
  get innerHTML() { return this._html; }
  get text() { return this._html + this.children.map((c) => (c instanceof FakeNode ? c.text : String(c))).join(' '); }
}

function installFakeDom() {
  const prev = { document: globalThis.document, Node: globalThis.Node };
  globalThis.Node = FakeNode;
  globalThis.document = { createElement: (t) => new FakeNode(t) };
  return () => { globalThis.document = prev.document; globalThis.Node = prev.Node; };
}

it('관리자 탭 전부 그리기 (몬스터·스킬·장비·드랍·시뮬레이터·성장)', async () => {
  const restore = installFakeDom();
  try {
    vi.resetModules();
    const tabs = {
      monsters: (await import('../src/admin/tabs/monsters.js')).renderMonsters,
      skills: (await import('../src/admin/tabs/skills.js')).renderSkills,
      items: (await import('../src/admin/tabs/items.js')).renderItems,
      drops: (await import('../src/admin/tabs/drops.js')).renderDrops,
      sim: (await import('../src/admin/tabs/sim.js')).renderSim,
      progress: (await import('../src/admin/tabs/progress.js')).renderProgress
    };
    const texts = {};
    for (const [name, render] of Object.entries(tabs)) {
      const root = new FakeNode('main');
      render(root);
      expect(root.children.length, name).toBeGreaterThan(0);
      texts[name] = root.text;
    }
    expect(texts.monsters).toContain('카우킹');
    expect(texts.skills).toContain('얼음보주');
    expect(texts.items).toContain('power');
    expect(texts.drops).toContain('버려진 외양간');
    expect(texts.sim).toContain('장비 등급');
  } finally { restore(); }
});
