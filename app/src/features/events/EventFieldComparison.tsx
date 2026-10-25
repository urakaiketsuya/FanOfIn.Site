import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { compareEventFields, computeEventReport, precedingEventCandidates, isCompletedPrecedingEvent, EVENT_CATEGORY_LABELS, type EventReport, type OmnidexEvent } from '@gatcg/shared';
import { gatcgApi, isApiErrorBody } from '../../lib/api/client';
import Button from '../../components/ui/Button';
import { useOmnidexIndex, useOmnidexIndexStatus } from '../tournaments/data';
import { findDeckChampionName } from '../../lib/ttsExport';
import { useCardsByNames } from './useCardsByNames';
import { Bar, CardIdentity } from './EventReportVisuals';

async function loadField(id: number) {
  const [event, players, decks, teams] = await Promise.all([
    gatcgApi.getOmnidexEvent(id), gatcgApi.getOmnidexPlayers(id), gatcgApi.getOmnidexDecklists(id), gatcgApi.getOmnidexTeams(id),
  ]);
  if (event.id !== id) throw new Error('Event identity mismatch');
  return { event, players, decks, teams };
}
type Field = Awaited<ReturnType<typeof loadField>>;
const percent = (n: number) => `${Number(n.toFixed(1))}%`;

export default function EventFieldComparison({ event, report }: { event: OmnidexEvent; report: EventReport }) {
  const index = useOmnidexIndex();
  const indexStatus = useOmnidexIndexStatus();
  const candidates = useMemo(() => precedingEventCandidates(event, index?.events ?? []), [event, index]);
  const key = `${event.id}:${candidates.map(e => e.id).join(',')}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; fields?: Field[]; error?: boolean }>({ key: '' });
  useEffect(() => {
    let cancelled = false;
    if (candidates.length !== 3) return;
    setState({ key });
    Promise.all(candidates.map(e => loadField(e.id))).then(fields => {
      if (!cancelled) setState({ key, fields });
    }).catch(() => { if (!cancelled) setState({ key, error: true }); });
    return () => { cancelled = true; };
  }, [key, attempt, candidates]);
  const fields = state.key === key ? state.fields : undefined;
  const names = useMemo(() => fields?.flatMap(f => isApiErrorBody(f.decks) ? [] : f.decks.flatMap(d => d.decklist.material.map(l => l.card))) ?? [], [fields]);
  const catalog = useCardsByNames([...names, ...report.champions.map(c => c.cardName)]);
  const comparison = useMemo(() => {
    if (!fields) return null;
    const reports = fields.map(f => {
      // Recheck refreshed metadata and completion time: no future results enter an earlier field.
      if (!isCompletedPrecedingEvent(event, f.event) || (isApiErrorBody(f.teams) && f.teams.error !== 'Not a team event.')) return { ...report, status: 'Unavailable' };
      const champions = new Map<number, { name: string; cardName: string }>();
      if (!isApiErrorBody(f.decks)) for (const deck of f.decks) {
        if (deck.decklist.material.some(l => l.quantity > 0 && !catalog.has(l.card))) continue;
        const cardName = findDeckChampionName(deck.decklist.material.filter(l => l.quantity > 0), catalog);
        if (cardName) champions.set(deck.player, { name: cardName.split(',')[0].trim(), cardName });
      }
      return computeEventReport(f.event, f.players, isApiErrorBody(f.decks) ? undefined : f.decks, champions, !isApiErrorBody(f.teams) && f.teams.length > 0);
    });
    return compareEventFields(report, reports);
  }, [fields, catalog, report, event]);
  let status = !index ? 'Loading earlier events…' : candidates.length < 3 ? 'Fewer than 3 comparable earlier events.' : !fields ? 'Loading earlier fields…' : !comparison ? 'Complete earlier fields unavailable.' : null;
  if (!index && indexStatus.error) status = 'Earlier events could not load.';
  if (state.key === key && state.error) status = 'Earlier fields could not load.';
  return <section aria-labelledby="event-history">
    <h2 id="event-history" className="text-xl font-semibold">What changed from earlier events?</h2>
    <p className="mt-1 text-xs text-ctp-subtext0">{event.format} · {event.season?.name ?? 'Season unavailable'} · {EVENT_CATEGORY_LABELS[event.category] ?? event.category} · {event.setting} · Worldwide · Previous 90 days</p>
    {status ? <div className="mt-3 text-sm text-ctp-subtext0" role="status">{status}{((!index && indexStatus.error) || (state.key === key && state.error)) && <Button className="ml-3" onClick={() => !index ? indexStatus.retry() : setAttempt(n => n + 1)}>Retry</Button>}</div> : comparison && <>
      <p className="mt-2 text-xs text-ctp-subtext0">{report.entrants} entrants here · {comparison.entrants} across 3 earlier events</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{comparison.champions.map(row => <article key={row.name} className="rounded-xl bg-ctp-mantle p-4">
        <CardIdentity name={row.cardName} card={catalog.get(row.cardName)} />
        <p className="mt-3 text-sm font-semibold tabular-nums">{row.change > 0 ? '+' : ''}{Number(row.change.toFixed(1))} pp</p>
        <div className="mb-1 mt-3 flex justify-between gap-2"><span className="text-xs">Earlier field</span><span className="font-semibold tabular-nums">{percent(row.previousShare)}</span></div>
        <Bar value={row.previousShare} label={`${row.name} earlier field share`} blue />
        <div className="mb-1 mt-3 flex justify-between gap-2"><span className="text-xs">This event</span><span className="font-semibold tabular-nums">{percent(row.currentShare)}</span></div>
        <Bar value={row.currentShare} label={`${row.name} current field share`} />
      </article>)}</div>
    </>}
    {candidates.length > 0 && <div className="mt-3 flex flex-wrap gap-x-4">{candidates.map(e => <Link key={e.id} className="inline-flex min-h-control items-center rounded text-xs text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/events/${e.id}`}>{e.name} · {e.date.slice(0, 10)}</Link>)}</div>}
  </section>;
}
