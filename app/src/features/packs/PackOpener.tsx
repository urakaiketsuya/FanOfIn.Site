import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PackOpenerWidget from "./PackOpenerWidget";

export default function PackOpener() {
  const { prefix = "" } = useParams<{ prefix: string }>();
  const cards = useCardCatalog();

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

      <div className="mt-4">
        <PackOpenerWidget setPrefix={prefix} buttonLabel="Open Pack" />
      </div>

      <p className="mt-6 text-xs text-ctp-subtext0">
        Odds are a best-effort approximation built from publicly available guaranteed-per-box rates (e.g. one
        Ultra Rare per 24-pack box) — Grand Archive doesn't publish an official per-pack rarity table, so this
        isn't exact retail odds.
      </p>
    </div>
  );
}
