import { useMemo, useState } from "react";
import type { Card, ClusterMatchupImpact } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { FUNCTIONAL_ROLE_LABELS, functionalRoles, type FunctionalRole } from "./functionalCopies";
import { probabilityAtLeast } from "./synergyReadiness";
import { matchupSideboardRecommendations, suggestedMatchupCut } from "./matchupSideboard";

const ROLES = Object.keys(FUNCTIONAL_ROLE_LABELS) as FunctionalRole[];

export default function SideboardImpact({ mainLines, sideboardLines, catalogByName, matchups = [] }: {
  mainLines: { name: string; quantity: number }[];
  sideboardLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  matchups?: ClusterMatchupImpact[];
}) {
  const [outName, setOutName] = useState("");
  const [inName, setInName] = useState("");
  const [opponentId, setOpponentId] = useState("");
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
  const oneBefore = probabilityAtLeast(deckSize, incomingBefore, Math.min(10, deckSize), 1);
  const oneAfter = probabilityAtLeast(deckSize, incomingAfter, Math.min(10, deckSize), 1);
  const selectedMatchup = matchups.find((matchup) => matchup.opponentClusterId === (opponentId || matchups[0]?.opponentClusterId));
  const recommendations = useMemo(() => selectedMatchup ? matchupSideboardRecommendations(selectedMatchup, new Set(sideboardLines.map((line) => line.name))) : [], [selectedMatchup, sideboardLines]);

  function previewRecommendation(cardName: string) {
    if (!selectedMatchup) return;
    setInName(cardName);
    setOutName(suggestedMatchupCut(mainLines, selectedMatchup, cardName));
  }

  if (sideboardLines.length === 0) return null;
  return <Panel data-component="SideboardImpact" className="mt-4 shadow-sm"><Section heading="dense" title="Matchup sideboard plan" description="Use historical matchup evidence to choose a card, then preview a one-copy swap.">{selectedMatchup && <div className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="flex flex-wrap items-center gap-2"><label className="text-xs text-ctp-subtext0">Opponent <select value={opponentId || matchups[0]?.opponentClusterId || ""} onChange={(event) => setOpponentId(event.target.value)} className="ml-1 rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">{matchups.map((matchup) => <option key={matchup.opponentClusterId} value={matchup.opponentClusterId}>{matchup.opponentClusterName} ({matchup.games}g)</option>)}</select></label><span className={`text-xs font-semibold ${selectedMatchup.baselineWinRate >= 0.5 ? "text-ctp-green" : "text-ctp-red"}`}>{(selectedMatchup.baselineWinRate * 100).toFixed(0)}% historical win rate</span></div>{recommendations.length > 0 ? <ul className="mt-2 grid gap-2 lg:grid-cols-3">{recommendations.slice(0, 3).map((recommendation) => <li key={recommendation.cardName} className="rounded-md border border-ctp-surface1 p-2"><button type="button" onClick={() => previewRecommendation(recommendation.cardName)} className="w-full text-left"><span className="block text-xs font-semibold text-ctp-text">{recommendation.cardName}</span><span className="mt-0.5 block text-[10px] leading-4 text-ctp-subtext0">{recommendation.answers[0] ? `Answer to ${recommendation.answers[0].opponentCardName}: +${(recommendation.answers[0].mitigation * 100).toFixed(0)}pp${recommendation.answers[0].scope === "champion" ? " Champion-wide" : ""}` : `Helpful-card correlation: +${(recommendation.helpfulLift * 100).toFixed(0)}pp`}</span><span className="mt-1 block text-[10px] font-medium text-ctp-blue">Preview swap</span></button></li>)}</ul> : <p className="mt-2 text-xs text-ctp-subtext0">No card currently in this sideboard has qualifying positive evidence for this matchup.</p>}</div>}<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-ctp-subtext0">Move out of Main<select value={outName} onChange={(event) => setOutName(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text"><option value="">Choose a card…</option>{mainLines.map((line) => <option key={line.name} value={line.name}>{line.name} ({line.quantity})</option>)}</select></label><label className="text-xs text-ctp-subtext0">Move in from Sideboard<select value={inName} onChange={(event) => setInName(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text"><option value="">Choose a card…</option>{sideboardLines.map((line) => <option key={line.name} value={line.name}>{line.name} ({line.quantity})</option>)}</select></label></div>{ready && <><div className="mt-3 rounded-lg border border-ctp-blue/30 bg-ctp-blue/5 p-2.5 text-xs"><span className="text-ctp-subtext0">See incoming card by 10:</span> <span className="font-semibold tabular-nums text-ctp-teal">{(oneBefore * 100).toFixed(1)}% → {(oneAfter * 100).toFixed(1)}%</span> <span className="text-ctp-green">(+{((oneAfter - oneBefore) * 100).toFixed(1)} pts)</span></div><div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">{ROLES.map((role) => { const before = roleCopies.get(role) ?? 0; const after = before - (outRoles.includes(role) ? 1 : 0) + (inRoles.includes(role) ? 1 : 0); const beforeOdds = probabilityAtLeast(deckSize, before, Math.min(10, deckSize), 1); const afterOdds = probabilityAtLeast(deckSize, after, Math.min(10, deckSize), 1); const delta = afterOdds - beforeOdds; return <div key={role} className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">{FUNCTIONAL_ROLE_LABELS[role]}</div><div className="mt-1 text-sm font-semibold tabular-nums text-ctp-text">{before} → {after} copies</div><div className={`text-xs tabular-nums ${delta > 0 ? "text-ctp-green" : delta < 0 ? "text-ctp-red" : "text-ctp-subtext0"}`}>{delta === 0 ? "No odds change" : `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)} pts by 10`}</div></div>; })}</div><div className="mt-2 rounded-lg border border-ctp-surface1 p-2.5 text-xs"><span className="text-ctp-subtext0">Incoming-card clumping:</span> <span className="font-medium text-ctp-text">2+ by 10 changes from {(twoBefore * 100).toFixed(1)}% to {(twoAfter * 100).toFixed(1)}%</span></div><p className="mt-2 text-[10px] leading-4 text-ctp-subtext0">Recommendations are correlations from recorded games, not causal guarantees. “Champion-wide” answers use the broader Champion matchup when the exact named-build sample was too small. Suggested cuts are provisional high-quantity cards without positive matchup evidence; preview assumes one copy each and never changes the deck.</p></>}</Section></Panel>;
}
