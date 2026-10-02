import { useMemo } from "react";
import { Link } from "react-router-dom";
import { collectionTotalsByCard, locationCardKey, type Card } from "@gatcg/shared";
import Button from "../../components/ui/Button";
import { useSavedCollection } from "./useSavedCollection";
import { OWNERSHIP_COVERAGE_NOTE } from "./CollectionStatus";

/** Saved counts only; quantity editing stays in the collection draft controller. */
export default function CardCollectionSummary({ card }: { card: Card }) {
  const { collection, collectionLoaded, collectionError, retryCollection } = useSavedCollection();
  const totals = useMemo(() => collectionTotalsByCard(collection).get(locationCardKey(card.name)), [collection, card.name]);
  const linkClass = "inline-flex min-h-control items-center rounded-lg px-3 text-sm font-medium text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue";
  return <section aria-label="Your collection" className="identity-surface mt-4 rounded-xl border border-ctp-surface1 p-4">
    <h2 className="text-lg font-semibold">Your copies</h2>
    {collectionLoaded ? <>
      <dl className="mt-3 flex flex-wrap gap-6">
        <div><dt className="text-xs text-ctp-subtext1">Physical copies owned</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{totals?.ownedQuantity ?? 0}</dd></div>
        <div><dt className="text-xs text-ctp-subtext1">Proxies</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{totals?.proxyQuantity ?? 0}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-ctp-subtext1">Saved quantities across all printings. {OWNERSHIP_COVERAGE_NOTE}</p>
    </> : <p role={collectionError ? "alert" : "status"} className="mt-2 text-sm text-ctp-subtext1">{collectionError ?? "Loading saved quantities…"}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      <Link to={`/collection?card=${encodeURIComponent(card.uuid)}`} className={`${linkClass} border border-ctp-blue`}>{collectionLoaded ? "Edit owned quantities" : "Open collection"}</Link>
      {collectionLoaded && <Link to={`/card-locations?card=${encodeURIComponent(card.uuid)}`} className={linkClass}>Find copies and loans</Link>}
      {collectionError && <Button onClick={retryCollection}>Retry quantities</Button>}
    </div>
  </section>;
}
