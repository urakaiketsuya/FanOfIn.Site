import { useEffect, useMemo, useState } from "react";
import type { BookmarkedDeck, Card, DeckFormat, SavedDeck } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { InlineState } from "../../../components/ui/ContentState";
import { accountApi, AccountApiError } from "../../../lib/accountApi";
import { parseDecklist } from "../../compare/parseDecklist";
import type { DeckWorkspace } from "../persistence/deckWorkspace";
import { decklistToWorkspace } from "../persistence/deckWorkspaceImport";

type WorkspaceSource = Extract<DeckWorkspace["source"], "analysis" | "review" | "combo">;
type PendingWorkspace = Omit<DeckWorkspace, "version" | "updatedAt">;
const LIBRARY_REQUEST_TIMEOUT_MS = 12_000;

function withLibraryTimeout<T>(request: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Deck library request timed out")), LIBRARY_REQUEST_TIMEOUT_MS);
    request.then(
      (value) => { window.clearTimeout(timeout); resolve(value); },
      (reason: unknown) => { window.clearTimeout(timeout); reject(reason); },
    );
  });
}

export default function DeckWorkspacePicker({ catalogByName, source, onLoad, compact = false }: { catalogByName: Map<string, Card>; source: WorkspaceSource; onLoad: (workspace: PendingWorkspace) => void; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [mode, setMode] = useState<"paste" | "library">("paste");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<DeckFormat>("STANDARD");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWorkspace | null>(null);
  const [libraryState, setLibraryState] = useState<"idle" | "loading" | "ready" | "signed-out" | "error">("idle");
  const [owned, setOwned] = useState<SavedDeck[]>([]);
  const [saved, setSaved] = useState<BookmarkedDeck[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || mode !== "library" || libraryState !== "idle") return;
    let active = true;
    setLibraryState("loading");
    const bookmarksRequest = withLibraryTimeout(accountApi.bookmarks()).catch(() => null);
    void withLibraryTimeout(accountApi.decks())
      .then((mine) => {
        if (!active) return;
        setOwned(mine.decks);
        setLibraryState("ready");
        // Bookmarks supplement the user's own library, but a slow or unavailable bookmarks
        // endpoint must not prevent owned decks from becoming selectable.
        void bookmarksRequest.then((bookmarks) => { if (active && bookmarks) setSaved(bookmarks.decks); });
      })
      .catch((reason: unknown) => { if (active) setLibraryState(reason instanceof AccountApiError && reason.status === 401 ? "signed-out" : "error"); });
    return () => { active = false; };
  }, [open, mode, libraryState]);

  useEffect(() => {
    if (!compact || !open) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); setPending(null); setNotice(null); } }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [compact, open]);

  const libraryDecks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...owned.map((deck) => ({ ...deck, key: `mine-${deck.id}`, subtitle: "My deck" })), ...saved.map((deck) => ({ ...deck, key: `saved-${deck.publicSlug}`, subtitle: `Saved · ${deck.owner.displayName}` }))]
      .filter((deck) => !needle || `${deck.title} ${deck.subtitle}`.toLowerCase().includes(needle));
  }, [owned, saved, query]);

  const preview = useMemo(() => pending ? {
    main: pending.main.reduce((sum, line) => sum + line.quantity, 0),
    material: pending.material.reduce((sum, line) => sum + line.quantity, 0),
    sideboard: pending.sideboard.reduce((sum, line) => sum + line.quantity, 0),
    unknown: [...new Set([...pending.main, ...pending.material, ...pending.sideboard].filter((line) => !catalogByName.has(line.name)).map((line) => line.name))],
  } : null, [pending, catalogByName]);

  function close() { setOpen(false); setPending(null); setNotice(null); }
  function preparePaste() {
    const parsed = parseDecklist(text);
    if (parsed.decklist.main.length + parsed.decklist.material.length + parsed.decklist.sideboard.length === 0) { setNotice("No card lines were recognized. Use a quantity followed by a card name, such as “4x Dungeon Guide”."); return; }
    setPending(decklistToWorkspace(parsed.decklist, catalogByName, source, format, null, "Pasted deck", "Pasted decklist"));
    setNotice(parsed.skippedLines.length ? `${parsed.skippedLines.length} line${parsed.skippedLines.length === 1 ? " was" : "s were"} skipped.` : null);
  }
  function prepareLibraryDeck(deck: (typeof libraryDecks)[number]) { setPending(decklistToWorkspace(deck.decklist, catalogByName, source, deck.format, deck.championName, deck.title, deck.subtitle, deck.key)); setNotice(null); }
  function confirm() { if (!pending?.championName) return; onLoad(pending); setText(""); if (compact) close(); else setPending(null); }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Change deck</button>;

  const body = <section data-component="DeckWorkspacePicker" role={compact ? "dialog" : undefined} aria-modal={compact || undefined} aria-labelledby="choose-deck-title" className={`w-full rounded-xl border border-ctp-surface1 bg-ctp-base p-4 shadow-xl ${compact ? "max-h-[90vh] max-w-2xl overflow-y-auto" : ""}`}>
    <div className="flex items-start justify-between gap-2"><div><h2 id="choose-deck-title" className="font-semibold text-ctp-text">{pending ? "Check imported deck" : "Choose a deck"}</h2><p className="mt-1 text-xs text-ctp-subtext0">{pending ? "Confirm its identity, format, and sections before continuing." : "Paste a list or select a deck from your library."}</p></div>{compact && <button type="button" onClick={close} aria-label="Close deck picker" className="rounded-md px-2 py-1 text-ctp-subtext1 hover:bg-ctp-surface0">✕</button>}</div>
    {pending && preview ? <div className="mt-4"><div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3"><p className="font-medium text-ctp-text">{pending.title ?? "Untitled deck"}</p><p className="mt-1 text-xs text-ctp-subtext1">{pending.championName ?? "Champion not detected"} · {pending.spiritName ?? "Spirit not detected"} · {pending.format === "PANTHEON" ? "Pantheon" : "Standard"}</p><div className="mt-3 flex flex-wrap gap-1.5 text-xs"><span className="rounded-full bg-ctp-surface0 px-2 py-1">{preview.main} main</span><span className="rounded-full bg-ctp-surface0 px-2 py-1">{preview.material} material</span><span className="rounded-full bg-ctp-surface0 px-2 py-1">{preview.sideboard} sideboard</span></div></div>{(!pending.championName || !pending.spiritName || preview.unknown.length > 0) && <div className="mt-3 rounded-lg border border-ctp-yellow/50 bg-ctp-yellow/5 p-3 text-xs text-ctp-subtext1"><p className="font-semibold text-ctp-yellow">Import warnings</p><ul className="mt-1 list-disc pl-5">{!pending.championName && <li>No Champion was detected in Material. Add it before importing.</li>}{!pending.spiritName && <li>No Spirit was detected. Some calculations may be unavailable.</li>}{preview.unknown.length > 0 && <li>{preview.unknown.length} card name{preview.unknown.length === 1 ? " is" : "s are"} not in the catalog: {preview.unknown.slice(0, 3).join(", ")}{preview.unknown.length > 3 ? "…" : ""}</li>}</ul></div>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPending(null)} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1">Back</button><button type="button" onClick={confirm} disabled={!pending.championName} className="rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base disabled:opacity-50">Open in {source === "analysis" ? "Analysis" : source === "review" ? "Review" : "Combo Lab"}</button></div></div> : <>
      <div className="mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Deck source"><button type="button" role="tab" aria-selected={mode === "paste"} onClick={() => setMode("paste")} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${mode === "paste" ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext1"}`}>Paste decklist</button><button type="button" role="tab" aria-selected={mode === "library"} onClick={() => setMode("library")} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${mode === "library" ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext1"}`}>My Decks</button></div>
      {mode === "paste" && <div className="mt-3"><div className="flex justify-end"><select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat)} aria-label="Deck format" className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></select></div><textarea value={text} onChange={(event) => setText(event.target.value)} rows={compact ? 6 : 9} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} aria-label="Decklist" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 font-mono text-sm text-ctp-text"/><button type="button" disabled={!text.trim()} onClick={preparePaste} className="mt-2 rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base disabled:opacity-50">Check decklist</button></div>}
      {mode === "library" && <div className="mt-3">{libraryState === "loading" && <InlineState>Loading your deck library…</InlineState>}{libraryState === "signed-out" && <InlineState>Sign in from <Link to="/decks/edit" className="text-ctp-blue hover:underline">My Decks</Link> to import a saved deck.</InlineState>}{libraryState === "error" && <InlineState tone="danger">Your deck library could not be loaded. <button type="button" onClick={() => setLibraryState("idle")} className="text-ctp-blue hover:underline">Try again</button></InlineState>}{libraryState === "ready" && <><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your decks…" aria-label="Search your decks" className="w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm"/>{libraryDecks.length === 0 ? <InlineState className="mt-3">No decks match this search.</InlineState> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{libraryDecks.map((deck) => <button key={deck.key} type="button" onClick={() => prepareLibraryDeck(deck)} className="rounded-lg border border-ctp-surface1 p-3 text-left hover:border-ctp-blue"><span className="block text-sm font-medium text-ctp-text">{deck.title}</span><span className="text-xs text-ctp-subtext0">{deck.subtitle} · {deck.format === "PANTHEON" ? "Pantheon" : "Standard"}</span></button>)}</div>}</>}</div>}
    </>}{notice && <p className="mt-2 text-xs text-ctp-yellow">{notice}</p>}
  </section>;
  return compact ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>{body}</div> : body;
}
