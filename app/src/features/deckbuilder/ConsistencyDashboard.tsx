import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { FUNCTIONAL_ROLE_LABELS, functionalRoleLines, functionalRoles, type FunctionalRole } from "./functionalCopies";
import { probabilityAtLeast, type SynergyReadiness } from "./synergyReadiness";

const ROLES = Object.keys(FUNCTIONAL_ROLE_LABELS) as FunctionalRole[];
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function ConsistencyDashboard({ mainLines, materialLines, sideboardLines, catalogByName, synergyReadiness }: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  sideboardLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  synergyReadiness: SynergyReadiness[];
}) {
  const [sideboardPlan, setSideboardPlan] = useState<FunctionalRole>("interaction");
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const openingSeen = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const roleStats = useMemo(() => ROLES.map((role) => {
    const lines = functionalRoleLines(mainLines, catalogByName, role);
    const copies = lines.reduce((sum, line) => sum + line.quantity, 0);
    return { role, copies, opening: probabilityAtLeast(deckSize, copies, openingSeen, 1), early: probabilityAtLeast(deckSize, copies, Math.min(10, deckSize), 1) };
  }), [mainLines, catalogByName, deckSize, openingSeen]);
  const strongestOpening = [...roleStats].sort((a, b) => b.opening - a.opening)[0];
  const thinnestRole = [...roleStats].sort((a, b) => a.early - b.early)[0];
  const weakestPackage = [...synergyReadiness].sort((a, b) => a.probabilityByTen - b.probabilityByTen)[0];
  const clumpiest = useMemo(() => mainLines.filter((line) => line.quantity >= 2).map((line) => ({ ...line, odds: probabilityAtLeast(deckSize, line.quantity, Math.min(10, deckSize), 2) })).sort((a, b) => b.odds - a.odds)[0], [mainLines, deckSize]);
  const bestCopy = [...roleStats].map((stat) => ({ ...stat, gain: probabilityAtLeast(deckSize, stat.copies + 1, Math.min(10, deckSize), 1) - stat.early })).sort((a, b) => b.gain - a.gain)[0];
  const sideboardCandidates = sideboardLines.filter((line) => { const card = catalogByName.get(line.name); return card ? functionalRoles(card).includes(sideboardPlan) : false; });
  const sideboardIn = [...sideboardCandidates].sort((a, b) => b.quantity - a.quantity)[0];
  const sideboardOut = [...mainLines].filter((line) => { const card = catalogByName.get(line.name); return !card || !functionalRoles(card).includes(sideboardPlan); }).sort((a, b) => b.quantity - a.quantity)[0];
  const planStat = roleStats.find((stat) => stat.role === sideboardPlan)!;
  const planGain = sideboardIn ? probabilityAtLeast(deckSize, planStat.copies + 1, Math.min(10, deckSize), 1) - planStat.early : 0;

  if (deckSize <= 0) return null;
  return <Panel data-component="ConsistencyDashboard" className="mt-4 border-ctp-blue/40 shadow-sm"><Section heading="dense" title="Consistency dashboard" description="The most actionable findings from this build's probability checks."><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Finding label="Best opening coverage" value={strongestOpening ? FUNCTIONAL_ROLE_LABELS[strongestOpening.role] : "No role detected"} detail={strongestOpening ? `${percent(strongestOpening.opening)} chance in ${openingSeen}` : "—"} tone="good" /><Finding label="Thinnest role" value={thinnestRole ? FUNCTIONAL_ROLE_LABELS[thinnestRole.role] : "No role detected"} detail={thinnestRole ? `${thinnestRole.copies} copies · ${percent(thinnestRole.early)} by 10` : "—"} tone="warn" /><Finding label="Package bottleneck" value={weakestPackage?.label ?? "No parsed package"} detail={weakestPackage ? `${percent(weakestPackage.probabilityByTen)} ready by 10 · ${weakestPackage.status}` : "Add or detect a card package first"} tone="warn" /><Finding label="Highest clumping" value={clumpiest?.name ?? "No duplicates"} detail={clumpiest ? `${percent(clumpiest.odds)} chance of 2+ by 10` : "—"} /><Finding label="Best +1 role gain" value={bestCopy ? FUNCTIONAL_ROLE_LABELS[bestCopy.role] : "No role detected"} detail={bestCopy ? `+${(bestCopy.gain * 100).toFixed(1)} pts by 10` : "—"} tone="good" /><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3"><label className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Sideboard plan<select value={sideboardPlan} onChange={(event) => setSideboardPlan(event.target.value as FunctionalRole)} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs normal-case tracking-normal text-ctp-text">{ROLES.map((role) => <option key={role} value={role}>{FUNCTIONAL_ROLE_LABELS[role]}</option>)}</select></label><div className="mt-2 text-sm font-semibold text-ctp-text">{sideboardIn && sideboardOut ? `${sideboardOut.name} → ${sideboardIn.name}` : "No coverage swap found"}</div><div className="mt-0.5 text-[11px] text-ctp-green">{sideboardIn ? `+${(planGain * 100).toFixed(1)} pts by 10` : "Sideboard lacks this detected role"}</div></div></div><p className="mt-3 text-[10px] leading-4 text-ctp-subtext0">Findings use exact draw probabilities and conservative printed-text roles. The suggested sideboard swap optimizes selected-role coverage only; use the detailed tools below to inspect assumptions before changing the deck.</p></Section></Panel>;
}

function Finding({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "good" | "warn" }) {
  const color = tone === "good" ? "text-ctp-green" : tone === "warn" ? "text-ctp-yellow" : "text-ctp-blue";
  return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">{label}</div><div className="mt-1 truncate text-sm font-semibold text-ctp-text">{value}</div><div className={`mt-0.5 text-[11px] ${color}`}>{detail}</div></div>;
}
