import { useCallback, useEffect, useMemo, useState } from "react";
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
import { forecastComboByTurn } from "../../lib/comboTurnForecast";
import ComboLibrary from "./ComboLibrary";

type LabTab = "build" | "calculations" | "explore";
type RecipePreset = { key: string; label: string; requirements: ComboRecipeRequirement[] };
type SavedCombo = { id: string; name: string; requirements: ComboRecipeRequirement[]; damage: number; goal?: "level" | "cards" | "custom"; targetTurn?: number | null };

const COMBO_LAB_SCENARIOS_KEY = "combo-lab-scenarios-v1";

function loadSavedCombos(): SavedCombo[] {
  try {
    const value = JSON.parse(localStorage.getItem(COMBO_LAB_SCENARIOS_KEY) ?? "[]") as SavedCombo[];
    return Array.isArray(value) ? value.filter((combo) => combo && typeof combo.id === "string" && typeof combo.name === "string" && Array.isArray(combo.requirements)) : [];
  } catch { return []; }
}

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
  const [goal, setGoal] = useState<LevelGoalConfig>({ targetLevel: 3, targetTurn: 2, playOrder: "first", useDirectLevelUp: true, useFractalPayment: true, fragmentedSpiritDepth: 12 });
  const [goalId, setGoalId] = useState<ComboGoalId>("level");
  const [savedCombos, setSavedCombos] = useState<SavedCombo[]>(loadSavedCombos);
  const [currentRecipe, setCurrentRecipe] = useState<ComboRecipeRequirement[]>([]);
  const [comboName, setComboName] = useState("Combo 1");
  const [comboDamage, setComboDamage] = useState(0);
  const [lethalThreshold, setLethalThreshold] = useState(20);
  const [forecastOrder, setForecastOrder] = useState<"first" | "second">("first");
  const [editingDeck, setEditingDeck] = useState(false);
  const [cardToAdd, setCardToAdd] = useState("");
  const data = useDeckBuilderData({ championName: workspace?.championName ?? null, format: workspace?.format ?? "STANDARD", includeDecodedDecks: false });
  const mined = useMinedPackageCandidates(tab === "explore");
  const { catalogByName } = data;

  function loadWorkspace(next: Omit<DeckWorkspace, "version" | "updatedAt">) {
    saveActiveDeckWorkspace(sessionStorage, next);
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
    setTab("build");
  }

  function applyDeckReplacement(cardName: string, removedCard: string) {
    if (!workspace || !removedCard || removedCard === cardName) return;
    const nextMain = workspace.main
      .map((line) => line.name === cardName ? { ...line, quantity: line.quantity + 1 } : line.name === removedCard ? { ...line, quantity: line.quantity - 1 } : line)
      .filter((line) => line.quantity > 0);
    const { version: _version, updatedAt: _updatedAt, ...stored } = workspace;
    saveActiveDeckWorkspace(sessionStorage, { ...stored, source: "combo", sourceLabel: "Combo Lab working copy", main: nextMain });
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
    setPendingSuggestion(null);
    setCutCard("");
    setNotice(`Applied: +1 ${cardName}, −1 ${removedCard}. Calculations updated.`);
  }

  function applySuggestion(cardName: string) {
    applyDeckReplacement(cardName, cutCard);
  }

  const requestedDeck = useRequestedDeckWorkspace(catalogByName, "combo", loadWorkspace);
  const urlPreset = useMemo<RecipePreset | null>(() => recipeFromParams(params), [params]);
  const [localPreset, setLocalPreset] = useState<RecipePreset | null>(null);
  const preset = urlPreset ?? localPreset;
  const deckNames = useMemo(() => new Set(workspace?.main.map((line) => line.name) ?? []), [workspace]);
  const levelAnalysis = useMemo(() => workspace ? computeLevelGoalAnalysis(workspace.main, workspace.material, catalogByName, goal) : null, [workspace, catalogByName, goal]);
  const selectedGoal = comboGoal(goalId);
  useEffect(() => { try { localStorage.setItem(COMBO_LAB_SCENARIOS_KEY, JSON.stringify(savedCombos)); } catch { /* Storage can be unavailable in private contexts. */ } }, [savedCombos]);

  const comboForecasts = useMemo(() => workspace ? savedCombos.map((combo) => ({ combo, points: forecastComboByTurn(workspace.main, workspace.material, catalogByName, combo.requirements, forecastOrder) })) : [], [workspace, savedCombos, catalogByName, forecastOrder]);
  const fastestCombo = useMemo(() => comboForecasts.map(({ combo, points }) => ({ combo, point: points.find((point) => (point.probability ?? 0) >= 0.5) })).filter((entry) => entry.point).sort((a, b) => a.point!.turn - b.point!.turn || (b.point!.probability ?? 0) - (a.point!.probability ?? 0))[0] ?? null, [comboForecasts]);

  function updateMainQuantity(name: string, quantity: number) {
    if (!workspace) return;
    const nextMain = workspace.main.map((line) => line.name === name ? { ...line, quantity } : line).filter((line) => line.quantity > 0);
    if (!workspace.main.some((line) => line.name === name) && quantity > 0) nextMain.push({ name, quantity });
    const { version: _version, updatedAt: _updatedAt, ...stored } = workspace;
    saveActiveDeckWorkspace(sessionStorage, { ...stored, source: "combo", sourceLabel: "Combo Lab working copy", main: nextMain });
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
  }

  function saveCurrentCombo() {
    if (currentRecipe.length < 2) return;
    const combo: SavedCombo = { id: `${Date.now()}`, name: comboName.trim() || `Combo ${savedCombos.length + 1}`, requirements: currentRecipe, damage: Math.max(0, comboDamage), goal: goalId === "level" ? "level" : goalId === "draw" ? "cards" : "custom", targetTurn: goalId === "level" ? goal.targetTurn : null };
    setSavedCombos((current) => [...current, combo]);
    setComboName(`Combo ${savedCombos.length + 2}`);
    setNotice(`${combo.name} saved.`);
  }

  const finishLocalMigration = useCallback(() => setSavedCombos([]), []);
  function openLibraryCombo(combo: { name: string; requirements: ComboRecipeRequirement[]; damage: number }) {
    setLocalPreset({ key: `library:${combo.name}`, label: combo.name, requirements: combo.requirements });
    setCurrentRecipe(combo.requirements); setComboName(combo.name); setComboDamage(combo.damage); setTab("calculations");
    setParams((current) => { const next = new URLSearchParams(current); next.set("recipe", JSON.stringify(combo.requirements)); next.set("label", combo.name); next.set("tab", "calculations"); return next; }, { replace: true });
  }

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
    <ComboLibrary localCombos={savedCombos} format={workspace?.format} championName={workspace?.championName} onMigrated={finishLocalMigration} onLoad={openLibraryCombo} />
    {!workspace || workspace.main.length === 0 ? <Panel>
<InlineState className="mb-4">Load a deck before constructing a combo recipe. The calculator evaluates cards in its shuffled Main Deck.</InlineState>
<DeckWorkspacePicker catalogByName={catalogByName} source="combo" onLoad={loadWorkspace} />
</Panel> : <>
      <Panel padding="sm">
<div className="flex flex-wrap items-center justify-between gap-3">
<div>
<p className="font-semibold text-ctp-text">{workspace.title ?? "Active deck"}</p>
<p className="text-xs text-ctp-subtext0">{workspace.championName ?? "Unknown Champion"} · {workspace.main.reduce((sum, line) => sum + line.quantity, 0)} Main · working copy</p>
</div><div className="flex items-center gap-3"><button type="button" onClick={() => setEditingDeck((value) => !value)} className="text-xs font-semibold text-ctp-blue">{editingDeck ? "Done editing" : "Edit deck"}</button>{preset && <div className="text-right">
<p className="text-xs font-medium text-ctp-mauve">Loaded recipe: {preset.label}</p>
<button type="button" onClick={() => { void navigator.clipboard.writeText(window.location.href).then(() => setNotice("Share link copied.")); }} className="text-xs text-ctp-blue hover:underline">Copy recipe link</button>
</div>}</div></div>{editingDeck && <div className="mt-3 border-t border-ctp-surface1 pt-3"><div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{workspace.main.map((line) => <div key={line.name} className="flex items-center justify-between rounded-md bg-ctp-base/50 px-2 py-1.5 text-xs"><span className="truncate text-ctp-text">{line.name}</span><span className="ml-2 flex items-center gap-1"><button type="button" aria-label={`Remove one ${line.name}`} onClick={() => updateMainQuantity(line.name, line.quantity - 1)} className="h-7 w-7 rounded border border-ctp-surface1">−</button><span className="w-5 text-center tabular-nums">{line.quantity}</span><button type="button" aria-label={`Add one ${line.name}`} disabled={line.quantity >= 4} onClick={() => updateMainQuantity(line.name, line.quantity + 1)} className="h-7 w-7 rounded border border-ctp-surface1 disabled:opacity-35">+</button></span></div>)}</div><div className="mt-2 flex gap-2"><select value={cardToAdd} onChange={(event) => setCardToAdd(event.target.value)} className="min-h-9 min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-2 text-xs text-ctp-text"><option value="">Add a card…</option>{[...catalogByName.keys()].filter((name) => !workspace.main.some((line) => line.name === name) && !catalogByName.get(name)?.types.includes("CHAMPION")).sort().map((name) => <option key={name} value={name}>{name}</option>)}</select><button type="button" disabled={!cardToAdd} onClick={() => { updateMainQuantity(cardToAdd, 1); setCardToAdd(""); }} className="rounded-md bg-ctp-blue px-3 text-xs font-semibold text-ctp-base disabled:opacity-40">Add</button></div></div>}{notice && <p className="mt-2 text-xs text-ctp-green">{notice}</p>}</Panel>
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
{levelAnalysis.detected.fragmentedSpirit && <label className="block rounded-lg border border-ctp-mauve/40 bg-ctp-mauve/5 p-3 text-sm"><span className="font-medium text-ctp-text">Fragmented Spirit opening selection</span><span className="mt-1 block text-xs text-ctp-subtext0">{levelAnalysis.detected.fragmentedSpirit} uses Glimpse 6 before drawing six. Choose how deeply you expect to inspect after bottoming misses.</span><select value={goal.fragmentedSpiritDepth ?? 12} onChange={(event) => setGoal((current) => ({ ...current, fragmentedSpiritDepth: Number(event.target.value) }))} className="mt-2 block min-h-10 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text">{[6, 7, 8, 9, 10, 11, 12].map((depth) => <option key={depth} value={depth}>Inspect up to {depth} cards{depth === 12 ? " · maximum selection" : ""}</option>)}</select><span className="mt-1 block text-[10px] text-ctp-subtext0">This improves enabler access only. Your opening hand remains six cards.</span></label>}
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
<Purpose label="Selects the opening six" cards={levelAnalysis.detected.fragmentedSpirit ? [levelAnalysis.detected.fragmentedSpirit] : []} detail="Glimpse 6 can bottom misses before drawing six, expanding the inspected pool without expanding hand size." />
<Purpose label="Replaces Memory payment" cards={levelAnalysis.detected.fractalPaymentCards} detail="Consumes two established Fractal phantasias." />
<Purpose label="Resource / sacrifice pool" cards={levelAnalysis.detected.fractalCards} detail="Fractals may provide Reservable and/or become payment fodder; individual timing still matters." />
</div>
</Panel>
</div>}
      {tab === "build" && goalId !== "level" && <Panel className="mt-4">
<h2 className="text-lg font-semibold text-ctp-text">{selectedGoal.label}</h2>
<button type="button" onClick={() => setTab("calculations")} className="mt-5 rounded-md bg-ctp-blue px-4 py-2 text-sm font-semibold text-ctp-base">Set requirements</button>
</Panel>}
      {tab === "calculations" && <Panel className="mt-4">{fastestCombo && <div className="mb-3 rounded-lg bg-ctp-teal/10 px-3 py-2 text-sm text-ctp-text"><span className="font-semibold">Fastest consistent combo:</span> {fastestCombo.combo.name} by turn {fastestCombo.point!.turn} ({((fastestCombo.point!.probability ?? 0) * 100).toFixed(0)}%)</div>}<div className="flex flex-wrap items-end gap-2"><label className="min-w-44 flex-1 text-xs text-ctp-subtext0">Combo name<input value={comboName} onChange={(event) => setComboName(event.target.value)} className="mt-1 block min-h-9 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 text-sm text-ctp-text" /></label><label className="w-32 text-xs text-ctp-subtext0">Combo damage<input type="number" min={0} value={comboDamage} onChange={(event) => setComboDamage(Number(event.target.value))} className="mt-1 block min-h-9 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 text-sm text-ctp-text" /></label><button type="button" disabled={currentRecipe.length < 2} onClick={saveCurrentCombo} className="min-h-9 rounded-md bg-ctp-mauve px-3 text-xs font-semibold text-ctp-base disabled:opacity-40">Save current combo</button><label className="w-28 text-xs text-ctp-subtext0">Play order<select value={forecastOrder} onChange={(event) => setForecastOrder(event.target.value as "first" | "second")} className="mt-1 block min-h-9 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 text-xs text-ctp-text"><option value="first">First</option><option value="second">Second</option></select></label><label className="w-28 text-xs text-ctp-subtext0">Lethal at<input type="number" min={1} value={lethalThreshold} onChange={(event) => setLethalThreshold(Math.max(1, Number(event.target.value)))} className="mt-1 block min-h-9 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-2 text-sm text-ctp-text" /></label></div>{comboForecasts.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-xs"><thead className="text-[10px] uppercase text-ctp-subtext0"><tr><th className="pb-2">Combo</th>{[1, 2, 3, 4, 5, 6].map((turn) => <th key={turn} className="pb-2 text-center">T{turn}</th>)}<th className="pb-2 text-center">50% by</th><th /></tr></thead><tbody>{comboForecasts.map(({ combo, points }) => { const fifty = points.find((point) => (point.probability ?? 0) >= 0.5); return <tr key={combo.id} className="border-t border-ctp-surface1"><td className="py-2 font-medium text-ctp-text">{combo.name}{combo.damage >= lethalThreshold && <span className="ml-1 rounded bg-ctp-red/15 px-1.5 py-0.5 text-[9px] font-bold text-ctp-red">LETHAL {combo.damage}</span>}</td>{points.map((point) => <td key={point.turn} className="py-2 text-center tabular-nums text-ctp-subtext1">{point.probability === null ? "—" : `${(point.probability * 100).toFixed(0)}%`}</td>)}<td className="py-2 text-center font-semibold text-ctp-teal">{fifty ? `T${fifty.turn}` : "—"}</td><td className="py-2 text-right"><button type="button" onClick={() => { setParams((current) => { const next = new URLSearchParams(current); next.set("recipe", JSON.stringify(combo.requirements)); next.set("label", combo.name); next.set("tab", "calculations"); return next; }, { replace: true }); setComboName(combo.name); setComboDamage(combo.damage); }} className="text-ctp-blue">Open</button><button type="button" onClick={() => setSavedCombos((current) => current.filter((candidate) => candidate.id !== combo.id))} className="ml-2 text-ctp-red">Remove</button></td></tr>; })}</tbody></table></div>}</Panel>}
      {tab === "calculations" && levelAnalysis && goalId === "level" && <>
<div className="mt-4 grid gap-3 lg:grid-cols-3">{levelAnalysis.routes.map((route) => <Panel key={route.id} padding="sm">
<div className="flex items-start justify-between gap-2">
<h2 className="font-semibold text-ctp-text">{route.label}</h2>{route.probability !== null && <span className={`text-lg font-bold tabular-nums ${route.status === "blocked" ? "text-ctp-red" : "text-ctp-teal"}`}>{(route.probability * 100).toFixed(1)}%</span>}</div>
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
</Panel>}<div className="mt-4">
<HypergeometricCalculator key={`level:${preset?.key ?? "custom"}`} mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} defaultMode="recipe" initialRecipe={preset?.requirements} onApplyRecipeSuggestion={applyDeckReplacement} onRecipeChange={setCurrentRecipe} />
</div>
</>}
      {tab === "calculations" && goalId !== "level" && <>
<HypergeometricCalculator key={`${goalId}:${preset?.key ?? "custom"}`} mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} defaultMode={selectedGoal.calculatorMode} initialRecipe={preset?.requirements} onApplyRecipeSuggestion={applyDeckReplacement} onRecipeChange={setCurrentRecipe} />
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
