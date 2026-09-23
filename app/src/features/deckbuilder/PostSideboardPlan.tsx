import { useEffect, useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { buildSideboardPlan, parseSavedSideboardPlans, sideboardPlanDeckFingerprint, type DeckLine, type SavedSideboardPlan } from "../../lib/sideboardPlan";
import { probabilityAtLeast } from "./synergyReadiness";
import { FUNCTIONAL_ROLE_LABELS, functionalRoles, type FunctionalRole } from "./functionalCopies";

const ROLES = Object.keys(FUNCTIONAL_ROLE_LABELS) as FunctionalRole[];
const CHECKPOINTS = [7, 10, 13];
const STORAGE_PREFIX = "sideboard-plans-v1:";
function loadPlans(key: string) { try { return parseSavedSideboardPlans(localStorage.getItem(key)); } catch { return []; } }

export default function PostSideboardPlan({ championName, mainLines, sideboardLines, catalogByName }: { championName: string | null; mainLines: DeckLine[]; sideboardLines: DeckLine[]; catalogByName: Map<string, Card> }) {
  const [outs, setOuts] = useState<Record<string, number>>({});
  const [ins, setIns] = useState<Record<string, number>>({});
  const [seen, setSeen] = useState(10);
  const [planName, setPlanName] = useState("");
  const [matchup, setMatchup] = useState("");
  const storageKey = `${STORAGE_PREFIX}${sideboardPlanDeckFingerprint(championName, mainLines, sideboardLines)}`;
  const [savedPlans, setSavedPlans] = useState<SavedSideboardPlan[]>(() => loadPlans(storageKey));
  const plan = useMemo(() => buildSideboardPlan(mainLines, sideboardLines, outs, ins), [mainLines, sideboardLines, outs, ins]);
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const before = useMemo(() => roleCounts(mainLines, catalogByName), [mainLines, catalogByName]);
  const after = useMemo(() => roleCounts(plan.postboardMain, catalogByName), [plan.postboardMain, catalogByName]);
  const setQuantity = (setter: React.Dispatch<React.SetStateAction<Record<string, number>>>, name: string, quantity: number) => setter((current) => ({ ...current, [name]: Math.max(0, quantity) }));
  const clear = () => { setOuts({}); setIns({}); };
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(savedPlans)); } catch { /* Local storage may be unavailable. */ } }, [savedPlans, storageKey]);
  function savePlan() {
    const name = planName.trim() || matchup.trim();
    if (!plan.valid || !name) return;
    const now = new Date().toISOString();
    setSavedPlans((current) => [{ id: crypto.randomUUID(), name, matchup: matchup.trim(), createdAt: now, updatedAt: now, outs: { ...outs }, ins: { ...ins } }, ...current]);
    setPlanName("");
  }
  function loadPlan(saved: SavedSideboardPlan) { setOuts({ ...saved.outs }); setIns({ ...saved.ins }); setPlanName(saved.name); setMatchup(saved.matchup); }

  return <section data-component="PostSideboardPlan" className="pt-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-ctp-text">Post-Sideboard Plan</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">Build the complete swap package, keep its size balanced, and compare functional access before playing the matchup.</p></div><button type="button" onClick={clear} disabled={plan.cardsIn + plan.cardsOut === 0} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-xs text-ctp-subtext1 disabled:opacity-40">Clear plan</button></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2"><CardSelector title="Move out of Main" lines={mainLines} values={outs} onChange={(name, quantity) => setQuantity(setOuts, name, quantity)} /><CardSelector title="Move in from Sideboard" lines={sideboardLines} values={ins} onChange={(name, quantity) => setQuantity(setIns, name, quantity)} /></div>
    <div className={`mt-3 rounded-lg border p-3 ${plan.valid ? "border-ctp-green/40 bg-ctp-green/5" : plan.cardsIn + plan.cardsOut > 0 ? "border-ctp-yellow/40 bg-ctp-yellow/5" : "border-ctp-surface1 bg-ctp-base/35"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-ctp-text">{plan.cardsOut} out · {plan.cardsIn} in</p><span className={`text-xs font-semibold ${plan.valid ? "text-ctp-green" : "text-ctp-yellow"}`}>{plan.valid ? "Balanced plan" : plan.cardsIn + plan.cardsOut === 0 ? "No swaps selected" : "Plan needs attention"}</span></div>{plan.errors.map((error) => <p key={error} className="mt-1 text-xs text-ctp-yellow">{error}</p>)}</div>
    {plan.valid && <><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-ctp-text">Functional access after boarding</h4><label className="text-xs text-ctp-subtext0">Cards seen <select value={seen} onChange={(event) => setSeen(Number(event.target.value))} className="ml-1 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-ctp-text">{CHECKPOINTS.map((value) => <option key={value}>{value}</option>)}</select></label></div><div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">{ROLES.map((role) => { const beforeCopies = before.get(role) ?? 0; const afterCopies = after.get(role) ?? 0; const beforeOdds = probabilityAtLeast(deckSize, beforeCopies, Math.min(seen, deckSize), 1); const afterOdds = probabilityAtLeast(deckSize, afterCopies, Math.min(seen, deckSize), 1); const delta = afterOdds - beforeOdds; return <div key={role} className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{FUNCTIONAL_ROLE_LABELS[role]}</p><p className="mt-1 text-sm font-semibold tabular-nums text-ctp-text">{beforeCopies} → {afterCopies} copies</p><p className={`text-xs tabular-nums ${delta > 0 ? "text-ctp-green" : delta < 0 ? "text-ctp-red" : "text-ctp-subtext0"}`}>{(beforeOdds * 100).toFixed(1)}% → {(afterOdds * 100).toFixed(1)}% {delta !== 0 && `(${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)} pts)`}</p></div>; })}</div><details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-base/25 p-3"><summary className="cursor-pointer text-xs font-medium text-ctp-blue">Review postboard Main Deck ({deckSize} cards)</summary><ul className="mt-2 columns-1 text-xs text-ctp-subtext1 sm:columns-2 lg:columns-3">{plan.postboardMain.map((line) => <li key={line.name} className="mb-1 break-inside-avoid">{line.quantity}× {line.name}</li>)}</ul></details></>}
    <div className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-base/25 p-3"><h4 className="text-sm font-semibold text-ctp-text">Saved matchup plans</h4><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs text-ctp-subtext0">Plan name<input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Control package" className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text" /></label><label className="text-xs text-ctp-subtext0">Matchup<input value={matchup} onChange={(event) => setMatchup(event.target.value)} placeholder="Opponent or archetype" className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text" /></label><button type="button" onClick={savePlan} disabled={!plan.valid || !(planName.trim() || matchup.trim())} className="self-end rounded-md bg-ctp-blue px-4 py-2 text-sm font-semibold text-ctp-base disabled:opacity-40">Save plan</button></div>{savedPlans.length === 0 ? <p className="mt-3 text-xs text-ctp-subtext0">No plans saved for this exact Main Deck and Sideboard.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{savedPlans.map((saved) => <article key={saved.id} className="rounded-md border border-ctp-surface1 p-2.5"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-ctp-text">{saved.name}</p><p className="text-[10px] text-ctp-subtext0">{saved.matchup || "General plan"} · {Object.values(saved.ins).reduce((sum, quantity) => sum + quantity, 0)} cards</p></div><button type="button" onClick={() => setSavedPlans((current) => current.filter((item) => item.id !== saved.id))} className="text-[10px] text-ctp-red">Delete</button></div><button type="button" onClick={() => loadPlan(saved)} className="mt-2 text-xs font-medium text-ctp-blue">Load plan</button></article>)}</div>}</div>
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
