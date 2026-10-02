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
export default function AnalysisResults({ main, material, catalog, profile, onExplore }: { main: CalculatorLine[]; material: CalculatorLine[]; catalog: Map<string, Card>; profile: DeckAnalysisProfile | null; onExplore: (card?: string) => void }) {
  const report = useMemo(() => computeDeckAnalysisReport(main, material, catalog, profile ? activeAnalysisPlan(profile) : null, !!profile?.reviewedAt), [main, material, catalog, profile]);
  const plan = profile ? activeAnalysisPlan(profile) : null;
  const [all, setAll] = useState(false);
  const art = (name: string) => { const card = catalog.get(name); const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-xs font-medium">{name}</span></>; return card ? <Link className="block w-24 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" target="_blank" rel="noopener noreferrer" to={`/cards/${card.slug}`}>{content}</Link> : <div className="w-24 shrink-0">{content}</div>; };
  return <div className="mt-4 space-y-4">
    <section className="identity-surface rounded-2xl border border-ctp-surface1 p-4">
      <p className="text-sm text-ctp-subtext1">Your deck at a glance</p><h2 className="mt-1 text-2xl font-bold">{report.size} cards. Your opening, explained.</h2>
      <div className="mt-4 flex flex-wrap gap-4">{material.map((line) => <div key={line.name}>{art(line.name)}</div>)}</div>
      <p className="mt-4 text-lg"><strong>{report.opening} cards</strong> in the modeled opening hand</p>
      <p className="mt-1 text-sm text-ctp-subtext1">{report.openingInferred ? 'Opening size detected from your starting champion.' : 'Using the default opening size because starting draw text could not be identified.'} Counts are capped at deck size.</p>
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
      <div className="mt-3 flex flex-wrap gap-4">{report.sources.map((source) => <div key={`${source.section}${source.name}`}>{art(source.name)}<p className="mt-1 max-w-24 text-xs">{source.section} · {source.perCopy} printed draws per copy{source.conditional ? ' · conditional' : ''}</p></div>)}</div>
      {report.sources.length > 0 && <details className="group mt-3"><summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue">View modeled draw estimates<DisclosureChevron /></summary><p className="text-sm text-ctp-subtext1">Assumes eligible effects resolve. Rounded expected bonus draws are used for estimated access; these are not confidence bounds or exact probabilities for actual play.</p>{report.checkpoints.map((point, i) => <div className="mt-3" key={i}><h3 className="font-semibold">Turn {point.turn} · going {point.order}</h3><p className="text-sm">{point.extra.toFixed(1)} expected extra draws before deck size cap</p><ul className="mt-2 space-y-2 text-xs">{report.cards.map((line) => <li key={line.name}>{line.name}: {percent(line.checkpoints[i].natural)} natural; {percent(line.checkpoints[i].modeled)} with modeled effects</li>)}</ul></div>)}</details>}
    </section>
    <section className="rounded-xl border border-ctp-surface1 p-4"><h2 className="text-lg font-semibold">Costs and champion progression</h2><p className="mt-1 text-sm text-ctp-subtext1">Printed Reserve costs by copies. These describe the list, not when cards can be paid for.</p><div className="mt-3 flex flex-wrap gap-2">{report.costs.map(([cost, count]) => <p key={cost} className="rounded-lg bg-ctp-surface0 p-3 text-sm">{cost === 'Unknown or no fixed Reserve cost' ? cost : `Reserve ${cost}`}: <strong>{count}</strong></p>)}</div><ul className="mt-4 flex flex-wrap gap-4">{report.lineage.map((line) => <li key={line.name}>{art(line.name)}<p className="mt-2 text-xs text-ctp-subtext1">Level {catalog.get(line.name)?.level ?? '?'}</p></li>)}</ul>{!report.lineage.length && <p className="mt-3 text-sm">No champion lineage identified.</p>}<p className="mt-3 text-sm text-ctp-subtext1">Progression and acceleration timing require legal lineage and payment assumptions. Explore those in Advanced calculators.</p></section>
    <section className="rounded-xl border border-ctp-surface1 p-4">
      <h2 className="text-lg font-semibold">Your saved plan</h2>
      {report.plan ? <>
        <h3 className="mt-2 break-words text-xl font-bold">{report.plan.name}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{(['enabler', 'payoff'] as const).map((role) => <div key={role} className="rounded-xl bg-ctp-surface0/50 p-3">
          <h4 className="font-semibold">{role === 'enabler' ? 'Setup cards' : 'Payoff cards'}</h4>
          <ul className="mt-3 flex flex-wrap gap-3">{report.cards.filter((line) => plan?.roles[line.name] === role).map((line) => <li key={line.name}>{art(line.name)}<p className="mt-2 text-xs text-ctp-subtext1">{line.quantity} copies</p></li>)}</ul>
        </div>)}</div>
        <div className="identity-surface mt-4 rounded-xl border border-ctp-surface1 p-4">
          <p className="text-4xl font-bold tracking-tight text-ctp-blue">{percent(report.plan.opening)}</p>
          <p className="mt-1 font-medium">Opening access to setup and payoff</p>
          <p className="mt-2 text-sm text-ctp-subtext1">At least one card from each role pool above, not every listed card. Natural draws only, without mulligans or searches. Access does not establish affordability, play order, or successful execution.</p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{report.plan.checkpoints.map((value, i) => <div className="rounded-xl bg-ctp-surface0 p-3" key={i}><dt className="text-xs">Turn {report.checkpoints[i].turn} · going {report.checkpoints[i].order}</dt><dd className="mt-1 text-xl font-semibold">{percent(value)}</dd></div>)}</dl>
      </> : <p className="mt-2 text-sm text-ctp-subtext1">Optional: define and review setup and payoff cards in analysis setup to add plan results. The report above needs no configuration.</p>}
      <Button className="mt-3" onClick={() => onExplore()}>Open advanced calculators</Button>
    </section>
  </div>;
}
