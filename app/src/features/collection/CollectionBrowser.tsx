import { setFamilyPrefix, type Card, type CollectionEntry, type CollectionUpdateLine } from "@gatcg/shared";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import CardArtTile from "../../components/CardArtTile";
import CollectionCardSheet from "./CollectionCardSheet";

import CollectionPurchase from "./CollectionPurchase";
import CollectionCardFilters from "./CollectionCardFilters";
import { emptyFilterState, filterCards } from "../cards/filters";
import { playsetProgress, playsetTarget } from "./collectionPlaysets";

export default function CollectionBrowser({ cards, entries, busy = false, preview = false, onUpdate, renderTracking, renderStatus }: {
  renderStatus?: (uuid: string) => ReactNode;
  renderTracking?: (uuid: string, name: string) => ReactNode;
  cards: Card[]; entries: CollectionEntry[]; busy?: boolean; preview?: boolean;
  onUpdate?: (lines: CollectionUpdateLine[], source: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState(() => entries.some(entry => entry.ownedQuantity > 0) ? "owned" : "all");
  const [editing, setEditing] = useState<string | null>(null);
  const [limit, setLimit] = useState(24);
  const [cardFilters, setCardFilters] = useState(emptyFilterState);
  const [sort, setSort] = useState("name");
  const quantities = useMemo(() => {
    const result = new Map<string, number>();
    for (const entry of entries) result.set(entry.cardUuid, (result.get(entry.cardUuid) ?? 0) + Math.max(0, entry.ownedQuantity));
    return result;
  }, [entries]);
  const pool = cards;
  const filteredPool = useMemo(() => filterCards(pool, cardFilters), [pool, cardFilters]);
  const playsets = playsetProgress(filteredPool, quantities);
  const ownedMatches = filteredPool.filter(card => (quantities.get(card.uuid) ?? 0) > 0).length;
  const matchingCards = filteredPool.filter(card => {
    const quantity = quantities.get(card.uuid) ?? 0;
    if (filter === "playsets") return quantity >= playsetTarget(card);
    if (filter === "incomplete") return quantity < playsetTarget(card);
    return filter === "all" || (quantity > 0) === (filter === "owned");
  }).sort((a, b) => sort === "owned" ? (quantities.get(b.uuid) ?? 0) - (quantities.get(a.uuid) ?? 0) || a.name.localeCompare(b.name) : sort === "name-desc" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
  function art(card: Card): Card {
    const preferred = card.editions.find(edition => cardFilters.printingSets?.size ? cardFilters.printingSets.has(edition.set.prefix) : cardFilters.sets.has(setFamilyPrefix(edition.set.prefix)));
    return preferred ? { ...card, editions: [preferred, ...card.editions.filter(edition => edition !== preferred)] } : card;
  }
  if (!cards.length) return <p role="status" className="mt-4 text-sm text-ctp-subtext1">Loading cards…</p>;
  return <section className="mt-3 [&_button]:min-h-12 [&_button]:min-w-12 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-ctp-blue">
    <CollectionPurchase catalog={cards} quantities={quantities} cards={matchingCards} preview={preview}>{shopping => <>
    <CollectionCardFilters  cards={pool} filters={cardFilters} onChange={value => { setCardFilters(value); setLimit(24); }}>
      <div className="grid gap-2">            <select aria-label="Sort cards" value={sort} onChange={event => setSort(event.target.value)} className="min-h-12 w-20 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-sm"><option value="name">A–Z</option><option value="name-desc">Z–A</option>{!preview && <option value="owned">Most owned</option>}</select></div>
      {!preview && <select aria-label="Ownership filter" value={filter} onChange={event => { setFilter(event.target.value); setLimit(24); }} className="min-h-12 w-24 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-sm"><option value="owned">Owned</option><option value="all">All cards</option><option value="missing">Missing</option><option value="playsets">Playsets complete</option><option value="incomplete">Needs copies</option></select>}

      {shopping.controls}
    </CollectionCardFilters>
    {!preview && (cardFilters.sets.size > 0 || cardFilters.subtypes.size > 0 || cardFilters.name || cardFilters.printingSets?.size) && <div className="my-2 text-sm text-ctp-subtext1"><p>{ownedMatches} / {filteredPool.length} owned · {filteredPool.length - ownedMatches} missing · {playsets.complete} playsets</p><progress aria-label="Matching card completion" value={ownedMatches} max={filteredPool.length || 1} className="w-full accent-ctp-blue"/><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs">Any physical printing counts</span><button type="button" onClick={() => setFilter("missing")} className="text-sm text-ctp-blue">Show missing</button></div></div>}
      {!preview && !entries.some(entry => entry.ownedQuantity > 0) && <p className="my-2 text-sm text-ctp-subtext1">Start with a card below. Add copies, then save your quantities together.</p>}
      {!matchingCards.length && <p role="status" className="my-6 text-sm">No cards match these filters.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{matchingCards.slice(0, limit).map(card => {
        const quantity = quantities.get(card.uuid) ?? 0;
        const complete = quantity >= playsetTarget(card);
        const canonical = entries.find(entry => entry.cardUuid === card.uuid && !entry.editionUuid);
        const update = (owned: number, proxies = canonical?.proxyQuantity ?? 0) => onUpdate?.([{ cardUuid: card.uuid, cardName: card.name, quantity: Math.max(0, owned), proxyQuantity: proxies }], "Collection adjustment");
        const content = <><CardArtTile card={art(card)} name={card.name} /><span className="mt-1 flex min-h-12 items-center text-sm font-medium">{card.name}</span></>;
        return <article key={card.uuid} className={`min-w-0 rounded-xl border bg-ctp-mantle p-2 ${shopping.active && shopping.choices[card.uuid] ? "border-ctp-blue ring-2 ring-ctp-blue/30" : "border-ctp-surface1"}`}>
          {shopping.active ? <button type="button" aria-label={`${shopping.choices[card.uuid] ? "Deselect" : "Select"} ${card.name} to buy`} aria-pressed={!!shopping.choices[card.uuid]} onClick={() => shopping.choose(card.uuid, card.name, shopping.choices[card.uuid] ? 0 : 1)} className="block w-full rounded text-left">{content}<span className="text-sm text-ctp-blue">{shopping.choices[card.uuid] ? "✓ Selected" : "Select to buy"}</span></button> : preview ? <Link to={`/cards/${card.slug}`} className="block rounded">{content}</Link> : <button type="button" aria-label={`Manage ${card.name}`} onClick={() => setEditing(card.uuid)} className="block w-full rounded text-left">{content}</button>}
          {!preview && <p className="mt-1 text-xs text-ctp-subtext1">{quantity} / {playsetTarget(card)} owned{complete ? " · ✓ Playset" : ""}</p>}
          {!preview && renderStatus?.(card.uuid)}
          {!preview && !shopping.active && <>
            <div className="mt-2 flex items-center gap-2"><button type="button" disabled={busy || !quantity} aria-label={`Remove one ${card.name}`} onClick={() => { if (entries.some(entry => entry.cardUuid === card.uuid && entry.editionUuid && entry.ownedQuantity > 0)) setEditing(card.uuid); else void update((canonical?.ownedQuantity ?? 0) - 1); }} className="flex-1 rounded-lg border border-ctp-surface1 disabled:opacity-40">−</button><button type="button" disabled={busy} aria-label={`Add one ${card.name}`} onClick={() => void update((canonical?.ownedQuantity ?? 0) + 1)} className="flex-1 rounded-lg border border-ctp-surface1">+</button></div>
          </>}
        </article>;
      })}</div>
      {matchingCards.length > limit && <button type="button" onClick={() => setLimit(current => current + 24)} className="mt-3 rounded-lg border border-ctp-surface1 px-3 text-sm">Show more cards</button>}
    </>}</CollectionPurchase>
    {editing && cards.find(card => card.uuid === editing) && <CollectionCardSheet card={cards.find(card => card.uuid === editing)!} entries={entries} busy={busy} onUpdate={onUpdate} renderTracking={renderTracking} onDismiss={() => setEditing(null)}/>}
  </section>;
}
