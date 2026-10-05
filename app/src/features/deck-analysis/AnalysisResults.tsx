import PlanCheck from './PlanCheck';
import ResultEvidence from './ResultEvidence';
import AccessTimeline, { ScenarioControls, type AnalysisScenario } from './AccessTimeline';
import { naturalCardsSeenByTurn } from '../../lib/turnToPlay';
import { probabilityAtLeast } from '../deckbuilder/synergyReadiness';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import DisclosureChevron from '../../components/DisclosureChevron';
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
    <section className="identity-surface rounded-2xl border border-ctp-surface1 p-4">
      <p className="text-sm text-ctp-subtext1">Your deck at a glance</p><h2 className="mt-1 text-2xl font-bold">{report.size} cards. Your opening, explained.</h2>
      <div className="mt-4 flex flex-wrap gap-4">{material.map((line) => <div key={line.name}>{art(line.name)}</div>)}</div>
      <p className="mt-4 text-lg"><strong>{report.opening} cards</strong> in the modeled opening hand</p>
      <p className="mt-1 text-sm text-ctp-subtext1">{report.openingInferred ? 'Opening size detected from your starting champion.' : 'Using the default opening size because starting draw text could not be identified.'} Counts are capped at deck size.</p>
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4">
      <h2 className="text-lg font-semibold">When will I find my card?</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Deadline and play order carry into quick calculators. Detailed models retain their own assumptions.</p>
      <ScenarioControls value={scenario} onChange={onScenarioChange} />
      {tracked ? <><div className="mb-3">{art(tracked.name)}</div><label className="block text-sm">Card to track<select className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" value={tracked.name} onChange={(event) => setSelectedCard(event.target.value)}>{report.cards.map((card) => <option key={card.name}>{card.name}</option>)}</select></label>
      <div className="mt-3"><ResultEvidence kind="calculated" basis={`${report.size} Main Deck cards · ${report.opening} opening cards. Natural draws only; no mulligans, searches, or extra draw effects.`} /></div>
      <AccessTimeline values={Array.from({ length: 8 }, (_, i) => probabilityAtLeast(report.size, tracked.quantity, Math.min(report.size, naturalCardsSeenByTurn(i + 1, report.opening, scenario.order)), 1))} label={`${tracked.name} · ${tracked.quantity} copies in ${report.size} · find 1+`} scenario={scenario} onTurnChange={(turn) => onScenarioChange({ ...scenario, turn })} />
      <Button className="mt-4" onClick={() => onExplore(tracked.name)}>Compare card access</Button></> : <p className="mt-3 text-sm">Add Main Deck cards to calculate access by turn.</p>}
    </section>
    {report.unresolved.length > 0 && <p role="status" className="rounded-xl border border-ctp-yellow/40 p-3 text-sm">Catalog data is unavailable for {report.unresolved.join(', ')}. Access odds still use listed quantities; costs, draw effects, and progression may be incomplete.</p>}
    <section className="rounded-xl border border-ctp-surface1 p-4">
      <h2 className="text-lg font-semibold">How many cards will I see?</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Cumulative cards seen, including your opening hand. This is not the number remaining in hand.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{report.checkpoints.map((point) => <article key={`${point.turn}${point.order}`} className="identity-surface rounded-xl border border-ctp-surface1 p-4">
        <h3 className="text-sm font-medium">Turn {point.turn} · going {point.order}</h3>
        <p className="mt-2"><strong className="text-4xl tracking-tight text-ctp-blue">{point.seen}</strong> <span className="text-sm">cards with natural draws</span></p>
        {report.sources.length > 0 && <p className="mt-3 text-sm"><strong>{point.adjustedSeen} cards</strong> with modeled draw effects</p>}
      </article>)}</div>
      {report.sources.length > 0 && <p className="mt-3 text-sm text-ctp-subtext1">Modeled totals add rounded expected bonus draws and stop at deck size. They assume eligible effects resolve, do not simulate costs or repeated activations, and are not guaranteed draws. Source cards and details appear below.</p>}
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4"><h2 className="text-lg font-semibold">How often will I find each card?</h2><p className="mt-1 text-sm text-ctp-subtext1">Chance of at least one copy with natural draws. Duplicate odds describe access, not a bad hand. No mulligans, searches, or extra draws are included.</p>
      <p className="mt-2 text-xs text-ctp-subtext1">Alphabetical order · {all ? report.cards.length : Math.min(4, report.cards.length)} of {report.cards.length} unique cards</p>
      {!report.cards.length && <p className="mt-3 text-sm">Add main deck cards to see their opening access.</p>}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{report.cards.slice(0, all ? undefined : 4).map((line) => <article key={line.name} className="identity-surface flex flex-wrap gap-3 rounded-xl border border-ctp-surface1 p-3">{art(line.name)}<div className="min-w-0 flex-1"><p className="text-xs text-ctp-subtext1">{line.quantity} copies</p><p className="mt-1 text-4xl font-bold tracking-tight text-ctp-blue">{percent(line.opening)}</p><p className="text-xs">At least one in opening</p><div aria-hidden="true" className="my-2 h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className="h-full bg-ctp-blue" style={{ width: `${line.opening * 100}%` }} /></div><p className="text-xs text-ctp-subtext1">Two or more in opening: {percent(line.duplicate)}</p><details className="group mt-3"><summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue">Access by turn<span className="sr-only"> for {line.name}</span><DisclosureChevron /></summary><dl className="mt-2 space-y-2 text-xs">{line.checkpoints.map((point, i) => <div key={i}><dt>Turn {report.checkpoints[i].turn} · going {report.checkpoints[i].order}</dt><dd className="font-semibold">{percent(point.natural)}</dd></div>)}</dl><Button className="mt-2" size="sm" onClick={() => onExplore(line.name)}>Explore card odds<span className="sr-only"> for {line.name}</span></Button></details></div></article>)}</div>
      {report.cards.length > 4 && <Button className="mt-3" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer cards' : `Show all ${report.cards.length} cards`}</Button>}
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4"><h2 className="text-lg font-semibold">What supports extra draws?</h2><p className="mt-1 text-sm text-ctp-subtext1">{report.sources.length ? 'Detected printed draw effects provide a single pass estimate. Conditions, level gates, prior spending, and repeated activations are not simulated. Starting champion draws are excluded here.' : 'No supported extra draw clauses detected. Variable effects and searches may still provide access.'}</p>
      {report.sources.length > 0 && <div className="mt-3"><ResultEvidence kind="modeled" basis="Printed draw clauses are detected from catalog text. Eligible effects are assumed to resolve once; expected bonus draws are rounded before estimating access." /></div>}
      <div className="mt-3 flex flex-wrap gap-4">{report.sources.map((source) => <div key={`${source.section}${source.name}`}>{art(source.name)}<p className="mt-1 max-w-24 text-xs">{source.section} · {source.perCopy} printed draws per copy{source.conditional ? ' · conditional' : ''}</p></div>)}</div>
      {report.sources.length > 0 && <details className="group mt-3"><summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue">View modeled draw estimates<DisclosureChevron /></summary><p className="text-sm text-ctp-subtext1">Assumes eligible effects resolve. Rounded expected bonus draws are used for estimated access; these are not confidence bounds or exact probabilities for actual play.</p>{report.checkpoints.map((point, i) => <div className="mt-3" key={i}><h3 className="font-semibold">Turn {point.turn} · going {point.order}</h3><p className="text-sm">{point.extra.toFixed(1)} expected extra draws before deck size cap</p><ul className="mt-2 space-y-2 text-xs">{report.cards.map((line) => <li key={line.name}>{line.name}: {percent(line.checkpoints[i].natural)} natural; {percent(line.checkpoints[i].modeled)} with modeled effects</li>)}</ul></div>)}</details>}
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4"><h2 className="text-lg font-semibold">Costs and champion progression</h2><p className="mt-1 text-sm text-ctp-subtext1">Printed Reserve costs by copies. These describe the list, not when cards can be paid for.</p><div className="mt-3 flex flex-wrap gap-2">{report.costs.map(([cost, count]) => <p key={cost} className="rounded-lg bg-ctp-surface0 p-3 text-sm">{cost === 'Unknown or no fixed Reserve cost' ? cost : `Reserve ${cost}`}: <strong>{count}</strong></p>)}</div><ul className="mt-4 flex flex-wrap gap-4">{report.lineage.map((line) => <li key={line.name}>{art(line.name)}<p className="mt-2 text-xs text-ctp-subtext1">Level {catalog.get(line.name)?.level ?? '?'}</p></li>)}</ul>{!report.lineage.length && <p className="mt-3 text-sm">No champion lineage identified.</p>}<p className="mt-3 text-sm text-ctp-subtext1">Progression and acceleration timing require legal lineage and payment assumptions. Explore those in Advanced calculators.</p></section>

  </div>;
}
