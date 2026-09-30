import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CARD_TAG_CATEGORIES, canonicalCardTag, cardTagCategory, setFamily, setFamilyPrefix, type OptionValue } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import Tabs from "../../components/ui/Tabs";
import PageHeader from "../../components/ui/PageHeader";
import { useCardCatalog } from "./useCardCatalog";
import { editionWithTag, emptyFilterState, filterCards, matchesEdition, type CardFilterState } from "./filters";
import { useCardTags } from "./cardTags";
import FilterPanel from "../../components/filters/FilterPanel";
import MultiSelectFilter from "../../components/filters/MultiSelectFilter";
import SearchSelectFilter from "../../components/filters/SearchSelectFilter";
import SegmentedFilter from "../../components/filters/SegmentedFilter";
import { toggleSetValue } from "../../components/filters/filterUtils";
import { rarityOptions } from "./rarities";
import CardGrid from "./CardGrid";
import LoadMore from "../../components/LoadMore";
import { useFeaturedSets } from "../sets/useFeaturedSets";
import { isBoosterSet } from "../packs/boosterSets";
import { PRODUCTS } from "../products/data";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";

const PAGE_SIZE = 60;

type TabMode = "browse" | "sets";
const TABS: readonly TabMode[] = ["browse", "sets"];
const TAB_LABELS: Record<TabMode, string> = { browse: "Browse", sets: "By Set" };

export default function CardsBrowse() {
  useDocumentTitle("Cards", "Browse and search the full Grand Archive TCG card database — filter by class, element, type, and set.");
  const cards = useCardCatalog();
  const syncProgress = useSyncProgress();
  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const featuredSets = useFeaturedSets();
  const cardTags = useCardTags();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useTabParam<TabMode>("tab", TABS, "browse");
  const [filters, setFilters] = useState<CardFilterState>(() => ({
    ...emptyFilterState(),
    rarities: new Set(searchParams.getAll("rarity")),
    artist: searchParams.get("artist") ?? "",
    classes: new Set(searchParams.getAll("class")),
    types: new Set(searchParams.getAll("type")),
    subtypes: new Set(searchParams.getAll("subtype")),
    elements: new Set(searchParams.getAll("element")),
    sets: new Set(searchParams.getAll("set").map(setFamilyPrefix)),
    tags: new Set(searchParams.getAll("tag").map(canonicalCardTag)),
  }));

  const filtered = useMemo(
    () => filterCards(cards, filters, cardTags.lookup).sort((a, b) => a.name.localeCompare(b.name)),
    [cards, filters, cardTags.lookup],
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const visible = filtered.slice(0, visibleCount);
  const activeFilterCount = (filters.name.trim() ? 1 : 0) + (filters.artist.trim() ? 1 : 0) + filters.classes.size + filters.types.size + filters.subtypes.size + filters.elements.size + filters.sets.size + (filters.speed === "any" ? 0 : 1) + (filters.printingSets?.size ?? 0) + (filters.rarities?.size ?? 0) + (filters.tags?.size ?? 0);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      for (const ed of card.editions) {
        if (ed.illustrator) set.add(ed.illustrator);
      }
    }
    return Array.from(set).sort();
  }, [cards]);

  const tagOptions = useMemo<OptionValue[]>(
    () => (cardTags.data?.tags ?? []).map((tag) => ({ value: tag.name, text: `${tag.name} (${tag.cardCount})` })),
    [cardTags.data],
  );

  const printingOptions = useMemo(() => [...new Map(cards.flatMap(card => card.editions.map(ed => [ed.set.prefix, ed.set.name] as const)))].map(([value, text]) => ({ value, text })), [cards]);

  const setOptions = useMemo<OptionValue[]>(() => {
    const byPrefix = new Map<string, { name: string; releaseDate: string }>();
    for (const card of cards) {
      for (const ed of card.editions) {
        const family = setFamily(ed.set);
        if (!byPrefix.has(family.prefix)) byPrefix.set(family.prefix, { name: family.name, releaseDate: ed.set.release_date });
      }
    }
    return Array.from(byPrefix.entries())
      .sort((a, b) => b[1].releaseDate.localeCompare(a[1].releaseDate))
      .map(([prefix, s]) => ({ value: prefix, text: `${s.name} (${prefix})` }));
  }, [cards]);

  // A card can have printings across multiple sets — when the Set filter narrows to exactly one,
  // show that set's specific art (same behavior the old dedicated /sets/:prefix page had) instead
  // of always defaulting to a card's first-ever printing.
  const pickEdition = useMemo(() => {
    if (!filters.sets.size && !filters.printingSets?.size && !filters.rarities?.size && !filters.artist.trim() && !filters.tags?.size) return undefined;
    return (card: (typeof cards)[number]) => editionWithTag(card, filters, cardTags.lookup) ?? card.editions.find(ed => matchesEdition(ed, filters)) ?? card.editions[0];
  }, [filters, cardTags.lookup]);

  function browseSet(prefix: string) {
    setFilters((f) => ({ ...f, sets: new Set([prefix]), printingSets: new Set() }));
    setTab("browse");
  }

  // Only when the Set filter narrows to exactly one — a graceful no-op for any set outside the
  // hand-authored Products dataset (old/obscure prefixes), not a broken image.
  const bannerProduct = filters.sets.size === 1 ? PRODUCTS.find((p) => p.prefix === Array.from(filters.sets)[0] && p.banner) : undefined;

  return (
    <PageLayout data-component="CardsBrowse" width="full">
      <div className="[&_input]:min-h-12 [&_button]:min-h-12 [&_button]:min-w-12">
      <PageHeader
        title="Cards"
        actions={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link to="/cards/tags" className="inline-flex min-h-12 items-center text-sm text-ctp-blue">Tag galleries</Link>
            <Link to="/cards/packages" className="text-sm text-ctp-blue hover:underline">
              Packages &rarr;
            </Link>
            <Link to="/cards/stats" className="text-sm text-ctp-blue hover:underline">
              Card stats &rarr;
            </Link>
            {tab === "browse" && (
              <p className="text-sm text-ctp-subtext0">
                {filtered.length} of {cards.length} synced cards
              </p>
            )}
          </div>
        }
      />

      <div className="mt-4">
        <Tabs tabs={TABS.map((mode) => ({ key: mode, label: TAB_LABELS[mode] }))} active={tab} onChange={setTab} label="Cards view" />
      </div>

      {tab === "sets" ? (
        <div className="mt-6 space-y-8">
          <p className="text-sm text-ctp-subtext1">Browse expansions and the cards printed in each one.</p>
          {!featuredSets && <InlineState className="mt-6">Loading…</InlineState>}
          {featuredSets && featuredSets.length === 0 && <InlineState className="mt-6">No sets found.</InlineState>}
          {(featuredSets ?? []).map((group) => (
            <div key={group.uuid}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <img src={gatcgApi.imageUrl(group.image)} alt={group.name} className="h-10 w-10 rounded object-contain" />
                <h2 className="text-lg font-semibold text-ctp-text">{group.name}</h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.sets.filter((set, index, all) => {
                  const family = setFamilyPrefix(set.prefix);
                  const representative = all.find(candidate => candidate.prefix === family) ?? all.find(candidate => setFamilyPrefix(candidate.prefix) === family);
                  return all.indexOf(representative!) === index;
                }).map((set) => {
                  const isBooster = isBoosterSet(set, group);
                  return (
                    <div key={set.id} className="flex items-center overflow-hidden rounded-md border border-ctp-surface1">
                      <button
                        type="button"
                        onClick={() => browseSet(setFamilyPrefix(set.prefix))}
                        className="min-h-12 px-3 py-1.5 text-sm text-ctp-subtext1 hover:text-ctp-text"
                      >
                        {setFamily(set).name}
                        <span className="ml-2 text-xs text-ctp-subtext0">{setFamilyPrefix(set.prefix)}</span>
                      </button>
                      {isBooster && (
                        <Link
                          to={`/packs/${set.prefix}`}
                          className="flex min-h-12 items-center border-l border-ctp-surface1 px-2 py-1.5 text-xs text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-blue"
                        >
                          Open a Pack
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              aria-label="Search by name or card text"
              placeholder="Search by name or card text…"
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
            <input
              type="text"
              list="artist-options"
              aria-label="Search by artist"
              placeholder="Search by artist…"
              value={filters.artist}
              onChange={(e) => setFilters((f) => ({ ...f, artist: e.target.value }))}
              className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
            <datalist id="artist-options">
              {artistOptions.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          {options.data && (
            <FilterPanel activeCount={activeFilterCount} onClear={() => setFilters(emptyFilterState())}>
              <MultiSelectFilter
                label="Class"
                options={options.data.class}
                selected={filters.classes}
                onToggle={(v) => setFilters((f) => ({ ...f, classes: toggleSetValue(f.classes, v) }))}
                iconKind="classes"
              />
              <MultiSelectFilter
                label="Type"
                options={options.data.type}
                selected={filters.types}
                onToggle={(v) => setFilters((f) => ({ ...f, types: toggleSetValue(f.types, v) }))}
                iconKind="types"
              />
              <SearchSelectFilter
                label="Subtype"
                options={options.data.subtype}
                selected={filters.subtypes}
                onToggle={(v) => setFilters((f) => ({ ...f, subtypes: toggleSetValue(f.subtypes, v) }))}
              />
              <MultiSelectFilter
                label="Element"
                options={options.data.element}
                selected={filters.elements}
                onToggle={(v) => setFilters((f) => ({ ...f, elements: toggleSetValue(f.elements, v) }))}
                iconKind="elements"
              />
              <SearchSelectFilter
                label="Set"
                options={setOptions}
                selected={filters.sets}
                onToggle={(v) => setFilters((f) => ({ ...f, sets: toggleSetValue(f.sets, v) }))}
              />
              <MultiSelectFilter label="Rarity" options={rarityOptions(cards)} selected={filters.rarities ?? new Set()} onToggle={value => setFilters(f => ({...f, rarities: toggleSetValue(f.rarities ?? new Set(), value)}))} />
              <SearchSelectFilter label="Printing edition (optional)" options={printingOptions} selected={filters.printingSets ?? new Set()} onToggle={value => setFilters(f => ({ ...f, printingSets: toggleSetValue(f.printingSets ?? new Set(), value) }))} />
              {tagOptions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Community tags</p>
                  {CARD_TAG_CATEGORIES.map(category => <SearchSelectFilter key={category} label={`${category} tags`} options={tagOptions.filter(tag => cardTagCategory(tag.value) === category)} selected={new Set([...filters.tags ?? []].filter(tag => cardTagCategory(tag) === category))} onToggle={value => setFilters(f => ({ ...f, tags: toggleSetValue(f.tags ?? new Set(), value) }))} />)}
                </div>
              )}
              <SegmentedFilter label="Speed" options={[{ value: "any", label: "All" }, { value: "fast", label: "Fast" }, { value: "normal", label: "Normal" }]} value={filters.speed} onChange={(speed) => setFilters((f) => ({ ...f, speed }))} />
            </FilterPanel>
          )}

          {!!filters.tags?.size && cardTags.data && (
            <p className="mt-3 text-xs text-ctp-subtext0">
              Tags are community-sourced from the{" "}
              <a href={cardTags.data.sourceUrl} target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">silvie.gg Art Tagger</a>
              {" "}with approved local contributions. Imported tags are mostly unreviewed. Matches any selected tag across printings. Gameplay labels are discovery hints; missing tags do not mean an effect is absent.
            </p>
          )}

          {cardTags.local.isError && <p role="status" className="mt-3 text-sm">Local contributions unavailable; showing imported tags. <button className="min-h-12 px-3 text-ctp-blue" onClick={() => void cardTags.local.refetch()}>Retry contributions</button></p>}
          {!cardTags.data && <p role="status" className="mt-3 text-sm text-ctp-subtext0">{cardTags.status.phase === "error" ? <>Community tags unavailable. <button type="button" onClick={cardTags.status.retry} className="min-h-12 px-3 text-ctp-blue focus-visible:outline-2">Retry tags</button></> : "Loading community tags…"}</p>}

          {bannerProduct && (
            <Link
              to={`/products`}
              className="relative mt-4 flex h-40 items-end overflow-hidden rounded-xl border border-ctp-surface0 bg-gradient-to-r from-ctp-crust via-ctp-crust/60 to-transparent"
            >
              <img src={bannerProduct.banner} alt="" className="absolute inset-y-0 right-0 h-full w-auto object-contain" />
              <div className="relative z-10 p-4">
                <img src={bannerProduct.logo} alt={bannerProduct.name} className="h-10 w-auto object-contain" />
              </div>
            </Link>
          )}

          {syncProgress.phase !== "done" && filtered.length === 0 && <InlineState className="mt-6">Loading…</InlineState>}
          {syncProgress.phase === "done" && filtered.length === 0 && (!filters.tags?.size || !!cardTags.data) && (
            <InlineState className="mt-6">No cards match this filter.</InlineState>
          )}

          {(!filters.tags?.size || !!cardTags.data) && <CardGrid cards={visible} pickEdition={pickEdition} />}

          <LoadMore remaining={filtered.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
        </>
      )}
    </div>
    </PageLayout>
  );
}
