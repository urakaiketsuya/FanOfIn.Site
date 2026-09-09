import { useEffect, useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import { computeTurnToPlay, earliestReserveCostTurn, isSimpleLevelUpAccelerant, DEFAULT_STARTING_HAND_SIZE } from "../../lib/turnToPlay";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { ForecastHeadline } from "../../components/ui/ForecastVisual";

const numberInputClass = "mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30";

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * "What's the earliest turn I could play this card?" — combines two independent gates: the card's
 * own Reserve cost (a hand-size question) and, when it needs a leveled-up champion, how early that
 * level is reachable given the deck's own "level up your champion" accelerants (see
 * `app/src/lib/turnToPlay.ts` for the rules this is grounded in, verified against the official
 * comprehensive rules at rules.gatcg.com — not assumed from memory). Required champion level has
 * no card-data field to read it from (confirmed: no card in the catalog carries one), so it's
 * always a manual input here, not auto-filled.
 */
export default function TurnToPlayCalculator({ mainLines, catalogByName }: { mainLines: { name: string; quantity: number }[]; catalogByName: Map<string, Card> }) {
  const [selectedCard, setSelectedCard] = useState("");
  const [reserveCost, setReserveCost] = useState(0);
  const [requiredLevel, setRequiredLevel] = useState(1);
  const [startingHandSize, setStartingHandSize] = useState(DEFAULT_STARTING_HAND_SIZE);

  const { simpleAccelerants, unmodeledAccelerants } = useMemo(() => {
    const seenSimple = new Map<string, Card>();
    const seenUnmodeled = new Set<string>();
    for (const line of mainLines) {
      const card = catalogByName.get(line.name);
      if (!card || !(card.effect ?? "").match(/level up your champion/i)) continue;
      if (isSimpleLevelUpAccelerant(card)) seenSimple.set(card.name, card);
      else seenUnmodeled.add(card.name);
    }
    return { simpleAccelerants: Array.from(seenSimple.values()), unmodeledAccelerants: Array.from(seenUnmodeled) };
  }, [mainLines, catalogByName]);

  const [checkedAccelerants, setCheckedAccelerants] = useState<Set<string>>(() => new Set());
  // Default every detected accelerant to checked the first time the deck's own set changes size —
  // avoids fighting the viewer's own unchecks on every unrelated re-render.
  const accelerantSignature = simpleAccelerants.map((card) => card.name).sort().join("|");
  useEffect(() => {
    setCheckedAccelerants(new Set(simpleAccelerants.map((c) => c.name)));
  }, [accelerantSignature, simpleAccelerants]);

  function handleSelectCard(name: string) {
    setSelectedCard(name);
    if (!name) return;
    const card = catalogByName.get(name);
    setReserveCost(card?.cost_reserve ?? 0);
  }

  const accelerantTurns = simpleAccelerants
    .filter((card) => checkedAccelerants.has(card.name))
    .map((card) => earliestReserveCostTurn(card.cost_reserve, startingHandSize));
  const result = computeTurnToPlay(reserveCost, requiredLevel, accelerantTurns, startingHandSize);
  const bindingReason = result.levelTurn > result.costTurn ? "champion level" : result.costTurn > result.levelTurn ? "Reserve cost" : "both, tied";

  return (
    <Panel data-component="TurnToPlayCalculator" className="mt-4 shadow-sm">
      <Section
        heading="dense"
        title="Turns to play"
        description={<>Earliest turn a card's Reserve cost and champion-level requirement could both be met — a best-case lower bound, not a guarantee.</>}
      >
        <div className="mt-3 rounded-xl bg-ctp-surface0/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Parameters</p>
          {mainLines.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ctp-subtext0">Card in build:</span>
              <select value={selectedCard} onChange={(e) => handleSelectCard(e.target.value)} className="min-h-10 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-xs text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30">
                <option value="">Custom…</option>
                {mainLines.map((line) => <option key={line.name} value={line.name}>{line.name}</option>)}
              </select>
              <span className="text-[10px] text-ctp-subtext0">Fills in Reserve cost below — still editable after.</span>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="text-xs text-ctp-subtext0">Reserve cost
              <input type="number" min={0} max={30} value={reserveCost} onChange={(e) => setReserveCost(clampInt(Number(e.target.value), 0, 30))} className={numberInputClass} />
            </label>
            <label className="text-xs text-ctp-subtext0">Champion level required
              <input type="number" min={1} max={6} value={requiredLevel} onChange={(e) => setRequiredLevel(clampInt(Number(e.target.value), 1, 6))} className={numberInputClass} />
            </label>
            <label className="text-xs text-ctp-subtext0">Starting hand size
              <input type="number" min={1} max={12} value={startingHandSize} onChange={(e) => setStartingHandSize(clampInt(Number(e.target.value), 1, 12))} className={numberInputClass} />
            </label>
          </div>
        </div>

        {simpleAccelerants.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0">Level-up accelerants found in this build</p>
            <div className="mt-1.5 space-y-1">
              {simpleAccelerants.map((card) => (
                <label key={card.name} className="flex items-center gap-2 text-xs text-ctp-subtext1">
                  <input type="checkbox" checked={checkedAccelerants.has(card.name)} onChange={(e) => setCheckedAccelerants((current) => { const next = new Set(current); if (e.target.checked) next.add(card.name); else next.delete(card.name); return next; })} />
                  {card.name} — usable from turn {earliestReserveCostTurn(card.cost_reserve, startingHandSize)} (Reserve {card.cost_reserve ?? 0})
                </label>
              ))}
            </div>
          </div>
        )}
        {unmodeledAccelerants.length > 0 && (
          <p className="mt-2 text-[10px] text-ctp-subtext0">Also found but not counted above (their own trigger needs something this calculator can't verify, e.g. counters built up over several turns or graveyard/opponent state): {unmodeledAccelerants.join(", ")}.</p>
        )}

        <div className="mt-4"><ForecastHeadline label="Earliest turn this card could be played" value={`Turn ${result.earliestTurn}`} detail={`${bindingReason === "both, tied" ? "Both gates" : bindingReason} sets the pace`} /></div>
        <div className="mt-4 space-y-3 rounded-xl bg-ctp-mantle/70 p-3" role="img" aria-label={`Reserve ready turn ${result.costTurn}; champion level ready turn ${result.levelTurn}; playable turn ${result.earliestTurn}`}>
          {([{ label: "Reserve ready", turn: result.costTurn, tone: "bg-ctp-blue" }, { label: "Champion level ready", turn: result.levelTurn, tone: "bg-ctp-mauve" }] as const).map((gate) => <div key={gate.label}><div className="flex items-center justify-between gap-3 text-xs"><span className="text-ctp-subtext1">{gate.label}</span><span className="font-semibold tabular-nums text-ctp-text">Turn {gate.turn}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ctp-surface0"><div className={`h-full rounded-full ${gate.tone}`} style={{ width: `${Math.max(8, gate.turn / Math.max(result.earliestTurn, 1) * 100)}%` }} /></div></div>)}
        </div>
        <p className="mt-1 text-xs text-ctp-subtext1">Bounded by {bindingReason === "both, tied" ? "both the Reserve cost and the champion-level requirement" : `the ${bindingReason} (turn ${bindingReason === "champion level" ? result.levelTurn : result.costTurn})`}{result.levelTurn > 1 || result.costTurn > 1 ? " — " : ""}{result.costTurn > 1 && `Reserve ${reserveCost} ready by turn ${result.costTurn}.`} {requiredLevel > 1 && `Level ${requiredLevel} reachable by turn ${result.levelTurn}.`}</p>

        <details className="mt-3 rounded-lg border border-ctp-surface1 px-3 py-2"><summary className="cursor-pointer text-xs font-medium text-ctp-subtext1">Assumptions and limits</summary><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-4 text-ctp-subtext0"><li>Starting hand plus one card drawn per turn sets the available-hand ceiling.</li><li>Other costs paid that turn are ignored.</li><li>The deck is assumed to have every required champion level.</li><li>Selected accelerants are assumed drawn and affordable.</li><li>A real game can run later than this best case, not earlier.</li></ul></details>
      </Section>
    </Panel>
  );
}
