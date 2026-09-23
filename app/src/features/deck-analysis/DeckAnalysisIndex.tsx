import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import Tabs from "../../components/ui/Tabs";
import CardImage from "../../components/CardImage";
import { InlineState } from "../../components/ui/ContentState";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { useDeckBuilderData } from "../deckbuilder/data/useDeckBuilderData";
import { loadActiveDeckWorkspace, saveActiveDeckWorkspace, type DeckWorkspace } from "../deckbuilder/persistence/deckWorkspace";
import DeckWorkspacePicker from "../deckbuilder/components/DeckWorkspacePicker";
import DeckToolWorkspaceHeader from "../deckbuilder/components/DeckToolWorkspaceHeader";
import HypergeometricCalculator from "../deckbuilder/HypergeometricCalculator";
import ResourceCurveReliability from "../deckbuilder/ResourceCurveReliability";
import ReserveSequencePressure from "../deckbuilder/ReserveSequencePressure";
import CopyClumpingRisk from "../deckbuilder/CopyClumpingRisk";
import ConditionalHandPressure from "../deckbuilder/ConditionalHandPressure";
import SideboardImpact from "../deckbuilder/SideboardImpact";
import BuilderTestPanel from "../deckbuilder/panels/BuilderTestPanel";
import { useDeckTestResult } from "../decks/useDeckTestResult";
import { useRequestedDeckWorkspace } from "../deckbuilder/persistence/useRequestedDeckWorkspace";
import { probabilityAtLeast } from "../deckbuilder/synergyReadiness";
import { computeResourceCurveReliability } from "../deckbuilder/resourceCurve";
import { calculateConditionalPressure } from "../deckbuilder/conditionalPressureCalculation";
import GamePlanReadiness from "../deckbuilder/GamePlanReadiness";
import FunctionalHandCalculator from "../deckbuilder/FunctionalHandCalculator";
import LevelUpRunway from "../deckbuilder/LevelUpRunway";
import ThreatCadence from "../deckbuilder/ThreatCadence";
import EnginePayoffBalance from "../deckbuilder/EnginePayoffBalance";
import InteractionCoverageMatrix from "../deckbuilder/InteractionCoverageMatrix";
import ResilienceRebuild from "../deckbuilder/ResilienceRebuild";

type AnalysisTab = "summary" | "explore" | "matchups";

export default function DeckAnalysisIndex() {
  useDocumentTitle("Deck Analysis", "Understand the consistency, timing, resource pressure, and sideboard shape of the active deck.");
  const [tab, setTab] = useState<AnalysisTab>("summary");
  const [workspace, setWorkspace] = useState<DeckWorkspace | null>(() => loadActiveDeckWorkspace(sessionStorage));
  const data = useDeckBuilderData({ championName: workspace?.championName ?? null, format: workspace?.format ?? "STANDARD", includeDecodedDecks: false });
  const { catalogByName } = data;
  const mainTotal = total(workspace?.main);
  const materialTotal = total(workspace?.material);
  const sideboardTotal = total(workspace?.sideboard);
  const opening = workspace ? inferStartingHandSize(workspace.material, catalogByName) : 0;
  const deckCardCounts = useMemo(() => new Map([...(workspace?.main ?? []), ...(workspace?.material ?? [])].map((line) => [line.name, line.quantity])), [workspace]);
  const { result: deckTestResult, loading: deckTestLoading } = useDeckTestResult({ deckCardCounts, cardsByName: catalogByName, nearestDecks: [] });

  function loadWorkspace(next: Omit<DeckWorkspace, "version" | "updatedAt">) {
    saveActiveDeckWorkspace(sessionStorage, next);
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
    setTab("summary");
  }

  const requestedDeck = useRequestedDeckWorkspace(catalogByName, "analysis", loadWorkspace);

  if (requestedDeck.pending) return <PageLayout><PageHeader title="Deck Analysis" description="Loading the selected deck without changing its saved copy." /><Panel className="mt-6"><InlineState>Loading deck…</InlineState></Panel></PageLayout>;
  if (requestedDeck.error) return <PageLayout><PageHeader title="Deck Analysis" description="The selected deck could not be opened." /><Panel className="mt-6"><InlineState tone="danger">{requestedDeck.error}</InlineState><button type="button" onClick={requestedDeck.retry} className="mt-4 rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base">Try again</button></Panel></PageLayout>;

  if (!workspace || mainTotal === 0) return <PageLayout><PageHeader title="Deck Analysis" description="Facts about how a deck behaves. Recommendations remain in Deck Review." /><Panel className="mt-6"><InlineState className="mb-4">Choose a deck to analyze. Importing here does not modify the saved original.</InlineState><DeckWorkspacePicker catalogByName={catalogByName} source="analysis" onLoad={loadWorkspace} /></Panel></PageLayout>;

  const deckSize = Math.max(1, mainTotal);
  const clumping = workspace.main
    .filter((line) => line.quantity >= 2)
    .map((line) => ({ ...line, probability: probabilityAtLeast(deckSize, line.quantity, Math.min(10, deckSize), 2) }))
    .sort((a, b) => b.probability - a.probability)[0];
  const conditional = calculateConditionalPressure(workspace.main, catalogByName, opening);
  const conditionalCard = conditional.rows[0];
  const resourcePoints = computeResourceCurveReliability(workspace.main, catalogByName, opening);
  const weakestResource = [...resourcePoints].sort((a, b) => a.first.probability - b.first.probability)[0];
  const weakestResourceCard = weakestResource
    ? workspace.main.find((line) => catalogByName.get(line.name)?.cost_reserve === weakestResource.cost)?.name
    : undefined;

  return <PageLayout>
    <PageHeader title="Deck Analysis" />
    <DeckToolWorkspaceHeader activeTool="analysis" title={workspace.title} championName={workspace.championName} spiritName={workspace.spiritName} format={workspace.format} mainTotal={mainTotal} materialTotal={materialTotal} sideboardTotal={sideboardTotal} sourceLabel={workspace.sourceLabel} actions={<DeckWorkspacePicker compact catalogByName={catalogByName} source="analysis" onLoad={loadWorkspace} />} />
    <DeckArtworkPreview material={workspace.material} main={workspace.main} catalogByName={catalogByName} />
    <div className="mt-4"><Tabs tabs={[{ key: "summary", label: "Summary" }, { key: "explore", label: "Explore" }, { key: "matchups", label: "Matchups" }]} active={tab} onChange={setTab} label="Deck analysis sections" baseId="deck-analysis" /></div>
    {tab === "summary" && <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-ctp-text">What stands out</h2><span className="rounded-full bg-ctp-surface0 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ctp-subtext0">Descriptive</span></div>
      <div className="grid gap-3 md:grid-cols-3">
        <InsightCard title="Opening hand" value={`${opening} cards`} detail="Set by your level-0 Champion" tone="text-ctp-blue" onExplore={() => setTab("explore")} />
        {clumping && <InsightCard title="Highest clumping chance" value={`${(clumping.probability * 100).toFixed(1)}%`} detail={`2+ copies of ${clumping.name} by 10 cards`} card={catalogByName.get(clumping.name)} tone={clumping.probability >= 0.25 ? "text-ctp-yellow" : "text-ctp-green"} onExplore={() => setTab("explore")} />}
        {weakestResource && <InsightCard title={`Reserve ${weakestResource.cost} access`} value={`${(weakestResource.first.probability * 100).toFixed(1)}%`} detail={`Going first · ready by turn ${weakestResource.first.turn}`} card={weakestResourceCard ? catalogByName.get(weakestResourceCard) : undefined} tone={weakestResource.first.probability >= 0.8 ? "text-ctp-green" : weakestResource.first.probability >= 0.6 ? "text-ctp-blue" : "text-ctp-yellow"} onExplore={() => setTab("explore")} />}
        {conditional.conditionalCopies > 0 && <InsightCard title="Conditional hand pressure" value={`${(conditional.chanceTwo * 100).toFixed(1)}%`} detail={`Chance of 2+ conditional cards in the opening ${opening}`} card={conditionalCard ? catalogByName.get(conditionalCard.name) : undefined} tone={conditional.chanceTwo >= 0.5 ? "text-ctp-red" : conditional.chanceTwo >= 0.25 ? "text-ctp-yellow" : "text-ctp-green"} onExplore={() => setTab("explore")} />}
      </div>
      <p className="mt-3 text-xs text-ctp-subtext0">These are measurements, not change recommendations. Use Deck Review when you want suggested edits.</p>
    </div>}
    {tab === "explore" && <div className="mt-4 space-y-3">
      <AnalysisDisclosure title="Game plan readiness" summary="Measure when setup, payoff, and protection are likely to come together."><GamePlanReadiness mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Functional hand" summary="Require useful roles while limiting awkward or redundant cards."><FunctionalHandCalculator mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Level-up runway" summary="Forecast level timing, acceleration access, and post-level hand pressure."><LevelUpRunway mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Threat cadence" summary="Measure the chance of presenting a fresh threat across consecutive turns."><ThreatCadence mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Engine-to-payoff balance" summary="Check whether setup arrives before the cards that depend on it."><EnginePayoffBalance mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Interaction coverage" summary="Compare answer access across opposing plans and postboard configurations."><InteractionCoverageMatrix mainLines={workspace.main} materialLines={workspace.material} sideboardLines={workspace.sideboard} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Resilience and rebuild" summary="Test protection and recovery access around a declared disruption turn."><ResilienceRebuild mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Card access and probability" summary="Find a card, functional role, or complete combo."><HypergeometricCalculator mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Consistency details" summary="Inspect duplicate draws and conditional cards."><CopyClumpingRisk mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /><ConditionalHandPressure mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Resource timing" summary="See when Reserve costs become reliably available."><ResourceCurveReliability mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Advanced sequence analysis" summary="Test a specific sequence of plays and deadlines."><ReserveSequencePressure mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></AnalysisDisclosure>
      <AnalysisDisclosure title="Sideboard impact" summary={workspace.sideboard.length > 0 ? "Preview substitutions without changing the deck." : "No Sideboard cards in this deck."}>{workspace.sideboard.length > 0 ? <SideboardImpact mainLines={workspace.main} sideboardLines={workspace.sideboard} catalogByName={catalogByName} /> : <InlineState>Add cards to the Sideboard in Deck Builder to analyze substitutions.</InlineState>}</AnalysisDisclosure>
    </div>}
    {tab === "matchups" && <BuilderTestPanel deckTestResult={deckTestResult} loading={deckTestLoading} cardsByName={catalogByName} nearestDecks={[]} nearestDeckCompareLink={() => "#"} onLoadNearestDeck={() => undefined} />}
  </PageLayout>;
}

function total(lines: { quantity: number }[] | undefined) { return lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0; }

function DeckArtworkPreview({ material, main, catalogByName }: { material: { name: string; quantity: number }[]; main: { name: string; quantity: number }[]; catalogByName: Map<string, Card> }) {
  return <section aria-labelledby="analysis-deck-heading" className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm">
    <div className="flex items-center justify-between gap-2"><h2 id="analysis-deck-heading" className="text-sm font-semibold text-ctp-text">Deck at a glance</h2><span className="text-xs text-ctp-subtext0">{main.reduce((sum, line) => sum + line.quantity, 0)} main</span></div>
    <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
      {[...material, ...main].slice(0, 14).map((line, index) => {
        const card = catalogByName.get(line.name);
        const tile = <div className={`relative aspect-[5/7] w-20 shrink-0 snap-start overflow-hidden rounded-lg bg-ctp-surface0 ${index < material.length ? "ring-1 ring-ctp-blue/60" : ""}`}>{card?.editions[0] ? <CardImage image={card.editions[0].image} alt={line.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center p-2 text-center text-[10px] text-ctp-subtext0">{line.name}</span>}<span className="absolute right-1 top-1 rounded-full bg-ctp-base/90 px-1.5 py-0.5 text-[10px] font-medium text-ctp-text">{line.quantity}x</span></div>;
        return card ? <Link key={`${line.name}:${index}`} to={`/cards/${card.slug}`} title={line.name}>{tile}</Link> : <div key={`${line.name}:${index}`}>{tile}</div>;
      })}
    </div>
  </section>;
}

function InsightCard({ title, value, detail, card, tone, onExplore }: { title: string; value: string; detail: string; card?: Card; tone: string; onExplore: () => void }) {
  return <article className="flex min-h-28 gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm">
    {card?.editions[0] && <Link to={`/cards/${card.slug}`} className="w-16 shrink-0 overflow-hidden rounded-md"><CardImage image={card.editions[0].image} alt={card.name} className="aspect-[5/7] h-full w-full object-cover" /></Link>}
    <div className="flex min-w-0 flex-1 flex-col"><p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">{title}</p><p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p><p className="mt-1 text-xs text-ctp-subtext0">{detail}</p><button type="button" onClick={onExplore} className="mt-auto self-start pt-2 text-xs font-medium text-ctp-blue hover:underline">Explore →</button></div>
  </article>;
}

function AnalysisDisclosure({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return <details className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle">
    <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ctp-blue"><span className="flex items-center justify-between gap-3"><span><span className="block text-sm font-semibold text-ctp-text">{title}</span><span className="mt-0.5 block text-xs text-ctp-subtext0">{summary}</span></span><span aria-hidden="true" className="text-xl text-ctp-subtext0 transition-transform group-open:rotate-90">›</span></span></summary>
    <div className="border-t border-ctp-surface1 px-3 pb-3">{children}</div>
  </details>;
}
