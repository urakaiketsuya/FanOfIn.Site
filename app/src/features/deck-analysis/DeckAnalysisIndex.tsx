import { useMemo, useState } from "react";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import Tabs from "../../components/ui/Tabs";
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

type AnalysisTab = "overview" | "consistency" | "resources" | "matchups" | "sideboard";

export default function DeckAnalysisIndex() {
  useDocumentTitle("Deck Analysis", "Understand the consistency, timing, resource pressure, and sideboard shape of the active deck.");
  const [tab, setTab] = useState<AnalysisTab>("overview");
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
    setTab("overview");
  }

  if (!workspace || mainTotal === 0) return <PageLayout><PageHeader title="Deck Analysis" description="Facts about how a deck behaves. Recommendations remain in Deck Review." /><Panel className="mt-6"><InlineState className="mb-4">Choose a deck to analyze. Importing here does not modify the saved original.</InlineState><DeckWorkspacePicker catalogByName={catalogByName} source="analysis" onLoad={loadWorkspace} /></Panel></PageLayout>;

  return <PageLayout>
    <PageHeader title="Deck Analysis" description="Facts about how the active deck behaves. Recommendations remain in Deck Review." />
    <DeckToolWorkspaceHeader activeTool="analysis" title={workspace.title} championName={workspace.championName} spiritName={workspace.spiritName} format={workspace.format} mainTotal={mainTotal} materialTotal={materialTotal} sideboardTotal={sideboardTotal} sourceLabel={workspace.sourceLabel} actions={<DeckWorkspacePicker compact catalogByName={catalogByName} source="analysis" onLoad={loadWorkspace} />} />
    <div className="mt-4"><Tabs tabs={[{ key: "overview", label: "Overview" }, { key: "consistency", label: "Consistency" }, { key: "resources", label: "Resources" }, { key: "matchups", label: "Matchups" }, { key: "sideboard", label: "Sideboard" }]} active={tab} onChange={setTab} label="Deck analysis sections" baseId="deck-analysis" /></div>
    {tab === "overview" && <Panel className="mt-4"><div className="grid gap-3 sm:grid-cols-3"><Summary label="Opening cards" value={String(opening)} detail="From the selected level-0 Champion" /><Summary label="Main deck" value={String(mainTotal)} detail="Cards used by probability calculations" /><Summary label="Analysis scope" value="Descriptive" detail="No changes are applied here" /></div><p className="mt-3 text-xs text-ctp-subtext0">Use Consistency for access and clumping odds, Resources for cost and sequence timing, Matchups for historical evidence, and Sideboard for substitution impact.</p></Panel>}
    {tab === "consistency" && <><HypergeometricCalculator mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /><CopyClumpingRisk mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /><ConditionalHandPressure mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></>}
    {tab === "resources" && <><ResourceCurveReliability mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /><ReserveSequencePressure mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></>}
    {tab === "matchups" && <BuilderTestPanel deckTestResult={deckTestResult} loading={deckTestLoading} cardsByName={catalogByName} nearestDecks={[]} nearestDeckCompareLink={() => "#"} onLoadNearestDeck={() => undefined} />}
    {tab === "sideboard" && (workspace.sideboard.length > 0 ? <SideboardImpact mainLines={workspace.main} sideboardLines={workspace.sideboard} catalogByName={catalogByName} /> : <Panel className="mt-4"><InlineState>Add cards to the Sideboard in Deck Builder to analyze substitutions.</InlineState></Panel>)}
  </PageLayout>;
}

function total(lines: { quantity: number }[] | undefined) { return lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0; }
function Summary({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">{label}</div><div className="mt-1 text-xl font-semibold text-ctp-text">{value}</div><div className="text-[11px] text-ctp-subtext0">{detail}</div></div>; }
