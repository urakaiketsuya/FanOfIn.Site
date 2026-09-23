import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { computeGamePlanReadiness, type GamePlanRole } from "../../lib/gamePlanReadiness";
import { inferStartingHandSize, type PlayOrder } from "../../lib/turnToPlay";

interface Line { name: string; quantity: number }
const LABEL: Record<GamePlanRole, string> = { enabler: "Enabler", payoff: "Payoff", protection: "Protection" };
const COLOR: Record<GamePlanRole, string> = { enabler: "text-ctp-blue", payoff: "text-ctp-mauve", protection: "text-ctp-green" };

export default function GamePlanReadiness({ mainLines, materialLines, catalogByName }: { mainLines: Line[]; materialLines: Line[]; catalogByName: Map<string, Card> }) {
  const [assignments, setAssignments] = useState<Record<string, GamePlanRole | "">>({});
  const [required, setRequired] = useState<Record<GamePlanRole, number>>({ enabler: 1, payoff: 1, protection: 1 });
  const [targetTurn, setTargetTurn] = useState(3);
  const [playOrder, setPlayOrder] = useState<PlayOrder>("first");
  const [query, setQuery] = useState("");
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const opening = inferStartingHandSize(materialLines, catalogByName);
  const roleLines = useMemo(() => ({
    enabler: mainLines.filter((line) => assignments[line.name] === "enabler"),
    payoff: mainLines.filter((line) => assignments[line.name] === "payoff"),
    protection: mainLines.filter((line) => assignments[line.name] === "protection"),
  }), [assignments, mainLines]);
  const roles = (Object.keys(roleLines) as GamePlanRole[]).map((role) => ({ role, copies: roleLines[role].reduce((sum, line) => sum + line.quantity, 0), required: required[role] }));
  const result = computeGamePlanReadiness(deckSize, opening, roles, targetTurn, playOrder);
  const filtered = mainLines.filter((line) => line.name.toLowerCase().includes(query.trim().toLowerCase()));
  const ready = roleLines.enabler.length > 0 && roleLines.payoff.length > 0;
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return <section data-component="GamePlanReadiness" className="pt-3">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-ctp-text">Game Plan Readiness</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">Define what sets the plan up, what pays it off, and what protects it. Each card has one role, so the joint probability remains exact.</p></div><button type="button" onClick={() => setAssignments({})} disabled={!Object.values(assignments).some(Boolean)} className="text-xs font-medium text-ctp-subtext1 hover:text-ctp-text disabled:opacity-40">Clear roles</button></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter cards…" aria-label="Filter deck cards" className="w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /><div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-ctp-surface1">{filtered.map((line) => <div key={line.name} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-2 border-b border-ctp-surface0 px-3 py-2 last:border-0"><div className="min-w-0"><p className="truncate text-sm text-ctp-text">{line.name}</p><p className="text-[10px] text-ctp-subtext0">{line.quantity} copies</p></div><select value={assignments[line.name] ?? ""} onChange={(event) => setAssignments((current) => ({ ...current, [line.name]: event.target.value as GamePlanRole | "" }))} aria-label={`Role for ${line.name}`} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"><option value="">Unassigned</option><option value="enabler">Enabler</option><option value="payoff">Payoff</option><option value="protection">Protection</option></select></div>)}</div></div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">{(Object.keys(roleLines) as GamePlanRole[]).map((role) => { const copies = roles.find((input) => input.role === role)!.copies; return <label key={role} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2 text-xs"><span className={`block font-semibold ${COLOR[role]}`}>{LABEL[role]}</span><span className="mt-1 block text-lg font-bold tabular-nums text-ctp-text">{copies}</span><span className="mt-1 flex items-center gap-1 text-[10px] text-ctp-subtext0">Need <select value={required[role]} onChange={(event) => setRequired((current) => ({ ...current, [role]: Number(event.target.value) }))} aria-label={`${LABEL[role]} cards required`} className="rounded border border-ctp-surface1 bg-ctp-mantle px-1 py-0.5 text-xs text-ctp-text">{[1,2,3,4].map((value) => <option key={value}>{value}</option>)}</select></span></label>; })}</div>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-ctp-subtext0">Target turn<select value={targetTurn} onChange={(event) => setTargetTurn(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text">{[1,2,3,4,5,6,7,8].map((turn) => <option key={turn} value={turn}>Turn {turn}</option>)}</select></label><label className="text-xs text-ctp-subtext0">Play order<select value={playOrder} onChange={(event) => setPlayOrder(event.target.value as PlayOrder)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text"><option value="first">Going first</option><option value="second">Going second</option></select></label></div>
        {!ready ? <div className="rounded-lg border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">Assign at least one Enabler and one Payoff to calculate the plan.</div> : <><div className="grid grid-cols-2 gap-2"><Metric label={`Core by turn ${targetTurn}`} value={percent(result.targetCoreProbability)} /><Metric label="With protection" value={result.targetProtectedProbability == null ? "Optional" : percent(result.targetProtectedProbability)} /></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3 text-xs text-ctp-subtext1"><p><b className="text-ctp-text">Bottleneck:</b> {result.bottleneck ? LABEL[result.bottleneck] : "—"}</p><p className="mt-1"><b className="text-ctp-text">Payoff without setup:</b> {percent(result.payoffWithoutEnabler)}</p><p className="mt-1"><b className="text-ctp-text">Setup without payoff:</b> {percent(result.enablerWithoutPayoff)}</p>{result.expectedCoreCardsSeen != null && <p className="mt-1"><b className="text-ctp-text">Expected access:</b> {result.expectedCoreCardsSeen.toFixed(1)} cards seen</p>}{result.bestAdditionalCopy && <p className="mt-2 text-ctp-green">Best extra role copy: {LABEL[result.bestAdditionalCopy.role]} (+{(result.bestAdditionalCopy.gain * 100).toFixed(1)} points by turn {targetTurn})</p>}</div></>}
      </div>
    </div>
    {ready && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-xs"><thead className="text-ctp-subtext0"><tr><th className="px-2 py-1.5">Turn</th>{result.points.map((point) => <th key={point.turn} className="px-2 py-1.5 text-right">{point.turn}</th>)}</tr></thead><tbody><tr className="border-t border-ctp-surface1"><th className="px-2 py-2 font-medium text-ctp-text">Core ready</th>{result.points.map((point) => <td key={point.turn} className="px-2 py-2 text-right tabular-nums text-ctp-mauve">{percent(point.coreProbability)}</td>)}</tr><tr className="border-t border-ctp-surface0"><th className="px-2 py-2 font-medium text-ctp-text">Protected plan</th>{result.points.map((point) => <td key={point.turn} className="px-2 py-2 text-right tabular-nums text-ctp-green">{point.protectedProbability == null ? "—" : percent(point.protectedProbability)}</td>)}</tr><tr className="border-t border-ctp-surface0 text-ctp-subtext0"><th className="px-2 py-2 font-medium">Cards seen</th>{result.points.map((point) => <td key={point.turn} className="px-2 py-2 text-right tabular-nums">{point.seen}</td>)}</tr></tbody></table></div>}
    <p className="mt-3 text-[11px] leading-4 text-ctp-subtext0">Exact without-replacement access odds using natural draws and the detected opening hand. Costs, activation legality, sequencing, board state, draw effects, and opponent responses are not modeled.</p>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 text-xl font-bold tabular-nums text-ctp-text">{value}</p></div>; }
