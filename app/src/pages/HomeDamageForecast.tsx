import { useState } from "react";
import { Link } from "react-router-dom";
import CardArtTile from "../components/CardArtTile";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { useHomeReveal } from "./useHomeReveal";
import { ForecastChart } from "../components/ui/ForecastVisual";

// Snapshot from computeAggressionForecast for the real Water Diao Chan list at /decks/8qjzzs.
// Recomputed from its 60-card Main Deck and pipeline/.cache/cards.json on 2026-10-07.
// Exact co-draw distributions include Burst Asunder, Refracting Missile, and Shimmering Refraction.
// Object deployment is assumed only for the optimistic ceiling.
const POINTS = [
  { seen: 7, expectedMin: 0, expectedMax: 5.2, medianMin: 0, medianMax: 5, low: 0, high: 11 },
  { seen: 10, expectedMin: 0, expectedMax: 9.9, medianMin: 0, medianMax: 10, low: 0, high: 18 },
  { seen: 15, expectedMin: 0, expectedMax: 20.5, medianMin: 0, medianMax: 20, low: 0, high: 32 },
  { seen: 20, expectedMin: 0, expectedMax: 34.1, medianMin: 0, medianMax: 34, low: 0, high: 49 },
] as const;

const FEATURED = ["Burst Asunder", "Refracting Missile", "Shimmering Refraction"];

export default function HomeDamageForecast() {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const cards = useCardsByNames(FEATURED);
  const reveal = useHomeReveal<HTMLDivElement>();
  const selected = POINTS[selectedIndex];
  return <section className="min-w-0" aria-labelledby="home-damage-heading">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ctp-blue">Damage forecast</p>
    <h2 id="home-damage-heading" className="mt-3 text-xl font-bold sm:text-2xl">See your damage potential grow.</h2>
    <div ref={reveal} className="home-report mt-5 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-5">
      <p className="font-semibold">Water Diao Chan</p>
      <p className="mt-1 text-xs text-ctp-subtext1">60-card Main Deck · Printed direct damage</p>
      <div className="home-report-art mt-4 grid grid-cols-3 gap-3">{FEATURED.map(name => {
        const card = cards.get(name);
        const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-xs">{name}</span></>;
        return card ? <Link key={name} to={`/cards/${card.slug}`} className="home-interactive rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div key={name}>{content}</div>;
      })}</div>
      <div className="mt-5" aria-live="polite" aria-atomic="true">
        <p className="text-4xl font-bold tracking-tight tabular-nums text-ctp-blue">{selected.expectedMin}–{selected.expectedMax}</p>
        <p className="mt-1 text-sm font-semibold">Expected damage access · {selected.seen} cards seen</p>
        <p className="mt-1 text-xs text-ctp-subtext1">Conservative to optimistic · Support deployed at the upper end</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="Cards seen">
        {POINTS.map((point, index) => <button key={point.seen} type="button" aria-pressed={index === selectedIndex} onClick={() => setSelectedIndex(index)} className={`min-h-12 min-w-12 rounded-lg border px-1 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue ${index === selectedIndex ? "border-ctp-blue bg-forest-surface text-ctp-blue" : "border-ctp-surface1 bg-ctp-base text-ctp-subtext1 hover:border-ctp-blue"}`}>{point.seen}<span className="block text-[10px] font-normal">cards seen</span></button>)}
      </div>
      <div className="mt-4" aria-label="Optimistic expected damage rises from 5.2 at 7 cards seen to 34.1 at 20 cards seen">
        <ForecastChart values={POINTS.map(point => point.expectedMax)} selectedIndex={selectedIndex} height={100} />
        <div className="flex justify-between text-xs text-ctp-subtext1"><span>7 cards seen</span><span>20 cards seen</span></div>
        <p className="mt-2 text-xs text-ctp-subtext0">Optimistic expected damage access</p>
      </div>
      <Link to="/decks/8qjzzs?tab=performance" className="mt-3 inline-flex min-h-12 items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Explore Diao Chan’s forecast →</Link>
    </div>
    <Link to="/deck-analysis" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-ctp-blue px-5 text-sm font-semibold text-ctp-base hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">Analyze your deck →</Link>
  </section>;
}
