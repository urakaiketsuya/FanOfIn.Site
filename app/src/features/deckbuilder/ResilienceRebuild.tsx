import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { computeResilienceForecast } from "../../lib/resilienceForecast";
import { inferStartingHandSize, type PlayOrder } from "../../lib/turnToPlay";
import type { ResilienceRole } from "../../lib/analysisProfile";

interface Line { name: string; quantity: number }
type Role = ResilienceRole;
const LABEL: Record<Role, string> = { establish: "Establish", protection: "Protect", rebuild: "Rebuild" };
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ResilienceRebuild({ mainLines, materialLines, catalogByName, sharedAssignments, onSharedAssignmentsChange }: { mainLines: Line[]; materialLines: Line[]; catalogByName: Map<string, Card>; sharedAssignments?: Record<string, Role | "">; onSharedAssignmentsChange?: (assignments: Record<string, Role | "">) => void }) {
  const [localAssignments, setLocalAssignments] = useState<Record<string, Role | "">>({});
  const assignments = sharedAssignments ?? localAssignments;
  const setAssignments = onSharedAssignmentsChange ?? setLocalAssignments;
  const [required, setRequired] = useState<Record<Role, number>>({ establish: 2, protection: 1, rebuild: 1 });
  const [clearTurn, setClearTurn] = useState(3);
  const [recoveryTurn, setRecoveryTurn] = useState(5);
  const [playOrder, setPlayOrder] = useState<PlayOrder>("first");
  const [query, setQuery] = useState("");
  const pools = useMemo(() => ({
    establish: mainLines.filter((line) => assignments[line.name] === "establish"),
    protection: mainLines.filter((line) => assignments[line.name] === "protection"),
    rebuild: mainLines.filter((line) => assignments[line.name] === "rebuild"),
  }), [assignments, mainLines]);
  const copies = (role: Role) => pools[role].reduce((sum, line) => sum + line.quantity, 0);
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const opening = inferStartingHandSize(materialLines, catalogByName);
  const result = computeResilienceForecast(deckSize, opening, { establishCopies: copies("establish"), establishRequired: required.establish, protectionCopies: copies("protection"), protectionRequired: required.protection, rebuildCopies: copies("rebuild"), rebuildRequired: required.rebuild }, clearTurn, recoveryTurn, playOrder);
  const filtered = mainLines.filter((line) => line.name.toLowerCase().includes(query.trim().toLowerCase()));
  const ready = (Object.keys(pools) as Role[]).every((role) => pools[role].length > 0);

  return <section data-component="ResilienceRebuild" className="pt-3">
    <div><h3 className="font-semibold text-ctp-text">Resilience / Rebuild</h3><p className="mt-1 max-w-2xl text-xs text-ctp-subtext0">Declare when disruption lands, what establishes your plan, what can protect it, and what can rebuild afterward.</p>{sharedAssignments && <p className="mt-1 text-[10px] font-medium text-ctp-blue">Using the active plan's shared recovery roles.</p>}</div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter cards…" aria-label="Filter resilience cards" className="w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" /><div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-ctp-surface1">{filtered.map((line) => <div key={line.name} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-2 border-b border-ctp-surface0 px-3 py-2 last:border-0"><div className="min-w-0"><p className="truncate text-sm text-ctp-text">{line.name}</p><p className="text-[10px] text-ctp-subtext0">{line.quantity} copies</p></div><select value={assignments[line.name] ?? ""} onChange={(event) => setAssignments({ ...assignments, [line.name]: event.target.value as Role | "" })} aria-label={`Resilience role for ${line.name}`} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"><option value="">Unassigned</option><option value="establish">Establish</option><option value="protection">Protect</option><option value="rebuild">Rebuild</option></select></div>)}</div></div>
      <div className="space-y-3"><div className="grid grid-cols-3 gap-2">{(Object.keys(pools) as Role[]).map((role) => <label key={role} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2 text-xs"><span className="font-semibold text-ctp-text">{LABEL[role]}</span><span className="mt-1 block text-xl font-bold tabular-nums text-ctp-text">{copies(role)}</span><span className="mt-1 flex items-center gap-1 text-[10px] text-ctp-subtext0">Need <select value={required[role]} onChange={(event) => setRequired((current) => ({ ...current, [role]: Number(event.target.value) }))} className="rounded border border-ctp-surface1 bg-ctp-mantle px-1">{[1,2,3,4].map((value) => <option key={value}>{value}</option>)}</select></span></label>)}</div><div className="grid grid-cols-3 gap-2"><Turn label="Disruption" value={clearTurn} onChange={(value) => { setClearTurn(value); setRecoveryTurn((current) => Math.max(current, value)); }} /><Turn label="Recover by" value={recoveryTurn} onChange={(value) => setRecoveryTurn(Math.max(clearTurn, value))} /><label className="text-xs text-ctp-subtext0">Order<select value={playOrder} onChange={(event) => setPlayOrder(event.target.value as PlayOrder)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text"><option value="first">First</option><option value="second">Second</option></select></label></div>{!ready ? <div className="rounded-lg border border-ctp-blue/30 bg-ctp-blue/5 p-3 text-sm text-ctp-subtext1">Assign cards to all three roles to compare protection and rebuilding.</div> : <><div className="grid grid-cols-2 gap-2"><Metric label="Plan established" value={percent(result.establishProbability)} /><Metric label="Protected route" value={percent(result.protectedProbability)} /><Metric label="Rebuild route" value={percent(result.rebuildProbability)} /><Metric label="Either recovery route" value={percent(result.resilientProbability)} /></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3 text-xs text-ctp-subtext1"><p><b className="text-ctp-text">Established but exposed:</b> {percent(result.exposedProbability)}</p>{result.bestAdditionalCopy && <p className="mt-2 text-ctp-green">Best extra role copy: {LABEL[result.bestAdditionalCopy.role]} (+{(result.bestAdditionalCopy.gain * 100).toFixed(1)} points)</p>}</div></>}</div></div>
    <p className="mt-3 text-[11px] leading-4 text-ctp-subtext0">Exact access ceiling for establishing the plan and then finding protection by the disruption turn or rebuilding by the recovery turn. It assumes selected pieces remain usable and does not simulate costs, zones, the actual disruption, or opponent responses.</p>
  </section>;
}

function Turn({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs text-ctp-subtext0">{label}<select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm text-ctp-text">{[1,2,3,4,5,6,7,8].map((turn) => <option key={turn} value={turn}>T{turn}</option>)}</select></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2"><p className="text-[9px] uppercase tracking-wide text-ctp-subtext0">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-ctp-text">{value}</p></div>; }
