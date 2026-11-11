import { reservableObjects, restReserveObjects, type PaymentObject } from './analyticsObjectPayments.js';
import type { Card } from './api-types.js';
import { aggregateLines, type AnalyticsDeck } from './fixtureResources.js';

const ENGINE = ['Academy Guide', 'Dungeon Guide', 'Epicurean Institute', 'Dormant Sacrificial Altar', 'Hub of Innovation', 'The Eternal Kingdom', 'Cordelia, Aurous Kaiser', 'Automata Genesis', 'Neos Sight'];
const OBELISKS = ['Obelisk of Fabrication', 'Obelisk of Armaments', 'Obelisk of Protection'];
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
  for (const name of ['Automaton Drone', 'Titan Mk II']) {
    if (catalog.get(name)?.power == null) missing.push(name);
  }
  if (missing.length) return { missing, points: [], sources: [] };
  const sources = main.filter(line => ENGINE.includes(line.name));
  const libraryBase = main.slice().sort((a, b) => a.name.localeCompare(b.name)).flatMap(line => Array.from({ length: line.quantity }, () => line.name));
  const count = Math.max(1, Math.floor(samples));
  let seed = 1739;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const totals = Array.from({ length: 5 }, () => ({ seen: [] as number[], extra: [] as number[], saved: [] as number[], tokenPaid: [] as number[], fabricated: [] as number[], weapons: [] as number[], prevention: [] as number[], titans: [] as number[], tokenBuffs: [] as number[], tokenPower: [] as number[], readyTokenPower: [] as number[], domainPaid: [] as number[], upkeepPaid: [] as number[], upkeepLost: [] as number[], plays: new Map<string, number>(), level3: 0, bonus: 0, preventionReady: 0 }));
  for (let sample = 0; sample < count; sample++) {
    const library = libraryBase.slice();
    for (let i = library.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [library[i], library[j]] = [library[j], library[i]]; }
    let seen = 0, level = 0, saved = 0, obelisks = 0, drones = 0, titans = 0, tokenBuffs = 0, fabricated = 0, weapons = 0, tokenPaid = 0, domainPaid = 0, upkeepPaid = 0, upkeepLost = 0, bonus = 0;
    let objects: (PaymentObject & { buffs: number })[] = [];
    const addObject = (name: string, token = false, buffs = 0) => objects.push({ name, buffs, domain: token ? OBELISKS.includes(name) : !!catalog.get(name)?.types.includes('DOMAIN'), token, rested: false });
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
    const domainGrant = () => level > 0 && board.includes('The Eternal Kingdom');
    const tokenGrant = () => board.includes('Cordelia, Aurous Kaiser');
    const availableObjects = () => reservableObjects(objects, domainGrant(), tokenGrant());
    const payReserve = (cost: number) => {
      const payment = restReserveObjects(objects, cost, domainGrant(), tokenGrant());
      domainPaid += payment.domains;
      tokenPaid += payment.tokens;
      memory.push(...pay(hand, cost - payment.count));
    };
    const reserveBudget = () => hand.length + availableObjects().length;
    const activation = (name: string, printed: number) => {
      const source = objects.find(object => object.name === name && !object.rested);
      if (!source) return null;
      const cost = Math.max(0, printed - objects.filter(object => object.domain).length);
      // The activation's REST cost and reservable cannot use the same object.
      const budget = reserveBudget() - Number(availableObjects().includes(source));
      return cost <= budget ? { source, cost } : null;
    };
    const summonFromObelisk = (name: string, printed: number, token: string) => {
      const available = activation(name, printed);
      if (!available) return false;
      available.source.rested = true;
      payReserve(available.cost);
      addObject(token, true, token === 'Automaton Drone' ? 1 : 0);
      if (token === 'Automaton Drone') { drones++; fabricated++; tokenBuffs++; }
      else weapons++;
      return true;
    };
    draw(hand, 7);
    for (let turn = 1; turn <= 5; turn++) {
      for (const object of objects) object.rested = false; // wake-up
      if (turn > 1 && level < 3) {
        const printed = catalog.get(LINEAGE[level])!.cost_memory;
        const guides = board.filter(name => name === 'Academy Guide').length;
        if (printed != null && printed >= 0) {
          const cost = Math.max(0, printed - guides);
          if (memory.length >= cost) { banishMemory(cost); saved += printed - cost; level++; }
        }
      }
      // Genesis chooses a different Obelisk each recollection, up to three.
      if (level === 3 && obelisks < 3) { addObject(OBELISKS[obelisks], true); obelisks++; }
      // Resolve Genesis, then upkeep, then Institute, all before recollecting memory.
      if (board.includes('The Eternal Kingdom')) {
        if (reserveBudget() >= 2) { payReserve(2); upkeepPaid += 2; }
        else { board = board.filter(name => name !== 'The Eternal Kingdom'); objects = objects.filter(object => object.name !== 'The Eternal Kingdom'); upkeepLost++; }
      }
      const institutes = board.filter(name => name === 'Epicurean Institute').length;
      board = board.filter(name => name !== 'Epicurean Institute');
      objects = objects.filter(object => object.name !== 'Epicurean Institute');
      draw(hand, institutes); // sacrifice is not destruction; no Test Subject is generated
      hand.push(...memory); memory = [];
      if (turn > 1) draw(hand);
      while (true) {
        const name = ENGINE.find(candidate => {
          if (!hand.includes(candidate) || (catalog.get(candidate)?.element === 'NEOS' && level < 3)) return false;
          if ((candidate === 'Cordelia, Aurous Kaiser' || candidate === 'The Eternal Kingdom') && board.includes(candidate)) return false; // retain the existing unique object
          const cost = catalog.get(candidate)?.cost_reserve;
          return cost != null && cost >= 0 && cost <= reserveBudget() - 1;
        });
        if (!name) {
          if (summonFromObelisk(OBELISKS[0], 6, 'Automaton Drone')) continue;
          if (summonFromObelisk(OBELISKS[1], 5, 'Aurousteel Greatsword')) continue;
          break;
        }
        hand.splice(hand.indexOf(name), 1);
        const cost = catalog.get(name)!.cost_reserve!;
        payReserve(cost);
        played.add(name);
        if (name === 'Neos Sight') {
          draw(hand);
          if (1 + board.length + obelisks + drones + titans + weapons >= 8) { const before = seen; draw(memory); bonus += seen - before; }
        } else if (name === 'Automata Genesis') {
          titans += 3;
          for (let i = 0; i < 3; i++) addObject('Titan Mk II', true);
          // Tonoris bonus counts all tokens; counters go only on token allies.
          const addedBuffs = obelisks + drones + titans + weapons;
          for (const object of objects) {
            if (object.token && catalog.get(object.name)?.types.includes('ALLY')) object.buffs += addedBuffs;
          }
          tokenBuffs += addedBuffs * (drones + titans);
        } else {
          board.push(name);
          addObject(name);
          if (name === 'Dungeon Guide' && level < 3 && memory.length >= 2) {
            banishMemory(2); // effect requirement, not a discounted materialization cost
            level++;
          }
          if (name === 'Cordelia, Aurous Kaiser') { drones += 2; addObject('Automaton Drone', true); addObject('Automaton Drone', true); }
          if (name === 'Hub of Innovation' || name === 'Dormant Sacrificial Altar') draw(memory);
        }
      }
      const total = totals[turn - 1];
      total.seen.push(seen);
      total.extra.push(seen - Math.min(library.length, 6 + turn));
      total.saved.push(saved);
      total.tokenPaid.push(tokenPaid);
      total.fabricated.push(fabricated);
      total.weapons.push(weapons);
      // End-of-turn capacity, not damage prevented or a cumulative total.
      const prevention = activation(OBELISKS[2], 4) ? 2 : 0;
      total.prevention.push(prevention);
      if (prevention) total.preventionReady++;
      total.titans.push(titans);
      total.tokenBuffs.push(tokenBuffs);
      const tokenAllies = objects.filter(object => object.token && catalog.get(object.name)?.types.includes('ALLY'));
      const tokenPower = (object: typeof objects[number]) => catalog.get(object.name)!.power! + object.buffs;
      total.tokenPower.push(tokenAllies.reduce((sum, object) => sum + tokenPower(object), 0));
      // Snapshot after payments, before end phase: Vigor has not woken Titans yet.
      total.readyTokenPower.push(tokenAllies.filter(object => !object.rested).reduce((sum, object) => sum + tokenPower(object), 0));
      total.domainPaid.push(domainPaid);
      total.upkeepPaid.push(upkeepPaid);
      total.upkeepLost.push(upkeepLost);
      if (level === 3) total.level3++;
      if (bonus > 0) total.bonus++;
      for (const name of played) total.plays.set(name, (total.plays.get(name) ?? 0) + 1);
    }
  }
  return { missing, sources, points: totals.map((total, i) => ({
    turn: i + 1, natural: Math.min(libraryBase.length, 7 + i), seen: range(total.seen), extra: range(total.extra), saved: range(total.saved), tokenPaid: range(total.tokenPaid),
    fabricated: range(total.fabricated), weapons: range(total.weapons), prevention: range(total.prevention), titans: range(total.titans), tokenBuffs: range(total.tokenBuffs), tokenPower: range(total.tokenPower), readyTokenPower: range(total.readyTokenPower),
    domainPaid: range(total.domainPaid), upkeepPaid: range(total.upkeepPaid), upkeepLost: range(total.upkeepLost),
    preventionReady: total.preventionReady / count, level3: total.level3 / count, bonus: total.bonus / count,
    plays: sources.map(source => ({ ...source, probability: (total.plays.get(source.name) ?? 0) / count })),
  })) };
}

/** Identical sequence policy on both sides; unavailable data never becomes zero. */
export function compareTonorisDrawReports(baseline: AnalyticsDeck, target: AnalyticsDeck, catalog: ReadonlyMap<string, Card>, samples = 1024) {
  const before = computeTonorisDrawReport(baseline, catalog, samples);
  const after = computeTonorisDrawReport(target, catalog, samples);
  if (!before && !after) return null;
  if (!before || !after) return { status: 'unsupported' as const, points: [], sources: [] };
  if (before.missing.length || after.missing.length) return { status: 'missing' as const, points: [], sources: [] };
  return { status: 'ready' as const,
    points: before.points.filter(point => point.turn === 3 || point.turn === 5).map(point => {
      const other = after.points[point.turn - 1];
      return { turn: point.turn, before: point, after: other,
        medianSeenDelta: other.seen.median - point.seen.median,
        level3Delta: (other.level3 - point.level3) * 100,
        bonusDelta: (other.bonus - point.bonus) * 100 };
    }),
    sources: [...new Set([...before.sources, ...after.sources].map(source => source.name))].map(name => ({
      name, before: before.sources.find(source => source.name === name)?.quantity ?? 0,
      after: after.sources.find(source => source.name === name)?.quantity ?? 0,
      beforePlayed: before.points[4].plays.find(source => source.name === name)?.probability ?? 0,
      afterPlayed: after.points[4].plays.find(source => source.name === name)?.probability ?? 0,
    })),
  };
}
