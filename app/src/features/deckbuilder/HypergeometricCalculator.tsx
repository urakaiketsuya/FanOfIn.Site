import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import ThemaSparkline from "../thema/ThemaSparkline";
import { probabilityAtLeast } from "./synergyReadiness";
import { drawnCardsPerCopy, expectedExtraDraws, materialDrawBonus } from "./drawEffects";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";

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

const numberInputClass = "mt-1 block w-full rounded border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none";

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
}: {
  mainLines: { name: string; quantity: number }[];
  materialLines: { name: string; quantity: number }[];
  catalogByName: Map<string, Card>;
}) {
  const mainDeckTotal = useMemo(() => mainLines.reduce((sum, line) => sum + line.quantity, 0), [mainLines]);
  const defaultDeckSize = Math.max(60, mainDeckTotal);

  const [selectedCard, setSelectedCard] = useState("");
  const [deckSize, setDeckSize] = useState(defaultDeckSize);
  const [copies, setCopies] = useState(4);
  const [seen, setSeen] = useState(10);
  const [required, setRequired] = useState(1);

  function handleSelectCard(name: string) {
    setSelectedCard(name);
    if (!name) return;
    const line = mainLines.find((l) => l.name === name);
    if (!line) return;
    setDeckSize(defaultDeckSize);
    setCopies(line.quantity);
  }

  const probability = probabilityAtLeast(deckSize, copies, seen, required);
  const curve = useMemo(
    () => Array.from({ length: Math.min(deckSize, CURVE_MAX_SEEN) }, (_, i) => probabilityAtLeast(deckSize, copies, i + 1, required)),
    [deckSize, copies, required],
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
  const probabilityWithDraw = probabilityAtLeast(deckSize, copies, seenWithDraw, required);
  const curveWithDraw = useMemo(
    () =>
      Array.from({ length: Math.min(deckSize, CURVE_MAX_SEEN) }, (_, i) => {
        const baseSeen = i + 1;
        const adjustedSeen = Math.min(deckSize, Math.round(baseSeen + expectedExtraDraws(drawEffectLines, deckSize, baseSeen) + materialBonus));
        return probabilityAtLeast(deckSize, copies, adjustedSeen, required);
      }),
    [drawEffectLines, deckSize, copies, required, materialBonus],
  );

  return (
    <Panel data-component="HypergeometricCalculator" className="mt-4">
      <Section
        heading="dense"
        title="Hypergeometric calculator"
        description={<>Chance of having seen at least a given number of copies of a card, given the deck size, copies in the deck, and cards drawn so far. A plain probability for whatever you're checking, not a verdict — unlike Synergy readiness above, nothing here is labeled "Reliable" or "Fragile."</>}
      >
      {mainLines.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Card in build:</span>
          <select
            value={selectedCard}
            onChange={(e) => handleSelectCard(e.target.value)}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
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

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <label className="text-xs text-ctp-subtext0">
          Copies in deck
          <input
            type="number"
            min={0}
            max={deckSize}
            value={copies}
            onChange={(e) => setCopies(clampInt(Number(e.target.value), 0, deckSize))}
            className={numberInputClass}
          />
        </label>
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
        <label className="text-xs text-ctp-subtext0">
          At least
          <input
            type="number"
            min={1}
            max={deckSize}
            value={required}
            onChange={(e) => setRequired(clampInt(Number(e.target.value), 1, deckSize))}
            className={numberInputClass}
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {SEEN_PRESETS.map((preset) => (
          <button
            key={preset.seen}
            type="button"
            onClick={() => setSeen(Math.min(preset.seen, deckSize))}
            className={`rounded-md border px-2 py-1 text-xs ${
              seen === preset.seen ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs text-ctp-subtext0">
          Chance of at least {required} of {copies} copies, out of {deckSize}, after {seen} seen
        </span>
        <span className="text-2xl font-bold text-ctp-blue">{(probability * 100).toFixed(1)}%</span>
      </div>

      {curve.length >= 2 && (
        <div className="mt-2">
          <ThemaSparkline values={curve} height={36} />
          <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
            <span>1 seen: {(curve[0] * 100).toFixed(0)}%</span>
            <span>{curve.length} seen: {(curve[curve.length - 1] * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {hasDrawEngine && (
        <div className="mt-4 border-t border-ctp-surface1 pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs text-ctp-subtext0">
              With card draw (est.): {seenWithDraw} effective seen from this build's own draw effects
            </span>
            <span className="text-2xl font-bold text-ctp-mauve">{(probabilityWithDraw * 100).toFixed(1)}%</span>
          </div>
          {curveWithDraw.length >= 2 && (
            <div className="mt-2">
              <ThemaSparkline values={curveWithDraw} height={36} />
              <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
                <span>1 seen: {(curveWithDraw[0] * 100).toFixed(0)}%</span>
                <span>{curveWithDraw.length} seen: {(curveWithDraw[curveWithDraw.length - 1] * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
          <p className="mt-2 text-[10px] text-ctp-subtext0">
            Estimate, not a guarantee — assumes every "Draw N card(s)" clause on{" "}
            {drawEffectLines.reduce((sum, line) => sum + line.quantity, 0)} Main Deck card{drawEffectLines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"}
            {materialDrawEffectLines.length > 0 && (
              <> and {materialDrawEffectLines.reduce((sum, line) => sum + line.quantity, 0)} Material Deck card{materialDrawEffectLines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"}</>
            )}{" "}
            fires every time it's drawn or reachable, whether or not that trigger is actually conditional, and doesn't account for those extra cards
            themselves containing further draw effects. Material Deck cards count in full regardless of {seen} seen — they're known and reachable from
            the start of the game, not drawn at random.
          </p>
        </div>
      )}
      </Section>
    </Panel>
  );
}
