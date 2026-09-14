import { useEffect, useMemo, useState } from "react";
import type { BookmarkedDeck, Card, DeckFormat, SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { InlineState } from "../../../components/ui/ContentState";
import { accountApi, AccountApiError } from "../../../lib/accountApi";
import { parseDecklist } from "../../compare/parseDecklist";
import type { DeckWorkspace } from "../persistence/deckWorkspace";
import { decklistToWorkspace } from "../persistence/deckWorkspaceImport";

type WorkspaceSource = Extract<DeckWorkspace["source"], "analysis" | "review">;

export default function DeckWorkspacePicker({ catalogByName, source, onLoad, compact = false }: {
  catalogByName: Map<string, Card>;
  source: WorkspaceSource;
  onLoad: (workspace: Omit<DeckWorkspace, "version" | "updatedAt">) => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<"closed" | "paste" | "library">(compact ? "closed" : "paste");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<DeckFormat>("STANDARD");
  const [error, setError] = useState<string | null>(null);
  const [libraryState, setLibraryState] = useState<"idle" | "loading" | "ready" | "signed-out" | "error">("idle");
  const [owned, setOwned] = useState<SavedDeck[]>([]);
  const [saved, setSaved] = useState<BookmarkedDeck[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (mode !== "library" || libraryState !== "idle") return;
    let active = true;
    setLibraryState("loading");
    void Promise.all([accountApi.decks(), accountApi.bookmarks()])
      .then(([mine, bookmarks]) => { if (active) { setOwned(mine.decks); setSaved(bookmarks.decks); setLibraryState("ready"); } })
      .catch((reason: unknown) => { if (active) setLibraryState(reason instanceof AccountApiError && reason.status === 401 ? "signed-out" : "error"); });
    return () => { active = false; };
  }, [mode, libraryState]);

  const libraryDecks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [
      ...owned.map((deck) => ({ ...deck, key: `mine-${deck.id}`, subtitle: "My deck" })),
      ...saved.map((deck) => ({ ...deck, key: `saved-${deck.publicSlug}`, subtitle: `Saved · ${deck.owner.displayName}` })),
    ].filter((deck) => !needle || `${deck.title} ${deck.subtitle}`.toLowerCase().includes(needle));
  }, [owned, saved, query]);

  function usePaste() {
    const parsed = parseDecklist(text);
    const cardCount = parsed.decklist.main.length + parsed.decklist.material.length + parsed.decklist.sideboard.length;
    if (cardCount === 0) { setError("No card lines were recognized. Use a quantity followed by a card name, such as “4x Dungeon Guide”."); return; }
    const workspace = decklistToWorkspace(parsed.decklist, catalogByName, source, format);
    if (!workspace.championName) { setError("No Champion was detected in the Material section."); return; }
    onLoad(workspace);
    setText("");
    setError(null);
    if (compact) setMode("closed");
  }

  function chooseLibraryDeck(deck: (typeof libraryDecks)[number]) {
    onLoad(decklistToWorkspace(deck.decklist, catalogByName, source, deck.format, deck.championName));
    setError(null);
    if (compact) setMode("closed");
  }

  if (mode === "closed") return <button type="button" onClick={() => setMode("paste")} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Change deck</button>;

  return <section data-component="DeckWorkspacePicker" className="rounded-lg border border-ctp-surface1 bg-ctp-base/35 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-ctp-text">Choose a deck</h2><p className="mt-1 text-xs text-ctp-subtext0">Paste a list or select a deck from your library.</p></div>{compact && <button type="button" onClick={() => setMode("closed")} className="text-xs text-ctp-subtext1 hover:text-ctp-text">Cancel</button>}</div>
    <div className="mt-3 flex gap-2" role="tablist" aria-label="Deck source">
      <button type="button" role="tab" aria-selected={mode === "paste"} onClick={() => setMode("paste")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === "paste" ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext1"}`}>Paste decklist</button>
      <button type="button" role="tab" aria-selected={mode === "library"} onClick={() => setMode("library")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === "library" ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext1"}`}>My Decks</button>
    </div>
    {mode === "paste" && <div className="mt-3"><div className="flex justify-end"><select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat)} aria-label="Deck format" className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></select></div><textarea value={text} onChange={(event) => setText(event.target.value)} rows={compact ? 6 : 9} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} aria-label="Decklist" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 font-mono text-sm text-ctp-text"/><button type="button" disabled={!text.trim()} onClick={usePaste} className="mt-2 rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base disabled:opacity-50">Use this deck</button></div>}
    {mode === "library" && <div className="mt-3">{libraryState === "loading" && <InlineState>Loading your deck library…</InlineState>}{libraryState === "signed-out" && <InlineState>Sign in from <Link to="/decks/edit" className="text-ctp-blue hover:underline">My Decks</Link> to import a saved deck.</InlineState>}{libraryState === "error" && <InlineState tone="danger">Your deck library could not be loaded. <button type="button" onClick={() => setLibraryState("idle")} className="text-ctp-blue hover:underline">Try again</button></InlineState>}{libraryState === "ready" && <><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your decks…" aria-label="Search your decks" className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm"/>{libraryDecks.length === 0 ? <InlineState className="mt-3">No decks match this search.</InlineState> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{libraryDecks.map((deck) => <button key={deck.key} type="button" onClick={() => chooseLibraryDeck(deck)} className="rounded-lg border border-ctp-surface1 p-3 text-left hover:border-ctp-blue"><span className="block text-sm font-medium text-ctp-text">{deck.title}</span><span className="text-xs text-ctp-subtext0">{deck.subtitle} · {deck.format === "PANTHEON" ? "Pantheon" : "Standard"}</span></button>)}</div>}</>}</div>}
    {error && <p className="mt-2 text-xs text-ctp-red">{error}</p>}
  </section>;
}
