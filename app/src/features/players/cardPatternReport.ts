import { decodeCardLines, type DeckCardIndexData, type DeckPopularityEntry, type OmnidexEventSummary } from '@gatcg/shared';
import { metagameReport, type Section } from '../metagame/report';

export function playerCardPatterns(index: DeckCardIndexData, entries: DeckPopularityEntry[], events: OmnidexEventSummary[], playerId: number, format: string, selected: string | null, asOf: string) {
  const playerEntries = entries.filter(e => e.player === playerId);
  const all = metagameReport(index, playerEntries, events, { format, days: 0, champion: '' }, asOf);
  const champion = selected ?? all.champions[0]?.[0] ?? '';
  const usage = champion ? metagameReport(index, playerEntries, events, { format, days: 0, champion }, asOf) : all;
  const end = Date.parse(asOf), start = end - 90 * 86400000;
  const eventById = new Map(events.filter(e => e.format === format && e.status === 'complete' && Date.parse(e.date) <= end).map(e => [e.id, e]));
  const eligible = new Map(playerEntries.filter(e => (e.championName ?? 'Unknown') === champion && eventById.has(e.eventId)).map(e => [e.deckId, e]));
  const seen = new Set<string>();
  const firsts = new Map<string, { name: string; section: Section; date: string; eventId: number; decks: number }>();
  for (const deck of index.decks) {
    const entry = eligible.get(deck.deckId);
    if (!entry || seen.has(deck.deckId)) continue;
    seen.add(deck.deckId);
    const date = eventById.get(entry.eventId)!.date;
    for (const section of ['main', 'material', 'sideboard'] as const) {
      for (const name of new Set(decodeCardLines(deck[section], index.cardNames).filter(l => l.name && Number.isFinite(l.quantity) && l.quantity > 0).map(l => l.name))) {
        const key = `${section}:${name}`, row = firsts.get(key) ?? { name, section, date, eventId: entry.eventId, decks: 0 };
        row.decks++;
        if (Date.parse(date) < Date.parse(row.date) || (date === row.date && entry.eventId < row.eventId)) { row.date = date; row.eventId = entry.eventId; }
        firsts.set(key, row);
      }
    }
  }
  return { ...usage, champions: all.champions, champion, newCards: [...firsts.values()].filter(r => Date.parse(r.date) > start).sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.name.localeCompare(b.name)), historyStart: [...firsts.values()].map(r => r.date).sort()[0] };
}
