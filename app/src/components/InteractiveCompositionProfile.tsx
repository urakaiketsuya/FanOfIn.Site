import { useMemo, useState } from "react";
import type { Card, OmnidexDecklistCardLine } from "@gatcg/shared";
import type { DeckComposition } from "../lib/deckIdentity";
import type { BarChartBar } from "./BarChart";
import BarChart from "./BarChart";
import { VisualCardTile, type VisualFieldVisibility } from "./VisualCardTile";

type Dimension = "types" | "elements" | "subtypes";
const CARD_FIELDS: VisualFieldVisibility = { cost: true, price: false, priceTrend: false, tags: false, simulator: false, community: false };
const LABELS: Record<Dimension, string> = { types: "Types", elements: "Elements", subtypes: "Subtypes" };

export default function InteractiveCompositionProfile({ composition, memoryCurve, reserveCurve, lines, cardsByName }: {
  composition: DeckComposition;
  memoryCurve: BarChartBar[];
  reserveCurve: BarChartBar[];
  lines: OmnidexDecklistCardLine[];
  cardsByName: Map<string, Card>;
}) {
  const [dimension, setDimension] = useState<Dimension>("types");
  const segments = useMemo(() => [...composition[dimension].entries()].sort((a, b) => b[1] - a[1]), [composition, dimension]);
  const [selection, setSelection] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const active = selection && composition[dimension].has(selection) ? selection : segments[0]?.[0] ?? null;
  const total = segments.reduce((sum, [, count]) => sum + count, 0);
  const matching = lines.filter((line) => {
    const card = cardsByName.get(line.card);
    if (!card || !active) return false;
    return dimension === "types" ? card.types.includes(active) : dimension === "elements" ? card.elements.includes(active) : card.subtypes.includes(active);
  });
  const visibleSegments = showAllCategories ? segments : segments.slice(0, 10);
  const visibleCards = showAllCards ? matching : matching.slice(0, 8);

  return <div data-component="InteractiveCompositionProfile" className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><BarChart title="Memory Cost Curve" bars={memoryCurve} /><BarChart title="Reserve Cost Curve" bars={reserveCurve} /></div>
    <div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-ctp-text">Explore composition</h3><p className="mt-0.5 text-xs text-ctp-subtext0">Choose a category to reveal its Main and Material cards.</p></div><div className="inline-flex rounded-lg bg-ctp-base p-1" role="group" aria-label="Composition dimension">{(Object.keys(LABELS) as Dimension[]).map((key) => <button key={key} type="button" aria-pressed={dimension === key} onClick={() => { setDimension(key); setSelection(null); setShowAllCategories(false); setShowAllCards(false); }} className={`min-h-10 rounded-md px-3 text-xs font-medium ${dimension === key ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>{LABELS[key]}</button>)}</div></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(14rem,0.65fr)_minmax(0,1.35fr)]">
        <div><div className="space-y-1">{visibleSegments.map(([label, count]) => <button key={label} type="button" aria-pressed={active === label} onClick={() => { setSelection(label); setShowAllCards(false); }} className={`grid min-h-10 w-full grid-cols-[minmax(5rem,auto)_1fr_auto] items-center gap-2 rounded-md px-2 text-left text-xs ${active === label ? "bg-ctp-blue/10 text-ctp-blue" : "text-ctp-subtext1 hover:bg-ctp-surface0"}`}><span className="truncate">{label}</span><span className="h-2 overflow-hidden rounded-full bg-ctp-surface0"><span className="block h-full rounded-full bg-ctp-blue" style={{ width: `${(count / Math.max(segments[0]?.[1] ?? 1, 1)) * 100}%` }} /></span><span className="w-14 text-right tabular-nums">{count} · {total ? Math.round(count / total * 100) : 0}%</span></button>)}</div>{segments.length > 10 && <button type="button" onClick={() => setShowAllCategories((value) => !value)} className="mt-2 min-h-10 text-xs font-medium text-ctp-blue">{showAllCategories ? "Show fewer categories" : `Show all ${segments.length} categories`}</button>}</div>
        <div aria-live="polite">{active && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{active} cards · {matching.length}</p>}{matching.length > 0 ? <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">{visibleCards.map((line) => <VisualCardTile key={line.card} line={line} card={cardsByName.get(line.card)} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={CARD_FIELDS} />)}</div> : <p className="text-sm text-ctp-subtext1">No resolved cards in this category.</p>}{matching.length > 8 && <button type="button" onClick={() => setShowAllCards((value) => !value)} className="mt-3 min-h-10 text-xs font-medium text-ctp-blue">{showAllCards ? "Show fewer cards" : `Show all ${matching.length} cards`}</button>}</div>
      </div>
    </div>
  </div>;
}
