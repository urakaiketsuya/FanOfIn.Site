import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface FeatureTip {
  message: string;
  to: string;
  cta: string;
}

// Hand-picked, not every page on the site — favors features a first-time visitor is unlikely to
// stumble onto from the nav alone (e.g. the Deck Builder's cut suggestions, the simulator/tournament
// data split) over ones already obvious from top-level nav labels.
const FEATURE_TIPS: FeatureTip[] = [
  { message: "Quickly import your public decks from other sites.", to: "/my-decks", cta: "/my-decks" },
  { message: "The Guided Deck Builder ranks cut suggestions by how much win rate they actually cost you.", to: "/deck-builder", cta: "Try the Deck Builder" },
  { message: "Card Impact shows which cards move win rate the most within an archetype.", to: "/cards/stats", cta: "See Card Stats" },
  { message: "Compare two decks side by side, card by card.", to: "/compare", cta: "Compare Decks" },
  { message: "Get cards from the latest set recommended based on your decklist.", to: "card-discovery", cta: "See New Cards"},
  { message: "Official livestream data at a glance.", to: "/timelines", cta: "See Play-by-Plays" },
  { message: "Anonymous Clarent simulator telemetry — real playtest data, kept separate from tournament stats.", to: "/simulator", cta: "Simulator" },
  { message: "See how each region's metagame differs from the overall field.", to: "/regions", cta: "Regional Analysis" },
  { message: "Track your card collection against decks you're eyeing.", to: "/collection", cta: "My Collection" },
  { message: "Curated Pantheon-format decks, hand-picked and explained.", to: "/pantheon", cta: "Pantheon Decks" },
  { message: "Earn achievements for tournament milestones — deep runs, streaks, and more.", to: "/achievements", cta: "Achievements" },
];

function tipIndexForNow(): number {
  return Math.floor(Date.now() / 60_000) % FEATURE_TIPS.length;
}

export default function FeatureBanner() {
  const [index, setIndex] = useState(tipIndexForNow);

  // Aligned to real minute boundaries (not just "60s after mount") so the tip is the same for
  // every visitor during a given minute, and stays in sync even if the tab is left open for hours.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = 60_000 - (Date.now() % 60_000);
      timeoutId = setTimeout(() => {
        setIndex(tipIndexForNow());
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  const tip = FEATURE_TIPS[index];

  return (
    <div className="border-b border-ctp-surface0 bg-ctp-mauve/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-center text-xs text-ctp-subtext1 sm:text-sm">
        <span aria-hidden="true">💡</span>
        <span>{tip.message}</span>
        <Link to={tip.to} className="shrink-0 font-medium text-ctp-mauve hover:underline">
          {tip.cta} &rarr;
        </Link>
      </div>
    </div>
  );
}
