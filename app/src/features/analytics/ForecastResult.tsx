import type { ReactNode } from 'react';
import type { Card, DrawRange } from '@gatcg/shared';
import { Link } from 'react-router-dom';
import CardArtTile from '../../components/CardArtTile';

export type ReportCard = { name: string; quantity: number; detail?: string };
import { rangeText, percent } from './reportFormatting';

/** Full card identity, quantities, and named links stay visible beside results. */
export function ReportCards({ lines, cardsByName }: { lines: ReportCard[]; cardsByName: Map<string, Card> }) {
  return <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-2">{lines.filter(line => line.quantity > 0).map(line => {
    const card = cardsByName.get(line.name);
    const content = <><div className="max-w-28"><CardArtTile card={card} name={line.name} cornerBadge={line.detail?.includes('→') ? line.detail : `×${line.quantity}`} /></div><span className="mt-2 block break-words text-xs font-medium">{line.name}</span>{line.detail && <span className="mt-1 block text-xs text-ctp-subtext1">{line.detail}</span>}</>;
    return card ? <Link key={line.name} to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" aria-label={`${line.name} (opens in a new tab)`} className="min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={line.name} className="min-w-0">{content}</div>;
  })}</div>;
}

export function RangeMark({ value, max, unit }: { value: DrawRange; max: number; unit: string }) {
  const scale = Math.max(1, max, value.high);
  return <div aria-hidden="true"><div className="relative mb-2 mt-4 h-1.5 rounded bg-ctp-surface1"><span className="absolute h-1.5 rounded bg-ctp-teal" style={{ left: `${100 * value.low / scale}%`, width: `${100 * (value.high - value.low) / scale}%` }} /><span className="absolute -top-0.5 size-2.5 -translate-x-1/2 rounded-full bg-ctp-text" style={{ left: `${100 * value.median / scale}%` }} /></div><div className="flex justify-between text-xs text-ctp-subtext1"><span>0 {unit}</span><span>{scale}</span></div></div>;
}

export function ForecastRange({ early, late, unit, max, cumulative = true }: { early: DrawRange; late: DrawRange; unit: string; max?: number; cumulative?: boolean }) {
  return <><div className="mt-2 flex flex-wrap items-center gap-3"><strong className="text-3xl font-semibold tabular-nums">{rangeText(late)}</strong><span className="text-sm">{unit}<span className="block text-xs text-ctp-subtext1">{cumulative ? 'By turn 5' : 'Turn 5'}</span></span></div><RangeMark value={late} max={max ?? Math.max(early.high, late.high, 1)} unit={unit} /><p className="mt-2 text-xs text-ctp-subtext1">{late.median} median · middle 80%</p><div className="mt-4 flex flex-wrap justify-between gap-2 text-sm"><span>{cumulative ? 'By turn 3' : 'Turn 3'}</span><span className="tabular-nums">{rangeText(early)} <span className="text-xs text-ctp-subtext1">· {early.median} median</span></span></div></>;
}

export function ForecastChance({ early, late, label, cumulative = true }: { early: number; late: number; label: string; cumulative?: boolean }) {
  return <><p className="text-sm">{label}</p><div className="mt-2 flex items-center gap-3"><strong className="text-3xl font-semibold tabular-nums">{percent(late)}</strong><span className="text-xs text-ctp-subtext1">{cumulative ? 'By turn 5' : 'Turn 5'}</span></div><div className="my-4 h-1.5 overflow-hidden rounded bg-ctp-surface1" aria-hidden="true"><div className="h-full bg-ctp-teal" style={{ width: percent(late) }} /></div><div className="flex justify-between gap-2 text-sm"><span>{cumulative ? 'By turn 3' : 'Turn 3'}</span><span className="tabular-nums">{percent(early)}</span></div></>;
}

export default function ForecastResult({ title, context, cards, cardsByName, children }: { title: string; context?: string; cards: ReportCard[]; cardsByName: Map<string, Card>; children: ReactNode }) {
  return <section className="min-w-0 border-t border-ctp-surface1 py-5 first:border-t-0 first:pt-0 last:pb-0"><div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-semibold">{title}</h3>{context && <p className="text-xs text-ctp-subtext1">{context}</p>}</div><div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="min-w-0">{children}</div><ReportCards lines={cards} cardsByName={cardsByName} /></div></section>;
}
