import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PackOpenerWidget from "./PackOpenerWidget";
import PageLayout from "../../components/layout/PageLayout";

export default function PackOpener() {
  const { prefix = "" } = useParams<{ prefix: string }>();
  const cards = useCardCatalog();
  const { phase } = useSyncProgress();

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
    if (phase === "error") {
      return (
        <PageLayout className="py-10">
          <p className="text-ctp-red">Couldn't load the card catalog.</p>
        </PageLayout>
      );
    }
    if (phase === "done") {
      return (
        <PageLayout className="py-10">
          <p className="text-ctp-subtext1">No cards are available yet.</p>
          <Link to="/cards?tab=sets" className="mt-2 inline-block text-ctp-blue hover:underline">
            &larr; Back to Sets
          </Link>
        </PageLayout>
      );
    }
    return (
      <PageLayout className="py-10">
        <p className="text-ctp-subtext1">Loading…</p>
      </PageLayout>
    );
  }

  if (!setInfo) {
    return (
      <PageLayout className="py-10">
        <p className="text-ctp-red">Set "{prefix}" not found.</p>
        <Link to="/cards?tab=sets" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; Back to Sets
        </Link>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
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
    </PageLayout>
  );
}
