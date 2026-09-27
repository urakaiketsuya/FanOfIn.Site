import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card, CollectionEntry, CollectionUpdateLine } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";
import CollectionCardFilters from "./CollectionCardFilters";
import { emptyFilterState, filterCards } from "../cards/filters";
import { collectionMilestone, collectionSetProgress } from "./collectionProgress";

export default function CollectionSets({ cards, entries, busy = false, preview = false, onUpdate, onPrintings }: {
  cards: Card[]; entries: CollectionEntry[]; busy?: boolean; preview?: boolean;
  onUpdate?: (lines: CollectionUpdateLine[], source: string) => Promise<void>;
  onPrintings?: (cardUuid: string) => void;
}) {
  const sets = useMemo(() => collectionSetProgress(cards, entries), [cards, entries]);
  const [prefix, setPrefix] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "owned" | "missing">("all");
  const [limit, setLimit] = useState(24);
  const [browseAll, setBrowseAll] = useState(false);
  const [cardFilters, setCardFilters] = useState(emptyFilterState);
  const [sort, setSort] = useState("name");
  const quantities = useMemo(() => {
    const result = new Map<string, number>();
    for (const entry of entries) result.set(entry.cardUuid, (result.get(entry.cardUuid) ?? 0) + Math.max(0, entry.ownedQuantity));
    return result;
  }, [entries]);
  const selected = browseAll ? { name: "All collection cards", prefix: "", cards, quantities, owned: cards.filter(card => (quantities.get(card.uuid) ?? 0) > 0).length, total: cards.length, percent: cards.length ? Math.floor(cards.filter(card => (quantities.get(card.uuid) ?? 0) > 0).length * 100 / cards.length) : 0 } : sets.find((set) => set.prefix === prefix);
  const filteredPool = useMemo(() => filterCards(selected?.cards ?? [], cardFilters), [selected?.cards, cardFilters]);
  const ownedMatches = filteredPool.filter(card => (quantities.get(card.uuid) ?? 0) > 0).length;
  const matchingSets = sets.filter((set) => `${set.name} ${set.prefix}`.toLowerCase().includes(query.toLowerCase()));
  const matchingCards = filteredPool.filter((card) => filter === "all" || ((quantities.get(card.uuid) ?? 0) > 0) === (filter === "owned")).sort((a,b) => {
    if (sort === "owned") return (quantities.get(b.uuid) ?? 0) - (quantities.get(a.uuid) ?? 0) || a.name.localeCompare(b.name);
    return sort === "name-desc" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });
  function openSet(value: string) { setBrowseAll(false); setCardFilters(emptyFilterState()); setPrefix(value); setFilter("all"); setLimit(24); }
  function art(card: Card, set: string): Card { return { ...card, editions: [...card.editions.filter((edition) => edition.set.prefix === set), ...card.editions.filter((edition) => edition.set.prefix !== set)] }; }
  if (!cards.length) return <p role="status" className="mt-4 text-sm text-ctp-subtext1">Loading the set catalog…</p>;
  return <section className="mt-4 [&_button]:min-h-12 [&_button]:min-w-12 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-ctp-blue">
    {!selected ? <>
      <h2 className="text-lg font-semibold">{preview ? "Explore sets" : "Your set progress"}</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">One physical copy of each unique card. Any printing counts; proxies and extra copies don’t increase completion.</p>
      {!preview && <p className="mt-2 text-sm text-ctp-blue">{sets.filter((set) => set.owned > 0).length} sets started · {sets.filter((set) => set.owned === set.total).length} complete</p>}
      <button type="button" onClick={() => { setBrowseAll(true); setFilter("all"); setLimit(24); }} className="mt-3 rounded-lg bg-ctp-blue px-4 text-ctp-base">Browse all cards</button>
      <input aria-label="Find a set" placeholder="Find a set…" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-3 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" />
      {!matchingSets.length && <p role="status" className="mt-4 text-sm">No sets match that search.</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{matchingSets.map((set) => <button key={set.prefix} type="button" onClick={() => openSet(set.prefix)} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 text-left hover:border-ctp-blue">
        <CardArtTile card={art(set.cards[0], set.prefix)} name={set.cards[0].name} />
        <span className="mt-2 block text-sm font-semibold">{set.name}</span><span className="block text-xs text-ctp-subtext0">{set.prefix} · {set.cards[0].name}</span>
        {!preview && <><span className="mt-2 block text-sm">{set.owned} / {set.total} cards · {set.percent}%</span><progress aria-label={`${set.name} completion`} value={set.owned} max={set.total} className="mt-2 h-2 w-full accent-ctp-blue" /><span className="mt-1 block text-xs text-ctp-blue">{collectionMilestone(set.owned, set.total)}</span></>}
        {preview && <span className="mt-2 block text-sm">{set.total} unique cards</span>}
      </button>)}</div>
    </> : <>
      <button type="button" onClick={() => { setPrefix(""); setBrowseAll(false); }} className="mb-2 rounded-lg px-3 text-sm text-ctp-blue">← All sets</button>
      <h2 className="text-xl font-semibold">{selected.name}</h2>
      {!preview && <div className="mt-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3"><p className="text-sm">{selected.owned} / {selected.total} unique cards · {selected.percent}%</p><progress aria-label={`${selected.name} completion`} value={selected.owned} max={selected.total} className="mt-2 h-2 w-full accent-ctp-blue" /><p className="mt-2 text-sm text-ctp-blue">{collectionMilestone(selected.owned, selected.total)}{selected.owned < selected.total ? ` · ${selected.total - selected.owned} cards left` : " · Every card represented!"}</p><p className="mt-1 text-xs text-ctp-subtext0">Current ownership milestone. Progress changes when you add or remove cards.</p></div>}
      <details className="mt-2 text-sm text-ctp-subtext1"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-1">What counts?<DisclosureChevron /></summary><p>Each distinct card appearing in this set counts once, including cards with alternate editions. A physical copy from any set counts. Exact-printing entries and unspecified printings are pooled; proxies are excluded. This measures card coverage, not completion of every printing. Totals follow the current catalog.</p></details>
      <CollectionCardFilters cards={selected.cards} filters={cardFilters} onChange={value => { setCardFilters(value); setLimit(24); }} />
      <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">Sort cards<select value={sort} onChange={event => { setSort(event.target.value); setLimit(24); }} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option>{!preview && <option value="owned">Most owned</option>}</select></label>
      <p role="status" className="mt-3 text-sm">{preview ? `${filteredPool.length} matching cards` : `${ownedMatches} of ${filteredPool.length} matching cards owned · ${filteredPool.length - ownedMatches} missing`}</p>
      {!preview && <div role="group" aria-label="Set card filter" className="my-3 flex flex-wrap gap-2">{(["all", "owned", "missing"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(24); }} className={`rounded-lg border px-3 text-sm capitalize ${filter === value ? "border-ctp-blue bg-ctp-blue/10 text-ctp-blue" : "border-ctp-surface1"}`}>{value}</button>)}</div>}
      {!matchingCards.length && <p role="status" className="my-4 text-sm">{filteredPool.length === 0 ? "No cards match these filters." : filter === "missing" ? "You own every matching card!" : "No owned cards match these filters yet."}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{matchingCards.slice(0, limit).map((card) => {
        const quantity = selected.quantities.get(card.uuid) ?? 0;
        const canonical = entries.find((entry) => entry.cardUuid === card.uuid && !entry.editionUuid);
        const update = (delta: number) => onUpdate?.([{ cardUuid: card.uuid, cardName: card.name, quantity: Math.max(0, (canonical?.ownedQuantity ?? 0) + delta), proxyQuantity: canonical?.proxyQuantity ?? 0 }], "Set progress adjustment");
        return <article key={card.uuid} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2"><Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={art(card, selected.prefix)} name={card.name} /><span className="mt-2 flex min-h-12 items-center text-sm font-medium">{card.name}</span></Link>
          {!preview && <><p className={`text-xs ${quantity ? "text-ctp-green" : "text-ctp-subtext0"}`}>{quantity ? `${quantity} owned` : "Missing"}</p>
          {quantity === 0 && <button type="button" disabled={busy} onClick={() => void update(1)} className="mt-2 w-full rounded-lg bg-ctp-blue px-2 text-sm text-ctp-base disabled:opacity-40" aria-label={`Add one ${card.name}`}>+ Add one</button>}
          <details className="mt-1"><summary className="flex min-h-12 cursor-pointer list-none items-center text-xs">Adjust copies<DisclosureChevron /></summary><p className="text-xs text-ctp-subtext0">Unspecified printing: {canonical?.ownedQuantity ?? 0}</p><div className="mt-2 flex gap-2"><button type="button" disabled={busy || !canonical?.ownedQuantity} onClick={() => void update(-1)} aria-label={`Remove one unspecified printing of ${card.name}`} className="flex-1 rounded-lg border border-ctp-surface1 disabled:opacity-40">−</button><button type="button" disabled={busy} onClick={() => void update(1)} aria-label={`Add one unspecified printing of ${card.name}`} className="flex-1 rounded-lg border border-ctp-surface1 disabled:opacity-40">+</button></div><button type="button" onClick={() => onPrintings?.(card.uuid)} className="mt-1 text-xs text-ctp-blue">Manage exact printings</button></details></>}
        </article>;
      })}</div>
      {matchingCards.length > limit && <button type="button" onClick={() => setLimit((current) => current + 24)} className="mt-3 rounded-lg border border-ctp-surface1 px-3 text-sm">Show more cards</button>}
    </>}
  </section>;
}
