import { useState } from "react";
import { Link } from "react-router-dom";
import CardImage from "../components/CardImage";
import { probabilityAtLeast } from "../features/deckbuilder/synergyReadiness";
import { useCardsByNames } from "../features/events/useCardsByNames";

const DECK_SIZE = 60;
const CHECKPOINTS = [7, 10, 15] as const;
const CARD_NAMES = ["Dungeon Guide"];

/** The featured xenbr4 list includes four Dungeon Guides in its 60-card Main Deck.
 * The three-copy scenario is hypothetical; both odds use the full calculator's draw math. */
export default function HomeDeckInsight() {
  const [seen, setSeen] = useState<(typeof CHECKPOINTS)[number]>(10);
  const actual = probabilityAtLeast(DECK_SIZE, 4, seen, 1);
  const fewer = probabilityAtLeast(DECK_SIZE, 3, seen, 1);
  const relativeGain = fewer > 0 ? Math.round(((actual - fewer) / fewer) * 100) : 0;
  const dungeonGuideImage = useCardsByNames(CARD_NAMES).get("Dungeon Guide")?.editions.find((edition) => edition.image)?.image;

  return (
    <section className="px-6 py-10 sm:px-8 sm:py-12" aria-labelledby="home-insight-heading">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Draw consistency</p>
          <h3 id="home-insight-heading" className="mt-3 text-xl font-bold text-ctp-text sm:text-2xl">What does one more copy change?</h3>
          <p className="mt-3 text-sm leading-relaxed text-ctp-subtext1 sm:text-base">The featured Silvie list runs four Dungeon Guides. See how often you would find one if you kept all four versus cutting one.</p>
        </div>

        <div className="mt-6 grid gap-5 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
          <div>
            <div className="flex items-start gap-4">
              <Link to="/cards/dungeon-guide" className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue" aria-label="View Dungeon Guide card">
                {dungeonGuideImage ? <CardImage image={dungeonGuideImage} alt="Dungeon Guide card" className="h-28 w-20 rounded-md border border-ctp-surface1 object-cover object-top sm:h-36 sm:w-26" /> : <span className="flex h-28 w-20 items-center justify-center rounded-md border border-ctp-surface1 bg-ctp-surface0 px-2 text-center text-xs text-ctp-subtext1 sm:h-36 sm:w-26">Dungeon Guide</span>}
              </Link>
              <div><p className="text-sm font-semibold text-ctp-text">Chance of seeing at least one Dungeon Guide</p><p className="mt-1 text-xs text-ctp-subtext0">60-card Main Deck · without replacement</p></div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:flex" role="group" aria-label="Cards seen">
              {CHECKPOINTS.map((count) => (
                <button key={count} type="button" aria-pressed={seen === count} onClick={() => setSeen(count)} className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-medium sm:px-4 ${seen === count ? "border-ctp-blue bg-forest-surface text-ctp-blue" : "border-ctp-surface1 bg-ctp-base text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"}`}>
                  {count} seen
                </button>
              ))}
            </div>
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
            <div><p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext1">With four copies, you are</p><p className="mt-2 text-4xl font-bold tabular-nums text-ctp-blue">+{relativeGain}%</p><p className="mt-3 text-sm leading-relaxed text-ctp-subtext1">more likely to find Dungeon Guide within {seen} cards seen than with three copies.</p></div>
            <Link to="/decks/xenbr4?tab=analysis" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-ctp-blue/60 px-4 py-2 text-center text-sm font-semibold text-ctp-blue hover:bg-forest-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Open the full deck analysis <span aria-hidden="true" className="ml-2">→</span></Link>
          </div>
        </div>

        <div className="mt-6 border-t border-ctp-surface0 pt-5 text-sm text-ctp-subtext1">Want to compare whole decks? <Link to="/compare?add=60363:570,60488:4261" className="font-semibold text-ctp-blue hover:underline">See two real builds side by side <span aria-hidden="true">→</span></Link></div>
      </div>
    </section>
  );
}
