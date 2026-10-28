import { BrowseComparisonChoice } from "./BrowseComparison";
import { publicComparison, sightingComparison } from "./browseComparisonModel";
import BrowseDeckFilters from "./BrowseDeckFilters";
import DeckResultsOrder from "./DeckResultsOrder";
import type { ActiveDeckFilter } from "../../components/deck-search/ActiveDeckFilters";
import { decodeCardLines, deckSearchChampion } from "@gatcg/shared";
import DeckContentFilterControls from "./DeckContentFilterControls";
import { deckContentFilterCount, deckMatchesContentFilters } from "./deckContentFilters";
import { useDeckCardIndexData } from "../archetypes/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import type { PublicDeckSummary } from "@gatcg/shared";
import { deckDateInRange } from "./deckDateRange";
import DeckSightingsView from "./DeckSightingsView";
import type { DeckContentFilterState } from "./deckContentFilters";
import { accountApi } from "../../lib/accountApi";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import Button from "../../components/ui/Button";
import { Select, TextInput } from "../../components/ui/FormControl";
import { InlineState } from "../../components/ui/ContentState";
import { PublicDeckCard } from "../account/PublicDeckCard";
import { useDeckSightingsData } from "../topdecks/data";
import DeckSightingRow from "../topdecks/DeckSightingRow";
import { usePlayerNameById } from "../tournaments/data";

export default function CombinedDecksView({ contentFilters, setContentFilters }: {
  contentFilters: DeckContentFilterState;
  setContentFilters: (update: (previous: DeckContentFilterState) => DeckContentFilterState) => void;
}) {
  const [params, setParams] = useSearchParams();
  const source = ["shared", "tournament"].includes(params.get("source") ?? "") ? params.get("source")! : "all";
  const dateFrom = params.get("from") ?? "";
  const dateTo = params.get("to") ?? "";
  const sort = ["oldest", "champion"].includes(params.get("sort") ?? "") ? params.get("sort")! : "newest";
  const [visitedTournament, setVisitedTournament] = useState(source === "tournament");
  useEffect(() => { if (source === "tournament") setVisitedTournament(true); }, [source]);
  const query = params.get("q") ?? "";
  const deferredQuery = useDeferredValue(query);
  const format = params.get("format") ?? "";
  const champion = params.get("champion") ?? "";
  const [shared, setShared] = useState<PublicDeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [visibleCount, setVisibleCount] = useState(30);
  const [pending, startTransition] = useTransition();
  const sightings = useDeckSightingsData();
  const catalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(catalog.map(card => [card.name, card])), [catalog]);
  const contentActive = deckContentFilterCount(contentFilters) > 0;
  const cardIndex = useDeckCardIndexData(contentActive && source === "all");
  const cardStatus = usePublishedDataStatus("analysis-deck-card-index", "/data/analysis/deck-card-index.json", contentActive && source === "all");
  const matchingIds = useMemo(() => {
    if (!contentActive || source !== "all") return null;
    return new Set((cardIndex?.decks ?? []).filter(deck => cardIndex?.cardNames && deckMatchesContentFilters(decodeCardLines([...deck.main, ...deck.material], cardIndex.cardNames), contentFilters, cardsByName)).map(deck => deck.deckId));
  }, [cardIndex, contentActive, contentFilters, cardsByName, source]);
  const status = usePublishedDataStatus("analysis-deck-sightings", "/data/analysis/deck-sightings.json");
  const playerName = usePlayerNameById();
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    // Finish discovery pagination before sorting so newest order spans both sources.
    void (async () => {
      const decks: PublicDeckSummary[] = [];
      let page: number | null = 1;
      while (page !== null && active) {
        const result = await accountApi.discoverDecks(new URLSearchParams({ page: String(page) }));
        decks.push(...result.decks); page = result.nextPage;
      }
      if (active) setShared(decks);
    })().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Shared decks could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const champions = useMemo(() => [...new Set([...shared.map(d => d.championName), ...(sightings?.sightings ?? []).map(d => d.championName)].filter((name): name is string => Boolean(name)))].sort(), [shared, sightings]);
  const rows = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    const matches = (name: string | null, text: string) => (!champion || deckSearchChampion(champion) === deckSearchChampion(name)) && (!search || text.toLowerCase().includes(search));
    return [
      ...(source !== "tournament" ? shared.filter(d => (!contentActive || (d.cardNames && deckMatchesContentFilters(d.cardNames.map(name => ({ name, quantity: 1 })), contentFilters, cardsByName))) && (!format || d.format === format) && matches(d.championName, `${d.title} ${d.championName ?? ""} ${d.owner.displayName}`)).map(deck => ({ kind: "shared" as const, id: deck.publicSlug, date: deck.publishedAt, deck })) : []),
      ...(source !== "shared" && format !== "PANTHEON" ? (sightings?.sightings ?? []).filter(d => (!matchingIds || matchingIds.has(d.deckId)) && matches(d.championName, `${d.championName ?? ""} ${d.eventName} ${playerName(d.player)}`)).map(deck => ({ kind: "tournament" as const, id: deck.deckId, date: deck.eventDate.slice(0, 10), deck })) : []),
    ].filter(row => deckDateInRange(row.date, dateFrom, dateTo)).sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      const byChampion = a.deck.championName === null ? (b.deck.championName === null ? 0 : 1)
        : b.deck.championName === null ? -1 : a.deck.championName.localeCompare(b.deck.championName);
      return (sort === "oldest" ? -byDate : sort === "champion" ? byChampion || byDate : byDate)
        || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);
    });
  }, [source, shared, sightings, deferredQuery, champion, format, playerName, dateFrom, dateTo, sort, contentActive, contentFilters, cardsByName, matchingIds]);
  function update(key: string, value: string) {
    const apply = () => { setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); next.delete("page"); return next; }, { replace: true }); setVisibleCount(30); };
    apply();
  }
  const activeItems: ActiveDeckFilter[] = [
    ...[['champion', champion], ['format', format], ['from', dateFrom], ['to', dateTo], ['q', query]].filter(([, value]) => value).map(([key, value]) => ({ key, label: `${({ champion: 'Champion', format: 'Format', from: 'From', to: 'Through', q: 'Search' } as Record<string, string>)[key]}: ${value}`, remove: () => update(key, '') })),
  ];
  function clearFilters() {
    startTransition(() => {
      setParams(previous => {
        const next = new URLSearchParams(previous);
        for (const key of [...next.keys()]) if (key.startsWith("content-")) next.delete(key);
        for (const key of ["q", "champion", "format", "from", "to", "page"]) next.delete(key);
        return next;
      }, { replace: true });
      setVisibleCount(30);
    });
  }
  const waiting = (source !== "tournament" && loading) || (source !== "shared" && format !== "PANTHEON" && !sightings && status.phase !== "error");
  const failed = (source !== "tournament" && Boolean(error)) || (source !== "shared" && format !== "PANTHEON" && !sightings && status.phase === "error");
  return <>
    <div className="mt-4">
      <label className="flex flex-col gap-1 text-xs">Source<Select aria-label="Deck source" value={source} onChange={e => update("source", e.target.value)}><option value="all">All sources</option><option value="shared">Shared decks</option><option value="tournament">Tournament decks</option></Select></label>
    </div>
    {(source === "tournament" || visitedTournament) && <div hidden={source !== "tournament"}>
      <DeckSightingsView championName={champion || null} setChampionName={value => update("champion", value ?? "")} query={query} setQuery={value => update("q", value)} contentFilters={contentFilters} setContentFilters={setContentFilters} />
    </div>}
    {source !== "tournament" && <>
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 basis-full flex-col gap-1 text-xs sm:flex-1">Search decks
        <TextInput aria-label="Search decks" placeholder="Deck, champion, player, or event" value={query} onChange={e => update("q", e.target.value)} />
      </label>
    </div>
    <BrowseDeckFilters filters={contentFilters} setFilters={setContentFilters} items={activeItems} onClear={clearFilters} resultLabel={`Show ${rows.length.toLocaleString()} ${rows.length === 1 ? "deck" : "decks"}`}>
      <div className="space-y-4">
        <label className="flex min-w-0 flex-col gap-1 text-sm">Champion
          <Select aria-label="Champion" value={champion} onChange={e => update("champion", e.target.value)}><option value="">All champions</option>{champions.map(name => <option key={name}>{name}</option>)}</Select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">Format
          <Select aria-label="Deck format" value={format} onChange={e => update("format", e.target.value)}><option value="">All formats</option><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></Select>
        </label>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm">Published / event date</legend>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1 text-xs">From<TextInput aria-label="Date from" type="date" value={dateFrom} max={dateTo || undefined} onInput={e => update("from", e.currentTarget.value)} /></label>
            <label className="flex min-w-0 flex-col gap-1 text-xs">Through<TextInput aria-label="Date through" type="date" value={dateTo} min={dateFrom || undefined} onInput={e => update("to", e.currentTarget.value)} /></label>
          </div>
          {dateFrom && dateTo && dateFrom > dateTo && <p role="alert" className="mt-2 text-sm text-ctp-red">Choose an end date on or after the start date.</p>}
        </fieldset>
        <DeckContentFilterControls filters={contentFilters} setFilters={setContentFilters} />
      </div>
    </BrowseDeckFilters>
    {contentActive && source === "all" && <PublishedSourceStatus label="Deck card index" status={cardStatus} hasData={!!cardIndex} />}
    {contentActive && shared.some(deck => !deck.cardNames) && <InlineState>Card lists are unavailable for some shared decks.</InlineState>}
    {source !== "shared" && format !== "PANTHEON" && <PublishedSourceStatus label="Tournament decks" status={status} hasData={Boolean(sightings)} />}
    {source !== "tournament" && loading && <InlineState className="mt-4">Loading shared decks…</InlineState>}
    {source !== "tournament" && error && <InlineState tone="danger" className="mt-4">{error}<Button onClick={() => setRetry(value => value + 1)}>Retry shared decks</Button></InlineState>}
    <DeckResultsOrder summary={<>{waiting && !rows.length ? "Loading decks…" : `${rows.length.toLocaleString()} ${rows.length === 1 ? "deck" : "decks"}`}{pending || query !== deferredQuery ? " · Recalculating…" : ""}</>} label={sort === 'oldest' ? 'Oldest first' : sort === 'champion' ? 'Champion A–Z' : 'Newest first'}>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs sm:flex-none">Sort by
        <Select aria-label="Sort decks" value={sort} onChange={e => update("sort", e.target.value)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="champion">Champion A–Z</option>
        </Select>
      </label>
    </DeckResultsOrder>
    {!rows.length && !waiting && !failed && (!contentActive || source === "shared" || !!cardIndex) && <InlineState className="mt-4">No decks match these filters.</InlineState>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.slice(0, visibleCount).map(row => row.kind === "shared" ? <BrowseComparisonChoice key={`shared:${row.id}`} deck={publicComparison(row.deck)}><PublicDeckCard deck={row.deck} /></BrowseComparisonChoice> : <BrowseComparisonChoice key={`tournament:${row.id}`} deck={sightingComparison(row.deck, playerName(row.deck.player))}><DeckSightingRow sighting={row.deck} championCard={undefined} playerName={playerName(row.deck.player)} browseCard /></BrowseComparisonChoice>)}</div>
    {rows.length > visibleCount && <Button className="mt-4" onClick={() => setVisibleCount(value => value + 30)}>Load more</Button>}
    </>}
  </>;
}
