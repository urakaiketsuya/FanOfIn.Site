import type { Card } from './api-types.js';
import { aggregateLines, type AnalyticsDeck } from './fixtureResources.js';

const ENGINE = ['Academy Guide', 'Dungeon Guide', 'Epicurean Institute', 'Dormant Sacrificial Altar', 'Hub of Innovation', 'Cordelia, Aurous Kaiser', 'Neos Sight'];
const LINEAGE = ['Tonoris, Lone Mercenary', 'Tonoris, Might of Humanity', 'Tonoris, Genesis Aegis'];
export const tonorisDrawSources = ENGINE;
export interface DrawRange { low: number; median: number; high: number }
const range = (values: number[]): DrawRange => {
  const sorted = values.slice().sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? 0;
  return { low: at(.1), median: at(.5), high: at(.9) };
};

/** Isolated, draw-focused sequence. No opposing removal or unreviewed Main plays. */
export function computeTonorisDrawReport(deck: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, samples = 1024) {
  const main = aggregateLines(deck.main);
  const material = new Set(deck.material.filter(line => line.quantity > 0).map(line => line.name));
  if (!material.has('Spirit of Water') || !LINEAGE.every(name => material.has(name))) return null;
  const missing = [...main, ...deck.material].filter(line => !catalog.has(line.name)).map(line => line.name);
  if (missing.length) return { missing, points: [], sources: [] };
  const sources = main.filter(line => ENGINE.includes(line.name));
  const libraryBase = main.slice().sort((a, b) => a.name.localeCompare(b.name)).flatMap(line => Array.from({ length: line.quantity }, () => line.name));
  const count = Math.max(1, Math.floor(samples));
  let seed = 1739;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const totals = Array.from({ length: 5 }, () => ({ seen: [] as number[], extra: [] as number[], saved: [] as number[], tokenPaid: [] as number[], plays: new Map<string, number>(), level3: 0, bonus: 0 }));
  for (let sample = 0; sample < count; sample++) {
    const library = libraryBase.slice();
    for (let i = library.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [library[i], library[j]] = [library[j], library[i]]; }
    let seen = 0, level = 0, saved = 0, obelisks = 0, drones = 0, restedTokens = 0, tokenPaid = 0, bonus = 0;
    let hand: string[] = [], memory: string[] = [];
    let board: string[] = [];
    const played = new Set<string>();
    const draw = (zone: string[], amount = 1) => { while (amount-- > 0 && seen < library.length) zone.push(library[seen++]); };
    // Reserve selection retains reviewed engine cards; ties are stable within the shuffle.
    const pay = (zone: string[], amount: number) => {
      zone.sort((a, b) => Number(ENGINE.includes(a)) - Number(ENGINE.includes(b)));
      return zone.splice(0, amount);
    };
    const banishMemory = (amount: number) => { for (let paid = 0; paid < amount; paid++) memory.splice(Math.floor(random() * memory.length), 1); };
    const availableTokens = () => board.includes('Cordelia, Aurous Kaiser') ? obelisks + drones - restedTokens : 0;
    draw(hand, 7);
    for (let turn = 1; turn <= 5; turn++) {
      restedTokens = 0; // wake-up refreshes the shared token payment pool
      if (turn > 1 && level < 3) {
        const printed = catalog.get(LINEAGE[level])!.cost_memory;
        const guides = board.filter(name => name === 'Academy Guide').length;
        if (printed != null && printed >= 0) {
          const cost = Math.max(0, printed - guides);
          if (memory.length >= cost) { banishMemory(cost); saved += printed - cost; level++; }
        }
      }
      // Genesis chooses a different Obelisk each recollection, up to three.
      if (level === 3) obelisks = Math.min(3, obelisks + 1);
      const institutes = board.filter(name => name === 'Epicurean Institute').length;
      board = board.filter(name => name !== 'Epicurean Institute');
      draw(hand, institutes); // sacrifice is not destruction; no Test Subject is generated
      hand.push(...memory); memory = [];
      if (turn > 1) draw(hand);
      while (true) {
        const name = ENGINE.find(candidate => {
          if (!hand.includes(candidate) || (catalog.get(candidate)?.element === 'NEOS' && level < 3)) return false;
          if (candidate === 'Cordelia, Aurous Kaiser' && board.includes(candidate)) return false; // retain the existing unique ally
          const cost = catalog.get(candidate)?.cost_reserve;
          return cost != null && cost >= 0 && cost <= hand.length - 1 + availableTokens();
        });
        if (!name) break;
        hand.splice(hand.indexOf(name), 1);
        const cost = catalog.get(name)!.cost_reserve!;
        const tokenPayment = Math.min(cost, availableTokens());
        restedTokens += tokenPayment;
        tokenPaid += tokenPayment;
        memory.push(...pay(hand, cost - tokenPayment));
        played.add(name);
        if (name === 'Neos Sight') {
          draw(hand);
          if (1 + board.length + obelisks + drones >= 8) { const before = seen; draw(memory); bonus += seen - before; }
        } else {
          board.push(name);
          if (name === 'Dungeon Guide' && level < 3 && memory.length >= 2) {
            banishMemory(2); // effect requirement, not a discounted materialization cost
            level++;
          }
          if (name === 'Cordelia, Aurous Kaiser') drones += 2;
          if (name === 'Hub of Innovation' || name === 'Dormant Sacrificial Altar') draw(memory);
        }
      }
      const total = totals[turn - 1];
      total.seen.push(seen);
      total.extra.push(seen - Math.min(library.length, 6 + turn));
      total.saved.push(saved);
      total.tokenPaid.push(tokenPaid);
      if (level === 3) total.level3++;
      if (bonus > 0) total.bonus++;
      for (const name of played) total.plays.set(name, (total.plays.get(name) ?? 0) + 1);
    }
  }
  return { missing, sources, points: totals.map((total, i) => ({
    turn: i + 1, natural: Math.min(libraryBase.length, 7 + i), seen: range(total.seen), extra: range(total.extra), saved: range(total.saved), tokenPaid: range(total.tokenPaid),
    level3: total.level3 / count, bonus: total.bonus / count,
    plays: sources.map(source => ({ ...source, probability: (total.plays.get(source.name) ?? 0) / count })),
  })) };
}
