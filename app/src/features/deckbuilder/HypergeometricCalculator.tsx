import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { probabilityAtLeast } from "./synergyReadiness";
import { drawnCardsPerCopy, expectedExtraDraws, materialDrawBonus } from "./drawEffects";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { ForecastChart, ForecastCheckpointSelector, ForecastHeadline } from "../../components/ui/ForecastVisual";
import { cardsSeenForRecipeTarget, expectedCardsSeenForRecipe, probabilityOfRecipe } from "../../lib/comboOdds";
import { inferStartingHandSize } from "../../lib/turnToPlay";
import { FUNCTIONAL_ROLE_LABELS, functionalRoleLines, type FunctionalRole } from "./functionalCopies";
import { glimpseAdjustedOdds, glimpseSources } from "./glimpseOdds";

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

interface RecipeGroup {
  id: number;
  cards: string[];
  required: number;
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
}: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
  seen?: number;
  onSeenChange?: (seen: number) => void;
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
  const [mode, setMode] = useState<"single" | "functional" | "recipe">("single");
  const [functionalRole, setFunctionalRole] = useState<FunctionalRole>("draw");
  const [selectedGlimpseSource, setSelectedGlimpseSource] = useState("");
  const [recipeGroups, setRecipeGroups] = useState<RecipeGroup[]>([{ id: 1, cards: [], required: 1 }, { id: 2, cards: [], required: 1 }]);
  const [nextGroupId, setNextGroupId] = useState(3);
  const copiesByName = useMemo(() => new Map(mainLines.map((line) => [line.name, line.quantity])), [mainLines]);
  const startingHandSize = useMemo(() => inferStartingHandSize(materialLines, catalogByName), [materialLines, catalogByName]);
  const seenPresets = useMemo(() => [
    { label: `Opening (${startingHandSize})`, seen: startingHandSize },
    { label: "Early (10)", seen: 10 },
    { label: "Mid (15)", seen: 15 },
    { label: "Late (20)", seen: 20 },
  ], [startingHandSize]);
  const probabilityGroups = useMemo(() => recipeGroups.map((group) => ({
    copies: group.cards.reduce((sum, name) => sum + (copiesByName.get(name) ?? 0), 0),
    required: group.required,
  })), [recipeGroups, copiesByName]);
  const recipeReady = probabilityGroups.length >= 2 && probabilityGroups.every((group) => group.copies >= group.required);
  const recipeLabel = recipeGroups.map((group) => group.cards.length > 1 ? `one of (${group.cards.join(" / ")})` : group.cards[0] || "choose cards").join(" + ");
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
  const plusOneGroups = probabilityGroups.map((group, index) => index === weakestGroupIndex ? { ...group, copies: group.copies + 1 } : group);
  const plusOneProbability = mode === "recipe" && recipeReady && probabilityGroups.reduce((sum, group) => sum + group.copies, 0) < deckSize ? probabilityOfRecipe(deckSize, plusOneGroups, seen) : null;
  const glimpseTargetCopies = mode === "single" ? copies : mode === "functional" ? functionalCopies : probabilityGroups[weakestGroupIndex]?.copies ?? 0;
  const glimpseTargetNames = mode === "single" ? [selectedCard].filter(Boolean) : mode === "functional" ? functionalLines.map((line) => line.name) : recipeGroups[weakestGroupIndex]?.cards ?? [];
  const glimpseOdds = activeGlimpseSource ? glimpseAdjustedOdds(deckSize, glimpseTargetCopies, activeGlimpseSource.copies, seen, activeGlimpseSource.glimpse, glimpseTargetNames.includes(activeGlimpseSource.name)) : null;

  /** Main Deck cards whose own effect text draws cards — the source of the "with card draw"
   * estimate below. Nothing excludes the target card itself: if it also draws cards, a copy of it
   * being drawn genuinely does help you see more of the deck, same as any other draw-effect card. */
  const drawEffectLines = useMemo(
    () =>
      mainLines
        .map((line) => ({ quantity: line.quantity, perCopy: catalogByName.get(line.name) ? drawnCardsPerCopy(catalogByName.get(line.name)!) : 0 }))
        .filter((line) => line.perCopy > 0),
    [mainLines, catalogByName],
  );
  /** Material Deck cards whose own effect text draws cards. Unlike `drawEffectLines`, these
   * contribute a flat bonus rather than one scaled by `seen` — see `materialDrawBonus`'s note on
   * why the Material Deck isn't subject to draw-probability the way the Main Deck is. */
  const materialDrawEffectLines = useMemo(
    () =>
      materialLines
        .map((line) => ({ quantity: line.quantity, perCopy: catalogByName.get(line.name) ? drawnCardsPerCopy(catalogByName.get(line.name)!) : 0 }))
        .filter((line) => line.perCopy > 0),
    [materialLines, catalogByName],
  );
  const materialBonus = useMemo(() => materialDrawBonus(materialDrawEffectLines), [materialDrawEffectLines]);
  const hasDrawEngine = drawEffectLines.length > 0 || materialDrawEffectLines.length > 0;
  const seenWithDraw = useMemo(
    () => Math.min(deckSize, Math.round(seen + expectedExtraDraws(drawEffectLines, deckSize, seen) + materialBonus)),
    [drawEffectLines, deckSize, seen, materialBonus],
  );
  const probabilityWithDraw = mode === "recipe" ? probabilityOfRecipe(deckSize, probabilityGroups, seenWithDraw) : probabilityAtLeast(deckSize, mode === "functional" ? functionalCopies : copies, seenWithDraw, mode === "functional" ? 1 : required);
  const curveWithDraw = useMemo(
    () =>
      Array.from({ length: Math.min(deckSize, CURVE_MAX_SEEN) }, (_, i) => {
        const baseSeen = i + 1;
        const adjustedSeen = Math.min(deckSize, Math.round(baseSeen + expectedExtraDraws(drawEffectLines, deckSize, baseSeen) + materialBonus));
        return mode === "recipe" ? probabilityOfRecipe(deckSize, probabilityGroups, adjustedSeen) : probabilityAtLeast(deckSize, mode === "functional" ? functionalCopies : copies, adjustedSeen, mode === "functional" ? 1 : required);
      }),
    [drawEffectLines, deckSize, copies, required, materialBonus, mode, probabilityGroups, functionalCopies],
  );

  return (
    <Panel data-component="HypergeometricCalculator" className="mt-4 shadow-sm">
      <Section
        heading="dense"
        title="Hypergeometric calculator"
        description={<>See how likely any card will see play.</>}
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

      {mode === "functional" && <div className="mt-3"><label className="text-xs text-ctp-subtext0">Role<select value={functionalRole} onChange={(event) => setFunctionalRole(event.target.value as FunctionalRole)} className="mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text">{(Object.keys(FUNCTIONAL_ROLE_LABELS) as FunctionalRole[]).map((role) => <option key={role} value={role}>{FUNCTIONAL_ROLE_LABELS[role]}</option>)}</select></label><div className="mt-2 flex flex-wrap gap-1.5">{functionalLines.length > 0 ? functionalLines.map((line) => <span key={line.name} className="rounded-full border border-ctp-teal/40 bg-ctp-teal/10 px-2 py-1 text-[10px] text-ctp-text">{line.name} · {line.quantity}</span>) : <span className="text-xs text-ctp-subtext0">No cards with this detected role.</span>}</div><p className="mt-2 text-[10px] text-ctp-subtext0">Detected conservatively from printed rules text. These are alternatives for finding the role, not claims that the cards are strategically identical.</p></div>}

      {mode === "recipe" && mainLines.length > 0 && <div className="mt-3 space-y-2">{recipeGroups.map((group, groupIndex) => { const usedElsewhere = new Set(recipeGroups.filter((candidate) => candidate.id !== group.id).flatMap((candidate) => candidate.cards)); return <div key={group.id} className="rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-ctp-mauve">Requirement {groupIndex + 1}{groupIndex > 0 ? " · AND" : ""}</span>{recipeGroups.length > 2 && <button type="button" onClick={() => setRecipeGroups((groups) => groups.filter((candidate) => candidate.id !== group.id))} className="text-[10px] text-ctp-subtext0 hover:text-ctp-red">Remove</button>}</div><div className="mt-2 grid gap-2 sm:grid-cols-[1fr_7rem]"><label className="text-xs text-ctp-subtext0">One of these cards<select multiple size={3} value={group.cards} onChange={(event) => setRecipeGroups((groups) => groups.map((candidate) => candidate.id === group.id ? { ...candidate, cards: Array.from(event.target.selectedOptions, (option) => option.value) } : candidate))} className="mt-1 block w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-1.5 text-xs text-ctp-text">{mainLines.filter((line) => !usedElsewhere.has(line.name)).map((line) => <option key={line.name} value={line.name}>{line.name} ({line.quantity})</option>)}</select></label><label className="text-xs text-ctp-subtext0">Need at least<input type="number" min={1} max={Math.max(1, group.cards.reduce((sum, name) => sum + (copiesByName.get(name) ?? 0), 0))} value={group.required} onChange={(event) => setRecipeGroups((groups) => groups.map((candidate) => candidate.id === group.id ? { ...candidate, required: clampInt(Number(event.target.value), 1, deckSize) } : candidate))} className={numberInputClass} /></label></div></div>; })}<button type="button" disabled={recipeGroups.length >= 4} onClick={() => { setRecipeGroups((groups) => [...groups, { id: nextGroupId, cards: [], required: 1 }]); setNextGroupId((id) => id + 1); }} className="rounded-md border border-ctp-mauve/50 px-2.5 py-1 text-xs text-ctp-mauve disabled:opacity-40">+ AND requirement</button><p className="text-[10px] text-ctp-subtext0">Cards within a requirement are OR alternatives. Every requirement must be satisfied.</p></div>}

      <div className={`mt-3 grid grid-cols-2 gap-3 ${mode === "single" ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
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

      <div className="mt-3"><ForecastCheckpointSelector checkpoints={seenPresets} selected={seen} onSelect={(value) => setSeen(Math.min(value, deckSize))} /></div>

      <div className="mt-4"><ForecastHeadline label={mode === "recipe" ? `Chance of ${recipeLabel}` : mode === "functional" ? `Chance of finding ${FUNCTIONAL_ROLE_LABELS[functionalRole].toLowerCase()}` : `Chance of seeing at least ${required} ${required === 1 ? "copy" : "copies"}`} value={`${(probability * 100).toFixed(1)}%`} detail={mode === "recipe" ? `${probabilityGroups.map((group) => `${group.required} of ${group.copies}`).join(" + ")} copies` : mode === "functional" ? `${functionalCopies} functional copies across ${functionalLines.length} cards` : undefined} /></div>

      {mode === "functional" && functionalCopies > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Opening hand</div><div className="font-semibold tabular-nums text-ctp-text">{(openingProbability * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">50% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{functionalFiftySeen ? `${functionalFiftySeen} seen` : "Not reached"}</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">80% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{functionalEightySeen ? `${functionalEightySeen} seen` : "Not reached"}</div></div></div>}

      {mode === "recipe" && recipeReady && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Opening hand</div><div className="font-semibold tabular-nums text-ctp-text">{(openingProbability * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Average complete</div><div className="font-semibold tabular-nums text-ctp-text">{expectedRecipeSeen === null ? "—" : `${expectedRecipeSeen.toFixed(1)} seen · ~T${expectedRecipeTurn}`}</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">50% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{fiftySeen ? `${fiftySeen} seen` : "Not reached"}</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">80% consistency</div><div className="font-semibold tabular-nums text-ctp-text">{eightySeen ? `${eightySeen} seen` : "Not reached"}</div></div><div className="rounded-lg border border-ctp-surface1 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">+1 weakest-group copy</div><div className="font-semibold tabular-nums text-ctp-teal">{plusOneProbability === null ? "—" : `+${((plusOneProbability - probability) * 100).toFixed(1)} pts`}</div></div></div>}
      {mode === "recipe" && <p className="mt-2 text-[10px] text-ctp-subtext0">Grand Archive has no general mulligan; opening odds use the starting cards seen directly.</p>}

      {activeGlimpseSource && glimpseOdds && glimpseTargetCopies > 0 && (
        <div className="mt-4 rounded-xl border border-ctp-mauve/35 bg-ctp-mauve/5 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-mauve">Selection-adjusted odds</p><p className="mt-1 text-xs text-ctp-subtext1">Natural access plus a Glimpse card positioned for your next draw.</p></div><label className="text-[10px] text-ctp-subtext0">Glimpse source<select value={activeGlimpseSource.name} onChange={(event) => setSelectedGlimpseSource(event.target.value)} className="mt-1 block min-h-9 max-w-64 rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">{detectedGlimpseSources.map((source) => <option key={source.name} value={source.name}>{source.name} · Glimpse {source.glimpse}</option>)}</select></label></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">In hand now</div><div className="font-semibold tabular-nums text-ctp-text">{(glimpseOdds.natural * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Glimpse finds</div><div className="font-semibold tabular-nums text-ctp-text">{(glimpseOdds.revealHit * 100).toFixed(1)}%</div></div><div className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">Setup gain</div><div className="font-semibold tabular-nums text-ctp-teal">+{(glimpseOdds.setup * 100).toFixed(1)} pts</div></div><div className="rounded-lg border border-ctp-mauve/40 bg-ctp-base/35 p-2.5"><div className="text-[10px] uppercase tracking-wide text-ctp-subtext0">By next draw</div><div className="font-semibold tabular-nums text-ctp-mauve">{(glimpseOdds.combined * 100).toFixed(1)}%</div></div></div>
          <p className="mt-2 text-[10px] leading-4 text-ctp-subtext0">Exact for one activation: {activeGlimpseSource.copies}× {activeGlimpseSource.name} seen within the selected {seen} cards, then Glimpse {activeGlimpseSource.glimpse}. {activeGlimpseSource.reserveCost === null ? "Activation cost and timing are not inferred." : `Printed reserve cost ${activeGlimpseSource.reserveCost}; affordability and conditional text are not assumed.`} Glimpse sets the next draw—it does not put the card in hand. {mode === "recipe" ? "For recipes, this targets the requirement with the fewest copies and does not claim the entire recipe is complete." : ""}</p>
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
          <ForecastHeadline label={`With card draw · ${seenWithDraw} cards seen`} value={`${(probabilityWithDraw * 100).toFixed(1)}%`} />
          {curveWithDraw.length >= 2 && (
            <div className="mt-2">
              <ForecastChart values={curveWithDraw} height={36} selectedIndex={Math.min(seenWithDraw, curveWithDraw.length) - 1} />
              <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                <span>1 seen: {(curveWithDraw[0] * 100).toFixed(0)}%</span>
                <span>{curveWithDraw.length} seen: {(curveWithDraw[curveWithDraw.length - 1] * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
      </Section>
    </Panel>
  );
}
