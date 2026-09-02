import { useEffect, useState } from "react";
import type { PublicDeckSummary } from "@gatcg/shared";
import { useSearchParams } from "react-router-dom";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PublicDeckCard } from "./PublicDeckCard";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import Button from "../../components/ui/Button";
import { Select, TextInput } from "../../components/ui/FormControl";

export default function SharedDecksIndex() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [decks, setDecks] = useState<PublicDeckSummary[]>();
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle("Shared Decks", "Discover public Grand Archive decklists shared by the community.");
  useEffect(() => { let active = true; setDecks(undefined); setError(null); void accountApi.discoverDecks(params).then((result) => { if (active) { setDecks(result.decks); setNextPage(result.nextPage); } }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Decks could not be loaded"); setDecks([]); setNextPage(null); } }); return () => { active = false; }; }, [params]);
  const format = params.get("format") ?? "";
  return <PageLayout width="wide">
    <PageHeader title="Shared Decks" description="Public lists from Fan of Insight users, ranked by likes and recency." />
    <form className="mt-6 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); const next = new URLSearchParams(); if (query.trim()) next.set("q", query.trim()); if (format) next.set("format", format); setParams(next); }}>
      <TextInput maxLength={80} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Deck, champion, or author" className="min-w-64 flex-1" />
      <Select value={format} onChange={(event) => { const next = new URLSearchParams(params); if (event.target.value) next.set("format", event.target.value); else next.delete("format"); next.delete("page"); setParams(next); }}><option value="">All formats</option><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></Select>
      <Button type="submit" variant="primary">Search</Button>
    </form>
    {error ? <InlineState tone="danger" className="mt-5">{error}</InlineState> : decks === undefined ? <InlineState className="mt-8">Loading public decks…</InlineState> : decks.length === 0 ? <EmptyState className="mt-8" title="No public decks match these filters" description="Try a different search or format." /> : <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{decks.map((deck) => <PublicDeckCard key={deck.publicSlug} deck={deck} />)}</div>}
    {decks && decks.length > 0 && <nav aria-label="Discovery pages" className="mt-6 flex justify-center gap-3">{Number(params.get("page") ?? "1") > 1 && <Button onClick={() => { const next = new URLSearchParams(params); const page = Number(params.get("page") ?? "1") - 1; if (page === 1) next.delete("page"); else next.set("page", String(page)); setParams(next); }}>Previous</Button>}{nextPage && <Button onClick={() => { const next = new URLSearchParams(params); next.set("page", String(nextPage)); setParams(next); }}>Next</Button>}</nav>}
  </PageLayout>;
}
