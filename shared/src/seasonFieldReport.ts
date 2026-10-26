import type { OmnidexEventSummary } from './omnidex-index-types';

/** Monthly entrant-weighted fields, separated by format. Missing fields never become zeroes. */
export function seasonFieldReport(events: readonly OmnidexEventSummary[]) {
  const groups = new Map<string, OmnidexEventSummary[]>();
  for (const event of new Map(events.map(event => [event.id, event])).values()) {
    if (event.status !== 'complete' || /team/i.test(event.format) || !event.format || !/^\d{4}-\d{2}-\d{2}/.test(event.date) || !Number.isFinite(Date.parse(event.date))) continue;
    const group = groups.get(event.format) ?? [];
    group.push(event); groups.set(event.format, group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([format, group]) => {
    const months = [...new Set(group.map(event => event.date.slice(0, 7)))].sort().slice(-2).map(month => {
      const candidates = group.filter(event => event.date.startsWith(month));
      const complete = candidates.filter(({ fieldComposition: field }) => field && Number.isInteger(field.entrants) && field.entrants > 0 && field.champions.length > 0 && new Set(field.champions.map(c => c.name)).size === field.champions.length && field.champions.every(c => c.name && Number.isInteger(c.count) && c.count > 0) && field.champions.reduce((sum, c) => sum + c.count, 0) === field.entrants);
      const counts = new Map<string, number>();
      for (const event of complete) for (const champion of event.fieldComposition!.champions) counts.set(champion.name, (counts.get(champion.name) ?? 0) + champion.count);
      return { month, events: candidates.length, completeEvents: complete.length, entrants: complete.reduce((sum, event) => sum + event.fieldComposition!.entrants, 0), counts };
    });
    const names = [...new Set(months.flatMap(month => [...month.counts.keys()]))];
    const champions = names.map(name => ({ name, shares: months.map(month => month.entrants ? (month.counts.get(name) ?? 0) / month.entrants * 100 : null), count: months.reduce((sum, month) => sum + (month.counts.get(name) ?? 0), 0) })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return { format, months, champions };
  });
}
