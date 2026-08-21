import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CardImage from "../../components/CardImage";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
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

export default function PackOpener() {
  const { prefix = "" } = useParams<{ prefix: string }>();
  const cards = useCardCatalog();
  const [pack, setPack] = useState<PackCard[] | null>(null);
  const [revealed, setRevealed] = useState(false);

  const setInfo = useMemo(() => {
    for (const card of cards) {
      for (const edition of card.editions) {
        if (edition.set.prefix === prefix) return edition.set;
      }
    }
    return null;
  }, [cards, prefix]);

  useDocumentTitle(
    setInfo ? `Open a ${setInfo.name} Pack` : "Open a Pack",
    setInfo ? `Simulate opening a booster pack of ${setInfo.name} using approximate Grand Archive TCG pull rates.` : undefined,
  );

  function openPack() {
    setRevealed(false);
    setPack(simulatePackOpening(cards, prefix));
    requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-subtext1">Loading…</p>
      </div>
    );
  }

  if (!setInfo) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-red">Set "{prefix}" not found.</p>
        <Link to="/cards?tab=sets" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; Back to Sets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/cards?tab=sets" className="text-sm text-ctp-blue hover:underline">
        &larr; Back to Sets
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ctp-blue">Open a {setInfo.name} Pack</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        A simulated 12-card booster pack, randomly drawn from {setInfo.name}'s real card pool.
      </p>

      <button
        type="button"
        onClick={openPack}
        className="mt-4 rounded-md border border-ctp-blue px-4 py-2 text-sm font-medium text-ctp-blue hover:bg-ctp-surface0"
      >
        {pack ? "Open Another Pack" : "Open Pack"}
      </button>

      {pack && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {pack.map((pc, i) => (
              <PackCardFace key={`${pc.edition.uuid}-${i}`} pc={pc} index={i} revealed={revealed} />
            ))}
          </div>
          <p className="mt-6 text-xs text-ctp-subtext0">
            Odds are a best-effort approximation built from publicly available guaranteed-per-box rates (e.g. one
            Ultra Rare per 24-pack box) — Grand Archive doesn't publish an official per-pack rarity table, so this
            isn't exact retail odds.
          </p>
        </>
      )}
    </div>
  );
}
