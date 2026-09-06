import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PackOpenerWidget from "./PackOpenerWidget";
import PageLayout from "../../components/layout/PageLayout";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

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
        <PageLayout data-component="PackOpener" className="py-10">
          <InlineState tone="danger">Couldn't load the card catalog.</InlineState>
        </PageLayout>
      );
    }
    if (phase === "done") {
      return (
        <PageLayout data-component="PackOpener" className="py-10">
          <EmptyState
            title="No cards are available yet"
            action={<Link to="/cards?tab=sets" className="text-ctp-blue hover:underline">&larr; Back to Sets</Link>}
          />
        </PageLayout>
      );
    }
    return (
      <PageLayout data-component="PackOpener" className="py-10">
        <InlineState>Loading…</InlineState>
      </PageLayout>
    );
  }

  if (!setInfo) {
    return (
      <PageLayout data-component="PackOpener" className="py-10">
        <EmptyState
          title={`Set "${prefix}" not found`}
          action={<Link to="/cards?tab=sets" className="text-ctp-blue hover:underline">&larr; Back to Sets</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout data-component="PackOpener">
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
