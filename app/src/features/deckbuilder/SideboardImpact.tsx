import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { FUNCTIONAL_ROLE_LABELS, functionalRoles, type FunctionalRole } from "./functionalCopies";
import { probabilityAtLeast } from "./synergyReadiness";

const ROLES = Object.keys(FUNCTIONAL_ROLE_LABELS) as FunctionalRole[];

export default function SideboardImpact({ mainLines, sideboardLines, catalogByName }: {
  mainLines: { name: string; quantity: number }[];
  sideboardLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const [outName, setOutName] = useState("");
  const [inName, setInName] = useState("");
  const deckSize = mainLines.reduce((sum, line) => sum + line.quantity, 0);
  const mainCopies = useMemo(() => new Map(mainLines.map((line) => [line.name, line.quantity])), [mainLines]);
  const roleCopies = useMemo(() => new Map(ROLES.map((role) => [role, mainLines.reduce((sum, line) => {
    const card = catalogByName.get(line.name);
    return sum + (card && functionalRoles(card).includes(role) ? line.quantity : 0);
  }, 0)])), [mainLines, catalogByName]);
  const outCard = catalogByName.get(outName);
  const inCard = catalogByName.get(inName);
  const outRoles = outCard ? functionalRoles(outCard) : [];
  const inRoles = inCard ? functionalRoles(inCard) : [];
  const ready = Boolean(outCard && inCard && deckSize > 0);
  const incomingBefore = mainCopies.get(inName) ?? 0;
  const incomingAfter = incomingBefore + 1;
  const twoBefore = probabilityAtLeast(deckSize, incomingBefore, Math.min(10, deckSize), 2);
  const twoAfter = probabilityAtLeast(deckSize, incomingAfter, Math.min(10, deckSize), 2);

  if (sideboardLines.length === 0) return null;
  return <Panel data-component="SideboardImpact" className="mt-4 shadow-sm"><Section heading="dense" title="Sideboard substitution impact" description="Preview a one-copy swap before changing the build."><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-ctp-subtext0">Move out of Main<select value={outName} onChange={(event) => setOutName(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text"><option value="">Choose a card…</option>{mainLines.map((line) => <option key={line.name} value={line.name}>{line.name} ({line.quantity})</option>)}</select></label><label className="text-xs text-ctp-subtext0">Move in from Sideboard<select value={inName} onChange={(event) => setInName(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text"><option value="">Choose a card…</option>{sideboardLines.map((line) => <option key={line.name} value={line.name}>{line.name} ({line.quantity})</option>)}</select></label></div>{ready && <><div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">{ROLES.map((role) => { const before = roleCopies.get(role) ?? 0; const after = before - (outRoles.includes(role) ? 1 : 0) + (inRoles.includes(role) ? 1 : 0); const beforeOdds = probabilityAtLeast(deckSize, before, Math.min(10, deckSize), 1); const afterOdds = probabilityAtLeast(deckSize, after, Math.min(10, deckSize), 1); const delta = afterOdds - beforeOdds; return <div key={role} className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{FUNCTIONAL_ROLE_LABELS[role]}</div><div className="mt-1 text-sm font-semibold tabular-nums text-ctp-text">{before} → {after} copies</div><div className={`text-xs tabular-nums ${delta > 0 ? "text-ctp-green" : delta < 0 ? "text-ctp-red" : "text-ctp-subtext0"}`}>{delta === 0 ? "No odds change" : `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)} pts by 10`}</div></div>; })}</div><div className="mt-2 rounded-lg border border-ctp-surface1 p-2.5 text-xs"><span className="text-ctp-subtext0">Incoming-card clumping:</span> <span className="font-medium text-ctp-text">2+ by 10 changes from {(twoBefore * 100).toFixed(1)}% to {(twoAfter * 100).toFixed(1)}%</span></div><p className="mt-2 text-[10px] leading-4 text-ctp-subtext0">Preview assumes exactly one copy moves each way and keeps Main Deck size fixed. Role deltas use the same conservative printed-text detection as Functional copies; matchup strength and card quality are not inferred.</p></>}</Section></Panel>;
}
