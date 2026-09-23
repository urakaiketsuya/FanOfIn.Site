import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { buildSideboardPlan, type DeckLine } from "../../lib/sideboardPlan";
import { probabilityAtLeast } from "./synergyReadiness";
import { FUNCTIONAL_ROLE_LABELS, functionalRoles, type FunctionalRole } from "./functionalCopies";

const ROLES = Object.keys(FUNCTIONAL_ROLE_LABELS) as FunctionalRole[];
const CHECKPOINTS = [7, 10, 13];

export default function PostSideboardPlan({ mainLines, sideboardLines, catalogByName }: { mainLines: DeckLine[]; sideboardLines: DeckLine[]; catalogByName: Map<string, Card> }) {
  const [outs, setOuts] = useState<Record<string, number>>({});
  const [ins, setIns] = useState<Record<string, number>>({});
  const [seen, setSeen] = useState(10);
  const plan = useMemo(() => buildSideboardPlan(mainLines, sideboardLines, outs, ins), [mainLines, sideboardLines, outs, ins]);
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const before = useMemo(() => roleCounts(mainLines, catalogByName), [mainLines, catalogByName]);
  const after = useMemo(() => roleCounts(plan.postboardMain, catalogByName), [plan.postboardMain, catalogByName]);
  const setQuantity = (setter: React.Dispatch<React.SetStateAction<Record<string, number>>>, name: string, quantity: number) => setter((current) => ({ ...current, [name]: Math.max(0, quantity) }));
  const clear = () => { setOuts({}); setIns({}); };

  return <section data-component="PostSideboardPlan" className="pt-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-ctp-text">Post-Sideboard Plan</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">Build the complete swap package, keep its size balanced, and compare functional access before playing the matchup.</p></div><button type="button" onClick={clear} disabled={plan.cardsIn + plan.cardsOut === 0} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-xs text-ctp-subtext1 disabled:opacity-40">Clear plan</button></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2"><CardSelector title="Move out of Main" lines={mainLines} values={outs} onChange={(name, quantity) => setQuantity(setOuts, name, quantity)} /><CardSelector title="Move in from Sideboard" lines={sideboardLines} values={ins} onChange={(name, quantity) => setQuantity(setIns, name, quantity)} /></div>
    <div className={`mt-3 rounded-lg border p-3 ${plan.valid ? "border-ctp-green/40 bg-ctp-green/5" : plan.cardsIn + plan.cardsOut > 0 ? "border-ctp-yellow/40 bg-ctp-yellow/5" : "border-ctp-surface1 bg-ctp-base/35"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-ctp-text">{plan.cardsOut} out · {plan.cardsIn} in</p><span className={`text-xs font-semibold ${plan.valid ? "text-ctp-green" : "text-ctp-yellow"}`}>{plan.valid ? "Balanced plan" : plan.cardsIn + plan.cardsOut === 0 ? "No swaps selected" : "Plan needs attention"}</span></div>{plan.errors.map((error) => <p key={error} className="mt-1 text-xs text-ctp-yellow">{error}</p>)}</div>
    {plan.valid && <><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-ctp-text">Functional access after boarding</h4><label className="text-xs text-ctp-subtext0">Cards seen <select value={seen} onChange={(event) => setSeen(Number(event.target.value))} className="ml-1 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-ctp-text">{CHECKPOINTS.map((value) => <option key={value}>{value}</option>)}</select></label></div><div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">{ROLES.map((role) => { const beforeCopies = before.get(role) ?? 0; const afterCopies = after.get(role) ?? 0; const beforeOdds = probabilityAtLeast(deckSize, beforeCopies, Math.min(seen, deckSize), 1); const afterOdds = probabilityAtLeast(deckSize, afterCopies, Math.min(seen, deckSize), 1); const delta = afterOdds - beforeOdds; return <div key={role} className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{FUNCTIONAL_ROLE_LABELS[role]}</p><p className="mt-1 text-sm font-semibold tabular-nums text-ctp-text">{beforeCopies} → {afterCopies} copies</p><p className={`text-xs tabular-nums ${delta > 0 ? "text-ctp-green" : delta < 0 ? "text-ctp-red" : "text-ctp-subtext0"}`}>{(beforeOdds * 100).toFixed(1)}% → {(afterOdds * 100).toFixed(1)}% {delta !== 0 && `(${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)} pts)`}</p></div>; })}</div><details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-base/25 p-3"><summary className="cursor-pointer text-xs font-medium text-ctp-blue">Review postboard Main Deck ({deckSize} cards)</summary><ul className="mt-2 columns-1 text-xs text-ctp-subtext1 sm:columns-2 lg:columns-3">{plan.postboardMain.map((line) => <li key={line.name} className="mb-1 break-inside-avoid">{line.quantity}× {line.name}</li>)}</ul></details></>}
    <p className="mt-3 text-[11px] leading-4 text-ctp-subtext0">The plan is a preview only. Functional roles come from conservative printed-text detection; matchup suitability, copy limits, format legality, costs, sequencing, and the opponent’s exact configuration are not inferred.</p>
  </section>;
}

function CardSelector({ title, lines, values, onChange }: { title: string; lines: DeckLine[]; values: Record<string, number>; onChange: (name: string, quantity: number) => void }) {
  return <div className="rounded-lg border border-ctp-surface1"><h4 className="border-b border-ctp-surface1 px-3 py-2 text-sm font-semibold text-ctp-text">{title}</h4><div className="max-h-72 overflow-y-auto">{lines.map((line) => { const value = values[line.name] ?? 0; return <div key={line.name} className="flex items-center gap-2 border-b border-ctp-surface0 px-3 py-2 last:border-0"><span className="min-w-0 flex-1 truncate text-sm text-ctp-text">{line.name} <span className="text-[10px] text-ctp-subtext0">({line.quantity})</span></span><button type="button" aria-label={`Remove one ${line.name} from plan`} onClick={() => onChange(line.name, value - 1)} disabled={value === 0} className="h-8 w-8 rounded border border-ctp-surface1 text-ctp-subtext1 disabled:opacity-30">−</button><span className="w-5 text-center text-sm font-semibold tabular-nums text-ctp-text">{value}</span><button type="button" aria-label={`Add one ${line.name} to plan`} onClick={() => onChange(line.name, value + 1)} disabled={value >= line.quantity} className="h-8 w-8 rounded border border-ctp-surface1 text-ctp-subtext1 disabled:opacity-30">+</button></div>; })}</div></div>;
}

function roleCounts(lines: DeckLine[], catalogByName: Map<string, Card>) {
  const counts = new Map<FunctionalRole, number>(ROLES.map((role) => [role, 0]));
  for (const line of lines) { const card = catalogByName.get(line.name); if (!card) continue; for (const role of functionalRoles(card)) counts.set(role, (counts.get(role) ?? 0) + line.quantity); }
  return counts;
}
