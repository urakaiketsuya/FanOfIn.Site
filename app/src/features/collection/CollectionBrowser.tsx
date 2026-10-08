import { type Card, type CollectionEntry, type CollectionUpdateLine } from "@gatcg/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import CardResult from "../../components/CardResult";
import CollectionCardSheet from "./CollectionCardSheet";

import CollectionPurchase from "./CollectionPurchase";
import CollectionCardFilters from "./CollectionCardFilters";
import { emptyFilterState, filterCards, matchesEdition } from "../cards/filters";
import { playsetProgress, playsetTarget } from "./collectionPlaysets";

export default function CollectionBrowser({ cards, entries, busy = false, preview = false, onUpdate, renderTracking, renderStatus, focusCardUuid, onReviewDraft }: {
  focusCardUuid?: string | null; onReviewDraft?: () => void;
  renderStatus?: (uuid: string) => ReactNode;
  renderTracking?: (uuid: string, name: string) => ReactNode;
  cards: Card[]; entries: CollectionEntry[]; busy?: boolean; preview?: boolean;
  onUpdate?: (lines: CollectionUpdateLine[], source: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState(() => entries.some(entry => entry.ownedQuantity > 0) ? "owned" : "all");
  const [editing, setEditing] = useState<string | null>(null);
  const [limit, setLimit] = useState(24);
  const [cardFilters, setCardFilters] = useState(emptyFilterState);
  const focusedCardName = cards.find(card => card.uuid === focusCardUuid)?.name;
  useEffect(() => {
    if (!focusCardUuid || !focusedCardName) return;
    setFilter("all"); setCardFilters({ ...emptyFilterState(), name: focusedCardName });
    setEditing(focusCardUuid); setLimit(24);
  }, [focusCardUuid, focusedCardName]);
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
    const preferred = card.editions.find(edition => matchesEdition(edition, cardFilters));
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
    {!preview && Boolean(cardFilters.sets.size > 0 || cardFilters.subtypes.size > 0 || cardFilters.name || cardFilters.printingSets?.size || cardFilters.rarities?.size) && <div className="my-2 text-sm text-ctp-subtext1"><p>{ownedMatches} / {filteredPool.length} owned · {filteredPool.length - ownedMatches} missing · {playsets.complete} playsets</p><progress aria-label="Matching card completion" value={ownedMatches} max={filteredPool.length || 1} className="w-full accent-ctp-blue"/><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs">Any physical printing counts</span><button type="button" onClick={() => setFilter("missing")} className="text-sm text-ctp-blue">Show missing</button></div></div>}
      {!preview && !entries.some(entry => entry.ownedQuantity > 0) && <p className="my-2 text-sm text-ctp-subtext1">Start with a card below. Add copies, then save your quantities together.</p>}
      {!matchingCards.length && <div className="my-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><p role="status" className="font-semibold">No cards match these filters.</p><p className="mt-1 text-sm text-ctp-subtext1">Try another card name or browse the full catalog.</p><Button className="mt-3" onClick={() => { setCardFilters(emptyFilterState()); setFilter("all"); setLimit(24); }}>Clear filters</Button></div>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3 lg:grid-cols-4">{matchingCards.slice(0, limit).map(card => {
        const quantity = quantities.get(card.uuid) ?? 0;
        const complete = quantity >= playsetTarget(card);
        const canonical = entries.find(entry => entry.cardUuid === card.uuid && !entry.editionUuid && (!entry.finish || entry.finish === "unspecified"));
        const update = (owned: number, proxies = canonical?.proxyQuantity ?? 0) => onUpdate?.([{ cardUuid: card.uuid, cardName: card.name, quantity: Math.max(0, owned), proxyQuantity: proxies }], "Collection adjustment");
        return <CardResult key={card.uuid} card={art(card)} name={card.name} selected={shopping.active && !!shopping.choices[card.uuid]} onSelect={shopping.active ? () => shopping.choose(card.uuid, card.name, shopping.choices[card.uuid] ? 0 : 1) : undefined} onManage={!preview ? () => setEditing(card.uuid) : undefined}>
          {!preview && <p key={quantity} className="quantity-arrive mt-1 rounded text-xs text-ctp-subtext1">{quantity} / {playsetTarget(card)} owned{complete ? " · ✓ Playset" : ""}</p>}
          {!preview && entries.some(entry => entry.cardUuid === card.uuid && (entry.editionUuid || (entry.finish && entry.finish !== "unspecified")) && entry.ownedQuantity > 0) && <p className="mt-1 text-xs text-ctp-subtext1">{entries.filter(entry => entry.cardUuid === card.uuid && (entry.editionUuid || (entry.finish && entry.finish !== "unspecified")) && entry.ownedQuantity > 0).length} identified pools · {entries.filter(entry => entry.cardUuid === card.uuid && entry.finish === "foil").reduce((sum, entry) => sum + entry.ownedQuantity, 0)} foil</p>}
          {!preview && renderStatus?.(card.uuid)}
          {!preview && !shopping.active && <>
            <div className="mt-2 flex items-center gap-2"><button type="button" disabled={busy || !quantity} aria-label={`Remove one ${card.name}`} onClick={() => { if (entries.some(entry => entry.cardUuid === card.uuid && (entry.editionUuid || (entry.finish && entry.finish !== "unspecified")) && entry.ownedQuantity > 0)) setEditing(card.uuid); else void update((canonical?.ownedQuantity ?? 0) - 1); }} className="min-h-12 min-w-12 flex-1 rounded-lg border border-ctp-surface1 disabled:opacity-40">−</button><button type="button" disabled={busy} aria-label={`Add one ${card.name}`} onClick={() => void update((canonical?.ownedQuantity ?? 0) + 1)} className="min-h-12 min-w-12 flex-1 rounded-lg border border-ctp-surface1">+</button></div>
          </>}
        </CardResult>;
      })}</div>
      {matchingCards.length > limit && <button type="button" onClick={() => setLimit(current => current + 24)} className="mt-3 rounded-lg border border-ctp-surface1 px-3 text-sm">Show more cards</button>}
    </>}</CollectionPurchase>
    {editing && cards.find(card => card.uuid === editing) && <CollectionCardSheet card={cards.find(card => card.uuid === editing)!} entries={entries} busy={busy} onUpdate={onUpdate} renderTracking={renderTracking} onReviewDraft={onReviewDraft ? () => { setEditing(null); onReviewDraft(); } : undefined} onDismiss={() => setEditing(null)}/>}
  </section>;
}
