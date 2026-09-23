import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import type { GamePlanRole } from "../../lib/gamePlanReadiness";
import { computeStageDrawQuality } from "../../lib/stageDrawQuality";
import { inferStartingHandSize, type PlayOrder } from "../../lib/turnToPlay";

interface Line { name: string; quantity: number }
type Role = "early" | "late" | "flexible" | "conditional";
const LABEL: Record<Role, string> = { early: "Setup-focused", late: "Payoff-focused", flexible: "Useful anytime", conditional: "Needs condition" };
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function StageDrawQuality({ mainLines, materialLines, catalogByName, sharedAssignments = {} }: { mainLines: Line[]; materialLines: Line[]; catalogByName: Map<string, Card>; sharedAssignments?: Record<string, GamePlanRole | ""> }) {
  const [assignments, setAssignments] = useState<Record<string, Role | "">>({});
  const [earlyTurn, setEarlyTurn] = useState(2);
  const [lateTurn, setLateTurn] = useState(6);
  const [maximumClunk, setMaximumClunk] = useState(1);
  const [playOrder, setPlayOrder] = useState<PlayOrder>("first");
  const [query, setQuery] = useState("");
  const pools = useMemo(() => ({ early: mainLines.filter((line) => assignments[line.name] === "early"), late: mainLines.filter((line) => assignments[line.name] === "late"), flexible: mainLines.filter((line) => assignments[line.name] === "flexible"), conditional: mainLines.filter((line) => assignments[line.name] === "conditional") }), [assignments, mainLines]);
  const copies = (role: Role) => pools[role].reduce((sum, line) => sum + line.quantity, 0);
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const result = computeStageDrawQuality(deckSize, inferStartingHandSize(materialLines, catalogByName), { earlyCopies: copies("early"), lateCopies: copies("late"), flexibleCopies: copies("flexible"), conditionalCopies: copies("conditional") }, earlyTurn, lateTurn, playOrder, maximumClunk);
  const filtered = mainLines.filter((line) => line.name.toLowerCase().includes(query.trim().toLowerCase()));
  const ready = copies("early") + copies("flexible") > 0 && copies("late") + copies("flexible") > 0;
  const preparedCount = Object.values(sharedAssignments).filter(Boolean).length;

  function usePreparedPlan() {
    const prepared: Record<string, Role | ""> = {};
    for (const line of mainLines) {
      const role = sharedAssignments[line.name];
      if (role === "enabler") prepared[line.name] = "early";
      else if (role === "payoff") prepared[line.name] = "late";
      else if (role === "protection") prepared[line.name] = "flexible";
    }
    setAssignments(prepared);
  }

  return <section data-component="StageDrawQuality" className="pt-3">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-ctp-text">Draw Quality by Game Stage</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">Classify cards by when they contribute, then measure early setup followed by fresh late impact.</p></div>{preparedCount > 0 && <button type="button" onClick={usePreparedPlan} className="min-h-11 rounded-lg border border-ctp-blue/50 px-3 text-sm font-medium text-ctp-blue hover:bg-ctp-blue/10">Use prepared plan</button>}</div>
    <p className="mt-3 text-xs leading-5 text-ctp-subtext1">Prepared roles are only a starting point: Setup becomes setup-focused, Payoff becomes payoff-focused, and Protection becomes useful anytime. Adjust cards whose timing differs in this deck.</p>
    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter cards…" aria-label="Filter draw quality cards" className="min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text" /><div className="mt-2 max-h-96 space-y-2 overflow-y-auto">{filtered.map((line) => { const card = catalogByName.get(line.name); return <div key={line.name} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2 sm:grid-cols-[2.25rem_minmax(0,1fr)_9rem]">{card?.editions[0] ? <CardImage image={card.editions[0].image} alt="" className="h-12 w-9 rounded object-cover object-top" /> : <span className="h-12 w-9 rounded bg-ctp-surface0" />}<div className="min-w-0"><p className="truncate text-sm text-ctp-text">{line.name}</p><p className="text-[10px] text-ctp-subtext0">{line.quantity} copies</p></div><select value={assignments[line.name] ?? ""} onChange={(event) => setAssignments((current) => ({ ...current, [line.name]: event.target.value as Role | "" }))} aria-label={`Game-stage role for ${line.name}`} className="col-span-2 min-h-11 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-xs text-ctp-text sm:col-span-1"><option value="">Unassigned</option><option value="early">Setup-focused</option><option value="late">Payoff-focused</option><option value="flexible">Useful anytime</option><option value="conditional">Needs condition</option></select></div>; })}</div></div>
      <div className="space-y-3"><div className="grid grid-cols-2 gap-2">{(Object.keys(pools) as Role[]).map((role) => <div key={role} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2"><p className="text-xs font-semibold text-ctp-text">{LABEL[role]}</p><p className="mt-1 text-xl font-bold tabular-nums text-ctp-text">{copies(role)}</p></div>)}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Turn label="Early check" value={earlyTurn} onChange={(value) => { setEarlyTurn(value); setLateTurn((current) => Math.max(current, value)); }} /><Turn label="Late check" value={lateTurn} onChange={(value) => setLateTurn(Math.max(earlyTurn, value))} /><label className="text-xs text-ctp-subtext0">Max early clunk<select value={maximumClunk} onChange={(event) => setMaximumClunk(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text">{[0,1,2,3,4].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs text-ctp-subtext0">Order<select value={playOrder} onChange={(event) => setPlayOrder(event.target.value as PlayOrder)} className="mt-1 block min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text"><option value="first">First</option><option value="second">Second</option></select></label></div>{!ready ? <div className="rounded-lg border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">Assign Setup-focused/Useful anytime and Payoff-focused/Useful anytime cards to evaluate both stages.</div> : <><div className="grid grid-cols-2 gap-2"><Metric label="Early functional" value={percent(result.openingFunctional)} /><Metric label="Late injection" value={percent(result.lateInjection)} /><Metric label="Both stages" value={percent(result.stagedPlan)} /><Metric label="Early clunk risk" value={percent(result.earlyClog)} /></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3 text-xs text-ctp-subtext1"><p>Early window: {result.earlySeen} cards seen.</p><p className="mt-1">Late draw window: cards {result.earlySeen + 1}–{result.lateSeen}.</p><p className="mt-1">Chance of 2+ setup-focused cards by the late checkpoint: <b className="text-ctp-text">{percent(result.lateFlood)}</b>.</p></div></>}</div></div>
    <p className="mt-3 text-[11px] leading-4 text-ctp-subtext0">“Both stages” exactly requires an Early-only or Flexible card by the early checkpoint, no more than the selected Late-only/Conditional clunk cap there, and a Late-only or Flexible card drawn after that checkpoint. Categories are player judgments; costs, plays, extra draws, and game state are not modeled.</p>
  </section>;
}

function Turn({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs text-ctp-subtext0">{label}<select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text">{[1,2,3,4,5,6,7,8].map((turn) => <option key={turn} value={turn}>Turn {turn}</option>)}</select></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2"><p className="text-[9px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-ctp-text">{value}</p></div>; }
