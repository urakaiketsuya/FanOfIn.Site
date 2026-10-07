import { useState } from "react";
import { Link } from "react-router-dom";

interface FeatureTip {
  message: string;
  to: string;
  cta: string;
}

// Keep tips concise and stable for the mounted visit.
const FEATURE_TIPS: FeatureTip[] = [
  { message: "Meet your champion. Explore their cards and builds.", to: "/champions", cta: "Explore champions" },
  { message: "Bring your decklist. Keep building from there.", to: "/decks/edit", cta: "Import a deck" },
  { message: "Start your next deck with guided tools.", to: "/deck-builder", cta: "Build a deck" },
  { message: "Explore card results from recorded tournaments.", to: "/cards/stats", cta: "See card stats" },
  { message: "Spot the differences between decklists.", to: "/compare", cta: "Compare decks" },
  { message: "Find new cards for your deck.", to: "/card-discovery", cta: "Discover cards" },
  { message: "Follow recorded livestream matches, play by play.", to: "/timelines", cta: "Explore matches" },
  { message: "See what players bring in another region.", to: "/regions", cta: "Explore regions" },
  { message: "Keep track of your cards across decks.", to: "/collection", cta: "Manage collection" },
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
        <Link to={tip.to} className="inline-flex min-h-control min-w-0 max-w-full items-center justify-center rounded font-medium text-ctp-mauve hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-mauve">
          {tip.cta} &rarr;
        </Link>
      </div>
    </div>
  );
}
