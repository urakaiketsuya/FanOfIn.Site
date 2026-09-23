import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { computeFunctionalHand, type FunctionalHandRole } from "../../lib/functionalHand";
import type { GamePlanRole } from "../../lib/gamePlanReadiness";
import { inferStartingHandSize, type PlayOrder } from "../../lib/turnToPlay";

interface Line { name: string; quantity: number }
type RequiredRole = Exclude<FunctionalHandRole, "liability">;
const LABEL: Record<FunctionalHandRole, string> = { proactive: "Early action", setup: "Setup piece", interaction: "Interaction", liability: "Unwanted early draw" };
const REQUIRED_ROLES: RequiredRole[] = ["proactive", "setup", "interaction"];

export default function FunctionalHandCalculator({ mainLines, materialLines, catalogByName, sharedAssignments }: { mainLines: Line[]; materialLines: Line[]; catalogByName: Map<string, Card>; sharedAssignments?: Record<string, GamePlanRole | ""> }) {
  const [assignments, setAssignments] = useState<Record<string, FunctionalHandRole | "">>({});
  const [required, setRequired] = useState<Record<RequiredRole, boolean>>({ proactive: true, setup: true, interaction: false });
  const [maximumLiabilities, setMaximumLiabilities] = useState(1);
  const [targetTurn, setTargetTurn] = useState(3);
  const [playOrder, setPlayOrder] = useState<PlayOrder>("first");
  const [query, setQuery] = useState("");
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const opening = inferStartingHandSize(materialLines, catalogByName);
  const grouped = useMemo(() => ({
    proactive: mainLines.filter((line) => assignments[line.name] === "proactive"),
    setup: mainLines.filter((line) => assignments[line.name] === "setup"),
    interaction: mainLines.filter((line) => assignments[line.name] === "interaction"),
    liability: mainLines.filter((line) => assignments[line.name] === "liability"),
  }), [assignments, mainLines]);
  const roles = (Object.keys(grouped) as FunctionalHandRole[]).map((role) => ({ role, copies: grouped[role].reduce((sum, line) => sum + line.quantity, 0) }));
  const activeRequired = REQUIRED_ROLES.filter((role) => required[role]);
  const result = computeFunctionalHand(deckSize, opening, roles, activeRequired, maximumLiabilities, targetTurn, playOrder);
  const filtered = mainLines.filter((line) => line.name.toLowerCase().includes(query.trim().toLowerCase()));
  const canCalculate = activeRequired.length > 0 && activeRequired.every((role) => grouped[role].length > 0);
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const canSeedFromPlan = sharedAssignments && Object.values(sharedAssignments).some((role) => role === "enabler" || role === "protection");
  function seedFromPlan() {
    if (!sharedAssignments) return;
    setAssignments(Object.fromEntries(mainLines.map((line) => [line.name, sharedAssignments[line.name] === "enabler" ? "setup" : sharedAssignments[line.name] === "protection" ? "interaction" : ""])));
    setRequired((current) => ({ ...current, setup: Object.values(sharedAssignments).includes("enabler"), interaction: Object.values(sharedAssignments).includes("protection") }));
  }

  return <section data-component="FunctionalHandCalculator" className="pt-3">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-ctp-text">Opening Hand Recipe</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">Choose what this deck specifically wants to find early. Only mark a card as an unwanted early draw when drawing it early is actually undesirable—not merely because it belongs to another plan.</p></div><div className="flex flex-wrap gap-2">{canSeedFromPlan && <button type="button" onClick={seedFromPlan} className="min-h-10 rounded-lg px-3 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">Use prepared plan</button>}<button type="button" onClick={() => setAssignments({})} disabled={!Object.values(assignments).some(Boolean)} className="min-h-10 rounded-lg px-3 text-xs font-medium text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text disabled:opacity-40">Clear recipe</button></div></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter cards…" aria-label="Filter opening hand cards" className="min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-2 text-base text-ctp-text sm:text-sm" /><div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-ctp-surface1">{filtered.map((line) => <div key={line.name} className="grid grid-cols-[minmax(0,1fr)] items-center gap-2 border-b border-ctp-surface0 px-3 py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_10rem]"><div className="min-w-0"><p className="truncate text-sm text-ctp-text">{line.name}</p><p className="text-[10px] text-ctp-subtext0">{line.quantity} copies</p></div><select value={assignments[line.name] ?? ""} onChange={(event) => setAssignments((current) => ({ ...current, [line.name]: event.target.value as FunctionalHandRole | "" }))} aria-label={`Opening hand role for ${line.name}`} className="min-h-11 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 text-sm text-ctp-text"><option value="">Does not define this recipe</option><option value="proactive">Early action</option><option value="setup">Setup piece</option><option value="interaction">Interaction</option><option value="liability">Unwanted early draw</option></select></div>)}</div></div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">{(Object.keys(grouped) as FunctionalHandRole[]).map((role) => <div key={role} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-ctp-text">{LABEL[role]}</span><span className="font-bold tabular-nums text-ctp-text">{roles.find((item) => item.role === role)!.copies}</span></div>{role === "liability" ? <label className="mt-2 flex items-center gap-1 text-[10px] text-ctp-subtext0">Allow at most <select value={maximumLiabilities} onChange={(event) => setMaximumLiabilities(Number(event.target.value))} className="rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-xs text-ctp-text">{[0,1,2,3,4].map((value) => <option key={value}>{value}</option>)}</select></label> : <label className="mt-2 flex items-center gap-2 text-[10px] text-ctp-subtext0"><input type="checkbox" checked={required[role]} onChange={(event) => setRequired((current) => ({ ...current, [role]: event.target.checked }))} /> Required</label>}</div>)}</div>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-ctp-subtext0">Target turn<select value={targetTurn} onChange={(event) => setTargetTurn(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text">{[1,2,3,4,5,6,7,8].map((turn) => <option key={turn} value={turn}>Turn {turn}</option>)}</select></label><label className="text-xs text-ctp-subtext0">Play order<select value={playOrder} onChange={(event) => setPlayOrder(event.target.value as PlayOrder)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text"><option value="first">Going first</option><option value="second">Going second</option></select></label></div>
        {!canCalculate ? <div className="rounded-lg border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">Choose at least one required category and assign cards to it. Turn off categories this deck does not need in its opening recipe.</div> : <><div className="grid grid-cols-3 gap-2"><Metric label="Opening" value={percent(result.openingProbability)} /><Metric label={`Turn ${targetTurn}`} value={percent(result.targetProbability)} /><Metric label="First 10" value={percent(result.firstTenProbability)} /></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3 text-xs text-ctp-subtext1"><p><b className="text-ctp-text">Least reliable part:</b> {result.bottleneck ? LABEL[result.bottleneck] : "—"}</p>{result.bestAdditionalCopy && <p className="mt-2 text-ctp-green">Best extra category copy: {LABEL[result.bestAdditionalCopy.role]} (+{(result.bestAdditionalCopy.gain * 100).toFixed(1)} points by turn {targetTurn})</p>}</div></>}
      </div>
    </div>
    {canCalculate && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[34rem] text-xs"><thead className="text-ctp-subtext0"><tr><th className="px-2 py-1.5 text-left">Turn</th>{result.points.map((point) => <th key={point.turn} className="px-2 py-1.5 text-right">{point.turn}</th>)}</tr></thead><tbody><tr className="border-t border-ctp-surface1"><th className="px-2 py-2 text-left font-medium text-ctp-text">Functional hand</th>{result.points.map((point) => <td key={point.turn} className="px-2 py-2 text-right font-medium tabular-nums text-ctp-blue">{percent(point.probability)}</td>)}</tr><tr className="border-t border-ctp-surface0 text-ctp-subtext0"><th className="px-2 py-2 text-left font-medium">Cards seen</th>{result.points.map((point) => <td key={point.turn} className="px-2 py-2 text-right tabular-nums">{point.seen}</td>)}</tr></tbody></table></div>}
    <p className="mt-3 text-[11px] leading-4 text-ctp-subtext0">Exact without-replacement access odds for this user-defined recipe. Meeting the recipe does not prove the cards are legal, affordable, or strategically compatible, and unassigned cards are not assumed to be bad draws.</p>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2 text-center"><p className="text-[9px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-ctp-text">{value}</p></div>; }
