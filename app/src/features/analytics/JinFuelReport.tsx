import { useEffect, useState, useTransition } from 'react';
import { Link } from 'react-router-dom';
import { computeJinFuelReport, hasJinFuelSources, type AnalyticsDeck, type Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import Panel from '../../components/ui/Panel';
import { ForecastChance, ForecastRange } from './ForecastResult';
import { percent } from './reportFormatting';

type Props = { deck: AnalyticsDeck; cardsByName: Map<string, Card> };
const featured = ['Volcanic Crescendo', 'Sly Songstress', 'Creative Shock', 'Creative Tinder', 'Package Courier', 'Hasty Messenger'];

export default function JinFuelReport({ deck, cardsByName }: Props) {
  const relevant = hasJinFuelSources(deck);
  const [attacks, setAttacks] = useState(true);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ deck: AnalyticsDeck; catalog: Map<string, Card>; attacks: boolean; report: ReturnType<typeof computeJinFuelReport> }>();
  useEffect(() => {
    if (!relevant) return;
    const timer = setTimeout(() => startTransition(() => setResult({ deck, catalog: cardsByName, attacks, report: computeJinFuelReport(deck, cardsByName, attacks) })), 0);
    return () => clearTimeout(timer);
  }, [deck, cardsByName, attacks, relevant]);
  if (!relevant) return null;
  const stale = pending || result?.deck !== deck || result.catalog !== cardsByName || result.attacks !== attacks;
  const report = stale ? undefined : result?.report;
  const early = report?.status === 'ready' ? report.points[2] : undefined;
  const late = report?.status === 'ready' ? report.points[4] : undefined;
  return <Panel data-component="JinFuelReport">
    <h3 className="text-lg font-semibold">Graveyard fuel</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Crescendo core engine estimate · going first</p>
    <div className="my-5 grid grid-cols-3 items-start gap-3 sm:grid-cols-6">{featured.map(name => {
      const quantity = deck.main.filter(line => line.name === name).reduce((n, line) => n + line.quantity, 0);
      if (!quantity) return null;
      const card = cardsByName.get(name);
      const content = <><CardArtTile card={card} name={name} cornerBadge={`×${quantity}`} /><span className="mt-2 block break-words text-xs font-medium">{name}</span></>;
      return card ? <Link key={name} to={`/cards/${card.slug}`} className="min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link>
        : <div key={name} className="min-w-0">{content}</div>;
    })}</div>
    <label className="mb-4 flex min-h-control cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" checked={attacks} onChange={event => setAttacks(event.target.checked)} className="size-5 accent-ctp-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue" />
      Surviving Messengers attack each turn
    </label>
    <div aria-busy={stale}>
      {stale ? <p role="status" className="py-4 text-sm text-ctp-subtext1">Recalculating…</p>
        : report?.status !== 'ready' ? <p role="status" className="py-4 text-sm text-ctp-subtext1">{report?.status === 'missing'
          ? cardsByName.size === 0 ? 'Loading card data…' : 'Required card data is unavailable.'
          : 'Requires a starting Spirit and an unambiguous champion progression.'}</p>
        : early && late && <>
          <h4 className="font-semibold">Resolved Crescendo</h4>
          <table className="mt-3 w-full text-right text-sm tabular-nums">
            <caption className="pb-3 text-left text-xs text-ctp-subtext1">Estimated chance · Fire cards banished in one cast</caption>
            <thead><tr className="border-b border-ctp-surface1"><th scope="col" className="py-2 text-left font-medium">By turn</th>{[3, 5, 8].map(n => <th key={n} scope="col" className="py-2 font-medium">{n}+ Fire</th>)}</tr></thead>
            <tbody>{report.points.map(point => <tr key={point.turn} className="border-b border-ctp-surface0"><th scope="row" className="py-3 text-left font-medium">{point.turn}</th>{point.thresholds.map(threshold => <td key={threshold.fuel} className="py-3">{percent(threshold.chance)}</td>)}</tr>)}</tbody>
          </table>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section><h4 className="font-semibold">Fire fuel remaining</h4><ForecastRange early={early.fuel} late={late.fuel} unit="cards" cumulative={false} /></section>
            <section><h4 className="font-semibold">Strongest Crescendo</h4><ForecastRange early={early.empower} late={late.empower} unit="Empower" /></section>
            <section><h4 className="mb-2 font-semibold">Harmonize</h4><ForecastChance early={early.harmonized} late={late.harmonized} label="Resolved with Melody activated that turn" /></section>
            <section><h4 className="font-semibold">Crescendo damage to each champion</h4><ForecastRange early={early.damage} late={late.damage} unit="damage" /></section>
          </div>
        </>}
    </div>
  </Panel>;
}
