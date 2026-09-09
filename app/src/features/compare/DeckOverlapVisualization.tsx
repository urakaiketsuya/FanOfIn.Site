import { useMemo, useState } from "react";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import Panel from "../../components/ui/Panel";

type OverlapView = "shared" | "baseline" | "target" | "quantity";
const CARD_FIELDS: VisualFieldVisibility = { cost: false, price: false, priceTrend: false, tags: false, simulator: false, community: false };

function quantities(decklist: OmnidexDecklist): Map<string, number> {
  const result = new Map<string, number>();
  for (const line of [...decklist.main, ...decklist.material, ...decklist.sideboard]) result.set(line.card, (result.get(line.card) ?? 0) + line.quantity);
  return result;
}

export default function DeckOverlapVisualization({ baseline, target, cardsByName, onViewAll }: {
  baseline: OmnidexDecklist;
  target: OmnidexDecklist;
  cardsByName: Map<string, Card>;
  onViewAll: () => void;
}) {
  const [view, setView] = useState<OverlapView>("shared");
  const groups = useMemo(() => {
    const a = quantities(baseline);
    const b = quantities(target);
    const names = new Set([...a.keys(), ...b.keys()]);
    return {
      shared: [...names].filter((name) => a.has(name) && b.has(name)),
      baseline: [...names].filter((name) => a.has(name) && !b.has(name)),
      target: [...names].filter((name) => !a.has(name) && b.has(name)),
      quantity: [...names].filter((name) => a.has(name) && b.has(name) && a.get(name) !== b.get(name)),
      a,
      b,
    };
  }, [baseline, target]);
  const total = groups.shared.length + groups.baseline.length + groups.target.length;
  const options: { key: OverlapView; label: string; count: number; tone: string }[] = [
    { key: "shared", label: "Shared", count: groups.shared.length, tone: "bg-ctp-green" },
    { key: "baseline", label: "Baseline only", count: groups.baseline.length, tone: "bg-ctp-yellow" },
    { key: "target", label: "Compared deck only", count: groups.target.length, tone: "bg-ctp-blue" },
    { key: "quantity", label: "Quantity changed", count: groups.quantity.length, tone: "bg-ctp-mauve" },
  ];
  const shown = groups[view].slice(0, 8);

  return <Panel data-component="DeckOverlapVisualization" padding="sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-ctp-text">Card overlap</h3><p className="mt-0.5 text-xs text-ctp-subtext0">Select a segment to inspect the cards behind it.</p></div>
      <button type="button" onClick={onViewAll} className="min-h-10 px-2 text-xs font-medium text-ctp-blue hover:underline">View complete comparison →</button>
    </div>
    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ctp-surface0" aria-label={`${groups.shared.length} shared, ${groups.baseline.length} baseline only, ${groups.target.length} comparison only`}>
      {options.slice(0, 3).map((option) => option.count > 0 && <button key={option.key} type="button" title={`${option.label}: ${option.count}`} aria-label={`${option.label}: ${option.count}`} onClick={() => setView(option.key)} className={`${option.tone} min-w-1 transition-opacity ${view === option.key ? "opacity-100" : "opacity-55 hover:opacity-80"}`} style={{ width: `${(option.count / Math.max(total, 1)) * 100}%` }} />)}
    </div>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Overlap category">
      {options.map((option) => <button key={option.key} type="button" aria-pressed={view === option.key} onClick={() => setView(option.key)} className={`min-h-10 rounded-full border px-3 text-xs font-medium transition-colors ${view === option.key ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:bg-ctp-surface0"}`}><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${option.tone}`} />{option.label} · {option.count}</button>)}
    </div>
    {shown.length > 0 && <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">{shown.map((name) => <VisualCardTile key={name} line={{ card: name, quantity: Math.max(groups.a.get(name) ?? 0, groups.b.get(name) ?? 0) }} card={cardsByName.get(name)} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={CARD_FIELDS} footer={<div className="mt-1.5"><div className="truncate text-sm font-medium text-ctp-text">{name}</div><div className="mt-1 border-t border-ctp-surface0 pt-1 text-[11px] text-ctp-subtext0">{groups.a.get(name) ?? 0}× → {groups.b.get(name) ?? 0}×</div></div>} />)}</div>}
    {groups[view].length > shown.length && <button type="button" onClick={onViewAll} className="mt-4 min-h-10 text-xs font-medium text-ctp-blue">See all {groups[view].length} cards →</button>}
  </Panel>;
}
