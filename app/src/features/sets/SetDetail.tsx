import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import CardGrid from "../cards/CardGrid";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function SetDetail() {
  const { prefix = "" } = useParams<{ prefix: string }>();
  const cards = useCardCatalog();
  const syncProgress = useSyncProgress();

  const { setName, matches } = useMemo(() => {
    const matches = cards.filter((card) => card.editions.some((ed) => ed.set.prefix === prefix));
    const setName = matches[0]?.editions.find((ed) => ed.set.prefix === prefix)?.set.name ?? prefix;
    return { setName, matches };
  }, [cards, prefix]);
  useDocumentTitle(setName, matches.length > 0 ? `Browse every Grand Archive TCG card printed in ${setName}.` : null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/sets" className="text-sm text-ctp-blue hover:underline">
        &larr; Back to Sets
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">{setName}</h1>
        <p className="text-sm text-ctp-subtext0">{matches.length} cards</p>
      </div>

      {syncProgress.phase !== "done" && matches.length === 0 && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {syncProgress.phase === "done" && matches.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No cards found for this set.</p>
      )}

      <CardGrid cards={matches} pickEdition={(card) => card.editions.find((ed) => ed.set.prefix === prefix)} />
    </div>
  );
}
