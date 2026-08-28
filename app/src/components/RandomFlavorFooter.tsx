import { useState } from "react";
import { Link } from "react-router-dom";
import { useRandomFlavorCard } from "../features/cards/useRandomFlavorCard";
import { useCardsByNames } from "../features/events/useCardsByNames";
import { CHARACTER_CUTOUTS } from "../features/products/characterArt";
import SyncStatus from "./SyncStatus";

// Hand-picked, not every CHARACTER_CUTOUTS entry (which also has a few non-Champion pieces —
// Slime tokens, a Drone ally — and some champion art that just doesn't read as well small).
const FOOTER_CUTOUT_NAMES = [
  "Alice, Whim's Monarch",
  "Arisanna, Master Alchemist",
  "Merlin, Memorite Vassal",
  "Lorraine, Wandering Warrior",
  "Diana, Keen Huntress",
  "Tonoris, Lone Mercenary",
  "Jin, Fate Defiant",
];

function pickRandomCutoutName(): string {
  return FOOTER_CUTOUT_NAMES[Math.floor(Math.random() * FOOTER_CUTOUT_NAMES.length)];
}

export default function RandomFlavorFooter() {
  const card = useRandomFlavorCard();
  const flavor = card?.flavor ? card.flavor.trim().replace(/^["""](.*)["""]$/, "$1") : null;

  // Picked once per app-shell mount, then held stable — this component lives outside
  // <AppRoutes/> and persists across in-app navigation, so it shouldn't re-roll on every render.
  const [cutoutName] = useState(pickRandomCutoutName);
  const cutoutCard = useCardsByNames([cutoutName]).get(cutoutName);

  return (
    <>
      <footer className="mx-auto mt-12 max-w-3xl px-4 py-8 text-center">
        {flavor && card && (
          <>
            <p className="text-sm italic text-ctp-subtext0">"{flavor}"</p>
            <Link to={`/cards/${card.slug}`} className="mt-1 inline-block text-xs text-ctp-subtext0 hover:text-ctp-blue">
              — {card.name}
            </Link>
          </>
        )}
        <p className="mt-6 text-[11px] text-ctp-subtext0/70">
          Grand Archive is a trademark of Weebs of the Shore. This is an unofficial fan project and is not affiliated
          with or endorsed by Weebs of the Shore.
        </p>
        <p className="mt-1 text-[11px] text-ctp-subtext0/70">
          This site is built and maintained with AI assistance. Card data, stats, and analysis are generated
          automatically — please verify anything important against official sources.
        </p>
        <div className="mt-3">
          <SyncStatus />
        </div>
        <Link to="/changelog" className="mt-3 inline-block text-[11px] text-ctp-subtext0/70 hover:text-ctp-blue">
          Changelog
        </Link>
      </footer>
      {cutoutName && cutoutCard && (
        <div className="pb-8 text-center">
          <Link to={`/cards/${cutoutCard.slug}`} title={cutoutName} className="inline-block">
            <img
              src={CHARACTER_CUTOUTS[cutoutName]}
              alt={cutoutName}
              className="mx-auto h-40 w-auto object-contain shadow-[0_14px_18px_-8px_rgba(0,0,0,0.5)] transition-transform hover:scale-105"
            />
          </Link>
        </div>
      )}
    </>
  );
}
