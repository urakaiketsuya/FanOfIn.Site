import { useState, type ReactNode } from "react";
import DialogSheet from "../../components/ui/DialogSheet";
import CardResultsToolbar from "../../components/CardResultsToolbar";
import { setFamily, type Card } from "@gatcg/shared";

import { rarityLabel, rarityOptions } from "../cards/rarities";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SearchSelectFilter from "../../components/filters/SearchSelectFilter";
import { emptyFilterState, type CardFilterState } from "../cards/filters";

export default function CollectionCardFilters({ cards, filters, onChange, children, secondary }: {
  children?: ReactNode; secondary?: ReactNode;
  cards: Card[]; filters: CardFilterState; onChange: (filters: CardFilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = filters.classes.size + filters.types.size + filters.subtypes.size + filters.elements.size + filters.sets.size + (filters.printingSets?.size ?? 0) + (filters.rarities?.size ?? 0);
  function toggle(key: "classes" | "types" | "subtypes" | "elements" | "sets" | "printingSets" | "rarities", value: string) {
    const values = new Set(filters[key]);
    if (values.has(value)) values.delete(value); else values.add(value);
    onChange({ ...filters, [key]: values });
  }
  const options = (key: "classes" | "types" | "subtypes" | "elements") => [...new Set(cards.flatMap(card => card[key]))].sort().map(value => ({ value, text: value.charAt(0) + value.slice(1).toLowerCase() }));
  const sets = [...new Map(cards.flatMap(card => card.editions.map(edition => [setFamily(edition.set).prefix, setFamily(edition.set).name] as const)))].sort((a,b) => a[1].localeCompare(b[1])).map(([value,text]) => ({value,text: `${text} (${value})`}));
  const printings = [...new Map(cards.flatMap(card => card.editions.map(ed => [ed.set.prefix, ed.set.name] as const)))].map(([value,text]) => ({value,text}));
  return <div className="mt-3 [&_input]:min-h-12 [&_input]:text-base">
    <CardResultsToolbar label="Search collection cards" query={filters.name} onQuery={value => onChange({...filters, name: value})}>
      {children}<button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={event => { event.currentTarget.focus(); setOpen(true); }} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm">Filters{count > 0 ? ` (${count})` : ""}</button>
    </CardResultsToolbar>
    <div className="flex flex-wrap gap-2">{(["subtypes", "elements", "classes", "types", "sets", "printingSets", "rarities"] as const).flatMap(key => [...(filters[key] ?? [])].map(value => <button key={`${key}:${value}`} type="button" aria-label={`Remove ${key === "rarities" ? rarityLabel(value) : value} filter`} onClick={() => toggle(key, value)} className="min-h-12 rounded-full border border-ctp-surface1 px-3 text-xs">{key === "rarities" ? rarityLabel(value) : value} ×</button>))}</div>
    {open && <DialogSheet title="Filter collection" dismissLabel="Show cards" onDismiss={() => setOpen(false)}>
      <div className="[&_button]:min-h-12 [&_button]:min-w-12 space-y-4 rounded-xl border border-ctp-surface1 p-3">{secondary}
        <SearchSelectFilter label="Subtypes" options={options("subtypes")} selected={filters.subtypes} onToggle={value => toggle("subtypes", value)} />
        <p className="text-xs text-ctp-subtext0">Choose Harmony, Melody, or another subtype. Multiple choices match either subtype.</p>
        {(["elements", "classes", "types"] as const).map(key => <MultiSelectFilter key={key} label={key.charAt(0).toUpperCase()+key.slice(1)} options={options(key)} selected={filters[key]} iconKind={key} onToggle={value => toggle(key,value)} />)}
        <MultiSelectFilter label="Rarity" options={rarityOptions(cards)} selected={filters.rarities ?? new Set()} onToggle={value => toggle("rarities", value)} onClear={() => onChange({...filters, rarities: new Set()})} />
        <SearchSelectFilter label="Sets" options={sets} selected={filters.sets} onToggle={value => toggle("sets",value)} />
        <SearchSelectFilter label="Printing edition (optional)" options={printings} selected={filters.printingSets ?? new Set()} onToggle={value => toggle("printingSets",value)} />
        <p className="text-xs text-ctp-subtext0">Rarity and edition filters match the same printing. Ownership still counts any physical printing; manage exact printings from a card’s copy controls.</p>
      </div>
    </DialogSheet>}
    {(count > 0 || filters.name) && <button type="button" onClick={() => onChange(emptyFilterState())} className="min-h-12 px-3 text-sm text-ctp-blue">Clear card filters</button>}
  </div>;
}
