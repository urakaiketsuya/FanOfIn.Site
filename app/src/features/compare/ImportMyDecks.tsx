import { useEffect, useMemo, useState } from "react";
import type { BookmarkedDeck, SavedDeck } from "@gatcg/shared";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { InlineState } from "../../components/ui/ContentState";
import type { ComparedDeck } from "./types";

export default function ImportMyDecks({ comparedKeys, onToggle }: { comparedKeys: Set<string>; onToggle: (deck: ComparedDeck) => void }) {
  const [owned, setOwned] = useState<SavedDeck[]>([]);
  const [saved, setSaved] = useState<BookmarkedDeck[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setState("loading");
    void Promise.all([accountApi.decks(), accountApi.bookmarks()])
      .then(([myDecks, bookmarks]) => { if (active) { setOwned(myDecks.decks); setSaved(bookmarks.decks); setState("ready"); } })
      .catch((reason: unknown) => { if (active) setState(reason instanceof AccountApiError && reason.status === 401 ? "signed-out" : "error"); });
    return () => { active = false; };
  }, [reload]);

  const decks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [
      ...owned.map((deck) => ({ key: `mine-${deck.id}`, label: deck.title, subtitle: "My deck", decklist: deck.decklist, format: deck.format })),
      ...saved.map((deck) => ({ key: `saved-${deck.publicSlug}`, label: deck.title, subtitle: `Saved · ${deck.owner.displayName}`, decklist: deck.decklist, format: deck.format })),
    ].filter((deck) => !needle || `${deck.label} ${deck.subtitle}`.toLowerCase().includes(needle));
  }, [owned, saved, query]);

  if (state === "loading") return <InlineState>Loading your deck library…</InlineState>;
  if (state === "signed-out") return <InlineState>Sign in from <a href="/decks/edit" className="text-ctp-blue hover:underline">My Decks</a> to add decks from your library.</InlineState>;
  if (state === "error") return <InlineState tone="danger">Your deck library could not be loaded. <button type="button" onClick={() => setReload((value) => value + 1)} className="min-h-10 font-medium text-ctp-blue hover:underline">Try again</button></InlineState>;

  return <div data-component="ImportMyDecks">
    <p className="text-sm text-ctp-subtext1">Add an editable build or a community deck you saved.</p>
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your decks…" aria-label="Search your decks" className="mt-3 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm focus:border-ctp-blue focus:outline-none" />
    {decks.length === 0 ? <InlineState className="mt-3">{query.trim() ? "No decks match this search." : "Your library does not contain any comparable decks yet."}</InlineState> : <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {decks.map((deck) => { const added = comparedKeys.has(deck.key); return <button key={deck.key} type="button" aria-pressed={added} onClick={() => onToggle({ key: deck.key, label: deck.label, source: { kind: "custom", decklist: deck.decklist }, format: deck.format })} className={`rounded-lg border p-3 text-left ${added ? "border-ctp-blue bg-ctp-blue/10" : "border-ctp-surface1 hover:border-ctp-blue/60"}`}><span className="block text-sm font-medium text-ctp-text">{deck.label}</span><span className="mt-0.5 block text-xs text-ctp-subtext0">{deck.subtitle} · {added ? "Added" : "Add to comparison"}</span></button>; })}
    </div>}
  </div>;
}
