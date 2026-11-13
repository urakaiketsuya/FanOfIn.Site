import type { CompositionDeck, CompositionExtension, CompositionMatch } from './cardCompositionValidation.js';

export interface GroupOptions {
  minimumMatches: number;
  minimumEvents: number;
  minimumPlayers: number;
  maximumSingles: number;
  beamWidth: number;
  maximumPerSize: number;
}
export const groupDefaults: GroupOptions = {
  minimumMatches: 100, minimumEvents: 20, minimumPlayers: 20,
  maximumSingles: 150, beamWidth: 200, maximumPerSize: 100,
};
export interface SupportedGroup {
  cards: string[];
  matches: number;
  events: number;
  players: number;
}
const key = (cards: string[]) => JSON.stringify([...new Set(cards)].sort());
const intersect = (a: number[], b: Set<number>) => a.filter(i => b.has(i));

/** Composition-only beam search, not exhaustive itemset mining. No outcomes are read. */
export function discoverGroups(rows: CompositionMatch[], nominations: string[][] = [], options = groupDefaults) {
  const decks: { cards: Set<string>; matches: Set<number>; events: Set<string>; players: Set<string> }[] = [];
  const ids = new Map<string, number>();
  rows.forEach((r, i) => {
    for (const [deck, player] of [[r.a, r.playerA], [r.b, r.playerB]] as const) {
      let index = ids.get(deck.identity);
      if (index === undefined) {
        index = decks.length; ids.set(deck.identity, index);
        decks.push({ cards: new Set(deck.cards.filter(([, q]) => q > 0).map(([n]) => n)), matches: new Set(), events: new Set(), players: new Set() });
      }
      const d = decks[index]; d.matches.add(i); d.events.add(r.event);
      if (player) d.players.add(player);
    }
  });
  const vertical = new Map<string, Set<number>>();
  decks.forEach((d, i) => { for (const c of d.cards) { const set = vertical.get(c) ?? new Set<number>(); set.add(i); vertical.set(c, set); } });
  const support = (indices: number[], cards: string[]): SupportedGroup => {
    const matches = new Set<number>(), events = new Set<string>(), players = new Set<string>();
    for (const i of indices) {
      for (const m of decks[i].matches) matches.add(m);
      for (const e of decks[i].events) events.add(e);
      for (const p of decks[i].players) players.add(p);
    }
    return { cards, matches: matches.size, events: events.size, players: players.size };
  };
  const eligible = (s: SupportedGroup) => s.matches >= options.minimumMatches && s.events >= options.minimumEvents && s.players >= options.minimumPlayers;
  const order = (a: SupportedGroup, b: SupportedGroup) => b.matches - a.matches || key(a.cards).localeCompare(key(b.cards));
  const singles = [...vertical].map(([c, indices]) => support([...indices], [c])).filter(eligible).sort(order).slice(0, options.maximumSingles);
  let beam = singles.map(s => ({ ...s, indices: [...vertical.get(s.cards[0])!] }));
  const recurring: SupportedGroup[] = [];
  const levels: { size: number; candidates: number; eligible: number; retained: number }[] = [];
  for (let size = 2; size <= 5; size++) {
    const candidates = new Map<string, { cards: string[]; indices: number[]; upper: number }>();
    for (const parent of beam) for (const single of singles) {
      const card = single.cards[0];
      if (parent.cards.includes(card)) continue;
      const cards = [...parent.cards, card].sort(), id = key(cards);
      if (candidates.has(id)) continue;
      const indices = intersect(parent.indices, vertical.get(card)!);
      // Sum is only a pruning upper bound; exact support below deduplicates both sides.
      const upper = indices.reduce((s, i) => s + decks[i].matches.size, 0);
      if (upper >= options.minimumMatches) candidates.set(id, { cards, indices, upper });
    }
    const ranked = [...candidates.values()].sort((a, b) => b.upper - a.upper || key(a.cards).localeCompare(key(b.cards)));
    const retained: typeof beam = [];
    let evaluatedEligible = 0;
    for (const candidate of ranked) {
      if (retained.length >= options.beamWidth && candidate.upper < retained.at(-1)!.matches) break;
      const s = support(candidate.indices, candidate.cards);
      if (!eligible(s)) continue;
      evaluatedEligible++;
      retained.push({ ...s, indices: candidate.indices }); retained.sort(order);
      if (retained.length > options.beamWidth) retained.pop();
    }
    beam = retained;
    levels.push({ size, candidates: candidates.size, eligible: evaluatedEligible, retained: beam.length });
    if (size >= 3) recurring.push(...beam.slice(0, options.maximumPerSize).map(({ indices: _, ...s }) => s));
  }
  const nominated = [...new Set(nominations.map(key))].map(k => JSON.parse(k) as string[]).filter(c => c.length >= 3 && c.length <= 5);
  const packages = nominated.map(cards => {
    let indices = [...(vertical.get(cards[0]) ?? [])];
    for (const c of cards.slice(1)) indices = intersect(indices, vertical.get(c) ?? new Set());
    return support(indices, cards);
  }).filter(eligible).sort(order);
  return { recurring, packages, options, levels, nominatedPackages: nominated.length, trainingDecks: decks.length };
}

/** Presence and partial completion are separately fitted; never sum package win rates. */
export function groupExtension(name: string, groups: SupportedGroup[], completeness = false): CompositionExtension {
  const cache = new Map<string, Map<string, number>>();
  return { name, features(deck: CompositionDeck) {
    let features = cache.get(deck.identity);
    if (features) return features;
    features = new Map();
    const cards = new Set(deck.cards.filter(([, q]) => q > 0).map(([n]) => n));
    for (const group of groups) {
      const count = group.cards.filter(c => cards.has(c)).length;
      const id = key(group.cards);
      if (count === group.cards.length) features.set(`full:${id}`, 1);
      // Linear completion is already represented by individual cards; use discrete states.
      else if (completeness && count >= 2) features.set(`partial:${count}:${id}`, 1);
    }
    cache.set(deck.identity, features);
    return features;
  } };
}
