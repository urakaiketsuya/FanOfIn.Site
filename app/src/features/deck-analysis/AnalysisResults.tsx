import PlanCheck from './PlanCheck';
import AccessTimeline, { ScenarioControls, type AnalysisScenario } from './AccessTimeline';
import { naturalCardsSeenByTurn } from '../../lib/turnToPlay';
import { probabilityAtLeast } from '../deckbuilder/synergyReadiness';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import Button from '../../components/ui/Button';
import { computeDeckAnalysisReport } from '../../lib/deckAnalysisReport';
import type { CalculatorLine } from '../../lib/calculatorDashboard';
import type { DeckAnalysisProfile } from '../../lib/analysisProfile';
import { activeAnalysisPlan } from '../../lib/analysisProfile';
const percent = (value: number | null) => value == null ? 'Unavailable' : `${(value * 100).toFixed(1)}%`;
export default function AnalysisResults({ main, material, catalog, profile, onExplore, onEditPlan, scenario, onScenarioChange }: { main: CalculatorLine[]; material: CalculatorLine[]; catalog: Map<string, Card>; profile: DeckAnalysisProfile | null; onExplore: (card?: string) => void; onEditPlan: () => void; scenario: AnalysisScenario; onScenarioChange: (value: AnalysisScenario) => void }) {
  const report = useMemo(() => computeDeckAnalysisReport(main, material, catalog, profile ? activeAnalysisPlan(profile) : null, !!profile?.reviewedAt), [main, material, catalog, profile]);
  const plan = profile ? activeAnalysisPlan(profile) : null;
  const [selectedCard, setSelectedCard] = useState(main[0]?.name ?? '');
  const tracked = report.cards.find((card) => card.name === selectedCard) ?? report.cards[0];
  const [all, setAll] = useState(false);
  const art = (name: string) => { const card = catalog.get(name); const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-xs font-medium">{name}</span></>; return card ? <Link className="block w-24 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" target="_blank" rel="noopener noreferrer" to={`/cards/${card.slug}`}>{content}</Link> : <div className="w-24 shrink-0">{content}</div>; };
  return <div className="mt-4 space-y-4">
    <section className="rounded-xl border border-ctp-surface1 p-4">
      <h2 className="text-xl font-semibold">Will I find my plan on time?</h2>
      <ScenarioControls value={scenario} onChange={onScenarioChange} />
      <PlanCheck main={main} catalog={catalog} plan={plan} opening={report.opening} scenario={scenario} onEditPlan={onEditPlan} needsReview={!!profile?.inheritedFrom && !profile.reviewedAt} />
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4">
      <h2 className="text-lg font-semibold">When will I find my card?</h2>
      <ScenarioControls value={scenario} onChange={onScenarioChange} />
      {tracked ? <><div className="mb-3">{art(tracked.name)}</div><label className="block text-sm">Card to track<select className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={tracked.name} onChange={(event) => setSelectedCard(event.target.value)}>{report.cards.map((card) => <option key={card.name}>{card.name}</option>)}</select></label>
      <AccessTimeline values={Array.from({ length: 8 }, (_, i) => probabilityAtLeast(report.size, tracked.quantity, Math.min(report.size, naturalCardsSeenByTurn(i + 1, report.opening, scenario.order)), 1))} label={`${tracked.name} · ${tracked.quantity} copies in ${report.size} · find 1+`} scenario={scenario} onTurnChange={(turn) => onScenarioChange({ ...scenario, turn })} />
      <Button className="mt-4" onClick={() => onExplore(tracked.name)}>Compare card access</Button></> : <p className="mt-3 text-sm">Add Main Deck cards to calculate access by turn.</p>}
    </section>
    {report.unresolved.length > 0 && <p role="status" className="rounded-xl border border-ctp-yellow/40 p-3 text-sm">Missing card data: {report.unresolved.join(', ')}.</p>}
    <section className="rounded-xl border border-ctp-surface1 p-4">
      <h2 className="text-lg font-semibold">How many cards will I see?</h2>
      <p className="mt-1 text-xs text-ctp-subtext1">Total cards seen · going {scenario.order}</p>
      <div className="mt-4 space-y-4" aria-label="Cards seen by turn">{report.checkpoints.filter((point) => point.order === scenario.order).map((point) => <div key={point.turn}>
        <div className="mb-1 flex justify-between text-sm"><span>Turn {point.turn}</span><strong>{point.seen} / {report.size} cards</strong></div>
        <div aria-hidden="true" className="flex h-7 overflow-hidden rounded bg-ctp-surface0"><div className="bg-ctp-blue transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${report.size ? point.seen / report.size * 100 : 0}%` }} />{report.sources.length > 0 && <div className="bg-ctp-teal transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${report.size ? (point.adjustedSeen - point.seen) / report.size * 100 : 0}%` }} />}</div>
        {report.sources.length > 0 && <p className="mt-1 text-xs text-ctp-subtext1">With estimated extra draws: {point.adjustedSeen} / {report.size}</p>}
      </div>)}</div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs"><span>Blue · natural draws</span>{report.sources.length > 0 && <span>Teal · estimated extra draws</span>}</div>
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4"><h2 className="text-lg font-semibold">How often will I find each card?</h2>
      <p className="mt-2 text-xs text-ctp-subtext1">Alphabetical order · {all ? report.cards.length : Math.min(4, report.cards.length)} of {report.cards.length} unique cards</p>
      {!report.cards.length && <p className="mt-3 text-sm">Add main deck cards to see their opening access.</p>}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{report.cards.slice(0, all ? undefined : 4).map((line) => <article key={line.name} className="identity-surface flex flex-wrap gap-3 rounded-xl border border-ctp-surface1 p-3">{art(line.name)}<div className="min-w-0 flex-1"><p className="text-xs text-ctp-subtext1">{line.quantity} copies</p><p className="mt-1 text-4xl font-bold tracking-tight text-ctp-blue">{percent(line.opening)}</p><p className="text-xs">At least one in opening</p><div aria-hidden="true" className="my-2 h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full bg-ctp-blue" style={{ width: `${line.opening * 100}%` }} /></div><p className="text-xs text-ctp-subtext1">Two or more in opening: {percent(line.duplicate)}</p><Button className="mt-2" size="sm" onClick={() => { setSelectedCard(line.name); onExplore(line.name); }}>Explore card odds<span className="sr-only"> for {line.name}</span></Button></div></article>)}</div>
      {report.cards.length > 4 && <Button className="mt-3" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer cards' : `Show all ${report.cards.length} cards`}</Button>}
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4"><h2 className="text-lg font-semibold">What supports extra draws?</h2>{!report.sources.length && <p className="mt-3 text-sm text-ctp-subtext1">No extra draw effects found.</p>}
      <div className="mt-3 flex flex-wrap gap-4">{report.sources.map((source) => <div key={`${source.section}${source.name}`}>{art(source.name)}<p className="mt-1 max-w-24 text-xs">{source.section} · {source.perCopy} printed draws per copy{source.conditional ? ' · conditional' : ''}</p></div>)}</div>
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4"><h2 className="text-lg font-semibold">Costs and champion progression</h2><dl className="mt-3 space-y-2">{report.costs.map(([cost, count]) => <div key={cost}><div className="flex justify-between gap-3 text-sm"><dt>{cost === 'Unknown or no fixed Reserve cost' ? 'No fixed / known cost' : `Reserve ${cost}`}</dt><dd>{count} cards</dd></div><div aria-hidden="true" className="mt-1 h-3 overflow-hidden rounded bg-ctp-surface0"><div className="h-full bg-ctp-mauve" style={{ width: `${report.size ? count / report.size * 100 : 0}%` }} /></div></div>)}</dl><ul className="mt-4 flex flex-wrap gap-4">{report.lineage.map((line) => <li key={line.name}>{art(line.name)}<p className="mt-2 text-xs text-ctp-subtext1">Level {catalog.get(line.name)?.level ?? '?'}</p></li>)}</ul>{!report.lineage.length && <p className="mt-3 text-sm">No champion lineage identified.</p>}</section>

  </div>;
}
