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
import type { ComboGoalId } from "../../lib/comboGoals";
import { inferComboPurpose } from "../../lib/comboPurpose";
import { forecastComboByTurn } from "../../lib/comboTurnForecast";
import ComboLibrary from "./ComboLibrary";
import GoalForecastChart, { type GoalForecastSeries } from "./GoalForecastChart";
import CardSearchPicker from "../../components/CardSearchPicker";

type LabTab = "analyze" | "explore";
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
    if (requirements.some((entry) => !entry || !["cards", "attribute", "keyword"].includes(entry.kind) || !Array.isArray(entry.cards) || typeof entry.value !== "string" || !Number.isInteger(entry.required) || entry.required < 1 || (entry.byTurn != null && (!Number.isInteger(entry.byTurn) || entry.byTurn < 1 || entry.byTurn > 6)) || (entry.avoid != null && (!(["cards", "attribute", "keyword"] as string[]).includes(entry.avoid.kind) || !Array.isArray(entry.avoid.cards) || typeof entry.avoid.value !== "string" || !Number.isInteger(entry.avoid.maximum) || entry.avoid.maximum < 0)))) return null;
    return { key: raw, label: params.get("label") ?? "Shared combo recipe", requirements };
  } catch {
    return null;
  }
}

export default function ComboLabIndex() {
  useDocumentTitle("Combo Lab", "Build flexible combo requirements, calculate access odds, and explore tournament-supported card packages.");
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<LabTab>(params.get("tab") === "explore" ? "explore" : "analyze");
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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cardToAdd, setCardToAdd] = useState("");
  const data = useDeckBuilderData({ championName: workspace?.championName ?? null, format: workspace?.format ?? "STANDARD", includeDecodedDecks: false });
  const mined = useMinedPackageCandidates(tab === "explore");
  const { catalogByName } = data;

  function loadWorkspace(next: Omit<DeckWorkspace, "version" | "updatedAt">) {
    saveActiveDeckWorkspace(sessionStorage, next);
    setWorkspace(loadActiveDeckWorkspace(sessionStorage));
    setTab("analyze");
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
  const addableCardNames = useMemo(() => [...catalogByName.keys()]
    .filter((name) => !deckNames.has(name) && !catalogByName.get(name)?.types.includes("CHAMPION"))
    .sort(), [catalogByName, deckNames]);
  const levelAnalysis = useMemo(() => workspace ? computeLevelGoalAnalysis(workspace.main, workspace.material, catalogByName, goal) : null, [workspace, catalogByName, goal]);
  const inferredPurpose = useMemo(() => inferComboPurpose(currentRecipe, workspace?.main ?? [], catalogByName), [currentRecipe, workspace, catalogByName]);
  useEffect(() => {
    setGoalId(inferredPurpose.goalId);
    setGoal((current) => ({ ...current, playOrder: "first", useDirectLevelUp: true, useFractalPayment: true, fragmentedSpiritDepth: 12 }));
  }, [inferredPurpose.goalId]);
  const levelForecast = useMemo(() => {
    if (!workspace || inferredPurpose.goalId !== "level") return [];
    const levels = [2, 3, 4, 5, 6];
    return levels.map((level) => ({
      level,
      points: [1, 2, 3, 4, 5, 6].map((turn) => computeLevelGoalAnalysis(workspace.main, workspace.material, catalogByName, { targetLevel: level, targetTurn: turn, playOrder: "first", useDirectLevelUp: true, useFractalPayment: true, fragmentedSpiritDepth: 12 })),
    }));
  }, [workspace, catalogByName, inferredPurpose.goalId]);
  const levelForecastSeries = useMemo<GoalForecastSeries[]>(() => {
    const colors = ["#89b4fa", "#cba6f7", "#94e2d5", "#f9e2af", "#f38ba8"];
    return levelForecast.map(({ level, points }, index) => ({
      label: `Level ${level}`,
      color: colors[index],
      values: points.map((analysis) => Math.max(...analysis.routes.filter((route) => route.id !== "fractal").map((route) => route.probability ?? 0))),
    }));
  }, [levelForecast]);
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
    setCurrentRecipe(combo.requirements); setComboName(combo.name); setComboDamage(combo.damage); setTab("analyze");
    setParams((current) => { const next = new URLSearchParams(current); next.set("recipe", JSON.stringify(combo.requirements)); next.set("label", combo.name); next.delete("tab"); return next; }, { replace: true });
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
    setTab("analyze");
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
    <PageHeader title="Combo Lab" description="Choose pieces and immediately see what they do and when your deck can find them." actions={<div className="flex w-full flex-wrap gap-2 sm:w-auto">
<button type="button" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((open) => !open)} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue">{libraryOpen ? "Close library" : "Combo library"}</button><Link to="/cards/packages" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:border-ctp-blue">Packages</Link>{workspace && <DeckWorkspacePicker compact catalogByName={catalogByName} source="combo" onLoad={loadWorkspace} />}</div>} />
    <div className={libraryOpen ? "" : "hidden"}><ComboLibrary localCombos={savedCombos} format={workspace?.format} championName={workspace?.championName} onMigrated={finishLocalMigration} onLoad={(combo) => { openLibraryCombo(combo); setLibraryOpen(false); }} /></div>
    {!workspace || workspace.main.length === 0 ? <Panel>
<InlineState className="mb-4">Load a deck before constructing a combo recipe. The calculator evaluates cards in its shuffled Main Deck.</InlineState>
<DeckWorkspacePicker catalogByName={catalogByName} source="combo" onLoad={loadWorkspace} />
</Panel> : <>
      <Panel padding="sm">
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<div>
<p className="font-semibold text-ctp-text">{workspace.title ?? "Active deck"}</p>
<p className="text-xs text-ctp-subtext0">{workspace.championName ?? "Unknown Champion"} · {workspace.main.reduce((sum, line) => sum + line.quantity, 0)} Main · working copy</p>
</div><div className="flex items-center justify-between gap-3 sm:justify-end"><button type="button" onClick={() => setEditingDeck((value) => !value)} className="min-h-9 text-xs font-semibold text-ctp-blue">{editingDeck ? "Done editing" : "Edit deck"}</button>{preset && <div className="text-right">
<p className="text-xs font-medium text-ctp-mauve">Loaded recipe: {preset.label}</p>
<button type="button" onClick={() => { void navigator.clipboard.writeText(window.location.href).then(() => setNotice("Share link copied.")); }} className="text-xs text-ctp-blue hover:underline">Copy recipe link</button>
</div>}</div></div>{editingDeck && <div className="mt-3 border-t border-ctp-surface1 pt-3"><div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{workspace.main.map((line) => <div key={line.name} className="flex items-center justify-between rounded-md bg-ctp-base/50 px-2 py-1.5 text-xs"><span className="truncate text-ctp-text">{line.name}</span><span className="ml-2 flex items-center gap-1"><button type="button" aria-label={`Remove one ${line.name}`} onClick={() => updateMainQuantity(line.name, line.quantity - 1)} className="h-7 w-7 rounded border border-ctp-surface1">−</button><span className="w-5 text-center tabular-nums">{line.quantity}</span><button type="button" aria-label={`Add one ${line.name}`} disabled={line.quantity >= 4} onClick={() => updateMainQuantity(line.name, line.quantity + 1)} className="h-7 w-7 rounded border border-ctp-surface1 disabled:opacity-35">+</button></span></div>)}</div><CardSearchPicker className="mt-2" options={addableCardNames} value={cardToAdd} onChange={setCardToAdd} onSelect={(name) => updateMainQuantity(name, 1)} placeholder="Search for a card to add…" ariaLabel="Search for a card to add" maxResults={10} /></div>}{notice && <p className="mt-2 text-xs text-ctp-green">{notice}</p>}</Panel>
      <div className="mt-4">
<Tabs tabs={[{ key: "analyze", label: "Analyze combo" }, { key: "explore", label: "Find packages" }]} active={tab} onChange={(next) => { setTab(next); setParams((current) => { const updated = new URLSearchParams(current); if (next === "analyze") updated.delete("tab"); else updated.set("tab", next); return updated; }, { replace: true }); }} label="Combo Lab sections" baseId="combo-lab" />
</div>
      {tab === "analyze" && inferredPurpose.purposes.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Detected combo purposes">{inferredPurpose.purposes.map((purpose) => <span key={purpose.id} className="shrink-0 rounded-full bg-ctp-mauve/10 px-2.5 py-1 text-xs font-medium text-ctp-mauve">{purpose.label}</span>)}</div>}
      {tab === "analyze" && <div className="mt-4">
<HypergeometricCalculator key={preset?.key ?? "custom"} mainLines={workspace.main} materialLines={workspace.material} catalogByName={catalogByName} defaultMode="recipe" initialRecipe={preset?.requirements} onApplyRecipeSuggestion={applyDeckReplacement} onRecipeChange={setCurrentRecipe} />
</div>}
      {tab === "analyze" && levelAnalysis && goalId === "level" && <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
<GoalForecastChart title="Chance to reach each Champion level" subtitle="Detected acceleration and opening selection are applied automatically. Lines show the strongest supported route." turns={[1, 2, 3, 4, 5, 6]} series={levelForecastSeries} />
<Panel><h2 className="font-semibold text-ctp-text">What the deck contributes</h2><div className="mt-3 space-y-3 text-sm"><Purpose label="Level acceleration" cards={levelAnalysis.detected.directLevelCards} detail="Included in the forecast when it beats natural materialization." /><Purpose label="Opening selection" cards={levelAnalysis.detected.fragmentedSpirit ? [levelAnalysis.detected.fragmentedSpirit] : []} detail="Detected Glimpse is applied automatically at its useful search depth." /><Purpose label="Fractal payment" cards={levelAnalysis.detected.fractalPaymentCards} detail="Tracked as payment support, not as extra Champion levels." /></div></Panel>
</div>}
      {tab === "analyze" && <Panel className="mt-4">{fastestCombo && <div className="mb-3 rounded-lg bg-ctp-teal/10 px-3 py-2 text-sm text-ctp-text"><span className="font-semibold">Fastest consistent combo:</span> {fastestCombo.combo.name} by turn {fastestCombo.point!.turn} ({((fastestCombo.point!.probability ?? 0) * 100).toFixed(0)}%)</div>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="text-xs text-ctp-subtext0 lg:col-span-2">Combo name<input value={comboName} onChange={(event) => setComboName(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text sm:text-sm" /></label><label className="text-xs text-ctp-subtext0">Combo damage<input type="number" min={0} value={comboDamage} onChange={(event) => setComboDamage(Number(event.target.value))} className="mt-1 block min-h-11 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text sm:text-sm" /></label><label className="text-xs text-ctp-subtext0">Play order<select value={forecastOrder} onChange={(event) => setForecastOrder(event.target.value as "first" | "second")} className="mt-1 block min-h-11 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text sm:text-sm"><option value="first">First</option><option value="second">Second</option></select></label><label className="text-xs text-ctp-subtext0">Lethal at<input type="number" min={1} value={lethalThreshold} onChange={(event) => setLethalThreshold(Math.max(1, Number(event.target.value)))} className="mt-1 block min-h-11 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 text-base text-ctp-text sm:text-sm" /></label><button type="button" disabled={currentRecipe.length < 2} onClick={saveCurrentCombo} className="min-h-11 rounded-md bg-ctp-mauve px-3 text-sm font-semibold text-ctp-base disabled:opacity-40 sm:col-span-2 lg:col-span-5">Save current combo</button></div>{comboForecasts.length > 0 && <div className="mt-4 grid gap-2 md:hidden">{comboForecasts.map(({ combo, points }) => { const fifty = points.find((point) => (point.probability ?? 0) >= 0.5); return <article key={combo.id} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium text-ctp-text">{combo.name}</p><p className="mt-1 text-xs text-ctp-subtext0">{fifty ? `50% by turn ${fifty.turn}` : "Below 50% through turn 6"}</p></div>{combo.damage >= lethalThreshold && <span className="rounded bg-ctp-red/15 px-1.5 py-0.5 text-[9px] font-bold text-ctp-red">LETHAL {combo.damage}</span>}</div><div className="mt-3 grid grid-cols-6 gap-1">{points.map((point) => <div key={point.turn} className="rounded bg-ctp-mantle px-1 py-2 text-center"><p className="text-[9px] text-ctp-subtext0">T{point.turn}</p><p className="mt-0.5 text-xs font-semibold tabular-nums text-ctp-text">{point.probability === null ? "—" : `${(point.probability * 100).toFixed(0)}%`}</p></div>)}</div><div className="mt-3 flex gap-4"><button type="button" onClick={() => { setLocalPreset({ key: `saved:${combo.id}`, label: combo.name, requirements: combo.requirements }); setCurrentRecipe(combo.requirements); setComboName(combo.name); setComboDamage(combo.damage); }} className="min-h-9 text-sm font-semibold text-ctp-blue">Open</button><button type="button" onClick={() => setSavedCombos((current) => current.filter((candidate) => candidate.id !== combo.id))} className="min-h-9 text-sm text-ctp-red">Remove</button></div></article>; })}</div>} {comboForecasts.length > 0 && <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[42rem] text-left text-xs"><thead className="text-[10px] uppercase text-ctp-subtext0"><tr><th className="pb-2">Combo</th>{[1, 2, 3, 4, 5, 6].map((turn) => <th key={turn} className="pb-2 text-center">T{turn}</th>)}<th className="pb-2 text-center">50% by</th><th /></tr></thead><tbody>{comboForecasts.map(({ combo, points }) => { const fifty = points.find((point) => (point.probability ?? 0) >= 0.5); return <tr key={combo.id} className="border-t border-ctp-surface1"><td className="py-2 font-medium text-ctp-text">{combo.name}{combo.damage >= lethalThreshold && <span className="ml-1 rounded bg-ctp-red/15 px-1.5 py-0.5 text-[9px] font-bold text-ctp-red">LETHAL {combo.damage}</span>}</td>{points.map((point) => <td key={point.turn} className="py-2 text-center tabular-nums text-ctp-subtext1">{point.probability === null ? "—" : `${(point.probability * 100).toFixed(0)}%`}</td>)}<td className="py-2 text-center font-semibold text-ctp-teal">{fifty ? `T${fifty.turn}` : "—"}</td><td className="py-2 text-right"><button type="button" onClick={() => { setLocalPreset({ key: `saved:${combo.id}`, label: combo.name, requirements: combo.requirements }); setCurrentRecipe(combo.requirements); setComboName(combo.name); setComboDamage(combo.damage); }} className="text-ctp-blue">Open</button><button type="button" onClick={() => setSavedCombos((current) => current.filter((candidate) => candidate.id !== combo.id))} className="ml-2 text-ctp-red">Remove</button></td></tr>; })}</tbody></table></div>}</Panel>}
      {tab === "analyze" && levelAnalysis && goalId === "level" && <>
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
<span className="shrink-0 font-semibold text-ctp-teal">+{(suggestion.gain * 100).toFixed(1)}%</span>
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
</Panel>}
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
