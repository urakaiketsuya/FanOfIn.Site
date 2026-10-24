import { useState, useTransition } from 'react';
import { computeCombatAccessForecast, packageReport, reportAccess, reportCounts, type Card, type ClusterMatchupImpact } from '@gatcg/shared';
import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import CardResult from '../../components/CardResult';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import { previewReportSwap } from './reportDraft';
import { computeAggressionForecast } from '../../lib/aggressionForecast';
import { pct, referenceLink, suggestReportSwaps, type ComparableDeck, type ReportSwap, type SuggestionGoal } from './reportModel';
import { Link } from 'react-router-dom';

export default function ReportSuggestions({ deck, cards, references, matchups, ready, onApply }: { deck: DeckWorkspace; cards: Map<string, Card>; references: ComparableDeck[]; matchups: ClusterMatchupImpact[]; ready: boolean; onApply: (swap: ReportSwap) => string | null }) {
  const [open, setOpen] = useState(false), [goal, setGoal] = useState<SuggestionGoal>('consistency');
  const [opponent, setOpponent] = useState(''), [preserved, setPreserved] = useState('');
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [locking, setLocking] = useState(false), [results, setResults] = useState<ReportSwap[] | null>(null);
  const [preview, setPreview] = useState<ReportSwap | null>(null), [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const packages = packageReport(deck);
  const matchup = matchups.find(row => row.opponentClusterId === opponent);
  const next = preview ? previewReportSwap(deck, preview, cards) : null;
  const counts = reportCounts(deck.main), size = [...counts.values()].reduce((a, b) => a + b, 0);
  const afterCounts = next ? reportCounts(next.main) : counts;
  const afterPackages = next ? packageReport(next) : [];
  const packageChanges = [...new Set([...packages, ...afterPackages].map(row => row.definition.id))].map(id => {
    const before = packages.find(row => row.definition.id === id), after = afterPackages.find(row => row.definition.id === id);
    return { id, label: (before ?? after)!.definition.label, before: before?.checkpoints[1].both ?? 0, after: after?.checkpoints[1].both ?? 0, metBefore: before?.requirementsMet ?? false, metAfter: after?.requirementsMet ?? false };
  });
  function invalidate() { setResults(null); setError(null); }
  return <Panel data-component="ReportSuggestions"><h2 className="text-lg font-semibold">Suggested changes</h2>
    {!open ? <Button className="mt-3" onClick={() => setOpen(true)}>Suggest improvements</Button> : <>
      <label className="mt-3 block text-sm">Goal<select className="mt-1 min-h-12 w-full rounded border border-ctp-surface1 bg-ctp-base p-2" value={goal} onChange={event => { setGoal(event.target.value as SuggestionGoal); invalidate(); }}><option value="consistency">Package consistency</option><option value="matchup">A specific matchup</option><option value="alternatives">Explore comparable alternatives</option></select></label>
      {goal === 'matchup' && <label className="mt-3 block text-sm">Target opponent<select className="mt-1 min-h-12 w-full rounded border border-ctp-surface1 bg-ctp-base p-2" value={opponent} onChange={event => { setOpponent(event.target.value); invalidate(); }}><option value="">Choose an opponent</option>{matchups.map(row => <option key={row.opponentClusterId} value={row.opponentClusterId}>{row.opponentClusterName}</option>)}</select></label>}
      {!!packages.length && <label className="mt-3 block text-sm">Preserve package access<select className="mt-1 min-h-12 w-full rounded border border-ctp-surface1 bg-ctp-base p-2" value={preserved} onChange={event => { setPreserved(event.target.value); invalidate(); }}><option value="">No package locked</option>{packages.map(row => <option value={row.definition.id} key={row.definition.id}>{row.definition.label}</option>)}</select></label>}
      <Button className="mt-3" aria-expanded={locking} onClick={() => setLocking(!locking)}>Lock cards ({locked.size})</Button>
      {locking && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...counts.keys()].map(name => <CardResult key={name} name={name} card={cards.get(name)} selected={locked.has(name)} onSelect={() => { setLocked(previous => { const value = new Set(previous); if (value.has(name)) value.delete(name); else value.add(name); return value; }); invalidate(); }}><p className="mt-2 text-xs">{locked.has(name) ? 'Copies locked' : 'Copies can change'}</p></CardResult>)}</div>}
      <div className="mt-3"><Button variant="primary" disabled={!ready || pending || (goal === 'matchup' && !matchup)} onClick={() => startTransition(() => setResults(suggestReportSwaps(deck, references, cards, goal, locked, preserved, matchup)))}>Find changes to test</Button></div>
      {!ready && <p role="status" className="mt-2 text-sm">Waiting for tournament evidence.</p>}
      {pending && <p role="status">Recalculating suggestions…</p>}
      {results?.length === 0 && <p role="status" className="mt-3">No supported swaps for these constraints.</p>}
      {results?.map(swap => <article className="mt-4 rounded-xl border border-ctp-surface1 p-3" key={`${swap.cut}:${swap.add}`}><div className="grid max-w-md grid-cols-2 gap-3"><CardResult name={swap.cut} card={cards.get(swap.cut)} newTab><p className="mt-2 font-semibold">Cut 1</p></CardResult><CardResult name={swap.add} card={cards.get(swap.add)} newTab><p className="mt-2 font-semibold">Add 1</p></CardResult></div><p className="mt-3 text-sm">{swap.reason}</p><Link className="flex min-h-12 items-center text-sm text-ctp-blue underline" to={referenceLink(swap.referenceId)}>Reference list</Link><Button onClick={() => { setPreview(swap); setError(null); }}>Compare swap</Button></article>)}
    </>}
    {preview && next && <DialogSheet title="Preview suggested swap" onDismiss={() => setPreview(null)} footer={<Button variant="primary" onClick={() => { const failure = onApply(preview); if (failure) setError(failure); else setPreview(null); }}>Apply to local draft</Button>}>
      <div className="grid grid-cols-2 gap-3"><CardResult name={preview.cut} card={cards.get(preview.cut)} newTab><p>Cut 1 · {counts.get(preview.cut)} → {afterCounts.get(preview.cut) ?? 0}</p></CardResult><CardResult name={preview.add} card={cards.get(preview.add)} newTab><p>Add 1 · {counts.get(preview.add) ?? 0} → {afterCounts.get(preview.add)}</p></CardResult></div>
      <h3 className="mt-4 font-semibold">Access at 10 cards seen</h3>
      <dl className="mt-3 space-y-3 text-sm">{[preview.cut, preview.add].map(name => <div key={name}><dt>{name}</dt><dd>{pct(reportAccess(size, counts.get(name) ?? 0, 10))} → {pct(reportAccess(size, afterCounts.get(name) ?? 0, 10))}</dd></div>)}{packageChanges.map(row => <div key={row.id}><dt>{row.label}</dt><dd>{pct(row.before)} → {pct(row.after)} · {row.metBefore ? 'supported' : 'incomplete'} → {row.metAfter ? 'supported' : 'incomplete'}</dd></div>)}</dl>
      <p className="mt-3 text-sm">Tradeoff · −1 {preview.cut}</p>
      {matchup && <p className="mt-3 text-sm">{matchup.opponentClusterName} · observed association</p>}
      <h3 className="mt-4 font-semibold">Matchup candidate access at 10 seen</h3>
      {matchups.filter(row => row.answers.some(group => group.answers.some(answer => answer.cardName === preview.cut || answer.cardName === preview.add))).slice(0, 3).map(row => {
        const names = [...new Set(row.answers.flatMap(group => group.answers.map(answer => answer.cardName)))];
        const beforeCopies = names.reduce((sum, name) => sum + (counts.get(name) ?? 0), 0), afterCopies = names.reduce((sum, name) => sum + (afterCounts.get(name) ?? 0), 0);
        return <p key={row.opponentClusterId} className="mt-2 text-sm">{row.opponentClusterName}: {pct(reportAccess(size, beforeCopies, 10))} → {pct(reportAccess(size, afterCopies, 10))} · observed Main pool</p>;
      })}
      {!matchups.some(row => row.answers.some(group => group.answers.some(answer => answer.cardName === preview.cut || answer.cardName === preview.add))) && <p className="mt-2 text-sm">No measured access changes.</p>}
      <SwapPotential before={deck} after={next} cards={cards} />
      <p className="mt-3 text-xs">Local draft · original preserved</p>
      {error && <p role="alert" className="mt-3 text-ctp-red">{error}</p>}
    </DialogSheet>}
  </Panel>;
}
function SwapPotential({ before, after, cards }: { before: DeckWorkspace; after: DeckWorkspace; cards: Map<string, Card> }) {
  const a = computeAggressionForecast(before.main, cards, before.material), b = computeAggressionForecast(after.main, cards, after.material);
  const ca = computeCombatAccessForecast(before.main, before.material, cards, 10), cb = computeCombatAccessForecast(after.main, after.material, cards, 10);
  return <div className="mt-4"><h3 className="font-semibold">Supported potential at 10 seen</h3><dl className="mt-2 space-y-2 text-sm"><div><dt>Conservative median printed damage</dt><dd>{a.points[1]?.medianMin ?? '—'} → {b.points[1]?.medianMin ?? '—'}</dd></div><div><dt>Conditional median printed damage</dt><dd>{a.points[1]?.medianMax ?? '—'} → {b.points[1]?.medianMax ?? '—'}</dd></div><div><dt>Sampled mean ally power with supported boosts</dt><dd>{ca.unavailable || cb.unavailable ? 'Card data incomplete' : `${ca.boostedPower.toFixed(1)} → ${cb.boostedPower.toFixed(1)}`}</dd></div></dl><p className="mt-2 text-xs">Before costs/resolution · first-player damage · ≥60-card ally model</p>{[...new Set([...ca.unmodeled, ...cb.unmodeled, ...a.audit.filter(row => row.status !== 'modeled').map(row => row.name), ...b.audit.filter(row => row.status !== 'modeled').map(row => row.name)])].length > 0 && <p className="mt-2 text-xs">Partial model coverage</p>}</div>;
}
