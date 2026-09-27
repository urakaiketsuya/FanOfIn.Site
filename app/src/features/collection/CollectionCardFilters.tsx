import type { Card } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SearchSelectFilter from "../../components/filters/SearchSelectFilter";
import { emptyFilterState, type CardFilterState } from "../cards/filters";

export default function CollectionCardFilters({ cards, filters, onChange }: {
  cards: Card[]; filters: CardFilterState; onChange: (filters: CardFilterState) => void;
}) {
  const count = filters.classes.size + filters.types.size + filters.subtypes.size + filters.elements.size + filters.sets.size;
  function toggle(key: "classes" | "types" | "subtypes" | "elements" | "sets", value: string) {
    const values = new Set(filters[key]);
    if (values.has(value)) values.delete(value); else values.add(value);
    onChange({ ...filters, [key]: values });
  }
  const options = (key: "classes" | "types" | "subtypes" | "elements") => [...new Set(cards.flatMap(card => card[key]))].sort().map(value => ({ value, text: value.charAt(0) + value.slice(1).toLowerCase() }));
  const sets = [...new Map(cards.flatMap(card => card.editions.map(edition => [edition.set.prefix, edition.set.name] as const)))].sort((a,b) => a[1].localeCompare(b[1])).map(([value,text]) => ({value,text: `${text} (${value})`}));
  return <div className="mt-3 [&_input]:min-h-12 [&_input]:text-base">
    <input aria-label="Search collection cards" placeholder="Search names or rules text…" value={filters.name} onChange={event => onChange({ ...filters, name: event.target.value })} className="w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" />
    <details className="mt-2"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2">Card filters{count > 0 ? ` (${count})` : ""}<DisclosureChevron /></summary>
      <div className="space-y-4 rounded-xl border border-ctp-surface1 p-3">
        <SearchSelectFilter label="Subtypes" options={options("subtypes")} selected={filters.subtypes} onToggle={value => toggle("subtypes", value)} />
        <p className="text-xs text-ctp-subtext0">Choose Harmony, Melody, or another subtype. Multiple choices match either subtype.</p>
        {(["elements", "classes", "types"] as const).map(key => <MultiSelectFilter key={key} label={key.charAt(0).toUpperCase()+key.slice(1)} options={options(key)} selected={filters[key]} iconKind={key} onToggle={value => toggle(key,value)} />)}
        <SearchSelectFilter label="Sets" options={sets} selected={filters.sets} onToggle={value => toggle("sets",value)} />
      </div>
    </details>
    {(count > 0 || filters.name) && <button type="button" onClick={() => onChange(emptyFilterState())} className="text-sm text-ctp-blue">Clear card filters</button>}
  </div>;
}
