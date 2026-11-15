import { decodeCardLines, type ArchetypeCluster, type DeckCardIndexData } from './analysis-types.js';

/** Tournament sightings, using the published build membership. Missing lists are not absences. */
export function cardBuildCopies(name: string, builds: readonly Pick<ArchetypeCluster, 'id' | 'name' | 'deckIds'>[], partitions: readonly DeckCardIndexData[]) {
  const quantities = new Map<string, number>();
  for (const partition of partitions) for (const deck of partition.decks) {
    if (quantities.has(deck.deckId)) continue;
    const main = decodeCardLines(deck.main, partition.cardNames);
    if (!main.some(line => line.name && line.quantity > 0)) continue;
    const quantity = [...main, ...decodeCardLines(deck.material, partition.cardNames)]
      .reduce((sum, line) => sum + (line.name === name && line.quantity > 0 ? line.quantity : 0), 0);
    quantities.set(deck.deckId, quantity);
  }
  return builds.map(build => {
    const membership = new Set(build.deckIds);
    const counts = new Map<number, number>();
    let available = 0, playing = 0;
    for (const id of membership) {
      const quantity = quantities.get(id);
      if (quantity === undefined) continue;
      available++;
      if (quantity > 0) { playing++; counts.set(quantity, (counts.get(quantity) ?? 0) + 1); }
    }
    return { id: build.id, name: build.name, requested: membership.size, available, playing,
      inclusion: available ? playing / available : null,
      buckets: [...counts].sort(([a], [b]) => a - b).map(([quantity, deckCount]) => ({ quantity, deckCount })),
    };
  }).sort((a, b) => b.playing - a.playing || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
