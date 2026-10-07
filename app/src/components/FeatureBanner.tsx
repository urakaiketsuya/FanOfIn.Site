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
      <div className="mx-auto max-w-5xl px-4 text-center text-xs text-ctp-subtext1 sm:text-sm">
        <Link to={tip.to} className="flex min-h-control items-center justify-center rounded py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-mauve group">
          <span>
            <span aria-hidden="true" className="mr-2">💡</span>
            {tip.message}{" "}
            <span className="inline-block font-medium text-ctp-mauve group-hover:underline">{tip.cta} &rarr;</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
