import { useState } from "react";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import Button from "../components/ui/Button";
import { probabilityAtLeast } from "../features/deckbuilder/synergyReadiness";
import { useCardsByNames } from "../features/events/useCardsByNames";

import { computeDrawEngineTiming } from "../features/deckbuilder/drawEffects";
import { HOME_DECK_DRAW_SOURCES } from "./homeDeckDrawSources";

const DECK_SIZE = 60;
const CHECKPOINTS = [7, 10, 15] as const;
const CARD_NAMES = ["Dungeon Guide"];

/** The featured xenbr4 list includes four Dungeon Guides in its Main Deck of 60 cards.
 * The three-copy scenario is hypothetical; both odds use the full calculator's draw math. */
export default function HomeDeckInsight() {
  const [seen, setSeen] = useState<(typeof CHECKPOINTS)[number]>(10);
  const timing = computeDrawEngineTiming(HOME_DECK_DRAW_SOURCES, DECK_SIZE, seen, 7);
  const adjustedSeen = Math.min(DECK_SIZE, Math.round(seen + timing.expectedActiveDraws));
  const actual = probabilityAtLeast(DECK_SIZE, 4, adjustedSeen, 1);
  const fewer = probabilityAtLeast(DECK_SIZE, 3, adjustedSeen, 1);
  const relativeGain = fewer > 0 ? Math.round(((actual - fewer) / fewer) * 100) : 0;
  const dungeonGuide = useCardsByNames(CARD_NAMES).get("Dungeon Guide");

  return (
    <section className="border-t border-ctp-surface0 px-4 py-8 sm:px-8 sm:py-10" aria-labelledby="home-insight-heading">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Draw consistency</p>
          <h2 id="home-insight-heading" className="mt-3 text-xl font-bold text-ctp-text sm:text-2xl">What does one more copy change?</h2>
          <p className="mt-3 text-sm leading-relaxed text-ctp-subtext1 sm:text-base">This Silvie example runs four Dungeon Guides. See how often you would find one if you kept all four versus cutting one.</p>
        </div>

        <div className="mt-6 grid gap-5 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
          <div>
            <div className="flex items-start gap-4">
              <Link to="/cards/dungeon-guide" className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue" aria-label="View Dungeon Guide card">
                <div className="w-20"><CardArtTile card={dungeonGuide} name="Dungeon Guide" /><span className="mt-1 block text-xs">Dungeon Guide</span></div>
              </Link>
              <div><p className="text-sm font-semibold text-ctp-text">Estimated chance of seeing at least one Dungeon Guide</p><p className="mt-1 text-xs text-ctp-subtext0">Main Deck of 60 cards · adjusted for card draw</p></div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:flex" role="group" aria-label="Natural cards seen before extra draw">
              {CHECKPOINTS.map((count) => (
                <Button key={count} type="button" aria-pressed={seen === count} onClick={() => setSeen(count)} className={`min-h-12 rounded-lg border px-2 py-2 text-sm font-medium sm:px-4 ${seen === count ? "border-ctp-blue bg-forest-surface text-ctp-blue" : "border-ctp-surface1 bg-ctp-base text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"}`}>
                  {count} natural
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ctp-subtext0">{seen} natural cards + {timing.expectedActiveDraws.toFixed(1)} expected extra draws ≈ {adjustedSeen} cards seen.</p>
            <div className="mt-7 space-y-5" aria-live="polite">
              {[
                { label: "4 copies · actual list", value: actual, color: "bg-ctp-blue", strong: true },
                { label: "3 copies · what if?", value: fewer, color: "bg-ctp-surface2", strong: false },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm"><span className={row.strong ? "font-semibold text-ctp-text" : "text-ctp-subtext1"}>{row.label}</span><span className="font-semibold tabular-nums text-ctp-text">{(row.value * 100).toFixed(1)}%</span></div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-ctp-surface0"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.value * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-forest-surface bg-forest-surface/30 p-5">
            <p className="text-sm text-ctp-subtext1"><strong className="text-2xl text-ctp-blue">+{relativeGain}%</strong> more likely to find Dungeon Guide with four copies.</p>
            <Link to="/decks/xenbr4?tab=performance" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg border border-ctp-blue/60 px-4 py-2 text-center text-sm font-semibold text-ctp-blue hover:bg-forest-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Open the full deck analysis <span aria-hidden="true" className="ml-2">→</span></Link>
          </div>
        </div>

        <Link to="/deck-analysis" className="mt-4 inline-flex min-h-12 items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">Analyze your own deck →</Link>
      </div>
    </section>
  );
}
