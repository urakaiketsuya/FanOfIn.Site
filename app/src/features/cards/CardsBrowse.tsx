import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { gatcgApi } from "../../lib/api/client";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { useCardCatalog } from "./useCardCatalog";
import { emptyFilterState, filterCards, type CardFilterState } from "./filters";
import FilterCheckboxGroup from "./FilterCheckboxGroup";
import CardGrid from "./CardGrid";

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function CardsBrowse() {
  const cards = useCardCatalog();
  const syncProgress = useSyncProgress();
  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<CardFilterState>(() => ({
    ...emptyFilterState(),
    artist: searchParams.get("artist") ?? "",
  }));

  const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);

  const artistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      for (const ed of card.editions) {
        if (ed.illustrator) set.add(ed.illustrator);
      }
    }
    return Array.from(set).sort();
  }, [cards]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">Cards</h1>
        <div className="flex items-center gap-3">
          <Link to="/cards/stats" className="text-sm text-ctp-blue hover:underline">
            Card stats &rarr;
          </Link>
          <p className="text-sm text-ctp-subtext0">
            {filtered.length} of {cards.length} synced cards
          </p>
        </div>
      </div>

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
          />
          <FilterCheckboxGroup
            label="Type"
            options={options.data.type}
            selected={filters.types}
            onToggle={(v) => setFilters((f) => ({ ...f, types: toggleInSet(f.types, v) }))}
          />
          <FilterCheckboxGroup
            label="Element"
            options={options.data.element}
            selected={filters.elements}
            onToggle={(v) => setFilters((f) => ({ ...f, elements: toggleInSet(f.elements, v) }))}
          />
        </div>
      )}

      {syncProgress.phase !== "done" && filtered.length === 0 && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {syncProgress.phase === "done" && filtered.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No cards match this filter.</p>
      )}

      <CardGrid cards={filtered} />
    </div>
  );
}
