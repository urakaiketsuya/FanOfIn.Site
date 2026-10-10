import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import type { PublicDeckSummary } from "@gatcg/shared";
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
  const source = params.get("source") ?? "all";
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
    const matches = (name: string | null, text: string) => (!champion || champion === name) && (!search || text.toLowerCase().includes(search));
    return [
      ...(source !== "tournament" ? shared.filter(d => (!format || d.format === format) && matches(d.championName, `${d.title} ${d.championName ?? ""} ${d.owner.displayName}`)).map(deck => ({ kind: "shared" as const, id: deck.publicSlug, date: deck.publishedAt.slice(0, 10), deck })) : []),
      ...(source !== "shared" && format !== "PANTHEON" ? (sightings?.sightings ?? []).filter(d => matches(d.championName, `${d.championName ?? ""} ${d.eventName} ${playerName(d.player)}`)).map(deck => ({ kind: "tournament" as const, id: deck.deckId, date: deck.eventDate.slice(0, 10), deck })) : []),
    ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }, [source, shared, sightings, deferredQuery, champion, format, playerName]);
  function update(key: string, value: string) {
    const apply = () => { setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); next.delete("page"); return next; }, { replace: true }); setVisibleCount(30); };
    if (key === "q") apply(); else startTransition(apply);
  }
  const waiting = (source !== "tournament" && loading) || (source !== "shared" && format !== "PANTHEON" && !sightings && status.phase !== "error");
  const failed = (source !== "tournament" && Boolean(error)) || (source !== "shared" && format !== "PANTHEON" && !sightings && status.phase === "error");
  return <>
    <div className="mt-4">
      <Select aria-label="Deck source" value={source} onChange={e => update("source", e.target.value)}><option value="all">All sources</option><option value="shared">Shared decks</option><option value="tournament">Tournament decks</option></Select>
    </div>
    {(source === "tournament" || visitedTournament) && <div hidden={source !== "tournament"}>
      <DeckSightingsView championName={champion || null} setChampionName={value => update("champion", value ?? "")} query={query} setQuery={value => update("q", value)} contentFilters={contentFilters} setContentFilters={setContentFilters} />
    </div>}
    {source !== "tournament" && <>
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <TextInput aria-label="Search decks" placeholder="Deck, champion, player, or event" value={query} onChange={e => update("q", e.target.value)} className="min-w-0" />
      <Select aria-label="Champion" value={champion} onChange={e => update("champion", e.target.value)}><option value="">All champions</option>{champions.map(name => <option key={name}>{name}</option>)}</Select>
      <Select aria-label="Deck format" value={format} onChange={e => update("format", e.target.value)}><option value="">All formats</option><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></Select>
    </div>
    {source !== "shared" && format !== "PANTHEON" && <PublishedSourceStatus label="Tournament decks" status={status} hasData={Boolean(sightings)} />}
    {source !== "tournament" && loading && <InlineState className="mt-4">Loading shared decks…</InlineState>}
    {source !== "tournament" && error && <InlineState tone="danger" className="mt-4">{error}<Button onClick={() => setRetry(value => value + 1)}>Retry shared decks</Button></InlineState>}
    <p className="mt-4 text-xs text-ctp-subtext0" role="status">{rows.length.toLocaleString()} decks · Newest first{pending || query !== deferredQuery ? " · Recalculating…" : ""}</p>
    {!rows.length && !waiting && !failed && <InlineState className="mt-4">No decks match these filters.</InlineState>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.slice(0, visibleCount).map(row => row.kind === "shared" ? <PublicDeckCard key={`shared:${row.id}`} deck={row.deck} /> : <DeckSightingRow key={`tournament:${row.id}`} sighting={row.deck} championCard={undefined} playerName={playerName(row.deck.player)} browseCard />)}</div>
    {rows.length > visibleCount && <Button className="mt-4" onClick={() => setVisibleCount(value => value + 30)}>Load more</Button>}
    </>}
  </>;
}
