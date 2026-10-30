import { competitionMatches, auditFieldWindows, fieldWindowStart, backtestFieldHistory, type BattleChartEntry, type FieldEvent, type FieldHistoryData } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import type { AnalysisContext } from './context.js';

function day(value: string | null): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString().slice(0, 10);
}

export function computeFieldHistory(bundles: OmnidexEventBundle[], ctx: AnalysisContext, minMatchups = 5): FieldHistoryData {
  const events: FieldEvent[] = [];
  const seenEvents = new Set<number>();
  for (const bundle of bundles) {
    if (seenEvents.has(bundle.id)) continue;
    seenEvents.add(bundle.id);
    const date = day(bundle.event.date);
    if (bundle.event.status !== 'complete' || !date || 'error' in bundle.decklists) continue;
    const signatures = ctx.getEventSignatures(bundle);
    const counts = new Map<string, number>();
    for (const sig of signatures.values()) if (sig.championName) counts.set(sig.championName, (counts.get(sig.championName) ?? 0) + 1);
    if (!counts.size) continue;
    const rows = new Map<string, BattleChartEntry>();
    for (const match of competitionMatches(bundle.pairingsByRound)) {
      const leftName = signatures.get(match.a)?.championName, rightName = signatures.get(match.b)?.championName;
      if (!leftName || !rightName) continue;
      const forward = leftName <= rightName;
      const a = forward ? leftName : rightName, b = forward ? rightName : leftName;
      const key = JSON.stringify([a, b]);
      const row = rows.get(key) ?? { a, b, aWins: 0, bWins: 0, ties: 0, games: 0 };
      row.games++;
      if (match.winner === null) row.ties++;
      else if (match.winner === (forward ? match.a : match.b)) row.aWins++;
      else row.bWins++;
      rows.set(key, row);
    }
    const completedDate = day(bundle.event.dateCompleted);
    events.push({ id: bundle.id, date, completedDate: completedDate && completedDate >= date ? completedDate : null,
      format: bundle.event.format.trim().toLowerCase() || 'unknown',
      champions: [...counts].map(([champion, weight]) => ({ champion, weight })).sort((a, b) => a.champion.localeCompare(b.champion)),
      battleChart: [...rows.values()].sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b)) });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const rangeChecks = [...new Set(events.map(event => event.format))].sort().map(format => {
    const to = events.filter(event => event.format === format).at(-1)!.date;
    const { windows: _windows, ...summary } = auditFieldWindows(events, format, fieldWindowStart(to, 336), to, minMatchups);
    return summary;
  });
  return { rangeChecks, generatedAt: new Date().toISOString(), minMatchups, events,
    backtests: [...new Set(events.map(e => e.format))].sort().map(format => backtestFieldHistory(events, format, minMatchups)) };
}
