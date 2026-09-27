import DisclosureChevron from "../DisclosureChevron";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardArtTile from "../CardArtTile";
import QuantityControl from "./QuantityControl";

export default function CardSearchResults({ query, names, catalog, chosen, onAdd, quantityFor, onSetQuantity, filtered = false, evidence, owned }: {
  quantityFor?: (name: string) => number;
  onSetQuantity?: (name: string, quantity: number) => void;
  query: string; names: string[]; catalog: Map<string, Card>; chosen: Map<string, number>;
  onAdd: (name: string, quantity: number) => void;
  filtered?: boolean; evidence?: ReadonlyMap<string, string>; owned?: ReadonlyMap<string, number>;
}) {
  const [limit, setLimit] = useState(24);
  const matches = useMemo(() => filtered ? names : names.filter(name => {
    const needle = query.trim().toLocaleLowerCase();
    return `${name} ${catalog.get(name)?.effect ?? ""}`.toLocaleLowerCase().includes(needle);
  }).sort((a,b) => a.localeCompare(b)), [names, query, catalog, filtered]);
  return <section aria-label="Card catalog" className="mt-3">
    <p role="status" className="mb-2 text-xs text-ctp-subtext0">{matches.length} matching {matches.length === 1 ? "card" : "cards"}</p>
    {!matches.length && <p className="py-4 text-sm text-ctp-subtext1">No cards match. Try another search or clear a filter.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
      {matches.slice(0, limit).map(name => {
        const card = catalog.get(name);
        const quantity = quantityFor?.(name) ?? chosen.get(name) ?? 0;
        return <article key={name} className="min-w-0 overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2">
          {card ? <Link to={`/cards/${card.slug}`} target="_blank" rel="noreferrer" className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={card} name={name} /><span className="flex min-h-12 items-center break-words text-sm font-medium">{name}<span className="sr-only"> — open card details in a new tab</span></span></Link> : <><CardArtTile card={undefined} name={name} /><p className="min-h-12 text-sm">{name}</p></>}
          {owned && <p className="mb-2 text-xs text-ctp-subtext0">{owned.get(name) ?? 0} owned</p>}
          {evidence?.get(name) && <details className="mb-2 text-xs text-ctp-subtext1"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-1">Why this card?<DisclosureChevron /></summary><p>{evidence.get(name)}</p></details>}
          {quantity > 0 && onSetQuantity ? <QuantityControl stacked name={name} quantity={quantity} min={0} onChange={value => onSetQuantity(name, value)} /> : <button type="button" disabled={quantity > 0} onClick={() => onAdd(name, 1)} aria-label={`Add ${name}`} className="min-h-12 w-full rounded-lg border border-ctp-blue px-2 text-sm text-ctp-blue disabled:opacity-50">{quantity ? "In deck" : "+ Add card"}</button>}
        </article>;
      })}
    </div>
    {matches.length > limit && <button type="button" onClick={() => setLimit(count => count + 24)} className="mt-2 min-h-12 rounded-lg px-3 text-sm text-ctp-blue">Show more cards</button>}
  </section>;
}
