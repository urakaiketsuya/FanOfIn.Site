import { decodeCardLines, type DeckCardIndexData, type ArchetypeCluster } from './analysis-types.js';
import type { PublishedCardPackage } from './publishedPackages.js';

type Line = { name: string; quantity: number };
export function observedLists(partitions: readonly DeckCardIndexData[]) {
  const found = new Map<string, { deckId: string; main: Line[]; material: Line[] }>();
  for (const partition of partitions) for (const deck of partition.decks) {
    if (found.has(deck.deckId)) continue;
    const section = (input: typeof deck.main) => {
      const counts = new Map<string, number>();
      for (const { name, quantity } of decodeCardLines(input, partition.cardNames)) if (name?.trim() && Number.isSafeInteger(quantity) && quantity > 0) counts.set(name, (counts.get(name) ?? 0) + quantity);
      return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([name, quantity]) => ({ name, quantity }));
    };
    const main = section(deck.main), material = section(deck.material);
    if (main.length) found.set(deck.deckId, { deckId: deck.deckId, main, material });
  }
  return found;
}

/** Exact remainder matching, within published membership. No functional-substitute claim. */
export function observedCardChoices(name: string, builds: readonly Pick<ArchetypeCluster, 'id' | 'name' | 'deckIds'>[], partitions: readonly DeckCardIndexData[]) {
  const lists = observedLists(partitions);
  return builds.flatMap(build => {
    const members = [...new Set(build.deckIds)].flatMap(id => lists.get(id) ? [lists.get(id)!] : []);
    const signature = (deck: typeof members[number], section: 'main' | 'material', removed: string, quantity: number) => JSON.stringify([section, quantity, deck.main.filter(l => section !== 'main' || l.name !== removed), deck.material.filter(l => section !== 'material' || l.name !== removed)]);
    const targets = new Map<string, Set<string>>();
    for (const deck of members) for (const section of ['main', 'material'] as const) {
      const line = deck[section].find(l => l.name === name);
      if (!line) continue;
      const key = signature(deck, section, name, line.quantity);
      const ids = targets.get(key) ?? new Set<string>(); ids.add(deck.deckId); targets.set(key, ids);
    }
    if (!targets.size) return [];
    const choices = new Map<string, { name: string; section: 'main' | 'material'; quantity: number; withCard: Set<string>; alternative: Set<string>; pairs: [string, string][] }>();
    for (const deck of members) {
      if ([...deck.main, ...deck.material].some(l => l.name === name)) continue;
      for (const section of ['main', 'material'] as const) for (const line of deck[section]) {
        const matches = targets.get(signature(deck, section, line.name, line.quantity));
        if (!matches) continue;
        const key = JSON.stringify([section, line.name, line.quantity]);
        const row = choices.get(key) ?? { ...line, section, withCard: new Set<string>(), alternative: new Set<string>(), pairs: [] };
        for (const id of matches) row.withCard.add(id);
        row.pairs.push([[...matches].sort()[0], deck.deckId]); row.alternative.add(deck.deckId); choices.set(key, row);
      }
    }
    return [...choices.values()].map(row => ({ buildId: build.id, buildName: build.name, name: row.name, section: row.section, quantity: row.quantity, pair: row.pairs.sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))[0], withCard: [...row.withCard].sort(), alternative: [...row.alternative].sort() }));
  }).sort((a,b) => b.alternative.length - a.alternative.length || b.withCard.length - a.withCard.length || a.buildId.localeCompare(b.buildId) || a.name.localeCompare(b.name) || a.quantity-b.quantity);
}

/** Projection onto a package pool, retaining section and copies; only complete observations form variants. */
export function observedPackageVariants(definitions: readonly PublishedCardPackage[], partitions: readonly DeckCardIndexData[]) {
  const lists = [...observedLists(partitions).values()];
  return definitions.map(def => {
    const pool = new Set(def.memberCards);
    let eligible = 0, partial = 0, complete = 0;
    const groups = new Map<string, { key: string; main: Line[]; material: Line[]; deckIds: string[] }>();
    for (const deck of lists) {
      if (def.materialChampionPrefix && !deck.material.some(l => l.name.startsWith(def.materialChampionPrefix!))) continue;
      eligible++;
      const main = deck.main.filter(l => pool.has(l.name)), material = deck.material.filter(l => pool.has(l.name));
      if (!main.length && !material.length) continue;
      const met = def.requirements.every(r => new Set(r.cards.filter(name => deck[r.section].some(l => l.name === name))).size >= r.minimum);
      if (!met) { partial++; continue; }
      complete++;
      const key = JSON.stringify([main, material]);
      const group = groups.get(key) ?? {key, main, material, deckIds: []}; group.deckIds.push(deck.deckId); groups.set(key, group);
    }
    return { id: def.id, eligible, partial, complete, variants: [...groups.values()].map(g => ({...g, deckIds: g.deckIds.sort(), share: g.deckIds.length / complete})).sort((a,b) => b.deckIds.length-a.deckIds.length || a.key.localeCompare(b.key)) };
  });
}
