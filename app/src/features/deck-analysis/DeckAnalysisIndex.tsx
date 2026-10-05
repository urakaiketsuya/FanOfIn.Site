import { OWNERSHIP_COVERAGE_NOTE } from "../collection/CollectionStatus";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { computeDeckCollectionStatus, type Card, type OmnidexDecklist } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
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
import DrawPatternReview from "./DrawPatternReview";
import SideboardImpact from "../deckbuilder/SideboardImpact";
import BuilderTestPanel from "../deckbuilder/panels/BuilderTestPanel";
import { useDeckTestResult } from "../decks/useDeckTestResult";
import { useRequestedDeckWorkspace } from "../deckbuilder/persistence/useRequestedDeckWorkspace";
import type { AnalysisScenario } from "./AccessTimeline";
import AnalysisResults from "./AnalysisResults";

import GamePlanReadiness from "../deckbuilder/GamePlanReadiness";
import FunctionalHandCalculator from "../deckbuilder/FunctionalHandCalculator";
import LevelUpRunway from "../deckbuilder/LevelUpRunway";
import ThreatCadence from "../deckbuilder/ThreatCadence";
import ResilienceRebuild from "../deckbuilder/ResilienceRebuild";
import PrepareAnalysis from "./PrepareAnalysis";
import CalculatorDashboard from "./CalculatorDashboard";
import { activeAnalysisPlan, analysisProfileKey, cacheSyncedAnalysisProfile, loadAnalysisProfile, newerAnalysisProfile, saveAnalysisProfile, type DeckAnalysisProfile } from "../../lib/analysisProfile";
import type { GamePlanRole } from "../../lib/gamePlanReadiness";
import { accountApi } from "../../lib/accountApi";

type AnalysisTab = "summary" | "explore" | "matchups";


export default function DeckAnalysisIndex() {
  useDocumentTitle("Deck Analysis", "Understand the consistency, timing, resource pressure, and sideboard shape of the active deck.");
  const [calculatorCard, setCalculatorCard] = useState<{ name: string; nonce: number }>();
  const setupRef = useRef<HTMLDetailsElement>(null);
  const [tab, setTab] = useState<AnalysisTab>("summary");
  const [workspace, setWorkspace] = useState<DeckWorkspace | null>(() => loadActiveDeckWorkspace(sessionStorage));
  const profileStorageKey = workspace ? analysisProfileKey(workspace.championName, workspace.main) : "";
  const [scenario, setScenario] = useState<AnalysisScenario>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`fanofin:calculator-dashboard:v1:${profileStorageKey}`) ?? 'null');
      return { turn: Number.isInteger(saved?.turn) && saved.turn >= 1 && saved.turn <= 8 ? saved.turn : 3, order: saved?.order === 'second' ? 'second' : 'first' };
    } catch { return { turn: 3, order: 'first' }; }
  });
  const profileIdentity = workspace?.deckIdentity ?? workspace?.title ?? workspace?.sourceLabel ?? null;
  const [analysisProfile, setAnalysisProfile] = useState<DeckAnalysisProfile | null>(() => workspace ? loadAnalysisProfile(localStorage, workspace.championName, workspace.main, workspace.deckIdentity ?? workspace.title ?? workspace.sourceLabel) : null);
  const [profileSync, setProfileSync] = useState<"local" | "syncing" | "synced" | "offline">("local");
  const syncTimer = useRef<number | null>(null);
  const profileAccount = useRef(false);
  useEffect(() => {
    if (!workspace) { setAnalysisProfile(null); setProfileSync("local"); return; }
    let cancelled = false;
    const local = loadAnalysisProfile(localStorage, workspace.championName, workspace.main, profileIdentity);
    setAnalysisProfile(local); setProfileSync("syncing");
    void accountApi.session().then(async ({ user }) => {
      if (!user || cancelled) { profileAccount.current = false; if (!cancelled) setProfileSync("local"); return; }
      profileAccount.current = true;
      const result = await accountApi.analysisProfile(local.deckFingerprint, profileIdentity);
      if (cancelled) return;
      if (!result.profile) {
        if (local.updatedAt !== new Date(0).toISOString()) await accountApi.saveAnalysisProfile(local, profileIdentity);
        if (!cancelled) setProfileSync("synced"); return;
      }
      const current = loadAnalysisProfile(localStorage, workspace.championName, workspace.main, profileIdentity);
      const remote = cacheSyncedAnalysisProfile(localStorage, workspace.championName, workspace.main, result.profile.profile, profileIdentity);
      if (!remote) { setProfileSync("offline"); return; }
      const selected = newerAnalysisProfile(current, remote);
      if (selected === current) { cacheSyncedAnalysisProfile(localStorage, workspace.championName, workspace.main, current, profileIdentity); setAnalysisProfile(current); await accountApi.saveAnalysisProfile(current, profileIdentity); }
      else setAnalysisProfile(remote);
      if (!cancelled) setProfileSync("synced");
    }).catch(() => { profileAccount.current = false; if (!cancelled) setProfileSync("offline"); });
    return () => { cancelled = true; };
  }, [profileStorageKey, profileIdentity, workspace]);
  useEffect(() => () => { if (syncTimer.current !== null) window.clearTimeout(syncTimer.current); }, []);
  const analysisPlan = analysisProfile ? activeAnalysisPlan(analysisProfile) : null;
  const analysisRoles = analysisPlan?.roles ?? {};
  const data = useDeckBuilderData({ championName: workspace?.championName ?? null, format: workspace?.format ?? "STANDARD", includeDecodedDecks: false });
  const { catalogByName, collection, collectionLoaded } = data;
  const mainTotal = total(workspace?.main);
  const materialTotal = total(workspace?.material);
  const sideboardTotal = total(workspace?.sideboard);
  const opening = workspace ? inferStartingHandSize(workspace.material, catalogByName) : 0;
  const deckCardCounts = useMemo(() => new Map([...(workspace?.main ?? []), ...(workspace?.material ?? [])].map((line) => [line.name, line.quantity])), [workspace]);
  const { result: deckTestResult, loading: deckTestLoading } = useDeckTestResult({ deckCardCounts, cardsByName: catalogByName, nearestDecks: [] });
  const collectionDecklist = useMemo<OmnidexDecklist>(() => ({
    main: (workspace?.main ?? []).map((line) => ({ card: line.name, quantity: line.quantity })),
    material: (workspace?.material ?? []).map((line) => ({ card: line.name, quantity: line.quantity })),
    sideboard: (workspace?.sideboard ?? []).map((line) => ({ card: line.name, quantity: line.quantity })),
  }), [workspace]);
  const collectionStatus = useMemo(
    () => workspace && collectionLoaded ? computeDeckCollectionStatus(collectionDecklist, collection, true) : null,
    [collection, collectionDecklist, collectionLoaded, workspace],
  );

  function loadWorkspace(next: Omit<DeckWorkspace, "version" | "updatedAt">) {
    saveActiveDeckWorkspace(sessionStorage, next);
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
    setCalculatorCard(undefined);
    setScenario({ turn: 3, order: "first" });
    setTab("summary");
  }

  const requestedDeck = useRequestedDeckWorkspace(catalogByName, "analysis", loadWorkspace);
  function persistAnalysisProfile(next: DeckAnalysisProfile) {
    if (!workspace || !analysisProfile) return;
    const saved = saveAnalysisProfile(localStorage, workspace.championName, workspace.main, next, profileIdentity);
    setAnalysisProfile(saved);
    if (!profileAccount.current) { setProfileSync("local"); return; }
    setProfileSync("syncing");
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => { void accountApi.saveAnalysisProfile(saved, profileIdentity).then(() => setProfileSync("synced")).catch(() => setProfileSync("offline")); }, 500);
  }
  function updateAnalysisRoles(roles: Record<string, GamePlanRole | "">) {
    if (!analysisProfile) return;
    persistAnalysisProfile({ ...analysisProfile, plans: analysisProfile.plans.map((plan) => plan.id === analysisProfile.activePlanId ? { ...plan, roles } : plan), reviewedAt: null });
  }

  function markAnalysisReviewed() {
    if (!workspace || !analysisProfile) return;
    persistAnalysisProfile({ ...analysisProfile, reviewedAt: new Date().toISOString() });
  }

  if (requestedDeck.pending) return <PageLayout><PageHeader title="Deck Analysis" description="Loading the selected deck without changing its saved copy." /><Panel className="mt-6"><InlineState>Loading deck…</InlineState></Panel></PageLayout>;
  if (requestedDeck.error) return <PageLayout><PageHeader title="Deck Analysis" description="The selected deck could not be opened." /><Panel className="mt-6"><InlineState tone="danger">{requestedDeck.error}</InlineState><button type="button" onClick={requestedDeck.retry} className="mt-4 rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base">Try again</button></Panel></PageLayout>;

  if (!workspace || mainTotal === 0) return <PageLayout><PageHeader title="Deck Analysis" description="Facts about how a deck behaves. Recommendations remain in Deck Review." /><Panel className="mt-6"><InlineState className="mb-4">Choose a deck to analyze. Importing here does not modify the saved original.</InlineState><DeckWorkspacePicker catalogByName={catalogByName} source="analysis" onLoad={loadWorkspace} /></Panel></PageLayout>;

  return <PageLayout>
    <PageHeader title="Deck Analysis" />
    <DeckToolWorkspaceHeader activeTool="analysis" title={workspace.title} championName={workspace.championName} spiritName={workspace.spiritName} format={workspace.format} mainTotal={mainTotal} materialTotal={materialTotal} sideboardTotal={sideboardTotal} sourceLabel={workspace.sourceLabel} actions={<DeckWorkspacePicker compact catalogByName={catalogByName} source="analysis" onLoad={loadWorkspace} />} />
    <details ref={setupRef} className="mt-3"><summary className="min-h-12 cursor-pointer py-3 text-sm font-medium text-ctp-blue">Deck and analysis setup</summary>
      <DeckArtworkPreview material={workspace.material} main={workspace.main} catalogByName={catalogByName} />
    {collectionStatus && <CollectionShortageSummary status={collectionStatus} />}
    {analysisProfile && <div className="mt-4"><PrepareAnalysis lines={workspace.main} catalogByName={catalogByName} profile={analysisProfile} onProfileChange={persistAnalysisProfile} onReviewed={markAnalysisReviewed} /><p className="mt-1 px-1 text-[10px] text-ctp-subtext0" aria-live="polite">{profileSync === "synced" ? "Analysis profile synced to your account." : profileSync === "syncing" ? "Syncing analysis profile…" : profileSync === "offline" ? "Saved on this device. Account sync will retry when this page is reopened." : "Analysis profile saved on this device."}</p></div>}
    </details>
    <div className="mt-4"><Tabs tabs={[{ key: "summary", label: "Results" }, { key: "explore", label: "Advanced calculators" }, { key: "matchups", label: "Matchups" }]} active={tab} onChange={setTab} label="Deck analysis sections" baseId="deck-analysis" /></div>
    <TabPanel baseId="deck-analysis" tab="summary" active={tab} keepMounted><AnalysisResults scenario={scenario} onScenarioChange={setScenario} key={profileStorageKey} main={workspace.main} material={workspace.material} catalog={catalogByName} profile={analysisProfile} onExplore={(card) => { if (card) setCalculatorCard({ name: card, nonce: Date.now() }); setTab("explore"); requestAnimationFrame(() => document.getElementById("deck-analysis-tab-explore")?.focus()); }} /></TabPanel>
    <TabPanel baseId="deck-analysis" tab="explore" active={tab} keepMounted>
      <CalculatorDashboard scenario={scenario} onScenarioChange={setScenario} initialCard={calculatorCard} key={profileStorageKey} storageKey={profileStorageKey} main={workspace.main} sideboard={workspace.sideboard} material={workspace.material} catalog={catalogByName} opening={opening} plan={analysisPlan} onEditPlan={() => { if (setupRef.current) { setupRef.current.open = true; const inner = setupRef.current.querySelector("details.group"); if (inner instanceof HTMLDetailsElement) inner.open = true; setupRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } }} detailedModels={{
        "Plan consistency": <><GamePlanReadiness mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} sharedAssignments={analysisRoles} sharedStageUsefulness={analysisPlan?.stageUsefulness} sharedEffectiveCosts={analysisProfile?.effectiveCosts} onSharedAssignmentsChange={updateAnalysisRoles} planName={analysisPlan?.name} /></>,
        "Opening hand": <><FunctionalHandCalculator mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} sharedAssignments={analysisRoles} /></>,
        "Level timing": <><LevelUpRunway mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></>,
        "Pressure access": <><ThreatCadence mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} sharedAssignments={analysisRoles} sharedPackages={analysisPlan?.pressure} onSharedPackagesChange={(pressure) => analysisProfile && persistAnalysisProfile({ ...analysisProfile, plans: analysisProfile.plans.map((plan) => plan.id === analysisProfile.activePlanId ? { ...plan, pressure } : plan), reviewedAt: null })} /></>,
        "Recovery access": <><ResilienceRebuild mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} sharedAssignments={analysisPlan?.resilience} onSharedAssignmentsChange={(resilience) => analysisProfile && persistAnalysisProfile({ ...analysisProfile, plans: analysisProfile.plans.map((plan) => plan.id === analysisProfile.activePlanId ? { ...plan, resilience } : plan), reviewedAt: null })} /></>,
        "Find cards": <><HypergeometricCalculator mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} /></>,
        "Unwanted draws": <DrawPatternReview mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} />,
        "Resource timing": <><ResourceCurveReliability mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} sharedEffectiveCosts={analysisProfile?.effectiveCosts} onSharedEffectiveCostsChange={(effectiveCosts) => analysisProfile && persistAnalysisProfile({ ...analysisProfile, effectiveCosts, reviewedAt: null })} /></>,
        "Sideboard comparison": <>{workspace.sideboard.length > 0 ? <SideboardImpact mainLines={workspace.main} sideboardLines={workspace.sideboard} catalogByName={catalogByName} /> : <InlineState>Add cards to the Sideboard in Deck Builder to analyze substitutions.</InlineState>}</>,
      }} />
    </TabPanel>
    <TabPanel baseId="deck-analysis" tab="matchups" active={tab}><BuilderTestPanel deckTestResult={deckTestResult} loading={deckTestLoading} cardsByName={catalogByName} nearestDecks={[]} nearestDeckCompareLink={() => "#"} onLoadNearestDeck={() => undefined} /></TabPanel>
  </PageLayout>;
}

function CollectionShortageSummary({ status }: { status: ReturnType<typeof computeDeckCollectionStatus> }) {
  const missing = status.lines.filter((line) => line.missing > 0);
  if (missing.length === 0) return <section className="mt-4 rounded-xl border border-ctp-green/35 bg-ctp-green/10 p-3" aria-label="Collection coverage"><p className="text-sm font-semibold text-ctp-green">Collection covers this deck</p><p className="mt-1 text-xs text-ctp-subtext1">All Main, Material, and Sideboard copies are recorded as owned.</p><p className="mt-2 text-xs text-ctp-subtext1">{OWNERSHIP_COVERAGE_NOTE}</p><Link to="/card-locations" className="inline-flex min-h-12 items-center text-sm text-ctp-blue underline">Check locations and loans</Link></section>;
  return <details className="mt-4 rounded-xl border border-ctp-yellow/35 bg-ctp-yellow/10 p-3">
    <summary className="min-h-12 cursor-pointer list-none py-2 text-sm font-semibold text-ctp-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue">Missing {status.missingCopies} cop{status.missingCopies === 1 ? "y" : "ies"} from collection</summary>
    <p className="text-xs text-ctp-subtext1">Deck recipes identify gameplay cards, so every recorded printing is pooled for coverage.</p>
    <ul className="mt-2 space-y-1" aria-label="Missing cards only">{missing.map((line) => <li key={line.card} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-ctp-base/40 px-3 text-sm"><span className="text-ctp-text">{line.card}</span><span className="shrink-0 font-semibold text-ctp-yellow">{line.missing} missing</span></li>)}</ul>
  </details>;
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
