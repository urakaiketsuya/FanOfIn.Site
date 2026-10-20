import { drawAccessReport, type Card } from "@gatcg/shared";
import AssociatedCards from "../../components/AssociatedCards";
import Panel from "../../components/ui/Panel";

export default function DeckAccessSummary({ mainLines, cardsByName }: {
  mainLines: { name: string; quantity: number }[];
  cardsByName: Map<string, Card>;
}) {
  const { size, rows } = drawAccessReport(mainLines);
  const quantities = [...new Set(rows.map(row => row.quantity))];
  return <Panel data-component="DeckAccessSummary">
    <h3 className="font-semibold">How reliably will you draw each card?</h3>
    <p className="mt-1 text-xs text-ctp-subtext1">Chance of drawing at least one · {size} Main cards</p>
    {!rows.length && <p role="status" className="mt-3 text-sm">Add Main cards to calculate access.</p>}
    {size > 0 && size < 60 && <p role="status" className="mt-2 text-xs text-ctp-yellow">Incomplete Main deck · probabilities use the current {size} cards</p>}
    <div className="mt-4 space-y-6">{quantities.map(quantity => {
      const group = rows.filter(row => row.quantity === quantity);
      return <section key={quantity} className="min-w-0">
        <h4 className="text-sm font-semibold">{quantity} {quantity === 1 ? 'copy' : 'copies'} of each card</h4>
        <div className="my-3 grid grid-cols-4 gap-2">{group[0].points.map(point => <div key={point.seen} className="min-w-0 rounded-lg bg-ctp-mantle p-2">
          <p className="text-xs text-ctp-subtext1">{point.seen} seen</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{(point.probability * 100).toFixed(1)}%</p>
          <div aria-hidden="true" className="mt-2 h-1.5 rounded bg-ctp-surface1"><div className="h-full rounded bg-ctp-blue" style={{ width: `${point.probability * 100}%` }} /></div>
        </div>)}</div>
        <AssociatedCards lines={group} cardsByName={cardsByName} label={`${quantity}-copy cards · individual access`} />
      </section>;
    })}</div>
  </Panel>;
}
