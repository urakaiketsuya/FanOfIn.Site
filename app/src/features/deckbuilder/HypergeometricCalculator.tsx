import { useEffect, useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { probabilityAtLeast } from "./synergyReadiness";
import { computeDrawEngineTiming, drawEngineSources } from "./drawEffects";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { ForecastChart, ForecastCheckpointSelector, ForecastHeadline } from "../../components/ui/ForecastVisual";
import { cardsSeenForRecipeTarget, expectedCardsSeenForRecipe, probabilityOfRecipe } from "../../lib/comboOdds";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { FUNCTIONAL_ROLE_LABELS, functionalRoleLines, type FunctionalRole } from "./functionalCopies";
import { glimpseAdjustedOdds, glimpseSources } from "./glimpseOdds";
import { matchesComboRequirement, printedKeywords, type ComboRequirementKind } from "../../lib/comboRequirements";

/** Same range Synergy readiness's curves use (`CURVE_MAX_SEEN` in synergyReadiness.ts) — keeps the
 * two probability visualizations on this tab reading consistently. */
const CURVE_MAX_SEEN = 25;

/** Same "cards seen" vocabulary as Synergy readiness's `CHECKPOINTS` — reused here as quick-select
 * presets rather than inventing a second set of labels for the same idea. */
function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const numberInputClass = "mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30";

export interface ComboRecipeRequirement {
  kind: ComboRequirementKind;
  cards: string[];
  value: string;
  required: number;
}

interface RecipeGroup extends ComboRecipeRequirement {
  id: number;
}

interface RecipePickerOption {
  kind: ComboRequirementKind;
  value: string;
  label: string;
  group: "Cards" | "Types and subtypes" | "Keywords";
  copies: number;
}

/**
 * A general-purpose front end onto `probabilityAtLeast` (the same hypergeometric function Synergy
 * readiness/Package balance already use) — for an arbitrary question the viewer types in, not an
 * auto-detected card-effect requirement. Deck size defaults to the real Main Deck total (floored at
 * 60, same convention `computeSynergyReadiness` uses — Material Deck isn't part of the shuffled draw
 * library, so it's excluded), and picking a card from the build autofills copies-in-deck from its
 * real quantity — but every field stays freely editable, so this also works with zero build loaded.
 *
 * Deliberately no "Reliable/Playable/Fragile/Unlikely" status label the way Synergy readiness has —
 * that tiering was calibrated for synergy-specific thresholds and would misleadingly imply a
 * judgment about whatever arbitrary question the viewer is actually asking here.
 */
export default function HypergeometricCalculator({
  mainLines,
  materialLines,
  catalogByName,
  seen: controlledSeen,
  onSeenChange,
  defaultMode = "single",
  initialRecipe,
  onApplyRecipeSuggestion,
  onRecipeChange,
}: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  seen?: number;
  onSeenChange?: (seen: number) => void;
  defaultMode?: "single" | "functional" | "recipe";
  initialRecipe?: ComboRecipeRequirement[];
  onApplyRecipeSuggestion?: (addCard: string, removeCard: string) => void;
  onRecipeChange?: (requirements: ComboRecipeRequirement[]) => void;
}) {
  const mainDeckTotal = useMemo(() => mainLines.reduce((sum, line) => sum + line.quantity, 0), [mainLines]);
  const defaultDeckSize = Math.max(60, mainDeckTotal);

  const [selectedCard, setSelectedCard] = useState("");
  const [deckSize, setDeckSize] = useState(defaultDeckSize);
  const [copies, setCopies] = useState(4);
  const [localSeen, setLocalSeen] = useState(10);
  const seen = controlledSeen ?? localSeen;
  const setSeen = onSeenChange ?? setLocalSeen;
  const [required, setRequired] = useState(1);
  const [mode, setMode] = useState<"single" | "functional" | "recipe">(defaultMode);
  const [functionalRole, setFunctionalRole] = useState<FunctionalRole>("draw");
  const [selectedGlimpseSource, setSelectedGlimpseSource] = useState("");
  const [glimpseActivationCap, setGlimpseActivationCap] = useState(2);
  const [recipeGroups, setRecipeGroups] = useState<RecipeGroup[]>(() => {
    const seed: ComboRecipeRequirement[] = initialRecipe?.length ? initialRecipe : [
      { kind: "cards", cards: [], value: "", required: 1 },
      { kind: "cards", cards: [], value: "", required: 1 },
    ];
    return seed.map((group, index) => ({ ...group, id: index + 1 }));
  });
  const [nextGroupId, setNextGroupId] = useState((initialRecipe?.length ?? 2) + 1);
  const [activeRecipePicker, setActiveRecipePicker] = useState<number | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [pendingRecipeSuggestion, setPendingRecipeSuggestion] = useState<string | null>(null);
  const [recipeCutCard, setRecipeCutCard] = useState("");
  useEffect(() => { onRecipeChange?.(recipeGroups.map(({ kind, cards, value, required }) => ({ kind, cards, value, required }))); }, [recipeGroups, onRecipeChange]);
  const startingHandSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const seenPresets = useMemo(() => [
    { label: `Opening (${startingHandSize})`, seen: startingHandSize },
    { label: "Early (10)", seen: 10 },
    { label: "Mid (15)", seen: 15 },
    { label: "Late (20)", seen: 20 },
  ], [startingHandSize]);
  const attributeOptions = useMemo(() => {
    const values = new Map<string, string>();
    for (const line of mainLines) {
      const card = catalogByName.get(line.name);
      for (const type of card?.types ?? []) values.set(`type:${type}`, `Type · ${type}`);
      for (const subtype of card?.subtypes ?? []) values.set(`subtype:${subtype}`, `Subtype · ${subtype}`);
    }
    return [...values].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [mainLines, catalogByName]);
  const keywordOptions = useMemo(() => Array.from(new Set(mainLines.flatMap((line) => {
    const card = catalogByName.get(line.name);
    return card ? printedKeywords(card) : [];
  }))).sort(), [mainLines, catalogByName]);
  const recipePickerOptions = useMemo<RecipePickerOption[]>(() => [
    ...mainLines.map((line) => ({ kind: "cards" as const, value: line.name, label: line.name, group: "Cards" as const, copies: line.quantity })),
    ...attributeOptions.map((option) => ({ kind: "attribute" as const, value: option.value, label: option.label.replace("Subtype · ", "Any ").replace("Type · ", "Any "), group: "Types and subtypes" as const, copies: mainLines.reduce((sum, line) => { const card = catalogByName.get(line.name); return card && matchesComboRequirement(card, { kind: "attribute", cards: [], value: option.value }) ? sum + line.quantity : sum; }, 0) })),
    ...keywordOptions.map((keyword) => ({ kind: "keyword" as const, value: keyword, label: `Keyword · ${keyword}`, group: "Keywords" as const, copies: mainLines.reduce((sum, line) => { const card = catalogByName.get(line.name); return card && matchesComboRequirement(card, { kind: "keyword", cards: [], value: keyword }) ? sum + line.quantity : sum; }, 0) })),
  ], [mainLines, attributeOptions, keywordOptions, catalogByName]);
  const recipeMatches = useMemo(() => recipeGroups.map((group) => mainLines.filter((line) => {
    const card = catalogByName.get(line.name);
    return card ? matchesComboRequirement(card, group) : false;
  })), [recipeGroups, mainLines, catalogByName]);
  const overlappingRecipeCards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lines of recipeMatches) for (const line of lines) counts.set(line.name, (counts.get(line.name) ?? 0) + 1);
    return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
  }, [recipeMatches]);
  const probabilityGroups = useMemo(() => recipeGroups.map((group, index) => ({
    copies: recipeMatches[index].reduce((sum, line) => sum + line.quantity, 0),
    required: group.required,
  })), [recipeGroups, recipeMatches]);
  const recipeReady = probabilityGroups.length >= 2 && overlappingRecipeCards.length === 0 && probabilityGroups.every((group) => group.copies >= group.required);
  const recipeLabel = recipeGroups.map((group) => group.kind === "cards" ? (group.cards.length > 1 ? `cards (${group.cards.join(" / ")})` : group.cards[0] || "choose cards") : group.value.split(":").at(-1) || `choose ${group.kind}`).join(" + ");
  const functionalLines = useMemo(() => functionalRoleLines(mainLines, catalogByName, functionalRole), [mainLines, catalogByName, functionalRole]);
  const functionalCopies = functionalLines.reduce((sum, line) => sum + line.quantity, 0);
  const detectedGlimpseSources = useMemo(() => glimpseSources(mainLines, catalogByName), [mainLines, catalogByName]);
  const activeGlimpseSource = detectedGlimpseSources.find((source) => source.name === selectedGlimpseSource) ?? detectedGlimpseSources[0];

  function handleSelectCard(name: string) {
    setSelectedCard(name);
    if (!name) return;
    const line = mainLines.find((l) => l.name === name);
    if (!line) return;
    setDeckSize(defaultDeckSize);
    setCopies(line.quantity);
  }

  function addRecipeSelection(groupId: number, option: RecipePickerOption) {
    setRecipeGroups((groups) => groups.map((group) => {
      if (group.id !== groupId) return group;
      if (option.kind === "cards") {
        const cards = group.kind === "cards" ? group.cards : [];
        return { ...group, kind: "cards", value: "", cards: cards.includes(option.value) ? cards : [...cards, option.value] };
      }
      return { ...group, kind: option.kind, value: option.value, cards: [] };
    }));
    setRecipeSearch("");
    if (option.kind !== "cards") setActiveRecipePicker(null);
  }

  function removeRecipeSelection(groupId: number, value: string) {
    setRecipeGroups((groups) => groups.map((group) => group.id !== groupId ? group : group.kind === "cards"
      ? { ...group, cards: group.cards.filter((name) => name !== value) }
      : { ...group, value: "" }));
  }

  const probability = mode === "recipe"
    ? probabilityOfRecipe(deckSize, probabilityGroups, seen)
    : probabilityAtLeast(deckSize, mode === "functional" ? functionalCopies : copies, seen, mode === "functional" ? 1 : required);
  const curve = useMemo(
    () => Array.from({ length: Math.min(deckSize, CURVE_MAX_SEEN) }, (_, i) => mode === "recipe" ? probabilityOfRecipe(deckSize, probabilityGroups, i + 1) : probabilityAtLeast(deckSize, mode === "functional" ? functionalCopies : copies, i + 1, mode === "functional" ? 1 : required)),
    [deckSize, copies, required, mode, probabilityGroups, functionalCopies],
  );
  const openingSeen = Math.min(startingHandSize, deckSize);
  const openingProbability = mode === "recipe" ? probabilityOfRecipe(deckSize, probabilityGroups, openingSeen) : probabilityAtLeast(deckSize, mode === "functional" ? functionalCopies : copies, openingSeen, mode === "functional" ? 1 : required);
  const functionalFiftySeen = mode === "functional" && functionalCopies > 0 ? cardsSeenForRecipeTarget(deckSize, [{ copies: functionalCopies, required: 1 }], 0.5) : null;
  const functionalEightySeen = mode === "functional" && functionalCopies > 0 ? cardsSeenForRecipeTarget(deckSize, [{ copies: functionalCopies, required: 1 }], 0.8) : null;
  const fiftySeen = mode === "recipe" && recipeReady ? cardsSeenForRecipeTarget(deckSize, probabilityGroups, 0.5) : null;
  const eightySeen = mode === "recipe" && recipeReady ? cardsSeenForRecipeTarget(deckSize, probabilityGroups, 0.8) : null;
  const expectedRecipeSeen = mode === "recipe" && recipeReady ? expectedCardsSeenForRecipe(deckSize, probabilityGroups) : null;
  const expectedRecipeTurn = expectedRecipeSeen === null ? null : Math.max(1, Math.ceil(expectedRecipeSeen - startingHandSize + 1));
  const weakestGroupIndex = probabilityGroups.reduce((weakest, group, index, groups) => group.copies < groups[weakest].copies ? index : weakest, 0);
  const recipeCopySuggestions = mode === "recipe" && recipeReady && probabilityGroups.reduce((sum, group) => sum + group.copies, 0) < deckSize
    ? recipeMatches.flatMap((lines, groupIndex) => lines.filter((line) => line.quantity < 4).map((line) => {
      const adjustedGroups = probabilityGroups.map((group, index) => index === groupIndex ? { ...group, copies: group.copies + 1 } : group);
      return { cardName: line.name, currentCopies: line.quantity, gain: probabilityOfRecipe(deckSize, adjustedGroups, seen) - probability };
    })).filter((suggestion) => suggestion.gain > 0).sort((a, b) => b.gain - a.gain || a.currentCopies - b.currentCopies || a.cardName.localeCompare(b.cardName))
    : [];
  const glimpseTargetCopies = mode === "single" ? copies : mode === "functional" ? functionalCopies : probabilityGroups[weakestGroupIndex]?.copies ?? 0;
  const glimpseTargetNames = mode === "single" ? [selectedCard].filter(Boolean) : mode === "functional" ? functionalLines.map((line) => line.name) : recipeMatches[weakestGroupIndex]?.map((line) => line.name) ?? [];
  const glimpseOdds = activeGlimpseSource ? glimpseAdjustedOdds(deckSize, glimpseTargetCopies, activeGlimpseSource.copies, seen, activeGlimpseSource.glimpse, glimpseTargetNames.includes(activeGlimpseSource.name), glimpseActivationCap) : null;

  const fragmentedSpiritName = useMemo(() => materialLines.find((line) => { const card = catalogByName.get(line.name); return card?.level === 0 && /\bGlimpse\s+6\b/i.test(card.effect ?? "") && /\bDraw\s+(?:six|6)\s+cards\b/i.test(card.effect ?? ""); })?.name ?? null, [materialLines, catalogByName]);
  const fragmentedSpiritSelection = fragmentedSpiritName ? 6 : 0;
  const drawSources = useMemo(() => drawEngineSources(mainLines, materialLines, catalogByName).filter((source) => source.name !== fragmentedSpiritName), [mainLines, materialLines, catalogByName, fragmentedSpiritName]);
  const drawTiming = useMemo(() => computeDrawEngineTiming(drawSources, deckSize, seen, startingHandSize), [drawSources, deckSize, seen, startingHandSize]);
  const hasDrawEngine = drawSources.length > 0;
  const seenWithDraw = useMemo(
    () => Math.min(deckSize, Math.round(seen + drawTiming.expectedActiveDraws + fragmentedSpiritSelection)),
    [deckSize, seen, drawTiming.expectedActiveDraws, fragmentedSpiritSelection],
  );
  const probabilityWithDraw = mode === "recipe" ? probabilityOfRecipe(deckSize, probabilityGroups, seenWithDraw) : probabilityAtLeast(deckSize, mode === "functional" ? functionalCopies : copies, seenWithDraw, mode === "functional" ? 1 : required);
  const curveWithDraw = useMemo(
    () =>
      Array.from({ length: Math.min(deckSize, CURVE_MAX_SEEN) }, (_, i) => {
        const baseSeen = i + 1;
        const timing = computeDrawEngineTiming(drawSources, deckSize, baseSeen, startingHandSize);
        const adjustedSeen = Math.min(deckSize, Math.round(baseSeen + timing.expectedActiveDraws));
        return mode === "recipe" ? probabilityOfRecipe(deckSize, probabilityGroups, adjustedSeen) : probabilityAtLeast(deckSize, mode === "functional" ? functionalCopies : copies, adjustedSeen, mode === "functional" ? 1 : required);
      }),
    [drawSources, deckSize, copies, required, startingHandSize, mode, probabilityGroups, functionalCopies],
  );

  return (
    <Panel data-component="HypergeometricCalculator" className="mt-4 shadow-sm">
      <Section
        heading="dense"
        title="Hypergeometric calculator"
        description={<>See combo access by checkpoint.</>}
      >
      <div className="mt-3 rounded-xl bg-ctp-surface0/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Parameters</p>
      <div className="mt-2 inline-flex flex-wrap rounded-md border border-ctp-surface1 bg-ctp-mantle p-0.5" role="group" aria-label="Probability question"><button type="button" aria-pressed={mode === "single"} onClick={() => setMode("single")} className={`rounded px-2.5 py-1 text-xs ${mode === "single" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Single card</button><button type="button" aria-pressed={mode === "functional"} onClick={() => setMode("functional")} className={`rounded px-2.5 py-1 text-xs ${mode === "functional" ? "bg-ctp-teal text-ctp-base" : "text-ctp-subtext1"}`}>Functional copies</button><button type="button" aria-pressed={mode === "recipe"} onClick={() => setMode("recipe")} className={`rounded px-2.5 py-1 text-xs ${mode === "recipe" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext1"}`}>Probability recipe</button></div>
      {mode === "single" && mainLines.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Card in build:</span>
          <select
            value={selectedCard}
            onChange={(e) => handleSelectCard(e.target.value)}
            className="min-h-10 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-xs text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30"
          >
            <option value="">Custom…</option>
            {mainLines.map((line) => (
              <option key={line.name} value={line.name}>
                {line.name} ({line.quantity})
              </option>
            ))}
          </select>
          <span className="text-[10px] text-ctp-subtext0">Fills in deck size and copies below — still editable after.</span>
        </div>
      )}

      {mode === "functional" && <div className="mt-3"><label className="text-xs text-ctp-subtext0">Role<select value={functionalRole} onChange={(event) => setFunctionalRole(event.target.value as FunctionalRole)} className="mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text">{(Object.keys(FUNCTIONAL_ROLE_LABELS) as FunctionalRole[]).map((role) => <option key={role} value={role}>{FUNCTIONAL_ROLE_LABELS[role]}</option>)}</select></label><div className="mt-2 flex flex-wrap gap-1.5">{functionalLines.length > 0 ? functionalLines.map((line) => <span key={line.name} className="rounded-full border border-ctp-teal/40 bg-ctp-teal/10 px-2 py-1 text-[10px] text-ctp-text">{line.name} · {line.quantity}</span>) : <span className="text-xs text-ctp-subtext0">No cards with this role.</span>}</div></div>}

      {mode === "recipe" && mainLines.length > 0 && <div className="mt-4 rounded-xl border border-ctp-mauve/30 bg-ctp-base/45 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-mauve">By this checkpoint, I want to see…</p><p className="mt-1 text-xs text-ctp-subtext0">Selections in one row are alternatives. Every row must be satisfied.</p></div><ForecastCheckpointSelector checkpoints={seenPresets} selected={seen} onSelect={(value) => setSeen(Math.min(value, deckSize))} /></div>
        <div className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ctp-subtext0">All of</div>
        <div className="mt-2 space-y-3">
        {recipeGroups.map((group, groupIndex) => {
          const matches = recipeMatches[groupIndex];
          const selectedLabels = group.kind === "cards" ? group.cards.map((name) => ({ value: name, label: name })) : group.value ? [{ value: group.value, label: recipePickerOptions.find((option) => option.kind === group.kind && option.value === group.value)?.label ?? group.value }] : [];
          const filteredOptions = recipePickerOptions.filter((option) => option.label.toLowerCase().includes(recipeSearch.trim().toLowerCase()) && !(group.kind === "cards" && option.kind === "cards" && group.cards.includes(option.value)));
          return <div key={group.id} className="relative rounded-xl border border-ctp-surface1 bg-ctp-mantle/65 p-3">
            {groupIndex > 0 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-ctp-surface1 bg-ctp-base px-2 py-0.5 text-[9px] font-bold uppercase text-ctp-subtext0">And</span>}
            <div className="flex flex-wrap items-start gap-3"><label className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-ctp-subtext0">Need at least<input aria-label={`Copies needed for requirement ${groupIndex + 1}`} type="number" min={1} max={Math.max(1, probabilityGroups[groupIndex]?.copies ?? deckSize)} value={group.required} onChange={(event) => setRecipeGroups((groups) => groups.map((candidate) => candidate.id === group.id ? { ...candidate, required: clampInt(Number(event.target.value), 1, deckSize) } : candidate))} className={numberInputClass} /></label><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5">{selectedLabels.map((selection, index) => <span key={selection.value} className="inline-flex items-center gap-1 rounded-full border border-ctp-mauve/40 bg-ctp-mauve/10 px-2.5 py-1 text-xs text-ctp-text">{index > 0 && <span className="text-[9px] font-bold text-ctp-subtext0">OR</span>}{selection.label}<button type="button" aria-label={`Remove ${selection.label}`} onClick={() => removeRecipeSelection(group.id, selection.value)} className="ml-0.5 text-ctp-subtext0 hover:text-ctp-red">×</button></span>)}<button type="button" onClick={() => { setActiveRecipePicker(activeRecipePicker === group.id ? null : group.id); setRecipeSearch(""); }} className="rounded-full border border-dashed border-ctp-blue/70 px-2.5 py-1 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">+ {selectedLabels.length ? "alternative" : "card or category"}</button></div>
              {activeRecipePicker === group.id && <div className="absolute z-20 mt-2 w-[min(34rem,calc(100%-1.5rem))] rounded-xl border border-ctp-surface1 bg-ctp-base p-2 shadow-xl"><input autoFocus type="search" value={recipeSearch} onChange={(event) => setRecipeSearch(event.target.value)} placeholder="Search cards, Fractal, Ally, Reservable…" className="block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none" /><div className="mt-2 max-h-64 overflow-y-auto">{filteredOptions.length ? (["Types and subtypes", "Keywords", "Cards"] as const).map((optionGroup) => { const options = filteredOptions.filter((option) => option.group === optionGroup).slice(0, optionGroup === "Cards" ? 30 : 15); return options.length ? <div key={optionGroup}><p className="px-2 pb-1 pt-2 text-[9px] font-bold uppercase tracking-wide text-ctp-subtext0">{optionGroup}</p>{options.map((option) => <button key={`${option.kind}:${option.value}`} type="button" onClick={() => addRecipeSelection(group.id, option)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-ctp-text hover:bg-ctp-surface0"><span>{option.label}</span><span className="text-[10px] text-ctp-subtext0">{option.copies} {option.copies === 1 ? "copy" : "copies"}</span></button>)}</div> : null; }) : <p className="px-2 py-4 text-center text-xs text-ctp-subtext0">No matches in this Main Deck.</p>}</div><button type="button" onClick={() => setActiveRecipePicker(null)} className="mt-2 w-full rounded-md border border-ctp-surface1 py-1.5 text-xs text-ctp-subtext1">Done</button></div>}
              <p className={`mt-2 text-[10px] ${matches.length ? "text-ctp-subtext0" : "text-ctp-yellow"}`}>{matches.length ? `${probabilityGroups[groupIndex].copies} matching copies across ${matches.length} card${matches.length === 1 ? "" : "s"} in this deck` : "Choose a card or category from this deck."}</p></div>{recipeGroups.length > 2 && <button type="button" onClick={() => setRecipeGroups((groups) => groups.filter((candidate) => candidate.id !== group.id))} className="text-[10px] text-ctp-subtext0 hover:text-ctp-red">Remove</button>}</div>
          </div>;
        })}
        </div>
        <button type="button" disabled={recipeGroups.length >= 6} onClick={() => { setRecipeGroups((groups) => [...groups, { id: nextGroupId, kind: "cards", cards: [], value: "", required: 1 }]); setNextGroupId((id) => id + 1); }} className="mt-3 rounded-md border border-ctp-mauve/50 px-3 py-1.5 text-xs font-semibold text-ctp-mauve disabled:opacity-40">+ Add another requirement</button>
        {overlappingRecipeCards.length > 0 && <p className="text-xs text-ctp-yellow">Requirements overlap on {overlappingRecipeCards.slice(0, 3).join(", ")}{overlappingRecipeCards.length > 3 ? "…" : ""}. Make groups disjoint for exact odds.</p>}
      </div>}

      <div className={`${mode === "recipe" ? "mt-3 rounded-lg border border-ctp-surface1 px-3 py-2" : "mt-3"}`}>
      {mode === "recipe" && <p className="text-xs font-medium text-ctp-subtext1">Advanced assumptions</p>}
      <div className={`${mode === "recipe" ? "mt-2" : ""} grid grid-cols-2 gap-3 ${mode === "single" ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        <label className="text-xs text-ctp-subtext0">
          Deck size
          <input
            type="number"
            min={1}
            max={200}
            value={deckSize}
            onChange={(e) => setDeckSize(clampInt(Number(e.target.value), 1, 200))}
            className={numberInputClass}
          />
        </label>
        {mode === "single" && <label className="text-xs text-ctp-subtext0">
          Copies in deck
          <input
            type="number"
            min={0}
            max={deckSize}
            value={copies}
            onChange={(e) => setCopies(clampInt(Number(e.target.value), 0, deckSize))}
            className={numberInputClass}
          />
        </label>}
        <label className="text-xs text-ctp-subtext0">
          Cards seen
          <input
            type="number"
            min={0}
            max={deckSize}
            value={seen}
            onChange={(e) => setSeen(clampInt(Number(e.target.value), 0, deckSize))}
            className={numberInputClass}
          />
        </label>
        {mode === "single" && <label className="text-xs text-ctp-subtext0">
          At least
          <input
            type="number"
            min={1}
            max={deckSize}
            value={required}
            onChange={(e) => setRequired(clampInt(Number(e.target.value), 1, deckSize))}
            className={numberInputClass}
          />
        </label>}
      </div>
      </div>
      </div>

      {mode !== "recipe" && <div className="mt-3"><ForecastCheckpointSelector checkpoints={seenPresets} selected={seen} onSelect={(value) => setSeen(Math.min(value, deckSize))} /></div>}

      <div className="mt-4"><ForecastHeadline label={mode === "recipe" ? `Chance of ${recipeLabel}` : mode === "functional" ? `Chance of finding ${FUNCTIONAL_ROLE_LABELS[functionalRole].toLowerCase()}` : `Chance of seeing at least ${required} ${required === 1 ? "copy" : "copies"}`} value={`${(probability * 100).toFixed(1)}%`} detail={mode === "recipe" ? `${probabilityGroups.map((group) => `${group.required} of ${group.copies}`).join(" + ")} copies` : mode === "functional" ? `${functionalCopies} functional copies across ${functionalLines.length} cards` : undefined} /></div>

      {mode === "functional" && functionalCopies > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Opening hand</div><div className="font-semibold tabular-nums text-ctp-text">{(openingProbability * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">50% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{functionalFiftySeen ? `${functionalFiftySeen} seen` : "Not reached"}</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">80% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{functionalEightySeen ? `${functionalEightySeen} seen` : "Not reached"}</div></div></div>}

      {mode === "recipe" && recipeReady && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Opening hand</div><div className="font-semibold tabular-nums text-ctp-text">{(openingProbability * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Average complete</div><div className="font-semibold tabular-nums text-ctp-text">{expectedRecipeSeen === null ? "—" : `${expectedRecipeSeen.toFixed(1)} seen · ~T${expectedRecipeTurn}`}</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">50% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{fiftySeen ? `${fiftySeen} seen` : "Not reached"}</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">80% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{eightySeen ? `${eightySeen} seen` : "Not reached"}</div></div></div>}
      {recipeCopySuggestions.length > 0 && <div className="mt-3 rounded-xl border border-ctp-teal/30 bg-ctp-teal/5 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-teal">Copies that improve this recipe</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{recipeCopySuggestions.slice(0, 4).map((suggestion) => { const isPending = pendingRecipeSuggestion === suggestion.cardName; return <div key={suggestion.cardName} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 px-3 py-2 text-xs"><div className="flex items-center justify-between gap-3"><span className="text-ctp-text">Add 1× {suggestion.cardName} <span className="text-ctp-subtext0">({suggestion.currentCopies} → {suggestion.currentCopies + 1})</span></span><span className="shrink-0 font-semibold tabular-nums text-ctp-teal">+{(suggestion.gain * 100).toFixed(1)} pts</span></div>{onApplyRecipeSuggestion && (isPending ? <div className="mt-2"><label className="text-[10px] text-ctp-subtext0">Replace<select value={recipeCutCard} onChange={(event) => setRecipeCutCard(event.target.value)} className="mt-1 block min-h-9 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text"><option value="">Choose a Main Deck card…</option>{mainLines.filter((line) => line.name !== suggestion.cardName).map((line) => <option key={line.name} value={line.name}>{line.quantity}× {line.name}</option>)}</select></label><div className="mt-2 flex gap-2"><button type="button" disabled={!recipeCutCard} onClick={() => { onApplyRecipeSuggestion(suggestion.cardName, recipeCutCard); setPendingRecipeSuggestion(null); setRecipeCutCard(""); }} className="rounded-md bg-ctp-blue px-2.5 py-1.5 font-semibold text-ctp-base disabled:cursor-not-allowed disabled:opacity-50">Apply and recalculate</button><button type="button" onClick={() => { setPendingRecipeSuggestion(null); setRecipeCutCard(""); }} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-ctp-subtext1">Cancel</button></div></div> : <button type="button" onClick={() => { setPendingRecipeSuggestion(suggestion.cardName); setRecipeCutCard(""); }} className="mt-2 rounded-md border border-ctp-blue/60 px-2.5 py-1.5 font-semibold text-ctp-blue hover:bg-ctp-blue/10">Review change</button>)}</div>; })}</div><p className="mt-2 text-[10px] text-ctp-subtext0">Assumes one unrelated Main Deck card is replaced, keeping deck size fixed. Only recipe cards currently below four copies are considered.</p></div>}

      {activeGlimpseSource && glimpseOdds && glimpseTargetCopies > 0 && (
        <div className="mt-4 rounded-xl border border-ctp-mauve/35 bg-ctp-mauve/5 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-mauve">Selection-adjusted odds</p><div className="flex flex-wrap gap-2"><label className="text-[10px] text-ctp-subtext0">Glimpse source<select value={activeGlimpseSource.name} onChange={(event) => setSelectedGlimpseSource(event.target.value)} className="mt-1 block min-h-9 max-w-64 rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">{detectedGlimpseSources.map((source) => <option key={source.name} value={source.name}>{source.name} · Glimpse {source.glimpse}</option>)}</select></label>{activeGlimpseSource.copies > 1 && <label className="text-[10px] text-ctp-subtext0">Max activations<select value={Math.min(glimpseActivationCap, activeGlimpseSource.copies)} onChange={(event) => setGlimpseActivationCap(Number(event.target.value))} className="mt-1 block min-h-9 rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">{Array.from({ length: activeGlimpseSource.copies }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}</select></label>}</div></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">In hand now</div><div className="font-semibold tabular-nums text-ctp-text">{(glimpseOdds.natural * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Glimpse finds</div><div className="font-semibold tabular-nums text-ctp-text">{(glimpseOdds.revealHit * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Setup gain</div><div className="font-semibold tabular-nums text-ctp-teal">+{(glimpseOdds.setup * 100).toFixed(1)} pts</div></div><div className="rounded-lg border border-ctp-mauve/40 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">By next draw</div><div className="font-semibold tabular-nums text-ctp-mauve">{(glimpseOdds.combined * 100).toFixed(1)}%</div></div></div>
        </div>
      )}

      {curve.length >= 2 && (
        <div className="mt-2">
          <ForecastChart values={curve} height={36} selectedIndex={Math.min(seen, curve.length) - 1} />
          <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
            <span>1 seen: {(curve[0] * 100).toFixed(0)}%</span>
            <span>{curve.length} seen: {(curve[curve.length - 1] * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {hasDrawEngine && !(mode === "functional" && functionalRole === "draw") && (
        <div className="mt-4 border-t border-ctp-surface1 pt-3">
          <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Engine online by T{drawTiming.turn}</div><div className="font-semibold tabular-nums text-ctp-text">{(drawTiming.onlineByTurn * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Expected active draws</div><div className="font-semibold tabular-nums text-ctp-teal">+{drawTiming.expectedActiveDraws.toFixed(1)}</div></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Printed potential</div><div className="font-semibold tabular-nums text-ctp-subtext1">{drawTiming.printedPotential.toFixed(0)}</div></div></div>
          <div className="mt-3"><ForecastHeadline label={`Timing-adjusted draw · ${seenWithDraw} cards seen`} value={`${(probabilityWithDraw * 100).toFixed(1)}%`} /></div>
          {curveWithDraw.length >= 2 && (
            <div className="mt-2">
              <ForecastChart values={curveWithDraw} height={36} selectedIndex={Math.min(seenWithDraw, curveWithDraw.length) - 1} />
              <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                <span>1 seen: {(curveWithDraw[0] * 100).toFixed(0)}%</span>
                <span>{curveWithDraw.length} seen: {(curveWithDraw[curveWithDraw.length - 1] * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
          <details className="mt-2 rounded-lg border border-ctp-surface1 bg-ctp-base/25 px-3 py-2"><summary className="cursor-pointer text-xs font-medium text-ctp-subtext1">Draw source breakdown</summary><div className="mt-2 space-y-1.5">{drawTiming.sources.map((source) => <div key={`${source.section}:${source.name}`} className="flex flex-wrap items-center justify-between gap-2 text-[11px]"><span className="text-ctp-text">{source.quantity}× {source.name}{source.conditional ? <span className="ml-1 text-ctp-yellow">conditional</span> : null}</span><span className="tabular-nums text-ctp-subtext0">{source.section === "material" ? "Material" : `${(source.onlineByTurn * 100).toFixed(0)}% found`} · ready T{source.firstAffordableTurn} · +{source.expectedActiveDraws.toFixed(1)}</span></div>)}</div></details>
        </div>
      )}
      </Section>
    </Panel>
  );
}
