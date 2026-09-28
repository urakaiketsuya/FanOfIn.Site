import { useMemo } from "react";
import { computeCollectionValue, type Card, type CollectionEntry } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import { usePriceLookupState } from "../pricing/usePriceLookup";

export function CollectionValueDisplay({ value, updatedAt, loading, error, retry, pending = false }: {
  value: ReturnType<typeof computeCollectionValue>; updatedAt?: string; loading: boolean;
  error: string | null; retry: () => void; pending?: boolean;
}) {
  const available = Boolean(updatedAt);
  const amount = value.total === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value.total);
  return <div><details className="group mt-2 max-w-xl text-sm">
    <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-2 rounded-lg py-2 focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">
      <span className="text-ctp-subtext1">Estimated collection value</span>
      <strong>{!value.ownedCopies ? "$0.00" : available ? amount : loading ? "Loading…" : "Unavailable"}</strong>
      <span className="text-xs text-ctp-subtext1">USD{pending ? " · Unsaved quantities" : ""}</span>
      <DisclosureChevron className="group-open:rotate-180" />
    </summary>
    <div className="space-y-2 rounded-lg bg-ctp-mantle p-3 text-xs leading-relaxed text-ctp-subtext1">
      <p>TCGplayer market prices × physical copies owned. Includes cards in decks and lent out; excludes proxies and cards marked only as “might own”.</p>
      <p>Exact printings use their matching price. Unspecified copies use the cheapest priced printing. Only nonfoil market prices are used. Missing nonfoil prices are excluded; finish and condition aren’t tracked.</p>
      {available && <p>{value.pricedCopies} of {value.ownedCopies} copies priced · {value.unspecifiedCopies} copies with unspecified printing. Prices updated {new Date(updatedAt!).toLocaleDateString()}.</p>}
      {error && <p role="status">{available ? "Showing cached prices. " : ""}{error} <button type="button" onClick={retry} disabled={loading} className="min-h-12 rounded-lg px-3 text-ctp-blue focus-visible:outline-2">{loading ? "Refreshing…" : "Retry prices"}</button></p>}
    </div>
  </details>
    {available && value.missingCopies > 0 && <p className="text-xs text-ctp-subtext1">Partial estimate · {value.missingCopies} copies have no nonfoil price.</p>}
    {error && available && <p className="text-xs text-ctp-subtext1">Using cached prices; refresh unavailable.</p>}
  </div>;
}

export default function CollectionValueSummary({ entries, cards, pending }: { entries: CollectionEntry[]; cards: Card[]; pending: boolean }) {
  const pricing = usePriceLookupState();
  const value = useMemo(() => computeCollectionValue(entries, cards, pricing.prices), [entries, cards, pricing.prices]);
  return <CollectionValueDisplay value={value} {...pricing} pending={pending} />;
}
