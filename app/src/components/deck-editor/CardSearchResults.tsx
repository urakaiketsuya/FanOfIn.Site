import QuantityControl from "./QuantityControl";
import { useMemo, useState } from "react";
import type { Card } from "@gatcg/shared";
import CardImage from "../CardImage";

/** Unranked catalog browsing: recommendations remain a separate opt-in action. */
export default function CardSearchResults({ query, names, catalog, chosen, onAdd, quantityFor, onSetQuantity }: {
  quantityFor?: (name: string) => number;
  onSetQuantity?: (name: string, quantity: number) => void;
  query: string;
  names: string[];
  catalog: Map<string, Card>;
  chosen: Map<string, number>;
  onAdd: (name: string, quantity: number) => void;
}) {
  const [limit, setLimit] = useState(8);
  const matches = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return names.filter((name) => terms.every((term) => name.toLocaleLowerCase().includes(term)))
      .sort((a, b) => a.localeCompare(b));
  }, [names, query]);
  return <section aria-label="Card catalog" className="mt-3">
    <p role="status" className="mb-2 text-xs text-ctp-subtext0">{query.trim() ? `${matches.length} matching ${matches.length === 1 ? "card" : "cards"}` : "Browse cards · A–Z"}</p>
    {matches.length === 0 && <p className="py-4 text-sm text-ctp-subtext1">No cards match. Try another name.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
      {matches.slice(0, limit).map((name) => {
        const card = catalog.get(name);
        const image = card?.editions[0]?.image;
        const quantity = quantityFor?.(name) ?? chosen.get(name) ?? 0;
        const added = quantity > 0;
        return <div key={name} className="overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle"><button type="button" disabled={added && !onSetQuantity} onClick={() => onAdd(name, 1)}
          aria-label={added && !onSetQuantity ? `${name} is in your deck` : `Add ${name}`}
          className="block w-full overflow-hidden bg-ctp-mantle text-left hover:border-ctp-blue disabled:opacity-60">
          {image ? <CardImage image={image} alt="" className="aspect-[5/7] w-full object-cover" /> : <div className="flex aspect-[5/7] items-center justify-center bg-ctp-surface0 p-3 text-sm">{name}</div>}
          <span className="block px-2 pt-2 text-sm font-medium">{name}</span>
          <span className="flex min-h-12 items-center px-2 text-sm text-ctp-blue">{added ? onSetQuantity ? "+ Add another" : "In deck" : "+ Add card"}</span>
        </button>{added && onSetQuantity && <QuantityControl name={name} quantity={quantity} onChange={(value) => onSetQuantity(name, value)} />}</div>;
      })}
    </div>
    {matches.length > limit && <button type="button" onClick={() => setLimit((count) => count + 8)} className="mt-2 rounded-lg px-3 text-sm text-ctp-blue">Show more cards</button>}
  </section>;
}
