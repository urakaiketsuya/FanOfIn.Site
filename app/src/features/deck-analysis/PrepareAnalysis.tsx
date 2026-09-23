import type { Card } from "@gatcg/shared";
import CardImage from "../../components/CardImage";
import type { GamePlanRole } from "../../lib/gamePlanReadiness";

interface Line { name: string; quantity: number }
const LABEL: Record<GamePlanRole, string> = { enabler: "Setup", payoff: "Payoff", protection: "Protection" };

export default function PrepareAnalysis({ lines, catalogByName, roles, onRolesChange }: { lines: Line[]; catalogByName: Map<string, Card>; roles: Record<string, GamePlanRole | "">; onRolesChange: (roles: Record<string, GamePlanRole | "">) => void }) {
  const counts = { enabler: 0, payoff: 0, protection: 0 };
  for (const line of lines) { const role = roles[line.name]; if (role) counts[role] += line.quantity; }
  const assigned = lines.filter((line) => roles[line.name]).length;
  const ready = counts.enabler > 0 && counts.payoff > 0;
  return <details className="group rounded-xl border border-ctp-blue/40 bg-ctp-blue/5" open={!ready}>
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ctp-blue [&::-webkit-details-marker]:hidden"><span><span className="block text-sm font-semibold text-ctp-text">Prepare analysis</span><span className="mt-0.5 block text-xs text-ctp-subtext0">{ready ? `${assigned} cards classified · Game Plan and Engine Balance ready` : "Classify setup and payoff cards once to unlock shared calculators"}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${ready ? "bg-ctp-green/15 text-ctp-green" : "bg-ctp-yellow/15 text-ctp-yellow"}`}>{ready ? "Ready" : "Needs input"}</span></summary>
    <div className="border-t border-ctp-blue/20 p-3 sm:p-4">
      <div className="grid grid-cols-3 gap-2">{(["enabler", "payoff", "protection"] as const).map((role) => <div key={role} className="rounded-lg border border-ctp-surface1 bg-ctp-base/50 p-2 text-center"><p className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{LABEL[role]}</p><p className="mt-1 text-lg font-bold tabular-nums text-ctp-text">{counts[role]}</p></div>)}</div>
      <p className="mt-3 text-xs text-ctp-subtext1">Setup establishes the plan; Payoff consumes or rewards it; Protection helps it survive. Unassigned cards remain outside these probability pools.</p>
      <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">{lines.map((line) => { const card = catalogByName.get(line.name); return <div key={line.name} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2 sm:grid-cols-[2.25rem_minmax(0,1fr)_9rem]">
        {card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.name} className="h-12 w-9 rounded object-cover object-top" /> : <div className="h-12 w-9 rounded bg-ctp-surface0" />}
        <div className="min-w-0"><p className="truncate text-sm font-medium text-ctp-text">{line.name}</p><p className="text-[10px] text-ctp-subtext0">{line.quantity} cop{line.quantity === 1 ? "y" : "ies"}</p></div>
        <select value={roles[line.name] ?? ""} onChange={(event) => onRolesChange({ ...roles, [line.name]: event.target.value as GamePlanRole | "" })} aria-label={`Analysis role for ${line.name}`} className="col-span-2 min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text sm:col-span-1"><option value="">Unassigned</option><option value="enabler">Setup</option><option value="payoff">Payoff</option><option value="protection">Protection</option></select>
      </div>; })}</div>
      {assigned > 0 && <button type="button" onClick={() => onRolesChange({})} className="mt-3 min-h-11 rounded-lg px-3 text-xs font-medium text-ctp-red hover:bg-ctp-red/10">Clear classifications</button>}
    </div>
  </details>;
}
