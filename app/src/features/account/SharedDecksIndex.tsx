import { useEffect, useState } from "react";
import type { PublicDeckSummary } from "@gatcg/shared";
import { useSearchParams } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PublicDeckCard } from "./PublicDeckCard";

export default function SharedDecksIndex() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [decks, setDecks] = useState<PublicDeckSummary[]>();
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle("Shared Decks", "Discover public Grand Archive decklists shared by the community.");
  useEffect(() => { let active = true; setDecks(undefined); setError(null); void accountApi.discoverDecks(params).then((result) => { if (active) { setDecks(result.decks); setNextPage(result.nextPage); } }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Decks could not be loaded"); setDecks([]); setNextPage(null); } }); return () => { active = false; }; }, [params]);
  const format = params.get("format") ?? "";
  return <div className="mx-auto max-w-5xl px-4 py-8">
    <h1 className="text-3xl font-bold text-ctp-blue">Shared Decks</h1><p className="mt-2 text-ctp-subtext1">Public lists from Fan of Insight users, ranked by likes and recency.</p>
    <form className="mt-6 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); const next = new URLSearchParams(); if (query.trim()) next.set("q", query.trim()); if (format) next.set("format", format); setParams(next); }}>
      <input maxLength={80} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Deck, champion, or author" className="min-w-64 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
      <select value={format} onChange={(event) => { const next = new URLSearchParams(params); if (event.target.value) next.set("format", event.target.value); else next.delete("format"); next.delete("page"); setParams(next); }} className="rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm"><option value="">All formats</option><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></select>
      <button className="rounded-md bg-ctp-blue px-4 py-2 text-sm text-ctp-base">Search</button>
    </form>
    {error && <p className="mt-5 text-ctp-red">{error}</p>}
    {decks === undefined ? <p className="mt-8 text-ctp-subtext1">Loading public decks…</p> : decks.length === 0 ? <p className="mt-8 rounded-lg border border-dashed border-ctp-surface1 p-8 text-center text-ctp-subtext1">No public decks match these filters.</p> : <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{decks.map((deck) => <PublicDeckCard key={deck.publicSlug} deck={deck} />)}</div>}
    {decks && decks.length > 0 && <nav aria-label="Discovery pages" className="mt-6 flex justify-center gap-3">{Number(params.get("page") ?? "1") > 1 && <button type="button" onClick={() => { const next = new URLSearchParams(params); const page = Number(params.get("page") ?? "1") - 1; if (page === 1) next.delete("page"); else next.set("page", String(page)); setParams(next); }} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm">Previous</button>}{nextPage && <button type="button" onClick={() => { const next = new URLSearchParams(params); next.set("page", String(nextPage)); setParams(next); }} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm">Next</button>}</nav>}
  </div>;
}
