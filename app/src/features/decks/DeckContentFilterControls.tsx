import FilterQuery from "../../components/filters/FilterQuery";
import { useMemo, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { gatcgApi } from "../../lib/api/client";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SearchSelectFilter from "../../components/filters/SearchSelectFilter";
import SegmentedFilter from "../../components/filters/SegmentedFilter";
import { toggleSetValue } from "../../components/filters/filterUtils";
import { useCardCatalog } from "../cards/useCardCatalog";
import type { DeckContentFilterState } from "./deckContentFilters";

export default function DeckContentFilterControls({ filters, setFilters }: {
  filters: DeckContentFilterState;
  setFilters: (update: (previous: DeckContentFilterState) => DeckContentFilterState) => void;
}) {
  const catalog = useCardCatalog();
  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const [isPending, startTransition] = useTransition();
  const cardNames = useMemo(() => Array.from(new Set(catalog.map((card) => card.name))).sort(), [catalog]);
  const setOptions = useMemo(() => {
    const sets = new Map<string, string>();
    for (const card of catalog) for (const edition of card.editions) sets.set(edition.set.prefix, `${edition.set.name} (${edition.set.prefix})`);
    return Array.from(sets, ([value, text]) => ({ value, text })).sort((a, b) => a.text.localeCompare(b.text));
  }, [catalog]);
  const update = (fn: (previous: DeckContentFilterState) => DeckContentFilterState) => startTransition(() => setFilters(fn));

  return <>
    {isPending && <p role="status" className="text-sm">Recalculating…</p>}
    <FilterQuery allowText={false} text="" facets={filters} allowed={["classes", "types", "subtypes", "elements", "sets"]} onChange={(_text, facets) => update(f => ({...f, ...facets}))} />
    <SearchSelectFilter label="Cards in deck" options={cardNames.map(value => ({value, text:value}))} selected={new Set(filters.cards)} onToggle={value => update(f => ({...f, cards: [...toggleSetValue(new Set(f.cards), value)]}))} />
    {options.data && <>
      <MultiSelectFilter label="Card class" options={options.data.class} selected={filters.classes} onToggle={(value) => update((f) => ({ ...f, classes: toggleSetValue(f.classes, value) }))} iconKind="classes" />
      <MultiSelectFilter label="Card type" options={options.data.type} selected={filters.types} onToggle={(value) => update((f) => ({ ...f, types: toggleSetValue(f.types, value) }))} iconKind="types" />
      <SearchSelectFilter label="Subtype" options={options.data.subtype} selected={filters.subtypes} onToggle={(value) => update((f) => ({ ...f, subtypes: toggleSetValue(f.subtypes, value) }))} />
      <MultiSelectFilter label="Card element" options={options.data.element} selected={filters.elements} onToggle={(value) => update((f) => ({ ...f, elements: toggleSetValue(f.elements, value) }))} iconKind="elements" />
      <SearchSelectFilter label="Set" options={setOptions} selected={filters.sets} onToggle={(value) => update((f) => ({ ...f, sets: toggleSetValue(f.sets, value) }))} />
      <SegmentedFilter label="Card speed" options={[{ value: "any", label: "All" }, { value: "fast", label: "Fast" }, { value: "normal", label: "Normal" }]} value={filters.speed} onChange={(speed) => update((f) => ({ ...f, speed }))} />
    </>}
  </>;
}
