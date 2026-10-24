import { useState } from 'react';
import { packageReport, type Card, type ReportDeck } from '@gatcg/shared';
import CardResult from '../../components/CardResult';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import DisclosureChevron from '../../components/DisclosureChevron';
import { pct } from './reportModel';
export function ReportCards({ names, cards }: { names: readonly string[]; cards: Map<string, Card> }) {
  return <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...new Set(names)].map(name => <CardResult key={name} name={name} card={cards.get(name)} newTab />)}</div>;
}
export default function PackageDecisionReport({ deck, cards, onExplore }: { deck: ReportDeck; cards: Map<string, Card>; onExplore: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const rows = packageReport(deck);
  return <Panel data-component="PackageDecisionReport">
    <h2 className="text-lg font-semibold">Package access</h2>
    <p className="mt-1 text-sm text-ctp-subtext1">Draw access · {deck.main.reduce((sum, line) => sum + line.quantity, 0)} Main · before activation</p>
    {!rows.length && <p role="status" className="mt-3">No reviewed packages detected.</p>}
    {(expanded ? rows : rows.slice(0, 2)).map(row => <section key={row.definition.id} className="mt-5 border-t border-ctp-surface1 pt-4">
      <h3 className="font-semibold">{row.definition.label}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{row.definition.memberCards.map(name => {
        const main = deck.main.filter(line => line.name === name).reduce((sum, line) => sum + line.quantity, 0), material = deck.material.filter(line => line.name === name).reduce((sum, line) => sum + line.quantity, 0);
        return <CardResult key={name} name={name} card={cards.get(name)} newTab><p className="mt-2 text-xs font-semibold">{row.anchor.some(r => r.cards.includes(name)) ? 'Source' : 'Support'}</p><p className="mt-1 text-xs">{main || material ? [main ? `Main ×${main}` : '', material ? `Material ×${material}` : ''].filter(Boolean).join(' · ') : 'Not in this deck'}</p></CardResult>;
      })}</div>
      <p className="mt-2 text-xs text-ctp-subtext1">Full reviewed pool · {row.requirementsMet ? 'Supported' : 'Missing support'}</p>
      <p className="mt-2 text-xs">Required · {row.definition.requirements.map(r => `${r.section === 'main' ? 'Main' : 'Material'} ≥${r.minimum} distinct`).join(' · ')}</p>
      {!row.lineage && <p role="status" className="mt-2 text-ctp-yellow">Required lineage missing.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">{row.checkpoints.map((point, index) => <div key={index} className="rounded-lg bg-ctp-base p-3">
        <h4 className="font-semibold">{[7, 10, 15, 20][index]} seen{point.seen < [7, 10, 15, 20][index] ? ` (${point.seen} available)` : ''}</h4>
        <dl className="mt-2 space-y-2 text-xs">{([['Both', point.both], ['Source only', point.anchorOnly], ['Support only', point.supportOnly], ['Neither', point.neither]] as const).map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-1"><dt>{label}</dt><dd className="font-semibold tabular-nums">{pct(value)}</dd></div>)}</dl>
      </div>)}</div>
      <Button className="mt-3" onClick={() => onExplore(row.anchor[0].cards[0])}>Open calculator</Button>
    </section>)}
    {rows.length > 2 && <Button className="mt-3 flex items-center gap-2" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer packages' : `Show all ${rows.length} packages`}<DisclosureChevron className={expanded ? "rotate-180" : ""} /></Button>}
  </Panel>;
}
