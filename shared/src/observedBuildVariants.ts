import { decodeCardLines, type DeckCardIndexData } from './analysis-types.js';

type Line = { name: string; quantity: number };
/** Exact, section-aware Main + Material lists within published membership. */
export function observedBuildVariants(deckIds: readonly string[], partitions: readonly DeckCardIndexData[]) {
  const membership = new Set(deckIds), seen = new Set<string>();
  const groups = new Map<string, { key: string; deckIds: string[]; main: Line[]; material: Line[] }>();
  for (const partition of partitions) for (const deck of partition.decks) {
    if (!membership.has(deck.deckId) || seen.has(deck.deckId)) continue;
    const section = (lines: typeof deck.main) => {
      const counts = new Map<string, number>();
      for (const {name, quantity} of decodeCardLines(lines, partition.cardNames)) {
        if (name?.trim() && Number.isInteger(quantity) && quantity > 0) counts.set(name, (counts.get(name) ?? 0) + quantity);
      }
      return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([name, quantity]) => ({ name, quantity }));
    };
    const main = section(deck.main), material = section(deck.material);
    if (!main.length) continue;
    seen.add(deck.deckId);
    const key = JSON.stringify([main, material]);
    const group = groups.get(key) ?? {key, deckIds: [], main, material};
    group.deckIds.push(deck.deckId); groups.set(key, group);
  }
  const sorted = [...groups.values()].sort((a,b) => b.deckIds.length - a.deckIds.length || a.key.localeCompare(b.key));
  const reference = sorted[0];
  const variants = sorted.map(group => {
    const changes: {section: 'main' | 'material'; name: string; delta: number}[] = [];
    for (const section of ['main', 'material'] as const) {
      const before = new Map(reference[section].map(line => [line.name, line.quantity]));
      const after = new Map(group[section].map(line => [line.name, line.quantity]));
      for (const name of [...new Set([...before.keys(), ...after.keys()])].sort()) {
        const delta = (after.get(name) ?? 0) - (before.get(name) ?? 0);
        if (delta) changes.push({section, name, delta});
      }
    }
    return {...group, deckIds: group.deckIds.sort(), share: group.deckIds.length / seen.size, changes};
  });
  return { requested: membership.size, available: seen.size, variants };
}
