import { useState } from "react";
import { Link } from "react-router-dom";
import CardImage from "../../components/CardImage";
import { useCardCatalog } from "../cards/useCardCatalog";
import { simulatePackOpening, RARITY_LABELS, RARITY_COLOR, type PackCard } from "./packOdds";

const REVEAL_STAGGER_MS = 120;

function PackCardFace({ pc, index, revealed }: { pc: PackCard; index: number; revealed: boolean }) {
  return (
    <div className="aspect-[5/7]" style={{ perspective: "1000px" }}>
      <div
        className="relative h-full w-full transition-transform duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transitionDelay: `${index * REVEAL_STAGGER_MS}ms`,
          transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center rounded-md border border-ctp-surface1 bg-gradient-to-br from-ctp-blue to-ctp-mauve"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-xs font-semibold text-ctp-crust opacity-80">Fan of Insight</span>
        </div>
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <CardImage
            image={pc.edition.image}
            alt={pc.card.name}
            className={`h-full w-full rounded-md border-2 ${RARITY_COLOR[pc.rarity] ?? "border-ctp-surface1"}`}
          />
          {pc.isFoil && (
            <span className="absolute right-1 top-1 rounded-full border border-ctp-yellow bg-ctp-crust/80 px-1.5 text-[10px] font-semibold text-ctp-yellow">
              FOIL
            </span>
          )}
        </div>
      </div>
      <p className="mt-1 truncate text-center text-xs text-ctp-subtext1">
        <Link to={`/cards/${pc.card.slug}`} className="hover:text-ctp-blue">
          {pc.card.name}
        </Link>
      </p>
      <p className="truncate text-center text-[10px] text-ctp-subtext0">{RARITY_LABELS[pc.rarity] ?? "Unknown"}</p>
    </div>
  );
}

/**
 * The "open pack, staggered flip reveal" unit shared by the full /packs/:prefix page and the
 * homepage's compact demo — both just wrap this with their own header/chrome. Reads
 * useCardCatalog() directly rather than taking cards as a prop since the catalog is already
 * synced app-wide (SyncProvider), so there's no extra fetch cost either caller needs to guard.
 */
export default function PackOpenerWidget({ setPrefix, buttonLabel }: { setPrefix: string; buttonLabel: string }) {
  const cards = useCardCatalog();
  const [pack, setPack] = useState<PackCard[] | null>(null);
  const [revealed, setRevealed] = useState(false);

  function openPack() {
    setRevealed(false);
    setPack(simulatePackOpening(cards, setPrefix));
    requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
  }

  return (
    <div data-component="PackOpenerWidget">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={openPack}
          disabled={cards.length === 0}
          className="rounded-md border border-ctp-blue px-4 py-2 text-sm font-medium text-ctp-blue hover:bg-ctp-surface0 disabled:opacity-50"
        >
          {pack ? "Open Another Pack" : buttonLabel}
        </button>
      </div>

      {pack && (
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {pack.map((pc, i) => (
            <PackCardFace key={`${pc.edition.uuid}-${i}`} pc={pc} index={i} revealed={revealed} />
          ))}
        </div>
      )}
    </div>
  );
}
