import CardGridSizeControl from "../../components/CardGridSizeControl";
import { CARD_GRID_MINIMUM } from "../../lib/cardGridSize";
import { useDecklistDisplayPrefs } from "../../lib/decklistDisplayPrefs";
import { formatFilterQuery, parseFilterQuery, type SearchFacet } from "@gatcg/shared";
import FilterQuery from "../../components/filters/FilterQuery";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SearchSelectFilter from "../../components/filters/SearchSelectFilter";
import { toggleSetValue } from "../../components/filters/filterUtils";
import DialogSheet from "../../components/ui/DialogSheet";
import { Select } from "../../components/ui/FormControl";
import { groupSpoilers, searchSpoilers, spoilerSetKey } from "../../lib/spoilerCatalog";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import spoilers from "../../../../data/reference/card-spoilers-2026-11-01.json";
import CardArtTile from "../../components/CardArtTile";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "./useCardCatalog";
import { mergePreviewCards } from "../../lib/previewCards";

const facets = ["classes", "types", "subtypes", "elements"] as const;
const allowed: SearchFacet[] = [...facets, "sets", "printingSets", "rarities"];
const facetOptions = Object.fromEntries(facets.map(key => [key, [...new Set(spoilers.cards.flatMap(card => card[key]))].sort().map(value => ({ value, text: value }))]));
const sortOptions = { newest: "Newest added", oldest: "Oldest added", name: "Name A to Z", "name-desc": "Name Z to A" } as const;
const sets = groupSpoilers(spoilers.cards);
// A reveal can be a new printing of an official card: retain the revealed art.
const artwork = new Map(mergePreviewCards([], spoilers.cards, true).map(card => [card.name, card]));
const addedDate = (value: string) => new Date(value.length === 10 ? `${value}T12:00:00-05:00` : value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

export default function CardSpoilers() {
  useDocumentTitle("Card spoilers", "Unreleased Grand Archive cards by set, newest additions first.");
  const prefs = useDecklistDisplayPrefs();
  const gridSize = prefs.visualCardSize === "rows" ? "medium" : prefs.visualCardSize;
  const catalog = useCardCatalog();
  const byName = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const parsed = useMemo(() => parseFilterQuery(query), [query]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rawSort = params.get("sort") ?? "newest";
  const sort = Object.hasOwn(sortOptions, rawSort) ? rawSort as keyof typeof sortOptions : "newest";
  const rawSet = params.get("set") ?? "";
  // Preserve links to the former umbrella filter.
  const set = rawSet === "asphodel-cantabile" ? "" : spoilerSetKey(rawSet);
  const shown = searchSpoilers(query).filter(card => !set || spoilerSetKey(card.setPrefix) === set);
  const groups = groupSpoilers(shown, sort);
  const activeCount = Object.values(parsed.facets).reduce((count, values) => count + (values?.size ?? 0), 0) + (set ? 1 : 0);
  const clearFilters = () => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.delete("q"); next.delete("set");
    return next;
  });
  function update(key: string, value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    }, { replace: true });
  }
  return <PageLayout width="fluid">
    <PageHeader title="Card spoilers" />
    <div className="my-5 [&_button]:min-h-12 [&_button]:min-w-12">
      <FilterQuery text={parsed.text} facets={parsed.facets} allowed={allowed} onChange={(text, selected) => update("q", formatFilterQuery(text, selected))} />
      <div className="flex flex-wrap items-center gap-2">
        <Button aria-haspopup="dialog" onClick={event => { event.currentTarget.focus(); setFiltersOpen(true); }}>Filters{activeCount ? ` (${activeCount})` : ""}</Button>
        {set && <Button aria-label="Remove set filter" onClick={() => update("set", "")}>Set: {sets.find(group => group.prefix === set)?.name ?? set} ×</Button>}
        {(query || set) && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}
      </div>
    </div>
    {filtersOpen && <DialogSheet title="Filter spoilers" onDismiss={() => setFiltersOpen(false)} footer={<Button variant="primary" onClick={() => setFiltersOpen(false)}>Show {shown.length} spoilers</Button>}>
      <div className="space-y-4 [&_button]:min-h-12 [&_button]:min-w-12">
        <label className="block text-sm">Set<Select className="mt-2 w-full" value={set} onChange={event => update("set", event.target.value)}>
          <option value="">All sets</option>
          {sets.map(group => <option key={group.prefix} value={group.prefix}>{group.name} ({group.prefix})</option>)}
        </Select></label>
        {facets.map(key => {
          const props = {
            label: { classes: "Class", types: "Type", subtypes: "Subtype", elements: "Element" }[key],
            options: facetOptions[key],
            selected: parsed.facets[key] ?? new Set<string>(),
            onToggle: (value: string) => update("q", formatFilterQuery(parsed.text, {
              ...parsed.facets, [key]: toggleSetValue(parsed.facets[key] ?? new Set(), value),
            })),
          };
          return key === "subtypes" ? <SearchSelectFilter key={key} {...props} /> : <MultiSelectFilter key={key} {...props} iconKind={key} />;
        })}
      </div>
    </DialogSheet>}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-ctp-subtext1">{shown.length} of {spoilers.cards.length} spoilers</p>
      <label className="flex flex-wrap items-center gap-2 text-sm">Sort within sets<Select value={sort} onChange={event => update("sort", event.target.value)}>
        {Object.entries(sortOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select></label>
      <CardGridSizeControl value={gridSize} onChange={prefs.setVisualCardSize} />
    </div>
    {shown.length === 0 && <div className="space-y-3"><p>No spoilers match your filters.</p><Button onClick={clearFilters}>Clear filters</Button></div>}
    <div className="space-y-10">
      {groups.map(group => <section key={group.prefix} aria-labelledby={`set-${group.prefix}`}>
        <h2 id={`set-${group.prefix}`} className="mb-4 text-xl font-semibold">{group.name} <span className="text-sm font-normal text-ctp-subtext1">{group.cards.length} {group.cards.length === 1 ? "card" : "cards"}</span></h2>
        <div className="grid items-start gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${CARD_GRID_MINIMUM[gridSize]}), 1fr))` }}>
          {group.cards.map(card => {
            const catalogCard = byName.get(card.name);
            const content = <><CardArtTile card={artwork.get(card.name)} name={card.name} /><span className="block break-words py-2 text-sm font-medium">{card.name}</span></>;
            return <div key={card.name} className="min-w-0">
              {catalogCard ? <Link aria-label={card.name} to={`/cards/${catalogCard.slug}`} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}</Link> : content}
              <p className="text-xs text-ctp-subtext1">Added <time dateTime={card.addedAt}>{addedDate(card.addedAt)}</time></p>
            </div>;
          })}
        </div>
      </section>)}
    </div>
  </PageLayout>;
}
