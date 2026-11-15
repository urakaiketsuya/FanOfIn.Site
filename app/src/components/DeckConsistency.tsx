import { useId, useMemo, useState } from "react";
import { cardAccess, copyCountTradeoffs, drawAccessReport, type BasicStatRow, type Card } from "@gatcg/shared";
import CardResult from "./CardResult";
import Button from "./ui/Button";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** Card-specific view of the existing random-draw model; never edits deck quantities. */
export default function DeckConsistency({ size, groups, cardsByName, onExplore }: {
  size: number; groups: BasicStatRow[]; cardsByName: Map<string, Card>; onExplore?: (name: string) => void;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [checkpoint, setCheckpoint] = useState(7);
  const cards = useMemo(() => groups.flatMap(group => group.lines).sort((a, b) => a.name.localeCompare(b.name)), [groups]);
  const report = useMemo(() => drawAccessReport(cards), [cards]);
  const selected = cards.find(card => card.name === name) ?? cards[0];
  if (!size || !selected) return <p role="status" className="py-4 text-sm text-ctp-subtext1">Add Main cards to calculate access.</p>;
  const seen = Math.min(checkpoint, size);
  const odds = cardAccess(size, selected.quantity, seen);
  const checkpoints = [...new Set([7, 10, 15, 20].map(value => Math.min(size, value)))];
  return <section className="mt-4 space-y-4" aria-label="Card consistency">
    <h3 className="font-semibold">Main card access</h3>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{report.rows.map(row => <CardResult key={row.name} compactOnMobile card={cardsByName.get(row.name)} name={row.name}>
      <p className="text-xs text-ctp-subtext1">{row.quantity} copies · find 1+</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">{row.points.filter((point, index, points) => index === 0 || Math.min(point.seen, size) !== Math.min(points[index - 1].seen, size)).map(point => <div key={point.seen}><dt>{Math.min(point.seen, size)} seen</dt><dd className="font-semibold tabular-nums">{percent(point.probability)}</dd></div>)}</dl>
    </CardResult>)}</div>
    <h3 className="pt-3 font-semibold">Explore copy counts</h3>
    <div className="flex flex-wrap gap-3">
      <label className="min-w-0 flex-1 text-sm" htmlFor={`${id}-card`}>Card
        <select id={`${id}-card`} className="mt-1 min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3" value={selected.name} onChange={event => setName(event.target.value)}>{cards.map(card => <option key={card.name} value={card.name}>{card.name} · {card.quantity}×</option>)}</select>
      </label>
      <label className="text-sm" htmlFor={`${id}-seen`}>Cards seen
        <select id={`${id}-seen`} className="mt-1 block min-h-control rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3" value={seen} onChange={event => setCheckpoint(Number(event.target.value))}>{checkpoints.map(value => <option key={value}>{value}</option>)}</select>
      </label>
    </div>
    <div className="grid items-start gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <CardResult compactOnMobile card={cardsByName.get(selected.name)} name={selected.name}><p className="text-sm text-ctp-subtext1">{selected.quantity} copies in Main</p></CardResult>
      <div className="rounded-xl bg-ctp-mantle p-4">
        <p className="text-sm text-ctp-subtext1">Chance to find at least one</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums">{percent(odds.access)}</p>
        <p className="mt-3 text-sm">{percent(odds.multiple)} to find two or more</p>
        <p className="mt-3 text-xs text-ctp-subtext1">Main · {size} cards · {seen} seen · random draws, no mulligan</p>
        {onExplore && <Button className="mt-3" onClick={() => onExplore(selected.name)}>Explore in calculator</Button>}
      </div>
    </div>
    <div>
      <h3 className="font-semibold">Compare copy counts</h3>
      <p className="mt-1 text-xs text-ctp-subtext1">Fixed {size}-card Main · hypothetical replacements</p>
      <table className="mt-2 w-full text-right text-sm tabular-nums">
        <thead><tr className="text-ctp-subtext1"><th scope="col" className="py-3 text-left font-medium">Copies</th><th scope="col" className="font-medium">Find 1+</th><th scope="col" className="font-medium">Find 2+</th></tr></thead>
        <tbody>{copyCountTradeoffs(size, seen, selected.quantity).map(row => <tr key={row.copies} className={row.copies === selected.quantity ? "bg-ctp-blue/10" : "border-t border-ctp-surface1"}><th scope="row" className="p-3 text-left font-medium">{row.copies}×{row.copies === selected.quantity && <span className="ml-2 text-xs text-ctp-blue">Current</span>}</th><td className="p-3">{percent(row.access)}</td><td className="p-3">{percent(row.multiple)}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
