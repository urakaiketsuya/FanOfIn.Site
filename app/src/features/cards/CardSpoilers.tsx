import { useBrowseParams } from "../../lib/useBrowseParams";
import "./CardSpoilers.css";
import type { CSSProperties } from "react";
import GroupedCardResults from "../../components/GroupedCardResults";
import { CARD_GROUPS, type CardGrouping } from "../../lib/cardResultGroups";
import DisclosureChevron from "../../components/DisclosureChevron";
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
import { groupSpoilers, groupSpoilerResults, sortSpoilers, searchSpoilers, spoilerSetKey } from "../../lib/spoilerCatalog";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  const [viewOpen, setViewOpen] = useState(false);
  const gridSize = prefs.visualCardSize === "rows" ? "medium" : prefs.visualCardSize;
  const catalog = useCardCatalog();
  const byName = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const [params, setParams] = useBrowseParams();
  const query = params.get("q") ?? "";
  const parsed = useMemo(() => parseFilterQuery(query), [query]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rawSort = params.get("sort") ?? "newest";
  const sort = Object.hasOwn(sortOptions, rawSort) ? rawSort as keyof typeof sortOptions : "newest";
  const rawSet = params.get("set") ?? "";
  // Preserve links to the former umbrella filter.
  const set = rawSet === "asphodel-cantabile" ? "" : spoilerSetKey(rawSet);
  const shown = searchSpoilers(query).filter(card => !set || spoilerSetKey(card.setPrefix) === set);
  const rawGrouping = params.get("group") ?? "none";
  const grouping = Object.hasOwn(CARD_GROUPS, rawGrouping) ? rawGrouping as CardGrouping : "none";
  const sorted = sortSpoilers(shown, sort);
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
    <div className="my-3 [&_button]:min-h-12 [&_button]:min-w-12">
      <FilterQuery text={parsed.text} facets={parsed.facets} allowed={allowed} onChange={(text, selected) => update("q", formatFilterQuery(text, selected))} actions={<>
        <Button aria-haspopup="dialog" onClick={event => { event.currentTarget.focus(); setFiltersOpen(true); }}>Filters{activeCount ? ` (${activeCount})` : ""}</Button>
        {set && <Button aria-label="Remove set filter" onClick={() => update("set", "")}>Set: {sets.find(group => group.prefix === set)?.name ?? set} ×</Button>}
        {(query || set) && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}
      </>} />
    </div>
    {filtersOpen && <DialogSheet title="Filter spoilers" onDismiss={() => setFiltersOpen(false)} footer={<Button variant="primary" onClick={() => setFiltersOpen(false)}>Show {shown.length} spoilers</Button>}>
      <div className="space-y-4 [&_button]:min-h-12 [&_button]:min-w-12">
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-ctp-subtext1">{shown.length} of {spoilers.cards.length} spoilers</p>
      <Select aria-label="Filter by set" className="max-w-full" value={set} onChange={event => update("set", event.target.value)}>
        <option value="">All sets</option>
        {sets.map(group => <option key={group.prefix} value={group.prefix}>{group.name}</option>)}
      </Select>
    </div>
    <GroupedCardResults items={sorted} cardFor={card => artwork.get(card.name)} grouping={grouping}
      onGrouping={value => update("group", value)} arrangeGroups={groupSpoilerResults}
      resultKey={JSON.stringify([query, set, sort, grouping])} pageSize={48}
      toolbar={<>
        <label className="flex min-w-0 flex-col gap-1 text-sm">Sort
          <Select value={sort} onChange={event => update("sort", event.target.value)}>
            {Object.entries(sortOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </label>
        <Button aria-expanded={viewOpen} aria-controls="spoiler-view" onClick={() => setViewOpen(value => !value)}>
          View · {gridSize[0].toUpperCase() + gridSize.slice(1)} <DisclosureChevron className={viewOpen ? "rotate-180" : ""} />
        </Button>
        {viewOpen && <div id="spoiler-view" className="w-full"><CardGridSizeControl value={gridSize} onChange={prefs.setVisualCardSize} /></div>}
      </>}>
      {visible => <div className={`spoiler-grid spoiler-grid--${gridSize} mt-4`} style={{ "--spoiler-card-min": CARD_GRID_MINIMUM[gridSize] } as CSSProperties}>
          {visible.map(card => {
            const catalogCard = byName.get(card.name);
            const content = <><CardArtTile card={artwork.get(card.name)} name={card.name} /><span className="block break-words py-2 text-sm font-medium">{card.name}</span></>;
            return <div key={`${card.setPrefix}:${card.name}`} className="min-w-0">
              {catalogCard ? <Link aria-label={card.name} to={`/cards/${catalogCard.slug}`} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-ctp-blue">{content}</Link> : content}
              <p className="text-xs text-ctp-subtext1">Added <time dateTime={card.addedAt}>{addedDate(card.addedAt)}</time></p>
            </div>;
          })}
      </div>}
    </GroupedCardResults>
    {shown.length === 0 && <div className="space-y-3 py-6"><p>No spoilers match your filters.</p><Button onClick={clearFilters}>Clear filters</Button></div>}
  </PageLayout>;
}
