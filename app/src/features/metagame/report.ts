import { decodeCardLines, type DeckCardIndexData, type DeckPopularityEntry, type OmnidexEventSummary } from '@gatcg/shared';

export type Section = 'main' | 'material' | 'sideboard';
export interface Usage { name: string; decks: number; copies: number }
export function metagameReport(index: DeckCardIndexData, entries: DeckPopularityEntry[], events: OmnidexEventSummary[], scope: { format: string; days: number; champion: string }, asOf: string) {
  const end = Date.parse(asOf);
  const start = scope.days ? end - scope.days * 86400000 : -Infinity;
  const eligibleEvents = new Set(events.filter(e => e.format === scope.format && e.status === 'complete' && Date.parse(e.date) <= end && Date.parse(e.date) > start).map(e => e.id));
  const eligible = new Map(entries.filter(e => eligibleEvents.has(e.eventId)).map(e => [e.deckId, e]));
  const champions = new Map<string, number>();
  const sections = { main: new Map<string, Usage>(), material: new Map<string, Usage>(), sideboard: new Map<string, Usage>() };
  const seen = new Set<string>(), eventIds = new Set<number>();
  let decks = 0, sideboards = 0;
  for (const deck of index.decks) {
    const entry = eligible.get(deck.deckId);
    if (!entry || seen.has(deck.deckId)) continue;
    seen.add(deck.deckId);
    const champion = entry.championName ?? 'Unknown';
    champions.set(champion, (champions.get(champion) ?? 0) + 1);
    if (scope.champion && champion !== scope.champion) continue;
    decks++; eventIds.add(entry.eventId);
    for (const section of ['main', 'material', 'sideboard'] as const) {
      const quantities = new Map<string, number>();
      for (const line of decodeCardLines(deck[section], index.cardNames)) {
        if (line.name && Number.isFinite(line.quantity) && line.quantity > 0) quantities.set(line.name, (quantities.get(line.name) ?? 0) + line.quantity);
      }
      if (section === 'sideboard' && quantities.size) sideboards++;
      for (const [name, quantity] of quantities) {
        const row = sections[section].get(name) ?? { name, decks: 0, copies: 0 };
        row.decks++; row.copies += quantity; sections[section].set(name, row);
      }
    }
  }
  return { decks, sideboards, events: eventIds.size,
    missing: [...eligible.values()].filter(e => !seen.has(e.deckId) && (!scope.champion || (e.championName ?? 'Unknown') === scope.champion)).length,
    champions: [...champions].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    sections: Object.fromEntries(Object.entries(sections).map(([key, rows]) => [key, [...rows.values()].sort((a, b) => b.decks - a.decks || a.name.localeCompare(b.name))])) as Record<Section, Usage[]>,
  };
}
