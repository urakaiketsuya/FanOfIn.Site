import { useId, useState } from "react";
import type { Card } from "@gatcg/shared";
import AssociatedCards from "../../components/AssociatedCards";
import { ForecastCheckpointSelector, ForecastHeadline, ForecastMetricBar } from "../../components/ui/ForecastVisual";
import Panel from "../../components/ui/Panel";
import { probabilityAtLeast } from "../deckbuilder/synergyReadiness";

export default function DeckAccessSummary({ mainLines, cardsByName }: {
  mainLines: { name: string; quantity: number }[];
  cardsByName: Map<string, Card>;
}) {
  const id = useId();
  const [selection, setSelection] = useState("");
  const [seen, setSeen] = useState(10);
  const quantities = new Map<string, number>();
  for (const line of mainLines) if (line.quantity > 0) quantities.set(line.name, (quantities.get(line.name) ?? 0) + line.quantity);
  const lines = [...quantities].map(([name, quantity]) => ({ name, quantity }));
  const selected = lines.find(line => line.name === selection) ?? lines[0];
  const size = Math.max(60, lines.reduce((sum, line) => sum + line.quantity, 0));
  if (!selected) return <Panel><p className="text-sm text-ctp-subtext1">Add main-deck cards to calculate access.</p></Panel>;
  const probability = probabilityAtLeast(size, selected.quantity, seen, 1);
  return <Panel data-component="DeckAccessSummary">
    <ForecastHeadline label={`Find at least one · ${seen} cards seen`} value={`${Math.round(probability * 100)}%`} />
    <div className="mt-3"><ForecastMetricBar label={selected.name} value={probability} /></div>
    <p className="my-3 text-xs text-ctp-subtext1">Selected card · {selected.quantity} copies · {size}-card library</p>
    <AssociatedCards lines={[selected]} cardsByName={cardsByName} label="Selected access card" />
    <div className="mt-4 space-y-3">
      <label htmlFor={id} className="block text-xs font-medium">Card to find</label>
      <select id={id} value={selected.name} onChange={event => setSelection(event.target.value)} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base">
        {lines.map(line => <option key={line.name} value={line.name}>{line.name}</option>)}
      </select>
      <ForecastCheckpointSelector checkpoints={[7, 10, 15, 20].map(n => ({ seen: n, label: `${n} seen` }))} selected={seen} onSelect={setSeen} />
    </div>
  </Panel>;
}
