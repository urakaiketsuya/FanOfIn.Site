import type { DeckFormat } from "@gatcg/shared";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useMemo, useState, type ReactNode } from "react";
import type { Card } from "@gatcg/shared";
import { automaticDeckSection, type DeckEdit, type EditableDeck } from "../../lib/deckEditing";
import { deckDestinationEligibility } from "../../lib/deckSectionEligibility";
import { rarityLabel, rarityOptions } from "../../features/cards/rarities";
import CardResultsToolbar from "../CardResultsToolbar";
import DialogSheet from "../ui/DialogSheet";
import DisclosureChevron from "../DisclosureChevron";
import CardSearchResults from "./CardSearchResults";
import { emptyCatalogFilters, filterCatalog, sortCatalogNames, type CatalogSort, type CatalogFilters } from "./catalogFilters";

export default function CardBrowser({ format = "UNKNOWN", query, onQuery, destination, onDestination, names, catalog, deck, onEdit, onAdded, owned, collectionStatus, identityElements, suggestedNames, evidence, suppressResults = false, sourceControl, renderStats, statsControls }: {
  format?: DeckFormat;
  renderStats?: (name: string) => ReactNode; statsControls?: ReactNode;
  query: string; onQuery: (query: string) => void;
  destination: "automatic" | "sideboard" | "maybeboard"; onDestination: (value: "automatic" | "sideboard" | "maybeboard") => void;
  names: string[]; catalog: Map<string, Card>; deck: EditableDeck; onEdit: (edit: DeckEdit) => void; onAdded?: () => void;
  owned?: ReadonlyMap<string, number>; collectionStatus?: string; identityElements?: ReadonlySet<string>;
  sourceControl?: ReactNode; suppressResults?: boolean; suggestedNames?: string[]; evidence?: ReadonlyMap<string, string>;
}) {
  const sync = useSyncProgress();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(emptyCatalogFilters);
  const [sort, setSort] = useState<CatalogSort>("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionError, setSelectionError] = useState("");
  const cards = useMemo(() => [...catalog.values()], [catalog]);
  const options = (key: "elements" | "types" | "subtypes") => [...new Set(cards.flatMap(card => card[key]))].sort();
  const matches = useMemo(() => {
    const allowed = new Set(filterCatalog(cards, query, filters, owned, identityElements).map(card => card.name));
    const pool = [...new Set(suggestedNames ?? names)];
    return sortCatalogNames(pool.filter(name => allowed.has(name) || (!catalog.has(name) && !Object.values(filters).some(Boolean) && name.toLowerCase().includes(query.toLowerCase()))), catalog, sort);
  }, [cards, query, filters, owned, identityElements, suggestedNames, names, catalog, sort]);
  const active = Object.entries(filters).filter(([, value]) => Boolean(value)) as [keyof CatalogFilters, string | boolean][];
  const labels: Record<keyof CatalogFilters, string> = { rarity: "Rarity", element: "Element", type: "Type", subtype: "Subtype", costType: "Cost", maxCost: "Maximum cost", ownedOnly: "Owned only", availableElements: "Available elements" };
  const sectionFor = (name: string) => destination === "automatic" ? automaticDeckSection(catalog.get(name)) : destination;
  const quantityFor = (name: string) => deck[sectionFor(name)].find(line => line.card === name)?.quantity ?? 0;
  function toggleSelection(name: string) {
    setSelected(current => { const next = new Set(current); if (next.has(name)) next.delete(name); else next.add(name); return next; });
    setSelectionError("");
  }
  function addSelected(quantity: number) {
    const additions = [...selected].map(name => ({name, section: sectionFor(name), quantity}));
    const invalid = additions.filter(item => !deckDestinationEligibility(catalog.get(item.name), item.section).allowed);
    if (invalid.length) { setSelectionError(`Cannot add ${invalid.map(item=>item.name).join(", ")} to this destination. Choose another destination or deselect these cards.`); return; }
    if (!additions.length) return;
    onEdit({type:"add-many", additions});
    setSelected(new Set());
    setSelectionError("");
    onAdded?.();
  }
  return <>
    <CardResultsToolbar query={query} onQuery={onQuery} onSubmit={() => { if (matches.includes(query)) toggleSelection(query); }}>
    <div className={`grid w-full items-center gap-2 ${sourceControl ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"}`}>
      {sourceControl}
      <label className="flex min-w-0 items-center gap-1 text-sm text-ctp-subtext1"><span className="sr-only">Add to</span><select aria-label="Add to" value={destination} onChange={event => onDestination(event.target.value as typeof destination)} className="min-h-12 w-full min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-xs"><option value="automatic">Deck</option><option value="sideboard">Sideboard</option><option value="maybeboard">Maybeboard</option></select></label>
      <button type="button" aria-expanded={filterOpen} aria-haspopup="dialog" onClick={event=>{event.currentTarget.focus();setFilterOpen(open=>!open);}} className="flex min-h-12 items-center gap-1 rounded-lg border border-ctp-surface1 px-2 text-sm">Options{active.length ? ` (${active.length})` : ""}<DisclosureChevron /></button>
    </div>
    </CardResultsToolbar>
    {filterOpen && <DialogSheet title="Browse options" onDismiss={()=>setFilterOpen(false)} dismissLabel="Show cards">
    <label className="mt-2 flex items-center justify-between gap-2 text-sm">Sort<select aria-label="Sort cards" value={sort} onChange={event=>setSort(event.target.value as CatalogSort)} className="min-h-12 min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="cost">Cost low to high</option><option value="cost-desc">Cost high to low</option><option value="element">Element</option></select></label>
    {statsControls}
      <div className="grid grid-cols-1 gap-3 pb-3 sm:grid-cols-2">
        {([['element','elements'],['type','types'],['subtype','subtypes']] as const).map(([key,values]) => <label key={key} className="text-sm">{labels[key]}<select value={filters[key]} onChange={e => setFilters(f => ({...f,[key]:e.target.value}))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="">All</option>{options(values).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
        <label className="text-sm">Rarity<select value={filters.rarity ?? ""} onChange={e => setFilters(f => ({...f, rarity:e.target.value}))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="">All rarities</option>{rarityOptions(cards).map(option => <option key={option.value} value={option.value}>{option.text}</option>)}</select></label>
        <label className="text-sm">Cost type<select value={filters.costType} onChange={e => setFilters(f=>({...f,costType:e.target.value}))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="">All</option><option value="memory">Memory</option><option value="reserve">Reserve</option></select></label>
        <label className="text-sm">Maximum cost<input type="number" min={0} value={filters.maxCost} onChange={e=>setFilters(f=>({...f,maxCost:e.target.value}))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2" /></label>
        <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={filters.availableElements} disabled={!identityElements?.size} onChange={e=>setFilters(f=>({...f,availableElements:e.target.checked}))} />Available deck elements</label>
        <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={filters.ownedOnly} disabled={!owned} onChange={e=>setFilters(f=>({...f,ownedOnly:e.target.checked}))} />Only cards I own</label>
        {!owned && <p className="text-xs text-ctp-subtext0">{collectionStatus ?? "Open your collection to load ownership filters."}</p>}
        {!identityElements?.size && <p className="text-xs text-ctp-subtext0">Add Material cards to enable the element filter.</p>}
      </div>
      {!!active.length && <button type="button" onClick={()=>setFilters(emptyCatalogFilters())} className="min-h-12 text-sm text-ctp-blue">Clear filters</button>}
    </DialogSheet>}
    {!!active.length && <div className="mt-2 flex flex-wrap gap-2" aria-label="Active card filters">{active.map(([key,value]) => <button type="button" key={key} onClick={()=>setFilters(f=>({...f,[key]:typeof value === "boolean" ? false : ""}))} className="min-h-12 rounded-full border border-ctp-blue px-3 text-xs text-ctp-blue" aria-label={`Remove ${labels[key]} filter`}>{labels[key]}{typeof value === "string" ? `: ${key === "rarity" ? rarityLabel(value) : value}` : ""} ×</button>)}</div>}
    {suppressResults ? null : !names.length ? <p role={sync.phase === "error" ? "alert" : "status"} className="py-4 text-sm">{sync.phase === "error" ? "Card catalog could not load. Check your connection and reload to try again." : sync.phase === "done" ? "No cards are available in the catalog yet." : "Loading card catalog…"}</p> : <CardSearchResults format={format} key={JSON.stringify([query, filters, sort, suggestedNames !== undefined])} query={query} names={matches} catalog={catalog} chosen={new Map()} filtered renderStats={renderStats} evidence={evidence} owned={owned} quantityFor={quantityFor} selected={selected} onToggleSelection={toggleSelection} onAdd={toggleSelection} onSetQuantity={(name, quantity)=>onEdit(quantity === 0 ? {type:"remove",section:sectionFor(name),name} : {type:"quantity",section:sectionFor(name),name,quantity})} />}
    {!!selected.size && <div className="sticky bottom-0 z-10 mt-3 rounded-xl border border-ctp-blue bg-ctp-base p-3 shadow-lg">
      <details><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm">{selected.size} selected<DisclosureChevron /></summary><div className="max-h-40 overflow-y-auto">{[...selected].map(name=><button key={name} type="button" onClick={()=>toggleSelection(name)} aria-label={`Deselect ${name}`} className="flex min-h-12 w-full items-center justify-between gap-2 text-left text-sm">{name}<span aria-hidden="true">×</span></button>)}</div></details>
      {[...selected].some(name=>!matches.includes(name)) && <p className="mb-2 text-xs text-ctp-subtext1">{[...selected].filter(name=>!matches.includes(name)).length} selected outside these results.</p>}
      {selectionError && <p role="alert" className="mb-2 text-sm text-ctp-yellow">{selectionError}</p>}
      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => addSelected(1)} className="min-h-12 rounded-lg border border-ctp-blue px-3 text-sm font-semibold text-ctp-blue">Add 1 each</button><button type="button" onClick={() => addSelected(4)} className="min-h-12 rounded-lg bg-ctp-blue px-3 text-sm font-semibold text-ctp-base">Add playset</button><button type="button" onClick={()=>{setSelected(new Set());setSelectionError("");}} className="col-span-2 min-h-12 rounded-lg px-3 text-sm">Clear</button></div>
    </div>}
  </>;
}
