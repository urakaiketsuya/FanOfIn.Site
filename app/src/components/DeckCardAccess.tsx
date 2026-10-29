import { useId, useState } from 'react';
import { cardAccess, copyCountTradeoffs, type BasicStatRow, type Card } from '@gatcg/shared';
import AssociatedCards from './AssociatedCards';
import DisclosureChevron from './DisclosureChevron';
import Button from './ui/Button';

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
const gain = (n: number) => `+${(n * 100).toFixed(1)} pp`;

export default function DeckCardAccess({ size, groups, cardsByName }: { size: number; groups: BasicStatRow[]; cardsByName: Map<string, Card> }) {
  const id = useId();
  const [checkpoint, setCheckpoint] = useState(7);
  const [selected, setSelected] = useState<string | null>(null);
  const seen = Math.min(checkpoint, size);
  const active = groups.find(row => row.label === selected);
  const current = active?.lines[0]?.quantity ?? 0;
  const options = [...new Set([7, 10, 15, 20].map(n => Math.min(n, size)))];
  return <section className="border-t border-ctp-surface1 pt-2" aria-labelledby={`${id}-title`}>
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
      <h3 id={`${id}-title`} className="text-sm font-semibold">Card access</h3>
      <label className="flex items-center gap-2 text-xs">Cards seen<select className="min-h-control rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 text-sm" value={seen} onChange={event => setCheckpoint(Number(event.target.value))}>{options.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    <p className="mb-2 text-xs text-ctp-subtext1">Main · {size} cards · random draws, no mulligan</p>
    <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 text-right text-xs text-ctp-subtext1"><span className="text-left">Copies per card</span><span>Find 1+</span><span>Find 2+</span></div>
    {[...groups].sort((a, b) => a.lines[0].quantity - b.lines[0].quantity).map(row => {
      const odds = cardAccess(size, row.lines[0].quantity, seen);
      return <Button key={row.label} variant="ghost" className="grid w-full grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-2 !px-0 text-right" aria-label={`${row.lines[0].quantity} copies per card: find one or more ${percent(odds.access)}, find two or more ${percent(odds.multiple)}. Show cards and copy-count scenarios`} aria-expanded={selected === row.label} aria-controls={`${id}-details`} onClick={() => setSelected(selected === row.label ? null : row.label)}>
        <span className="flex items-center gap-1 text-left text-sm"><DisclosureChevron className={selected === row.label ? "rotate-180" : ""} />{row.lines[0].quantity}× <span className="text-xs text-ctp-subtext1">· {row.lines.length} cards</span></span><span className="text-sm tabular-nums">{percent(odds.access)}</span><span className="text-sm tabular-nums">{percent(odds.multiple)}</span>
      </Button>;
    })}
    <div id={`${id}-details`} aria-live="polite">{active && <div className="mt-2 space-y-3 border-t border-ctp-surface1 pt-3">
      <AssociatedCards lines={active.lines} cardsByName={cardsByName} />
      <div><h4 className="text-sm font-semibold">Copy-count scenarios</h4><p className="mt-1 text-xs text-ctp-subtext1">Fixed {size}-card Main · change from one fewer copy</p></div>
      <table className="w-full text-right text-xs tabular-nums"><thead><tr className="text-ctp-subtext1"><th scope="col" className="py-2 text-left font-medium">Copies</th><th scope="col" className="w-16 font-medium">Find 1+</th><th scope="col" className="w-16 font-medium">Find 2+</th></tr></thead><tbody>{copyCountTradeoffs(size, seen, current).map(row => <tr key={row.copies} className={row.copies === current ? 'bg-ctp-surface0' : ''}><th scope="row" className="py-2 text-left font-medium">{row.copies}×{row.copies === current && <span className="block text-ctp-subtext1">Current</span>}</th><td className="py-2">{percent(row.access)}<span className="block text-ctp-subtext1">{gain(row.accessGain)}</span></td><td className="py-2">{percent(row.multiple)}<span className="block text-ctp-subtext1">{gain(row.multipleGain)}</span></td></tr>)}</tbody></table>
    </div>}</div>
  </section>;
}
