import { useState } from "react";
import type { OmnidexDecklist } from "@gatcg/shared";
import { VisualCardTile, type VisualFieldVisibility } from "../../components/VisualCardTile";
import { formatUsd } from "../../lib/format";
import { useComparisonData, type ComparisonDeckStats } from "./useComparisonData";
import { useComparisonSummary, type ComparisonCardChange } from "./useComparisonSummary";
import type { ComparedDeck } from "./types";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";
import HypergeometricCalculator from "../deckbuilder/HypergeometricCalculator";
import AggressionForecast from "../decks/AggressionForecast";
import { computeAggressionForecast } from "../../lib/aggressionForecast";
import { computeBreakthroughDamage, computeBreakthroughDamageVsAverage } from "../../lib/breakthroughDamage";
import BreakthroughDamagePanel from "./BreakthroughDamagePanel";
import DeckOverlapVisualization from "./DeckOverlapVisualization";

const SECTION_LABEL = { main: "Main", material: "Material", sideboard: "Sideboard" } as const;
const ANALYSIS_CARD_FIELDS: VisualFieldVisibility = { cost: false, price: false, priceTrend: false, tags: false, simulator: false, community: false };

function shortLabel(label: string): string {
  const at = label.indexOf(" @ ");
  return at === -1 ? label : label.slice(0, at);
}

function featuredChanges(changes: ComparisonCardChange[]): ComparisonCardChange[] {
  return [
    ...changes.filter((c) => c.kind === "moved" || c.kind === "movedQuantity"),
    ...changes.filter((c) => c.kind === "quantity"),
    ...changes.filter((c) => c.kind === "added"),
    ...changes.filter((c) => c.kind === "removed"),
  ].slice(0, 6);
}

function changeDetail(change: ComparisonCardChange): string {
  const from = change.baselineSection ? SECTION_LABEL[change.baselineSection] : null;
  const to = change.targetSection ? SECTION_LABEL[change.targetSection] : null;
  switch (change.kind) {
    case "added": return `Added ${change.targetQty}× to ${to}`;
    case "removed": return `Removed ${change.baselineQty}× from ${from}`;
    case "quantity": return `${from} · ${change.baselineQty}× → ${change.targetQty}×`;
    case "moved": return `${from} → ${to} · ${change.targetQty}×`;
    case "movedQuantity": return `${from} ${change.baselineQty}× → ${to} ${change.targetQty}×`;
  }
}

function changeTone(change: ComparisonCardChange): string {
  return change.kind === "added" ? "text-ctp-blue" : change.kind === "removed" ? "text-ctp-yellow" : "text-ctp-mauve";
}

function signed(value: number, digits = 0): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function ProfileStat({ label, baseline, target, delta }: { label: string; baseline: string; target: string; delta?: string | null }) {
  const changed = delta != null && delta !== "0" && delta !== "+0";
  return <div className="flex min-w-0 items-baseline gap-2 text-sm">
    <span className="text-xs text-ctp-subtext0">{label}</span>
    <span className="tabular-nums text-ctp-subtext1">{baseline}</span>
    <span aria-hidden="true" className="text-ctp-overlay1">→</span>
    <span className="font-medium tabular-nums text-ctp-text">{target}</span>
    {delta && <span className={`text-xs tabular-nums ${changed ? "font-semibold text-ctp-blue" : "text-ctp-overlay1"}`}>({delta})</span>}
  </div>;
}

function DeckProfile({ baseline, target }: { baseline: ComparisonDeckStats; target: ComparisonDeckStats }) {
  const priceDelta = baseline.price > 0 && target.price > 0 ? target.price - baseline.price : null;
  const winDelta = baseline.winRate !== null && target.winRate !== null ? target.winRate - baseline.winRate : null;
  return <div className="flex flex-wrap gap-x-6 gap-y-1.5">
    <ProfileStat label="Price" baseline={baseline.price > 0 ? formatUsd(baseline.price) : "—"} target={target.price > 0 ? formatUsd(target.price) : "—"} delta={priceDelta === null ? null : `${priceDelta >= 0 ? "+" : "−"}${formatUsd(Math.abs(priceDelta))}`} />
    <ProfileStat label="Win rate" baseline={baseline.winRate === null ? "—" : `${(baseline.winRate * 100).toFixed(0)}%`} target={target.winRate === null ? "—" : `${(target.winRate * 100).toFixed(0)}%`} delta={winDelta === null ? null : `${signed(winDelta * 100)}pp`} />
  </div>;
}

export default function ComparisonSummary({ decks, decklists, baselineKey, mode = "overview", onViewAllDifferences }: {
  decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null>; baselineKey: string | null;
  mode?: "overview" | "forecasts";
  onBaselineChange?: (key: string) => void;
  onViewAllDifferences: () => void;
}) {
  const { deckStats } = useComparisonData(decks, decklists);
  const { baselineIndex, summaries, cardsByName } = useComparisonSummary(decks, decklists, baselineKey);
  const formats = new Set(deckStats.map((s) => s.format).filter((format) => format !== "UNKNOWN"));
  const mixedFormats = formats.size > 1;
  const pantheonOnly = formats.size === 1 && formats.has("PANTHEON");
  const baselineDeck = baselineIndex >= 0 ? decks[baselineIndex] : undefined;
  const baselineStats = baselineIndex >= 0 ? deckStats[baselineIndex] : undefined;
  const forecastDecks = decks.map((deck) => {
    const list = decklists.get(deck.key);
    if (!list) return { deck, list: null, mainLines: [], materialLines: [], damageForecast: null, breakthroughVsAverage: null };
    const mainLines = list.main.map((line) => ({ name: line.card, quantity: line.quantity }));
    const materialLines = list.material.map((line) => ({ name: line.card, quantity: line.quantity }));
    const damageForecast = computeAggressionForecast(mainLines, cardsByName, materialLines);
    const hasDamageForecast = damageForecast.fixedDamageCopies > 0 || damageForecast.variableDamageCopies > 0 || damageForecast.scalingDamageCopies > 0 || damageForecast.ambiguousDamageCopies > 0 || damageForecast.recurringDamagePerTurn > 0;
    const breakthroughVsAverage = hasDamageForecast ? null : computeBreakthroughDamageVsAverage([...mainLines, ...materialLines], cardsByName);
    return { deck, list, mainLines, materialLines, damageForecast: hasDamageForecast ? damageForecast : null, breakthroughVsAverage };
  });
  const [forecastSeen, setForecastSeen] = useState(10);

  if (decks.length < 2) return <InlineState className="text-sm">Add at least one more deck to see an analysis.</InlineState>;

  return <div data-component="ComparisonSummary" className="space-y-6">
    {mixedFormats && <Panel tone="warning" padding="sm" className="text-sm text-ctp-yellow">{/* COPY_PLACEHOLDER: mixed-format warning */}This comparison mixes formats. Card overlap remains useful, but construction rules and recommendations are not directly comparable.</Panel>}
    {pantheonOnly && <Panel padding="sm" className="text-sm text-ctp-subtext1">{/* COPY_PLACEHOLDER: Pantheon framing */}Pantheon analysis emphasizes recurring packages and singleton choices rather than Standard tournament performance.</Panel>}

    {mode === "overview" && summaries.map((summary, targetIndex) => {
      if (targetIndex === baselineIndex) return null;
      const targetStats = deckStats[targetIndex];
      const changes = featuredChanges(summary.changes);
      const baselineList = baselineDeck ? decklists.get(baselineDeck.key) : null;
      const targetList = decklists.get(summary.key);
      const baselineCardCount = baselineList ? new Set([...baselineList.main, ...baselineList.material, ...baselineList.sideboard].map((line) => line.card)).size : 0;
      const sharedPercent = baselineCardCount > 0 ? Math.round((summary.sharedCardCount / baselineCardCount) * 100) : null;
      const addedCount = summary.changes.filter((change) => change.kind === "added").length;
      const removedCount = summary.changes.filter((change) => change.kind === "removed").length;
      const quantityCount = summary.changes.filter((change) => change.kind === "quantity").length;
      const movedCount = summary.changes.filter((change) => change.kind === "moved" || change.kind === "movedQuantity").length;
      return <section key={summary.key} aria-labelledby={`analysis-${summary.key}`} className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{baselineDeck ? shortLabel(baselineDeck.label) : "Baseline"} →</p>
          <h2 id={`analysis-${summary.key}`} className="mt-0.5 text-xl font-semibold text-ctp-text">{shortLabel(summary.label)}</h2>
          {!summary.loading && !summary.unavailable && <p className="mt-1 text-sm text-ctp-subtext1">{/* COPY_PLACEHOLDER: package-aware takeaway */}{summary.changes.length} card changes with {summary.sharedCardCount} cards retained from the baseline{sharedPercent === null ? "." : ` (${sharedPercent}%).`}</p>}
        </div>
        {summary.loading && <InlineState className="text-sm">Loading analysis…</InlineState>}
        {!summary.loading && summary.unavailable && <InlineState className="text-sm">A decklist is unavailable, so this comparison cannot be analyzed.</InlineState>}
        {!summary.loading && !summary.unavailable && baselineStats && targetStats && <>
          <Panel padding="sm">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-2xl font-semibold tabular-nums text-ctp-text">{sharedPercent === null ? "—" : `${sharedPercent}%`}</div><div className="text-[11px] text-ctp-subtext0">Baseline retained</div></div><div className="flex flex-wrap gap-x-4 gap-y-2 text-xs"><span className="text-ctp-blue"><strong className="tabular-nums">+{addedCount}</strong> added</span><span className="text-ctp-yellow"><strong className="tabular-nums">−{removedCount}</strong> removed</span><span className="text-ctp-mauve"><strong className="tabular-nums">{quantityCount}</strong> quantity</span><span className="text-ctp-peach"><strong className="tabular-nums">{movedCount}</strong> moved</span></div></div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-ctp-surface0" aria-hidden="true"><span className="bg-ctp-green" style={{ width: `${sharedPercent ?? 0}%` }} /><span className="flex-1 bg-ctp-blue/50" /></div>
          </Panel>
          <Panel padding="sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-ctp-text">Deck profile</h3>{(summary.championChanged || summary.spiritChanged) && <div className="text-xs text-ctp-subtext0">{summary.championChanged && <span>Champion: {summary.baselineChampion ?? "—"} → {summary.targetChampion ?? "—"}</span>}{summary.championChanged && summary.spiritChanged && <span className="mx-2">·</span>}{summary.spiritChanged && <span>Spirit: {summary.baselineSpirit ?? "none"} → {summary.targetSpirit ?? "none"}</span>}</div>}</div>
            <DeckProfile baseline={baselineStats} target={targetStats} />
          </Panel>
          <Section heading="dense" title="Key decisions" description="The most visible quantity, section, addition, and removal choices in this comparison." actions={summary.changes.length > changes.length ? <button type="button" onClick={onViewAllDifferences} className="text-xs font-medium text-ctp-blue hover:underline">View all {summary.changes.length} cards →</button> : undefined}>{/* COPY_PLACEHOLDER: key-decisions description */}
            {changes.length === 0 ? <InlineState className="mt-2 text-sm">No card differences.</InlineState> : <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">{changes.map((change) => <VisualCardTile key={`${change.name}-${change.baselineSection ?? ""}-${change.targetSection ?? ""}`} line={{ card: change.name, quantity: 1 }} card={cardsByName.get(change.name)} unitPrice={undefined} priceTrend={undefined} simulatorEvidence={undefined} communityEntry={undefined} fields={ANALYSIS_CARD_FIELDS} footer={<div className="mt-1.5 min-w-0"><div className="truncate text-sm font-medium text-ctp-text" title={change.name}>{change.name}</div><div className={`mt-1 border-t border-ctp-surface0 pt-1 text-[11px] ${changeTone(change)}`}>{changeDetail(change)}</div></div>} />)}</div>}
          </Section>
          {baselineList && targetList && <DeckOverlapVisualization baseline={baselineList} target={targetList} cardsByName={cardsByName} onViewAll={onViewAllDifferences} />}
        </>}
      </section>;
    })}

    {mode === "forecasts" && <div className="space-y-8">
      <Section heading="dense" title="Draw probability" description="Compare the same cards-seen checkpoint across every deck.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          {forecastDecks.map(({ deck, list, mainLines, materialLines }) => <section key={deck.key} className="min-w-0">
            <h3 className="text-base font-semibold text-ctp-text">{shortLabel(deck.label)}</h3>
            {!list ? <Panel padding="sm" className="mt-4"><InlineState className="text-sm">Decklist unavailable.</InlineState></Panel> : <HypergeometricCalculator mainLines={mainLines} materialLines={materialLines} catalogByName={cardsByName} seen={forecastSeen} onSeenChange={setForecastSeen} />}
          </section>)}
        </div>
      </Section>

      <Section heading="dense" title="Damage forecasts" description="Compare damage output at the same cards-seen checkpoint.">
        <div className="grid items-start gap-4 md:grid-cols-2">
          {forecastDecks.map(({ deck, list, damageForecast, breakthroughVsAverage }) => <section key={deck.key} className="min-w-0">
            <h3 className="text-base font-semibold text-ctp-text">{shortLabel(deck.label)}</h3>
            {!list ? <Panel padding="sm" className="mt-4"><InlineState className="text-sm">Decklist unavailable.</InlineState></Panel> : damageForecast ? (
              <Panel className="mt-4 shadow-sm"><AggressionForecast forecast={damageForecast} embedded seen={forecastSeen} onSeenChange={setForecastSeen} /></Panel>
            ) : breakthroughVsAverage && breakthroughVsAverage.attackerCount > 0 ? (
              <Panel className="mt-4 shadow-sm"><h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Combat damage forecast</h4><div className="mt-3"><BreakthroughDamagePanel attackerLabel={shortLabel(deck.label)} defenderLabel="an average deck" result={breakthroughVsAverage} /></div></Panel>
            ) : (
              <Panel className="mt-4 shadow-sm"><h4 className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Printed damage forecast</h4><p className="mt-1 text-xs text-ctp-subtext0">No printed spell/ability damage and no attacking allies found in this list.</p></Panel>
            )}
          </section>)}
        </div>
      </Section>
    </div>}

    {mode === "forecasts" && baselineDeck && (
      <Section heading="dense" title="Breakthrough damage" description="How much ally combat power reaches the champion if every attacker swings and the defender blocks with its best Intercept allies first.">
        <div className="mt-3 space-y-4">
          {decks.map((deck, index) => {
            if (index === baselineIndex) return null;
            const baselineList = decklists.get(baselineDeck.key);
            const targetList = decklists.get(deck.key);
            if (!baselineList || !targetList) return null;
            const baselineLines = [...baselineList.main, ...baselineList.material].map((line) => ({ name: line.card, quantity: line.quantity }));
            const targetLines = [...targetList.main, ...targetList.material].map((line) => ({ name: line.card, quantity: line.quantity }));
            const baselineIntoTarget = computeBreakthroughDamage(baselineLines, targetLines, cardsByName);
            const targetIntoBaseline = computeBreakthroughDamage(targetLines, baselineLines, cardsByName);
            if (baselineIntoTarget.attackerCount === 0 && targetIntoBaseline.attackerCount === 0) return null;
            return <div key={deck.key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">{shortLabel(baselineDeck.label)} vs. {shortLabel(deck.label)}</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <BreakthroughDamagePanel attackerLabel={shortLabel(baselineDeck.label)} defenderLabel={shortLabel(deck.label)} result={baselineIntoTarget} />
                <BreakthroughDamagePanel attackerLabel={shortLabel(deck.label)} defenderLabel={shortLabel(baselineDeck.label)} result={targetIntoBaseline} />
              </div>
            </div>;
          })}
        </div>
      </Section>
    )}
  </div>;
}
