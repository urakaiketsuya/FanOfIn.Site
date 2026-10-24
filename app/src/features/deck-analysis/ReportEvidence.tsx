import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fixedTargetCoverage, packageReport, reportAccess, reportCounts, type Card, type ClusterMatchupImpact } from '@gatcg/shared';
import type { DeckWorkspace } from '../deckbuilder/persistence/deckWorkspace';
import CardResult from '../../components/CardResult';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import DisclosureChevron from '../../components/DisclosureChevron';
import { pct, referenceLink, referenceDifferences, type ComparableDeck } from './reportModel';
import { ReportCards } from './PackageDecisionReport';
export function ComparableBuildReport({ deck, references, cards, loading, error, onRetry }: { deck: DeckWorkspace; references: ComparableDeck[]; cards: Map<string, Card>; loading: boolean; error?: string | null; onRetry: () => void }) {
  const [selected, setSelected] = useState('');
  const [expanded, setExpanded] = useState(false);
  const reference = references.find(row => row.deckId === selected) ?? references[0];
  const differences = reference ? referenceDifferences(deck, reference) : [];
  return <Panel>
    <h2 className="text-lg font-semibold">Similar builds</h2>
    {error ? <><p role="alert">Tournament data unavailable.</p><Button onClick={onRetry}>Retry tournament evidence</Button></> : loading ? <p role="status">Loading comparable decks…</p> : !reference ? <p role="status" className="mt-2">No comparable lists.</p> : <>
      <p className="mt-2 text-sm">{references.length} lists · {references.map(row => row.eventDate!.slice(0, 10)).sort()[0]}–{references.map(row => row.eventDate!.slice(0, 10)).sort().at(-1)} · 180-day cohort</p>
      <label className="mt-3 block text-sm">Reference list<select className="mt-1 min-h-12 w-full rounded border border-ctp-surface1 bg-ctp-base p-2" value={reference.deckId} onChange={event => { setSelected(event.target.value); setExpanded(false); }}>{references.slice(0, 12).map(row => <option key={row.deckId} value={row.deckId}>{row.eventDate?.slice(0, 10)} · {pct(row.similarity)} similarity · {row.deckId}</option>)}</select></label>
      <Link className="flex min-h-12 items-center text-sm text-ctp-blue underline" to={referenceLink(reference.deckId)}>Open tournament list</Link>
      {!differences.length ? <p>Identical Main + Material</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{(expanded ? differences : differences.slice(0, 6)).map(row => <div key={`${row.section}:${row.name}`} className="min-w-0"><CardResult name={row.name} card={cards.get(row.name)} newTab /><p className="mt-2 text-sm">{row.section === 'main' ? 'Main' : 'Material'} · Yours {row.current} / Reference {row.reference}</p></div>)}</div>}
      {differences.length > 6 && <Button className="mt-3 flex items-center gap-2" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer differences' : `Show all ${differences.length} differences`}<DisclosureChevron className={expanded ? 'rotate-180' : ''} /></Button>}
    </>}
  </Panel>;
}
export function MatchupCoverageReport({ deck, matchups, cards, loading, error, onRetry }: { deck: DeckWorkspace; matchups: ClusterMatchupImpact[]; cards: Map<string, Card>; loading: boolean; error?: string | null; onRetry: () => void }) {
  const [selected, setSelected] = useState('');
  const matchup = matchups.find(row => row.opponentClusterId === selected) ?? matchups[0];
  const main = reportCounts(deck.main), material = reportCounts(deck.material);
  const size = [...main.values()].reduce((a, b) => a + b, 0);
  return <Panel>
    <h2 className="text-lg font-semibold">Matchup coverage</h2>
    {error ? <><p role="alert">Matchup data unavailable.</p><Button onClick={onRetry}>Retry matchup evidence</Button></> : loading ? <p role="status">Loading matchup evidence…</p> : !matchup ? <p className="mt-2">No matched-build evidence.</p> : <>
      <label className="mt-3 block text-sm">Opponent<select className="mt-1 min-h-12 w-full rounded border border-ctp-surface1 bg-ctp-base p-2" value={matchup.opponentClusterId} onChange={event => setSelected(event.target.value)}>{matchups.map(row => <option key={row.opponentClusterId} value={row.opponentClusterId}>{row.opponentClusterName} · {row.games} games</option>)}</select></label>
      
      {!matchup.opponentCards.length && <p className="mt-3">Insufficient card-level data.</p>}
      {matchup.opponentCards.slice(0, 3).map(threat => {
        const answers = matchup.answers.find(row => row.opponentCardName === threat.cardName)?.answers ?? [];
        const verified = [...new Set([...main.keys(), ...material.keys()])].flatMap(name => { const rule = fixedTargetCoverage(name, cards.get(threat.cardName)); return rule ? [{ name, ...rule }] : []; });
        const present = answers.filter(answer => main.has(answer.cardName) || material.has(answer.cardName));
        const copies = present.reduce((sum, answer) => sum + (main.get(answer.cardName) ?? 0), 0);
        return <section key={threat.cardName} className="mt-4 border-t border-ctp-surface1 pt-3"><h3 className="font-semibold">Against {threat.cardName}</h3><ReportCards names={[threat.cardName, ...verified.map(row => row.name), ...present.map(row => row.cardName)]} cards={cards} />
          {verified.length > 0 && <div className="mt-3"><h4 className="text-sm font-semibold">Verified targets</h4>{verified.map(row => <p key={row.name} className="mt-2 text-sm">{row.name}: {row.detail} · {main.has(row.name) ? `${pct(reportAccess(size, main.get(row.name)!, 10))} access at 10 seen` : 'Material available'}</p>)}<p className="mt-2 text-xs">Target eligibility · before costs/resolution</p></div>}
          {!present.length ? <p className="mt-2 text-sm">0 observed candidates in Main / Material</p> : <><h4 className="mt-3 text-sm font-semibold">Observed Main candidates</h4><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{[7, 10, 15, 20].map(seen => <div key={seen} className="rounded-lg bg-ctp-base p-2"><p className="text-xs">{seen} seen</p><p className="mt-1 font-semibold tabular-nums">{pct(reportAccess(size, copies, seen))}</p></div>)}</div>{present.some(row => material.has(row.cardName)) && <p className="text-sm">Material · available before activation</p>}
          {present.map(row => <p className="mt-2 text-xs" key={row.cardName}>{row.cardName} · {row.role} · {row.scope === 'champion' ? 'Champion' : 'Build'} · {row.sampleWithAnswer} with / {row.sampleWithoutAnswer} without · +{(row.mitigation * 100).toFixed(1)}pp observed</p>)}</>}
        </section>;
      })}
    </>}
  </Panel>;
}
export function ResourceExecutionReport({ deck, cards, onExplore }: { deck: DeckWorkspace; cards: Map<string, Card>; onExplore: (name: string) => void }) {
  const packages = packageReport(deck);
  const consumers = deck.main.filter(row => ['Strategem of Myriad Ice', 'Calculated Foresight'].includes(row.name));
  const shared = new Map<string, string[]>();
  for (const row of packages) for (const name of row.definition.requirements.filter(req => req.section === 'material').flatMap(req => [...req.cards])) if (deck.material.some(line => line.name === name)) shared.set(name, [...(shared.get(name) ?? []), row.definition.label]);
  const overlaps = [...shared].filter(([, labels]) => labels.length > 1);
  if (!consumers.length && !overlaps.length) return null;
  return <Panel><h2 className="text-lg font-semibold">Shared resources</h2>
    {consumers.length > 0 && <><ReportCards names={consumers.map(row => row.name)} cards={cards} /><p className="mt-2 text-sm">Shared Floating Memory · 1 use per banished card</p></>}
    {overlaps.map(([name, labels]) => <div key={name}><ReportCards names={[name]} cards={cards} /><p className="mt-2 text-sm">{labels.length} packages share this card</p></div>)}
    <Button className="mt-3" onClick={() => onExplore(consumers[0]?.name ?? deck.main[0]?.name)}>Resource calculator</Button>
  </Panel>;
}
