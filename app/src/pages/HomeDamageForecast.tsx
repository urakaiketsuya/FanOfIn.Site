import { useState } from "react";
import { Link } from "react-router-dom";
import CardImage from "../components/CardImage";
import { ForecastChart } from "../components/ui/ForecastVisual";

// Snapshot from computeAggressionForecast for the real Water Diao Chan list at /decks/8qjzzs.
// Recomputed from its 60-card Main Deck and pipeline/.cache/cards.json on 2026-09-22.
// The lower bound is zero because Burst Asunder's Fractal scaling is conditional.
const POINTS = [
  { seen: 7, expectedMin: 0, expectedMax: 3.2 },
  { seen: 10, expectedMin: 0, expectedMax: 6 },
  { seen: 15, expectedMin: 0, expectedMax: 12.5 },
  { seen: 20, expectedMin: 0, expectedMax: 21.3 },
] as const;

export default function HomeDamageForecast() {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const selected = POINTS[selectedIndex];

  return (
    <section className="border-t border-ctp-surface0 px-6 py-10 sm:px-8 sm:py-12" aria-labelledby="home-damage-heading">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Damage potential</p>
        <h3 id="home-damage-heading" className="mt-3 text-xl font-bold text-ctp-text sm:text-2xl">How much damage could a deck produce?</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ctp-subtext1 sm:text-base">This Water Diao Chan list has four Burst Asunders and 18 Fractal cards. Its printed damage forecast grows as more cards are seen.</p>

        <div className="mt-6 grid gap-6 rounded-2xl bg-ctp-mantle p-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:p-7 sm:gap-8">
          <Link to="/decks/8qjzzs?tab=analysis" className="hidden h-fit w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue sm:block" aria-label="Open the Water Diao Chan deck analysis">
            <CardImage image="/cards/images/0ueslsle3w.jpg" alt="Diao Chan card" className="h-44 w-30 rounded-lg border border-ctp-surface1 object-cover object-top shadow-lg" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Modeled expected damage</p><p className="mt-1 text-xs text-ctp-subtext1">Conditional upper estimate · {selected.seen} cards seen</p></div>
              <p className="text-3xl font-bold tabular-nums text-ctp-blue">{selected.expectedMin}–{selected.expectedMax}</p>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2" role="group" aria-label="Damage forecast cards seen">
              {POINTS.map((point, index) => <button key={point.seen} type="button" aria-pressed={index === selectedIndex} onClick={() => setSelectedIndex(index)} className={`min-h-11 rounded-lg border px-1.5 py-2 text-xs font-semibold sm:text-sm ${index === selectedIndex ? "border-ctp-blue bg-forest-surface text-ctp-blue" : "border-ctp-surface1 bg-ctp-base text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"}`}>{point.seen} seen</button>)}
            </div>
            <div className="mt-5"><ForecastChart values={POINTS.map((point) => point.expectedMax)} low={POINTS.map((point) => point.expectedMin)} high={POINTS.map((point) => point.expectedMax)} selectedIndex={selectedIndex} height={90} /></div>
            <details className="mt-4 border-t border-ctp-surface0 pt-3 text-xs text-ctp-subtext1"><summary className="min-h-10 cursor-pointer py-2 font-semibold text-ctp-blue">What this forecast includes</summary><p className="pb-2 leading-relaxed">The upper end assumes the Fractal-scaling combo is available. Zero is the guaranteed floor; this models printed effects, not total combat damage or a promised turn outcome.</p></details>
            <Link to="/decks/8qjzzs?tab=analysis" className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-ctp-blue/60 px-5 py-2 text-sm font-semibold text-ctp-blue hover:bg-forest-surface/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore the full damage forecast <span aria-hidden="true" className="ml-2">→</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
