import { useState } from "react";
import { Link } from "react-router-dom";

interface FeatureTip {
  message: string;
  to: string;
  cta: string;
}

// Hand-picked, not every page on the site – favors features a first-time visitor is unlikely to
// stumble onto from the nav alone (e.g. the Deck Builder's cut suggestions, the simulator/tournament
// data split) over ones already obvious from top-level nav labels.
const FEATURE_TIPS: FeatureTip[] = [
  { message: "Quickly import your public decks from other sites:", to: "/decks/edit", cta: "Build Now" },
  { message: "New to deck building? We have free tools:", to: "/deck-builder", cta: "Get Started" },
  { message: "Card Impact shows which cards move win rate the most within an archetype.", to: "/cards/stats", cta: "See Card Stats" },
  { message: "Compare multiple decks at once:", to: "/compare", cta: "Compare Decks" },
  { message: "Get cards from the latest set recommended based on your decklist:", to: "card-discovery", cta: "See New Cards"},
  { message: "Official livestream data at a glance:", to: "/timelines", cta: "See Play-by-Plays" },
  { message: "Travelling to play?", to: "/regions", cta: "See what's hot in another region" },
  { message: "Track your cards across decks:", to: "/collection", cta: "Add to Collection" },
];

function tipIndexForNow(): number {
  return Math.floor(Date.now() / 60_000) % FEATURE_TIPS.length;
}

export default function FeatureBanner() {
  const [index] = useState(tipIndexForNow);

  const tip = FEATURE_TIPS[index];

  return (
    <div data-component="FeatureBanner" className="border-b border-ctp-surface0 bg-ctp-mauve/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-center text-xs text-ctp-subtext1 sm:text-sm">
        <span aria-hidden="true">💡</span>
        <span>{tip.message}</span>
        <Link to={tip.to} className="inline-flex min-h-control min-w-0 max-w-full items-center justify-center font-medium text-ctp-mauve hover:underline">
          {tip.cta} &rarr;
        </Link>
      </div>
    </div>
  );
}
