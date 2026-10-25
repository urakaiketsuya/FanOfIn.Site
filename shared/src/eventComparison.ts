import type { OmnidexEvent } from './omnidex-types';
import type { OmnidexEventSummary } from './omnidex-index-types';
import type { EventReport } from './eventReport';

/** Select by metadata, never by favorable results or list availability. */
type Candidate = Pick<OmnidexEventSummary, 'id' | 'status' | 'seasonId' | 'format' | 'category' | 'setting' | 'ranked' | 'type' | 'structure' | 'date'>;
export function precedingEventCandidates<T extends Candidate>(event: OmnidexEvent, events: T[]): T[] {
  const time = Date.parse(event.date);
  if (!Number.isFinite(time) || !event.season) return [];
  return [...new Map(events.map(e => [e.id, e])).values()].filter(e =>
    e.id !== event.id && e.status === 'complete' && e.seasonId === event.season!.id &&
    e.format === event.format && e.category === event.category && e.setting === event.setting &&
    e.ranked === event.ranked && e.type === event.type && e.structure === event.structure &&
    Date.parse(e.date) < time && Date.parse(e.date) >= time - 90 * 86400000,
  ).sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || b.id - a.id).slice(0, 3);
}

/** Refreshed event metadata must still match and results must predate the target. */
export function isCompletedPrecedingEvent(event: OmnidexEvent, previous: OmnidexEvent): boolean {
  const completed = Date.parse(previous.dateCompleted ?? '');
  return precedingEventCandidates(event, [{ ...previous, seasonId: previous.season?.id ?? null }]).length === 1 &&
    Number.isFinite(completed) && completed < Date.parse(event.date);
}

export function compareEventFields(current: EventReport, previous: EventReport[]) {
  if (current.status || previous.length !== 3 || previous.some(r => r.status || r.entrants <= 0)) return null;
  const entrants = previous.reduce((sum, r) => sum + r.entrants, 0);
  const names = new Map(current.champions.map(c => [c.name, c.cardName]));
  for (const report of previous) for (const champion of report.champions) if (!names.has(champion.name)) names.set(champion.name, champion.cardName);
  return { entrants, champions: [...names].map(([name, cardName]) => {
    const currentShare = current.champions.find(c => c.name === name)?.fieldShare ?? 0;
    const count = previous.reduce((sum, r) => sum + (r.champions.find(c => c.name === name)?.entrants ?? 0), 0);
    const previousShare = count / entrants * 100;
    return { name, cardName, currentShare, previousShare, change: currentShare - previousShare };
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || a.name.localeCompare(b.name)) };
}
