import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { probabilityAtLeast } from "./synergyReadiness";
import { drawnCardsPerCopy, expectedExtraDraws, materialDrawBonus } from "./drawEffects";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { ForecastChart, ForecastCheckpointSelector, ForecastHeadline } from "../../components/ui/ForecastVisual";
import { conditionalComboOdds } from "../../lib/comboOdds";

/** Same range Synergy readiness's curves use (`CURVE_MAX_SEEN` in synergyReadiness.ts) — keeps the
 * two probability visualizations on this tab reading consistently. */
const CURVE_MAX_SEEN = 25;

/** Same "cards seen" vocabulary as Synergy readiness's `CHECKPOINTS` — reused here as quick-select
 * presets rather than inventing a second set of labels for the same idea. */
const SEEN_PRESETS = [
  { label: "Opening (7)", seen: 7 },
  { label: "Early (10)", seen: 10 },
  { label: "Mid (15)", seen: 15 },
  { label: "Late (20)", seen: 20 },
] as const;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const numberInputClass = "mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30";

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
  const [mode, setMode] = useState<"single" | "combo">("single");
  const [anchorCard, setAnchorCard] = useState("");
  const [optionCards, setOptionCards] = useState<string[]>([]);
  const anchorCopies = mainLines.find((line) => line.name === anchorCard)?.quantity ?? 0;
  const optionCopies = optionCards.reduce((sum, name) => sum + (mainLines.find((line) => line.name === name)?.quantity ?? 0), 0);

  function handleSelectCard(name: string) {
    setSelectedCard(name);
    if (!name) return;
    const line = mainLines.find((l) => l.name === name);
    if (!line) return;
    setDeckSize(defaultDeckSize);
    setCopies(line.quantity);
  }

  const probability = mode === "combo"
    ? conditionalComboOdds(deckSize, anchorCopies, optionCopies, seen).probability
    : probabilityAtLeast(deckSize, copies, seen, required);
  const curve = useMemo(
    () => Array.from({ length: Math.min(deckSize, CURVE_MAX_SEEN) }, (_, i) => mode === "combo" ? conditionalComboOdds(deckSize, anchorCopies, optionCopies, i + 1).probability : probabilityAtLeast(deckSize, copies, i + 1, required)),
    [deckSize, copies, required, mode, anchorCopies, optionCopies],
  );

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
  const probabilityWithDraw = mode === "combo" ? conditionalComboOdds(deckSize, anchorCopies, optionCopies, seenWithDraw).probability : probabilityAtLeast(deckSize, copies, seenWithDraw, required);
  const curveWithDraw = useMemo(
    () =>
      Array.from({ length: Math.min(deckSize, CURVE_MAX_SEEN) }, (_, i) => {
        const baseSeen = i + 1;
        const adjustedSeen = Math.min(deckSize, Math.round(baseSeen + expectedExtraDraws(drawEffectLines, deckSize, baseSeen) + materialBonus));
        return mode === "combo" ? conditionalComboOdds(deckSize, anchorCopies, optionCopies, adjustedSeen).probability : probabilityAtLeast(deckSize, copies, adjustedSeen, required);
      }),
    [drawEffectLines, deckSize, copies, required, materialBonus, mode, anchorCopies, optionCopies],
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
      <div className="mt-2 inline-flex rounded-md border border-ctp-surface1 bg-ctp-mantle p-0.5" role="group" aria-label="Probability question"><button type="button" aria-pressed={mode === "single"} onClick={() => setMode("single")} className={`rounded px-2.5 py-1 text-xs ${mode === "single" ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1"}`}>Single card</button><button type="button" aria-pressed={mode === "combo"} onClick={() => setMode("combo")} className={`rounded px-2.5 py-1 text-xs ${mode === "combo" ? "bg-ctp-mauve text-ctp-base" : "text-ctp-subtext1"}`}>Card + one of…</button></div>
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

      {mode === "combo" && mainLines.length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-ctp-subtext0">Required card<select value={anchorCard} onChange={(event) => { setAnchorCard(event.target.value); setOptionCards((current) => current.filter((name) => name !== event.target.value)); }} className="mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-xs text-ctp-text"><option value="">Choose a card…</option>{mainLines.map((line) => <option key={line.name} value={line.name}>{line.name} ({line.quantity})</option>)}</select></label><label className="text-xs text-ctp-subtext0">At least one of<select multiple size={4} value={optionCards} onChange={(event) => setOptionCards(Array.from(event.target.selectedOptions, (option) => option.value))} className="mt-1 block w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-xs text-ctp-text">{mainLines.filter((line) => line.name !== anchorCard).map((line) => <option key={line.name} value={line.name}>{line.name} ({line.quantity})</option>)}</select></label></div>}

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

      <div className="mt-3"><ForecastCheckpointSelector checkpoints={SEEN_PRESETS} selected={seen} onSelect={(value) => setSeen(Math.min(value, deckSize))} /></div>

      <div className="mt-4"><ForecastHeadline label={mode === "combo" ? `Chance of ${anchorCard || "required card"} + one option` : `Chance of seeing at least ${required} ${required === 1 ? "copy" : "copies"}`} value={`${(probability * 100).toFixed(1)}%`} detail={mode === "combo" ? `${anchorCopies} required-card copies + ${optionCopies} option copies` : undefined} /></div>

      {curve.length >= 2 && (
        <div className="mt-2">
          <ForecastChart values={curve} height={36} selectedIndex={Math.min(seen, curve.length) - 1} />
          <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
            <span>1 seen: {(curve[0] * 100).toFixed(0)}%</span>
            <span>{curve.length} seen: {(curve[curve.length - 1] * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {hasDrawEngine && (
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
