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
  const scope = { format, days: 90, champion };
  const recent = metagameReport(index, playerEntries, events, scope, asOf);
  const previous = metagameReport(index, playerEntries, events, scope, new Date(start).toISOString());
  const others = metagameReport(index, entries.filter(e => e.player !== playerId), events, scope, asOf);
  function compare(left: typeof recent, right: typeof recent, signature: boolean) {
    return Object.fromEntries((['main', 'material', 'sideboard'] as const).map(section => {
      const a = new Map(left.sections[section].map(r => [r.name, r.decks]));
      const b = new Map(right.sections[section].map(r => [r.name, r.decks]));
      const rows = left.decks >= 3 && right.decks >= (signature ? 10 : 3)
        ? [...new Set([...a.keys(), ...b.keys()])].map(name => {
          const leftCount = a.get(name) ?? 0, rightCount = b.get(name) ?? 0;
          const leftPercent = 100 * leftCount / left.decks, rightPercent = 100 * rightCount / right.decks;
          return { name, leftCount, rightCount, leftPercent, rightPercent, delta: leftPercent - rightPercent };
        }).filter(r => signature ? r.delta >= 0.05 && r.leftCount >= 2 : Math.abs(r.delta) >= 0.05)
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.leftCount - a.leftCount || a.name.localeCompare(b.name))
        : [];
      return [section, rows];
    })) as Record<Section, { name: string; leftCount: number; rightCount: number; leftPercent: number; rightPercent: number; delta: number }[]>;
  }
  const trends = compare(recent, previous, false), signatures = compare(recent, others, true);
  return { ...usage, recent, previous, others, trends, signatures, champions: all.champions, champion, newCards: [...firsts.values()].filter(r => Date.parse(r.date) > start).sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.name.localeCompare(b.name)), historyStart: [...firsts.values()].map(r => r.date).sort()[0] };
}
