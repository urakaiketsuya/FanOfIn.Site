import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { OptionValue } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import { useCardCatalog } from "./useCardCatalog";
import { emptyFilterState, filterCards, type CardFilterState } from "./filters";
import FilterCheckboxGroup from "./FilterCheckboxGroup";
import FilterSearchGroup from "./FilterSearchGroup";
import CardGrid from "./CardGrid";
import LoadMore from "../../components/LoadMore";
import { useFeaturedSets } from "../sets/useFeaturedSets";

const PAGE_SIZE = 60;

type TabMode = "browse" | "sets";
const TABS: readonly TabMode[] = ["browse", "sets"];
const TAB_LABELS: Record<TabMode, string> = { browse: "Browse", sets: "By Set" };

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function CardsBrowse() {
  useDocumentTitle("Cards", "Browse and search the full Grand Archive TCG card database — filter by class, element, type, and set.");
  const cards = useCardCatalog();
  const syncProgress = useSyncProgress();
  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const featuredSets = useFeaturedSets();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useTabParam<TabMode>("tab", TABS, "browse");
  const [filters, setFilters] = useState<CardFilterState>(() => ({
    ...emptyFilterState(),
    artist: searchParams.get("artist") ?? "",
    classes: new Set(searchParams.getAll("class")),
    types: new Set(searchParams.getAll("type")),
    subtypes: new Set(searchParams.getAll("subtype")),
    elements: new Set(searchParams.getAll("element")),
    sets: new Set(searchParams.getAll("set")),
  }));

  const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const visible = filtered.slice(0, visibleCount);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      for (const ed of card.editions) {
        if (ed.illustrator) set.add(ed.illustrator);
      }
    }
    return Array.from(set).sort();
  }, [cards]);

  const setOptions = useMemo<OptionValue[]>(() => {
    const byPrefix = new Map<string, { name: string; releaseDate: string }>();
    for (const card of cards) {
      for (const ed of card.editions) {
        if (!byPrefix.has(ed.set.prefix)) byPrefix.set(ed.set.prefix, { name: ed.set.name, releaseDate: ed.set.release_date });
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
    if (filters.sets.size === 0) return undefined;
    return (card: (typeof cards)[number]) => card.editions.find((ed) => filters.sets.has(ed.set.prefix)) ?? card.editions[0];
  }, [filters.sets]);

  function browseSet(prefix: string) {
    setFilters((f) => ({ ...f, sets: new Set([prefix]) }));
    setTab("browse");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">Cards</h1>
        <div className="flex items-center gap-3">
          <Link to="/cards/stats" className="text-sm text-ctp-blue hover:underline">
            Card stats &rarr;
          </Link>
          {tab === "browse" && (
            <p className="text-sm text-ctp-subtext0">
              {filtered.length} of {cards.length} synced cards
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TABS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setTab(mode)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              tab === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {TAB_LABELS[mode]}
          </button>
        ))}
      </div>

      {tab === "sets" ? (
        <div className="mt-6 space-y-8">
          <p className="text-sm text-ctp-subtext1">Browse expansions and the cards printed in each one.</p>
          {!featuredSets && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
          {featuredSets && featuredSets.length === 0 && <p className="mt-6 text-ctp-subtext1">No sets found.</p>}
          {(featuredSets ?? []).map((group) => (
            <div key={group.uuid}>
              <div className="flex items-center gap-3">
                <img src={gatcgApi.imageUrl(group.image)} alt={group.name} className="h-10 w-10 rounded object-contain" />
                <h2 className="text-lg font-semibold text-ctp-text">{group.name}</h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.sets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => browseSet(set.prefix)}
                    className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text"
                  >
                    {set.name}
                    <span className="ml-2 text-xs text-ctp-subtext0">{set.prefix}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by name…"
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
            />
            <input
              type="text"
              list="artist-options"
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
            <div className="mt-4 space-y-4">
              <FilterCheckboxGroup
                label="Class"
                options={options.data.class}
                selected={filters.classes}
                onToggle={(v) => setFilters((f) => ({ ...f, classes: toggleInSet(f.classes, v) }))}
                iconKind="classes"
              />
              <FilterCheckboxGroup
                label="Type"
                options={options.data.type}
                selected={filters.types}
                onToggle={(v) => setFilters((f) => ({ ...f, types: toggleInSet(f.types, v) }))}
                iconKind="types"
              />
              <FilterSearchGroup
                label="Subtype"
                options={options.data.subtype}
                selected={filters.subtypes}
                onToggle={(v) => setFilters((f) => ({ ...f, subtypes: toggleInSet(f.subtypes, v) }))}
              />
              <FilterCheckboxGroup
                label="Element"
                options={options.data.element}
                selected={filters.elements}
                onToggle={(v) => setFilters((f) => ({ ...f, elements: toggleInSet(f.elements, v) }))}
                iconKind="elements"
              />
              <FilterSearchGroup
                label="Set"
                options={setOptions}
                selected={filters.sets}
                onToggle={(v) => setFilters((f) => ({ ...f, sets: toggleInSet(f.sets, v) }))}
              />
            </div>
          )}

          {syncProgress.phase !== "done" && filtered.length === 0 && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
          {syncProgress.phase === "done" && filtered.length === 0 && (
            <p className="mt-6 text-ctp-subtext1">No cards match this filter.</p>
          )}

          <CardGrid cards={visible} pickEdition={pickEdition} />

          <LoadMore remaining={filtered.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />
        </>
      )}
    </div>
  );
}
