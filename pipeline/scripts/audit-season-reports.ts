/** Read-only source audit. Run from repository root: node --import tsx pipeline/scripts/audit-season-reports.ts */
import { readFile } from 'node:fs/promises';
import { decodeCardLines, type DeckCardIndexData, type ArchetypeTaxonomyData, type OmnidexEventSummary } from '@gatcg/shared';
const root = new URL('../../', import.meta.url);
const read = async (path: string) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const browse: { generatedAt: string; events: OmnidexEventSummary[] } = await read('data/omnidex/browse.json');
const index: DeckCardIndexData = await read('data/analysis/deck-card-index.json');
const taxonomy: ArchetypeTaxonomyData = await read('data/analysis/archetype-taxonomy.json');
const popularity: { generatedAt: string; entries: { deckId: string }[] } = await read('data/analysis/deck-popularity-index.json');
const events = new Map(browse.events.map(event => [event.id, event]));
const lists = new Map(index.decks.map(deck => [deck.deckId, deck]));
const memberships = new Map<string, Set<string>>();
for (const cluster of taxonomy.clusters) for (const id of cluster.deckIds) {
  const builds = memberships.get(id) ?? new Set<string>();
  builds.add(cluster.id); memberships.set(id, builds);
}
const rows = new Map<string, { seasonId: number; season: string; format: string; month: string; events: number; recordedDecks: number; usableLists: number; missingLists: number; invalidLists: number; assignedBuilds: number; unassignedBuilds: number; ambiguousBuilds: number }>();
const cohort = (event: OmnidexEventSummary) => {
  if (event.status !== 'complete' || !event.seasonId || !event.format || /team/i.test(event.format) || !/^\d{4}-\d{2}-\d{2}/.test(event.date) || !Number.isFinite(Date.parse(event.date))) return null;
  const month = event.date.slice(0, 7);
  const key = JSON.stringify([event.seasonId, event.format, month]);
  if (!rows.has(key)) rows.set(key, { seasonId: event.seasonId, season: event.seasonName ?? '', format: event.format, month, events: 0, recordedDecks: 0, usableLists: 0, missingLists: 0, invalidLists: 0, assignedBuilds: 0, unassignedBuilds: 0, ambiguousBuilds: 0 });
  return rows.get(key)!;
};
for (const event of events.values()) { const row = cohort(event); if (row) row.events++; }
const recordedEventIds = new Set<number>();
const recordedIds = new Set(popularity.entries.map(entry => entry.deckId));
let unknownEvent = 0, excludedEvent = 0, malformedDeckId = 0;
for (const id of recordedIds) {
  if (!/^\d+:\d+$/.test(id)) { malformedDeckId++; continue; }
  const event = events.get(Number(id.split(':')[0]));
  if (!event) { unknownEvent++; continue; }
  const row = cohort(event);
  if (!row) { excludedEvent++; continue; }
  row.recordedDecks++;
  recordedEventIds.add(event.id);
  const builds = memberships.get(id)?.size ?? 0;
  if (builds === 1) row.assignedBuilds++;
  else if (builds === 0) row.unassignedBuilds++;
  else row.ambiguousBuilds++;
  const deck = lists.get(id);
  if (!deck) { row.missingLists++; continue; }
  const valid = [deck.main, deck.material].every(section => {
    const decoded = decodeCardLines(section, index.cardNames);
    return decoded.length > 0 && decoded.every(line => line.name?.trim() && Number.isInteger(line.quantity) && line.quantity > 0);
  });
  if (valid) row.usableLists++; else row.invalidLists++;
}
const cohorts = [...rows.values()].sort((a, b) => a.seasonId - b.seasonId || a.format.localeCompare(b.format) || a.month.localeCompare(b.month));
console.log(JSON.stringify({
  sources: { browse: browse.generatedAt, lists: index.generatedAt, taxonomy: taxonomy.generatedAt, popularity: popularity.generatedAt },
  duplicateEventIds: browse.events.length - events.size,
  duplicateListIds: index.decks.length - lists.size,
  duplicatePopularityIds: popularity.entries.length - recordedIds.size,
  malformedDeckId, unknownEvent, excludedEvent,
  indexedListsOutsideRecordedPopulation: index.decks.filter(deck => !recordedIds.has(deck.deckId)).length,
  cohorts: cohorts.map(row => ({ ...row, eventsWithRecordedDecks: [...events.values()].filter(event => event.seasonId === row.seasonId && event.format === row.format && event.date.startsWith(row.month) && recordedEventIds.has(event.id)).length })),
}, null, 2));
