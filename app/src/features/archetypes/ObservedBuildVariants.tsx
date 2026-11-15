import { useState } from 'react';
import { Link } from 'react-router-dom';
import { type observedBuildVariants, type Card } from '@gatcg/shared';
import CardArtTile from '../../components/CardArtTile';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';

type Report = ReturnType<typeof observedBuildVariants>;
export default function ObservedBuildVariants({ report, cards }: { report: Report; cards: ReadonlyMap<string, Card> }) {
  const [visible, setVisible] = useState(4);
  const [open, setOpen] = useState<string | null>(null);
  const preview = (name: string, quantity: string) => {
    const card = cards.get(name);
    const content = <><CardArtTile card={card} name={name} cornerBadge={quantity} /><span className="mt-1 block break-words text-xs">{name}</span></>;
    return card ? <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}</Link> : <div>{content}</div>;
  };
  return <Panel><h3 className="text-lg font-semibold">Observed lists & alternatives</h3>
    <p className="mt-1 text-xs text-ctp-subtext0">{report.variants.length} exact lists · {report.available}/{report.requested} recorded lists available · Main + Material</p>
    {!report.available ? <p className="mt-3">Observed lists unavailable.</p> : <div className="mt-4 space-y-5">{report.variants.slice(0, visible).map((variant, index) => {
      const expanded = open === variant.key;
      const [event, player] = variant.deckIds[0].split(':');
      return <article key={variant.key} className="min-w-0 border-t border-ctp-surface1 pt-4">
        <h4 className="font-semibold">{index === 0 ? 'Most common observed list' : `Alternative ${index}`} · {(variant.share * 100).toFixed(1)}%</h4>
        <p className="mt-1 text-xs text-ctp-subtext0">{variant.deckIds.length}/{report.available} lists{index > 0 ? ' · changes from most common' : ''}</p>
        {index === 0 && !expanded && <p className="mt-2 text-xs text-ctp-subtext0">{Math.min(6, variant.main.length + variant.material.length)} of {variant.main.length + variant.material.length} cards</p>}
        {index === 0 && !expanded && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{[...variant.material, ...variant.main].slice(0,6).map((line,i) => <div key={`${line.name}-${i}`}>{preview(line.name, `${line.quantity}×`)}</div>)}</div>}
        {index > 0 && !expanded && (['main','material'] as const).map(section => {
          const changes = variant.changes.filter(change => change.section === section);
          return changes.length > 0 && <section key={section} className="mt-3"><h5 className="text-sm font-medium">{section === 'main' ? 'Main' : 'Material'}</h5><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{changes.map(change => <div key={change.name}>{preview(change.name, `${change.delta > 0 ? '+' : '−'}${Math.abs(change.delta)}`)}</div>)}</div></section>;
        })}
        <div className="mt-3 flex flex-wrap gap-3"><Button aria-expanded={expanded} onClick={() => setOpen(expanded ? null : variant.key)}>{expanded ? 'Hide full list' : 'View full list'}</Button><Link className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue focus-visible:outline-2" to={`/events/${event}?tab=decklists&player=${player}`}>Recorded deck →</Link></div>
        {expanded && (['main','material'] as const).map(section => <section key={section} className="mt-4"><h5 className="font-semibold">{section === 'main' ? 'Main' : 'Material'} · {variant[section].reduce((n,line) => n + line.quantity,0)}</h5><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{variant[section].map(line => <div key={line.name}>{preview(line.name, `${line.quantity}×`)}</div>)}</div></section>)}
      </article>;
    })}</div>}
    <div className="mt-4 flex flex-wrap gap-3">
      {report.variants.length > visible && <Button onClick={() => setVisible(value => value + 4)}>Show {Math.min(4, report.variants.length - visible)} more lists</Button>}
      {visible > 4 && <Button onClick={() => { setVisible(4); setOpen(null); }}>Show fewer alternatives</Button>}
    </div>
  </Panel>;
}
