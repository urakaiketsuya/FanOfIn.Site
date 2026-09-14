import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import Tabs from "../../components/ui/Tabs";
import { InlineState } from "../../components/ui/ContentState";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import DeckWorkspacePicker from "../deckbuilder/components/DeckWorkspacePicker";
import HypergeometricCalculator, { type ComboRecipeRequirement } from "../deckbuilder/HypergeometricCalculator";
import { useDeckBuilderData } from "../deckbuilder/data/useDeckBuilderData";
import { loadActiveDeckWorkspace, saveActiveDeckWorkspace, type DeckWorkspace } from "../deckbuilder/persistence/deckWorkspace";
import { useRequestedDeckWorkspace } from "../deckbuilder/persistence/useRequestedDeckWorkspace";
import { useMinedPackageCandidates } from "../deckbuilder/useMinedPackageCandidates";
import { computeLevelGoalAnalysis, type LevelGoalConfig } from "../../lib/levelGoal";
import { COMBO_GOALS, comboGoal, type ComboGoalId } from "../../lib/comboGoals";

type LabTab = "build" | "calculations" | "explore";
type RecipePreset = { key: string; label: string; requirements: ComboRecipeRequirement[] };

const cardRequirement = (cards: string[], required = 1): ComboRecipeRequirement => ({ kind: "cards", cards, value: "", required });

function recipeFromParams(params: URLSearchParams): RecipePreset | null {
  const raw = params.get("recipe");
  if (!raw) return null;
  try {
    const requirements = JSON.parse(raw) as ComboRecipeRequirement[];
    if (!Array.isArray(requirements) || requirements.length < 2 || requirements.length > 6) return null;
    if (requirements.some((entry) => !entry || !["cards", "attribute", "keyword"].includes(entry.kind) || !Array.isArray(entry.cards) || typeof entry.value !== "string" || !Number.isInteger(entry.required) || entry.required < 1)) return null;
    return { key: raw, label: params.get("label") ?? "Shared combo recipe", requirements };
  } catch {
    return null;
  }
}

export default function ComboLabIndex() {
  useDocumentTitle("Combo Lab", "Build flexible combo requirements, calculate access odds, and explore tournament-supported card packages.");
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<LabTab>(params.get("tab") === "explore" ? "explore" : params.get("tab") === "calculations" ? "calculations" : "build");
  const [workspace, setWorkspace] = useState<DeckWorkspace | null>(() => loadActiveDeckWorkspace(sessionStorage));
  const [search, setSearch] = useState("");
  const [deckOnly, setDeckOnly] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null);
  const [cutCard, setCutCard] = useState("");
  const [goal, setGoal] = useState<LevelGoalConfig>({ targetLevel: 3, targetTurn: 2, playOrder: "first", useDirectLevelUp: true, useFractalPayment: true });
  const [goalId, setGoalId] = useState<ComboGoalId>("level");
  const data = useDeckBuilderData({ championName: workspace?.championName ?? null, format: workspace?.format ?? "STANDARD", includeDecodedDecks: false });
  const mined = useMinedPackageCandidates(tab === "explore");
  const { catalogByName } = data;

  function loadWorkspace(next: Omit<DeckWorkspace, "version" | "updatedAt">) {
    saveActiveDeckWorkspace(sessionStorage, next);
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
    setTab("build");
  }

  function applySuggestion(cardName: string) {
    if (!workspace || !cutCard || cutCard === cardName) return;
    const nextMain = workspace.main
      .map((line) => line.name === cardName ? { ...line, quantity: line.quantity + 1 } : line.name === cutCard ? { ...line, quantity: line.quantity - 1 } : line)
      .filter((line) => line.quantity > 0);
    const { version: _version, updatedAt: _updatedAt, ...stored } = workspace;
    saveActiveDeckWorkspace(sessionStorage, { ...stored, source: "combo", sourceLabel: "Combo Lab working copy", main: nextMain });
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
    setPendingSuggestion(null);
    setCutCard("");
    setNotice(`Applied: +1 ${cardName}, −1 ${cutCard}. Calculations updated.`);
  }

  const requestedDeck = useRequestedDeckWorkspace(catalogByName, "combo", loadWorkspace);
  const urlPreset = useMemo<RecipePreset | null>(() => recipeFromParams(params), [params]);
  const [localPreset, setLocalPreset] = useState<RecipePreset | null>(null);
  const preset = urlPreset ?? localPreset;
  const deckNames = useMemo(() => new Set(workspace?.main.map((line) => line.name) ?? []), [workspace]);
  const levelAnalysis = useMemo(() => workspace ? computeLevelGoalAnalysis(workspace.main, workspace.material, catalogByName, goal) : null, [workspace, catalogByName, goal]);
  const selectedGoal = comboGoal(goalId);

  const packages = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const families = (mined?.families ?? []).map((family) => ({
      key: `family:${family.anchorCard}:${family.optionCards.join("|")}`,
      label: `${family.anchorCard} family`,
      anchor: family.anchorCard,
      members: [...family.coreCards, ...family.optionCards],
      requirements: [cardRequirement([family.anchorCard]), ...family.coreCards.map((name) => cardRequirement([name])), cardRequirement(family.optionCards, family.minOptions)],
      matchingDecks: family.matchingDecks,
      confidence: family.confidenceScore,
      detail: `${family.coreCards.length} required support · ${family.minOptions} of ${family.optionCards.length} options`,
    }));
    const candidates = (mined?.candidates ?? []).filter((candidate) => candidate.confidenceScore >= 40).map((candidate) => ({
      key: `candidate:${candidate.anchorCard}:${candidate.memberCards.join("|")}`,
      label: `${candidate.anchorCard} package`,
      anchor: candidate.anchorCard,
      members: candidate.memberCards,
      requirements: [cardRequirement([candidate.anchorCard]), ...candidate.memberCards.map((name) => cardRequirement([name]))],
      matchingDecks: candidate.matchingDecks,
      confidence: candidate.confidenceScore,
      detail: `${candidate.confidenceTier} evidence · ${candidate.evidenceKinds.join(" · ")}`,
    }));
    return [...families, ...candidates]
      .filter((entry) => !deckOnly || [entry.anchor, ...entry.members].some((name) => deckNames.has(name)))
      .filter((entry) => !needle || `${entry.label} ${entry.members.join(" ")}`.toLowerCase().includes(needle))
      .sort((a, b) => b.confidence - a.confidence || b.matchingDecks - a.matchingDecks)
      .slice(0, 80);
  }, [mined, search, deckOnly, deckNames]);

  function selectPackage(entry: (typeof packages)[number]) {
    const requirements = entry.requirements.slice(0, 6);
    setLocalPreset({ key: entry.key, label: entry.label, requirements });
    setParams(() => {
      const next = new URLSearchParams();
      next.set("recipe", JSON.stringify(requirements));
      next.set("label", entry.label);
      return next;
    }, { replace: true });
    setTab("calculations");
  }

  if (requestedDeck.pending) return <PageLayout>
<InlineState className="mt-10">Loading the selected deck…</InlineState>
</PageLayout>;
  if (requestedDeck.error) return <PageLayout>
<Panel tone="danger" className="mt-10">
<InlineState tone="danger">{requestedDeck.error}</InlineState>
<button type="button" onClick={requestedDeck.retry} className="mt-3 text-sm text-ctp-blue">Try again</button>
</Panel>
</PageLayout>;

  return <PageLayout data-component="ComboLabIndex" width="wide">
    <PageHeader title="Combo Lab" description="Define what your combo needs, calculate exact access odds, and start from packages found in real tournament decks." actions={<div className="flex gap-2">
<Link to="/cards/packages" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue">Package catalog</Link>{workspace && <DeckWorkspacePicker compact catalogByName={catalogByName} source="combo" onLoad={loadWorkspace} />}</div>} />
    {!workspace || workspace.main.length === 0 ? <Panel>
<InlineState className="mb-4">Load a deck before constructing a combo recipe. The calculator evaluates cards in its shuffled Main Deck.</InlineState>
<DeckWorkspacePicker catalogByName={catalogByName} source="combo" onLoad={loadWorkspace} />
</Panel> : <>
      <Panel padding="sm">
<div className="flex flex-wrap items-center justify-between gap-3">
<div>
<p className="font-semibold text-ctp-text">{workspace.title ?? "Active deck"}</p>
<p className="text-xs text-ctp-subtext0">{workspace.championName ?? "Unknown Champion"} · {workspace.main.reduce((sum, line) => sum + line.quantity, 0)} Main · working copy</p>
</div>{preset && <div className="text-right">
<p className="text-xs font-medium text-ctp-mauve">Loaded recipe: {preset.label}</p>
<button type="button" onClick={() => { void navigator.clipboard.writeText(window.location.href).then(() => setNotice("Share link copied.")); }} className="text-xs text-ctp-blue hover:underline">Copy recipe link</button>
</div>}</div>{notice && <p className="mt-2 text-xs text-ctp-green">{notice}</p>}</Panel>
      <div className="mt-4">
<Tabs tabs={[{ key: "build", label: "Build" }, { key: "calculations", label: "Calculations" }, { key: "explore", label: "Explore packages" }]} active={tab} onChange={(next) => { setTab(next); setParams((current) => { const updated = new URLSearchParams(current); if (next === "build") updated.delete("tab"); else updated.set("tab", next); return updated; }, { replace: true }); }} label="Combo Lab sections" baseId="combo-lab" />
</div>
      {tab === "build" && <Panel className="mt-4">
<h2 className="text-lg font-semibold text-ctp-text">What should this package accomplish?</h2>
<p className="mt-1 text-sm text-ctp-subtext1">Choose an outcome first. Each goal states what its math can—and cannot—prove under the comprehensive rules.</p>
<div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{COMBO_GOALS.map((candidate) => <button key={candidate.id} type="button" aria-pressed={goalId === candidate.id} onClick={() => setGoalId(candidate.id)} className={`rounded-lg border p-3 text-left ${goalId === candidate.id ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 bg-ctp-base/35 hover:border-ctp-blue/60"}`}>
<span className="block text-sm font-semibold text-ctp-text">{candidate.label}</span>
<span className="mt-1 block text-xs text-ctp-subtext0">{candidate.summary}</span>
</button>)}</div>
</Panel>}
      {tab === "build" && levelAnalysis && goalId === "level" && <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
<Panel>
<div className="mt-4 grid gap-3 sm:grid-cols-3">
<label className="text-xs text-ctp-subtext0">Target Champion level<select value={goal.targetLevel} onChange={(event) => setGoal((current) => ({ ...current, targetLevel: Number(event.target.value) }))} className="mt-1 block min-h-10 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text">{[2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>Level {level}</option>)}</select>
</label>
<label className="text-xs text-ctp-subtext0">Evaluate by turn<select value={goal.targetTurn} onChange={(event) => setGoal((current) => ({ ...current, targetTurn: Number(event.target.value) }))} className="mt-1 block min-h-10 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text">{[1, 2, 3, 4, 5, 6].map((turn) => <option key={turn} value={turn}>Turn {turn}</option>)}</select>
</label>
<label className="text-xs text-ctp-subtext0">Play order<select value={goal.playOrder} onChange={(event) => setGoal((current) => ({ ...current, playOrder: event.target.value as "first" | "second" }))} className="mt-1 block min-h-10 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text">
<option value="first">Going first</option>
<option value="second">Going second</option>
</select>
</label>
</div>
<fieldset className="mt-5">
<legend className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Routes to consider</legend>
<div className="mt-2 space-y-2">
<label className="flex items-start gap-2 rounded-lg border border-ctp-surface1 p-3 text-sm">
<input type="checkbox" checked={goal.useDirectLevelUp} onChange={(event) => setGoal((current) => ({ ...current, useDirectLevelUp: event.target.checked }))} className="mt-1" />
<span>
<span className="font-medium text-ctp-text">Direct level-up effects</span>
<span className="block text-xs text-ctp-subtext0">Can advance faster than the normal Materialize Phase schedule.</span>
</span>
</label>
<label className="flex items-start gap-2 rounded-lg border border-ctp-surface1 p-3 text-sm">
<input type="checkbox" checked={goal.useFractalPayment} onChange={(event) => setGoal((current) => ({ ...current, useFractalPayment: event.target.checked }))} className="mt-1" />
<span>
<span className="font-medium text-ctp-text">Fractal payment effects</span>
<span className="block text-xs text-ctp-subtext0">Replace Champion Memory costs but do not create an extra materialization.</span>
</span>
</label>
</div>
</fieldset>
<button type="button" onClick={() => setTab("calculations")} className="mt-5 rounded-md bg-ctp-blue px-4 py-2 text-sm font-semibold text-ctp-base">Evaluate this goal</button>
</Panel>
<Panel>
<h2 className="text-sm font-semibold uppercase tracking-wide text-ctp-subtext0">Detected purpose graph</h2>
<div className="mt-3 space-y-3 text-sm">
<Purpose label="Accelerates level" cards={levelAnalysis.detected.directLevelCards} detail="Produces an extra level-up outside normal materialization." />
<Purpose label="Replaces Memory payment" cards={levelAnalysis.detected.fractalPaymentCards} detail="Consumes two established Fractal phantasias." />
<Purpose label="Resource / sacrifice pool" cards={levelAnalysis.detected.fractalCards} detail="Fractals may provide Reservable and/or become payment fodder; individual timing still matters." />
</div>
</Panel>
</div>}
      {tab === "build" && goalId !== "level" && <Panel className="mt-4">
<RuleContract goal={selectedGoal} />
<button type="button" onClick={() => setTab("calculations")} className="mt-5 rounded-md bg-ctp-blue px-4 py-2 text-sm font-semibold text-ctp-base">Set requirements</button>
</Panel>}
      {tab === "calculations" && levelAnalysis && goalId === "level" && <>
<div className="mt-4 grid gap-3 lg:grid-cols-3">{levelAnalysis.routes.map((route) => <Panel key={route.id} padding="sm">
<div className="flex items-start justify-between gap-2">
<h2 className="font-semibold text-ctp-text">{route.label}</h2>{route.probability !== null && <span className={`text-lg font-bold tabular-nums ${route.status === "blocked" ? "text-ctp-red" : "text-ctp-teal"}`}>{(route.probability * 100).toFixed(1)}%</span>}</div>
<p className="mt-2 text-xs text-ctp-subtext1">{route.detail}</p>
<p className="mt-2 text-[10px] text-ctp-subtext0">
<span className="font-semibold uppercase">Bottleneck:</span> {route.bottleneck}</p>
</Panel>)}</div>{levelAnalysis.suggestions.length > 0 && <Panel className="mt-4">
<h2 className="font-semibold text-ctp-text">Changes that improve this goal</h2>
<p className="mt-1 text-xs text-ctp-subtext0">Each test adds one copy and replaces one Main Deck card, keeping deck size constant.</p>
<div className="mt-3 grid gap-2 sm:grid-cols-2">{levelAnalysis.suggestions.slice(0, 6).map((suggestion) => { const suggestionKey = `${suggestion.route}:${suggestion.cardName}`; const isPending = pendingSuggestion === suggestionKey; const cutOptions = workspace.main.filter((line) => line.name !== suggestion.cardName); return <article key={suggestionKey} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3">
<div className="flex items-center justify-between gap-3">
<span className="text-sm font-medium text-ctp-text">Add 1× {suggestion.cardName} <span className="text-xs font-normal text-ctp-subtext0">({suggestion.currentCopies} → {suggestion.currentCopies + 1})</span>
</span>
<span className="shrink-0 font-semibold text-ctp-teal">+{(suggestion.gain * 100).toFixed(1)} pts</span>
</div>
<p className="mt-1 text-xs text-ctp-subtext1">{suggestion.reason}</p>{isPending ? <div className="mt-3 rounded-md border border-ctp-surface1 bg-ctp-mantle p-2">
<label className="text-xs text-ctp-subtext0">Choose the card to replace<select value={cutCard} onChange={(event) => setCutCard(event.target.value)} className="mt-1 block min-h-10 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text">
<option value="">Select a Main Deck card…</option>{cutOptions.map((line) => <option key={line.name} value={line.name}>{line.quantity}× {line.name}</option>)}</select>
</label>
<div className="mt-2 flex gap-2">
<button type="button" disabled={!cutCard} onClick={() => applySuggestion(suggestion.cardName)} className="rounded-md bg-ctp-blue px-3 py-1.5 text-xs font-semibold text-ctp-base disabled:cursor-not-allowed disabled:opacity-50">Apply change</button>
<button type="button" onClick={() => { setPendingSuggestion(null); setCutCard(""); }} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-xs text-ctp-subtext1">Cancel</button>
</div>
</div> : <button type="button" onClick={() => { setPendingSuggestion(suggestionKey); setCutCard(""); }} className="mt-3 rounded-md border border-ctp-blue/60 px-3 py-1.5 text-xs font-semibold text-ctp-blue hover:bg-ctp-blue/10">Review change</button>}</article>; })}</div>
</Panel>}<details className="mt-4">
<summary className="cursor-pointer rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm font-semibold text-ctp-text">Open custom probability calculations</summary>
<HypergeometricCalculator key={`${workspace.updatedAt}:${preset?.key ?? "custom"}`} mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} defaultMode="recipe" initialRecipe={preset?.requirements} />
</details>
<p className="mt-3 text-xs text-ctp-subtext0">Direct-route percentages are exact card-access odds at the selected checkpoint. Fractal-route percentages are access ceilings: matched cards still need enough Reserve, legal sequencing, and time to enter and remain on the field.</p>
</>}
      {tab === "calculations" && goalId !== "level" && <>
<Panel className="mt-4"><RuleContract goal={selectedGoal} /></Panel>
<HypergeometricCalculator key={`${workspace.updatedAt}:${goalId}:${preset?.key ?? "custom"}`} mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} defaultMode={selectedGoal.calculatorMode} initialRecipe={preset?.requirements} />
</>}
      {tab === "explore" && <Panel className="mt-4">
<div className="flex flex-wrap items-end gap-3">
<label className="min-w-64 flex-1 text-xs text-ctp-subtext0">Find an anchor or member<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fractal, Full Bloom…" className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" />
</label>
<label className="flex min-h-10 items-center gap-2 text-xs text-ctp-subtext1">
<input type="checkbox" checked={deckOnly} onChange={(event) => setDeckOnly(event.target.checked)} />Touches my deck</label>
</div>{!mined ? <InlineState className="mt-5">Loading package evidence…</InlineState> : packages.length === 0 ? <InlineState className="mt-5">No packages match these filters.</InlineState> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{packages.map((entry) => { const included = [entry.anchor, ...entry.members].filter((name) => deckNames.has(name)).length; return <article key={entry.key} className="rounded-xl border border-ctp-surface1 bg-ctp-base/40 p-4">
<div className="flex items-start justify-between gap-3">
<div>
<h2 className="font-semibold text-ctp-text">{entry.label}</h2>
<p className="mt-1 text-xs text-ctp-subtext1">{entry.anchor} + {entry.members.join(" / ")}</p>
</div>
<span className="rounded-full bg-ctp-mauve/10 px-2 py-1 text-[10px] font-semibold text-ctp-mauve">{entry.confidence}/100</span>
</div>
<p className="mt-2 text-xs text-ctp-subtext0">{entry.detail} · {entry.matchingDecks.toLocaleString()} matching decks · {included}/{entry.members.length + 1} cards currently present</p>
<button type="button" onClick={() => selectPackage(entry)} className="mt-3 rounded-md border border-ctp-blue/60 px-3 py-1.5 text-xs font-semibold text-ctp-blue hover:bg-ctp-blue/10">Calculate this package</button>
</article>; })}</div>}</Panel>}
    </>}
  </PageLayout>;
}

function Purpose({ label, cards, detail }: { label: string; cards: string[]; detail: string }) {
  return <div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-3">
<p className="font-medium text-ctp-text">{label}</p>
<p className="mt-1 text-xs text-ctp-subtext1">{detail}</p>
<div className="mt-2 flex flex-wrap gap-1">{cards.length ? cards.map((name) => <span key={name} className="rounded-full bg-ctp-mauve/10 px-2 py-0.5 text-[10px] text-ctp-mauve">{name}</span>) : <span className="text-[10px] text-ctp-subtext0">None detected in this deck</span>}</div>
</div>;
}

function RuleContract({ goal }: { goal: ReturnType<typeof comboGoal> }) {
  return <div>
<div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ctp-text">{goal.label}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${goal.evidence === "rules-exact" ? "bg-ctp-green/10 text-ctp-green" : "bg-ctp-yellow/10 text-ctp-yellow"}`}>{goal.evidence === "rules-exact" ? "Rules-exact routes" : "Access ceiling"}</span></div>
<p className="mt-2 text-sm text-ctp-subtext1"><span className="font-medium text-ctp-text">Measures:</span> {goal.measures}</p>
<p className="mt-1 text-sm text-ctp-subtext1"><span className="font-medium text-ctp-text">Still requires game-state validation:</span> {goal.doesNotMeasure}</p>
<p className="mt-3 text-xs text-ctp-subtext0">Rules: {goal.ruleLinks.map((link, index) => <span key={link.href}>{index > 0 && " · "}<a href={link.href} target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">{link.label}</a></span>)}</p>
</div>;
}
