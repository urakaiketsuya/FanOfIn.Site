import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useId, useMemo, useState, type ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import { automaticDeckSection, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import DisclosureChevron from "../DisclosureChevron";
import CardSearchResults from "./CardSearchResults";
import { emptyCatalogFilters, filterCatalog, type CatalogFilters } from "./catalogFilters";

export default function CardBrowser({ query, onQuery, destination, onDestination, names, catalog, deck, onEdit, onAdded, owned, collectionStatus, identityElements, suggestedNames, evidence, suppressResults = false, sourceControl }: {
  query: string; onQuery: (query: string) => void;
  destination: "automatic" | "sideboard" | "maybeboard"; onDestination: (value: "automatic" | "sideboard" | "maybeboard") => void;
  names: string[]; catalog: Map<string, Card>; deck: EditableDeck; onEdit: (edit: DeckEdit) => void; onAdded?: () => void;
  owned?: ReadonlyMap<string, number>; collectionStatus?: string; identityElements?: ReadonlySet<string>;
  sourceControl?: ReactNode; suppressResults?: boolean; suggestedNames?: string[]; evidence?: ReadonlyMap<string, string>;
}) {
  const id = useId();
  const sync = useSyncProgress();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(emptyCatalogFilters);
  const cards = useMemo(() => [...catalog.values()], [catalog]);
  const options = (key: "elements" | "types" | "subtypes") => [...new Set(cards.flatMap(card => card[key]))].sort();
  const matches = useMemo(() => {
    const allowed = new Set(filterCatalog(cards, query, filters, owned, identityElements).map(card => card.name));
    const pool = [...new Set(suggestedNames ?? names)];
    return pool.filter(name => allowed.has(name) || (!catalog.has(name) && !Object.values(filters).some(Boolean) && name.toLowerCase().includes(query.toLowerCase())));
  }, [cards, query, filters, owned, identityElements, suggestedNames, names, catalog]);
  const active = Object.entries(filters).filter(([, value]) => Boolean(value)) as [keyof CatalogFilters, string | boolean][];
  const labels: Record<keyof CatalogFilters, string> = { element: "Element", type: "Type", subtype: "Subtype", costType: "Cost", maxCost: "Maximum cost", ownedOnly: "Owned only", availableElements: "Available elements" };
  const sectionFor = (name: string) => destination === "automatic" ? automaticDeckSection(catalog.get(name)) : destination;
  const quantityFor = (name: string) => deck[sectionFor(name)].find(line => line.card === name)?.quantity ?? 0;
  function add(name: string) {
    onEdit({ type: "quantity", section: sectionFor(name), name, quantity: quantityFor(name) + 1 });
    onAdded?.();
  }
  return <>
    <label htmlFor={id} className="sr-only">Search cards</label>
    <input id={id} value={query} onChange={event => onQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && matches.includes(query)) add(query); }} placeholder="Search names or rules text…" className="min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-base focus-visible:outline-2 focus-visible:outline-ctp-blue" />
    <div className={`mt-2 grid items-center gap-2 ${sourceControl ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"}`}>
      {sourceControl}
      <label className="flex min-w-0 items-center gap-1 text-sm text-ctp-subtext1"><span className="sr-only">Add to</span><select aria-label="Add to" value={destination} onChange={event => onDestination(event.target.value as typeof destination)} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs"><option value="automatic">Deck</option><option value="sideboard">Sideboard</option><option value="maybeboard">Maybeboard</option></select></label>
      <button type="button" aria-expanded={filterOpen} aria-controls={`${id}-filters`} onClick={()=>setFilterOpen(open=>!open)} className="flex min-h-12 items-center gap-1 rounded-lg border border-ctp-surface1 px-2 text-sm">Filters{active.length ? ` (${active.length})` : ""}<DisclosureChevron /></button>
    </div>
    {filterOpen && <div id={`${id}-filters`} className="mt-2 rounded-lg border border-ctp-surface1 p-3">
      <div className="grid grid-cols-1 gap-3 pb-3 sm:grid-cols-2">
        {([['element','elements'],['type','types'],['subtype','subtypes']] as const).map(([key,values]) => <label key={key} className="text-sm">{labels[key]}<select value={filters[key]} onChange={e => setFilters(f => ({...f,[key]:e.target.value}))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="">All</option>{options(values).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
        <label className="text-sm">Cost type<select value={filters.costType} onChange={e => setFilters(f=>({...f,costType:e.target.value}))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="">All</option><option value="memory">Memory</option><option value="reserve">Reserve</option></select></label>
        <label className="text-sm">Maximum cost<input type="number" min={0} value={filters.maxCost} onChange={e=>setFilters(f=>({...f,maxCost:e.target.value}))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2" /></label>
        <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={filters.availableElements} disabled={!identityElements?.size} onChange={e=>setFilters(f=>({...f,availableElements:e.target.checked}))} />Available deck elements</label>
        <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={filters.ownedOnly} disabled={!owned} onChange={e=>setFilters(f=>({...f,ownedOnly:e.target.checked}))} />Only cards I own</label>
        {!owned && <p className="text-xs text-ctp-subtext0">{collectionStatus ?? "Open your collection to load ownership filters."}</p>}
        {!identityElements?.size && <p className="text-xs text-ctp-subtext0">Add Material cards to enable the element filter.</p>}
      </div>
      {!!active.length && <button type="button" onClick={()=>setFilters(emptyCatalogFilters())} className="min-h-12 text-sm text-ctp-blue">Clear filters</button>}
    </div>}
    {!!active.length && <div className="mt-2 flex flex-wrap gap-2" aria-label="Active card filters">{active.map(([key,value]) => <button type="button" key={key} onClick={()=>setFilters(f=>({...f,[key]:typeof value === "boolean" ? false : ""}))} className="min-h-12 rounded-full border border-ctp-blue px-3 text-xs text-ctp-blue" aria-label={`Remove ${labels[key]} filter`}>{labels[key]}{typeof value === "string" ? `: ${value}` : ""} ×</button>)}</div>}
    {suppressResults ? null : !names.length ? <p role={sync.phase === "error" ? "alert" : "status"} className="py-4 text-sm">{sync.phase === "error" ? "Card catalog could not load. Check your connection and reload to try again." : sync.phase === "done" ? "No cards are available in the catalog yet." : "Loading card catalog…"}</p> : <CardSearchResults key={JSON.stringify([query, filters, suggestedNames !== undefined])} query={query} names={matches} catalog={catalog} chosen={new Map()} filtered evidence={evidence} owned={owned} quantityFor={quantityFor} onAdd={add} onSetQuantity={(name, quantity)=>onEdit(quantity === 0 ? {type:"remove",section:sectionFor(name),name} : {type:"quantity",section:sectionFor(name),name,quantity})} />}
  </>;
}
