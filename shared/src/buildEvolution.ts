import { decodeCardLines, type ArchetypeCluster, type DeckCardIndexData, type DeckPopularityIndexData } from './analysis-types.js';

export interface EvolutionEvent { id: number; date: string; seasonId: number | null; seasonName: string | null }
export interface EvolutionCard { name: string; prevalence: number; averageCopies: number }
export interface EvolutionSeason {
  id: number; name: string; deckCount: number; listedCount: number;
  cards: EvolutionCard[];
  builds: { id: string; name: string; count: number; share: number }[];
}

/** Published build membership only; a sighting counts once, regardless of duplicate input rows. */
export function buildEvolution(builds: readonly Pick<ArchetypeCluster, 'id' | 'name' | 'deckIds'>[], cards: DeckCardIndexData, popularity: DeckPopularityIndexData, events: readonly EvolutionEvent[]): EvolutionSeason[] {
  const eventById = new Map(events.map(event => [event.id, event]));
  const calendar = new Map<number, { name: string; date: string }>();
  for (const event of events) {
    if (event.seasonId === null || !event.date) continue;
    const old = calendar.get(event.seasonId);
    if (!old || event.date < old.date) calendar.set(event.seasonId, { name: event.seasonName ?? `Season ${event.seasonId}`, date: event.date });
  }
  const membership = new Map<string, string>();
  for (const build of builds) for (const id of build.deckIds) if (!membership.has(id)) membership.set(id, build.id);
  const deckById = new Map(cards.decks.map(deck => [deck.deckId, deck]));
  const seen = new Set<string>();
  const buckets = new Map<number, { count: number; listed: number; builds: Map<string, number>; cards: Map<string, { count: number; copies: number }> }>();
  for (const entry of popularity.entries) {
    const build = membership.get(entry.deckId);
    const season = eventById.get(entry.eventId)?.seasonId;
    if (!build || season == null || seen.has(entry.deckId)) continue;
    seen.add(entry.deckId);
    let bucket = buckets.get(season);
    if (!bucket) { bucket = { count: 0, listed: 0, builds: new Map(), cards: new Map() }; buckets.set(season, bucket); }
    bucket.count++;
    bucket.builds.set(build, (bucket.builds.get(build) ?? 0) + 1);
    const deck = deckById.get(entry.deckId);
    if (!deck || deck.main.length + deck.material.length === 0) continue;
    bucket.listed++;
    const combined = new Map<string, number>();
    for (const line of decodeCardLines([...deck.main, ...deck.material], cards.cardNames)) {
      if (line.quantity > 0) combined.set(line.name, (combined.get(line.name) ?? 0) + line.quantity);
    }
    for (const [name, copies] of combined) {
      const stat = bucket.cards.get(name) ?? { count: 0, copies: 0 };
      stat.count++; stat.copies += copies; bucket.cards.set(name, stat);
    }
  }
  const ordered = [...calendar].sort((a, b) => a[1].date.localeCompare(b[1].date) || a[0] - b[0]);
  const first = ordered.findIndex(([id]) => buckets.has(id));
  if (first < 0) return [];
  return ordered.slice(first).map(([id, season]) => {
    const bucket = buckets.get(id);
    return { id, name: season.name, deckCount: bucket?.count ?? 0, listedCount: bucket?.listed ?? 0,
      cards: [...(bucket?.cards ?? [])].map(([name, stat]) => ({ name, prevalence: stat.count / bucket!.listed, averageCopies: stat.copies / stat.count })).sort((a, b) => b.prevalence - a.prevalence || a.name.localeCompare(b.name)),
      builds: builds.map(build => ({ id: build.id, name: build.name, count: bucket?.builds.get(build.id) ?? 0, share: bucket?.count ? (bucket.builds.get(build.id) ?? 0) / bucket.count : 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  });
}

export function compareEvolutionSeasons(before: EvolutionSeason, after: EvolutionSeason) {
  if (!before.listedCount || !after.listedCount) return [];
  const left = new Map(before.cards.map(card => [card.name, card]));
  const right = new Map(after.cards.map(card => [card.name, card]));
  return [...new Set([...left.keys(), ...right.keys()])].map(name => ({ name, before: left.get(name), after: right.get(name), status: !left.has(name) ? 'Added' : !right.has(name) ? 'Dropped' : 'Retained' })).sort((a, b) => Math.abs((b.after?.prevalence ?? 0) - (b.before?.prevalence ?? 0)) - Math.abs((a.after?.prevalence ?? 0) - (a.before?.prevalence ?? 0)) || a.name.localeCompare(b.name));
}
