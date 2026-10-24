import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MatchLogRecord } from '@gatcg/shared';
import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import { accountApi } from '../../lib/accountApi';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
export default function ReportTesting({ deck, tasks }: { deck: DeckWorkspace; tasks: string[] }) {
  const savedId = deck.deckIdentity?.startsWith('saved:') ? deck.deckIdentity.slice(6) : undefined;
  const [records, setRecords] = useState<MatchLogRecord[] | null>(null), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setRecords(null); setError(false);
    if (savedId) void accountApi.matchLog(savedId).then(result => { if (active) setRecords(result.records.filter(row => row.savedDeckId === savedId)); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [savedId, attempt]);
  const bottlenecks = new Map<string, number>();
  for (const record of records ?? []) for (const label of new Set(record.bottlenecks)) bottlenecks.set(label, (bottlenecks.get(label) ?? 0) + 1);
  return <Panel><h2 className="text-lg font-semibold">Playtesting</h2><div className="mt-3 flex flex-wrap gap-2">{tasks.slice(0, 3).map(task => <span key={task} className="rounded-lg bg-ctp-base px-3 py-2 text-xs">{task}</span>)}</div>
    {savedId && (error ? <><p role="alert" className="mt-3">Testing history could not be loaded.</p><Button onClick={() => setAttempt(attempt + 1)}>Retry testing history</Button></> : !records ? <p role="status">Loading testing history…</p> : <><p className="mt-3 text-sm">{records.length} games · all versions</p>{[...bottlenecks].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, count]) => <p key={label} className="mt-2 text-sm">{label}: {count} games</p>)}</>)}
    <Link className="mt-3 inline-flex min-h-12 items-center text-sm text-ctp-blue underline" to={savedId ? `/match-log?deck=${encodeURIComponent(savedId)}` : '/match-log'}>Log game</Link>
  </Panel>;
}
