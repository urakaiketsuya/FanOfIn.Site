import Button from "../../../components/ui/Button";
import DialogSheet from "../../../components/ui/DialogSheet";
import Tabs, { TabPanel } from "../../../components/ui/Tabs";
import DeckCardPreview from "../../../components/DeckCardPreview";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  const baseId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const wasReviewing = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(!compact);
  const [mode, setMode] = useState<"paste" | "library">("paste");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<DeckFormat>("STANDARD");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWorkspace | null>(null);
  const [libraryState, setLibraryState] = useState<"idle" | "loading" | "ready" | "signed-out" | "error">("idle");
  const [bookmarksUnavailable, setBookmarksUnavailable] = useState(false);
  const [libraryReload, setLibraryReload] = useState(0);
  const [owned, setOwned] = useState<SavedDeck[]>([]);
  const [saved, setSaved] = useState<BookmarkedDeck[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || mode !== "library") return;
    let active = true;
    setLibraryState("loading");
    setSaved([]);
    setBookmarksUnavailable(false);
    const bookmarksRequest = withLibraryTimeout(accountApi.bookmarks()).catch(() => null);
    void withLibraryTimeout(accountApi.decks())
      .then((mine) => {
        if (!active) return;
        setOwned(mine.decks);
        setLibraryState("ready");
        // Bookmarks supplement the user's own library, but a slow or unavailable bookmarks
        // endpoint must not prevent owned decks from becoming selectable.
        void bookmarksRequest.then((bookmarks) => { if (active) { if (bookmarks) setSaved(bookmarks.decks); else setBookmarksUnavailable(true); } });
      })
      .catch((reason: unknown) => { if (active) setLibraryState(reason instanceof AccountApiError && reason.status === 401 ? "signed-out" : "error"); });
    return () => { active = false; };
  }, [open, mode, libraryReload]);

  useEffect(() => {
    if (!open && wasOpen.current) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (pending || wasReviewing.current) reviewHeading.current?.focus();
    wasReviewing.current = !!pending;
  }, [pending]);

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

  function close() { setOpen(false); setPending(null); setText(""); setNotice(null); }
  function preparePaste() {
    const parsed = parseDecklist(text);
    if (parsed.decklist.main.length + parsed.decklist.material.length + parsed.decklist.sideboard.length === 0) { setNotice("No card lines were recognized. Use a quantity followed by a card name, such as “4x Dungeon Guide”."); return; }
    setPending(decklistToWorkspace(parsed.decklist, catalogByName, source, format, null, "Pasted deck", "Pasted decklist"));
    setNotice(parsed.skippedLines.length ? `${parsed.skippedLines.length} line${parsed.skippedLines.length === 1 ? " was" : "s were"} skipped.` : null);
  }
  function prepareLibraryDeck(deck: (typeof libraryDecks)[number]) { setPending(decklistToWorkspace(deck.decklist, catalogByName, source, deck.format, deck.championName, deck.title, deck.subtitle, deck.key)); setNotice(null); }
  function confirm() { if (!pending?.championName) return; onLoad(pending); setText(""); if (compact) close(); else setPending(null); }

  if (!open) return <Button ref={trigger} onClick={() => setOpen(true)}>Change deck</Button>;

  const actions = pending ? <div className="flex flex-wrap justify-end gap-2"><Button onClick={() => setPending(null)}>Back</Button><Button variant="primary" onClick={confirm} disabled={!pending.championName}>Open in {source === "analysis" ? "Analysis" : source === "review" ? "Review" : "Combo Lab"}</Button></div> : undefined;
  const body = <section data-component="DeckWorkspacePicker" className="min-w-0">
    <h2 ref={reviewHeading} tabIndex={-1} className="text-xl font-semibold outline-none">{pending ? "Check imported deck" : "Choose a deck"}</h2>
    <p className="mt-1 text-sm text-ctp-subtext1">{pending ? "Confirm its identity, format, and sections before continuing." : "Paste a list or select a deck from your library."}</p>
    {pending && preview ? <div className="mt-4">
      <DeckCardPreview lines={(pending.material.length ? pending.material : pending.main).slice(0, 4)} cardsByName={catalogByName} newTab />
      <div className="mt-3 rounded-xl bg-ctp-mantle p-3"><p className="break-words text-lg font-semibold">{pending.title ?? "Untitled deck"}</p><p className="mt-1 text-sm text-ctp-subtext1">{pending.championName ?? "Champion not detected"} · {pending.spiritName ?? "Spirit not detected"} · {pending.format === "PANTHEON" ? "Pantheon" : "Standard"}</p><p className="mt-2 text-sm">{preview.main} main · {preview.material} material · {preview.sideboard} sideboard</p></div>
      {(!pending.championName || !pending.spiritName || preview.unknown.length > 0) && <div className="mt-3 rounded-lg border border-ctp-yellow/50 bg-ctp-yellow/5 p-3 text-sm text-ctp-subtext1"><p className="font-semibold text-ctp-yellow">Import warnings</p><ul className="mt-1 list-disc pl-5">{!pending.championName && <li>No Champion was detected in Material. Add it before importing.</li>}{!pending.spiritName && <li>No Spirit was detected. Some calculations may be unavailable.</li>}{preview.unknown.length > 0 && <li>{preview.unknown.length} card names are not in the catalog: {preview.unknown.slice(0, 3).join(", ")}{preview.unknown.length > 3 ? "…" : ""}</li>}</ul></div>}
      {!compact && <div className="mt-4">{actions}</div>}
    </div> : <>
      <div className="mt-3"><Tabs baseId={baseId} tabs={[{key: "paste", label: "Paste decklist"}, {key: "library", label: "My Decks"}]} active={mode} onChange={setMode} label="Deck source" /></div>
      <TabPanel baseId={baseId} tab="paste" active={mode} className="mt-3">
        <label className="block text-sm">Format<select value={format} onChange={event => setFormat(event.target.value as DeckFormat)} className="ml-2 min-h-control"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option></select></label>
        <textarea value={text} onChange={event => setText(event.target.value)} rows={compact ? 6 : 9} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} aria-label="Decklist" className="mt-2 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 font-mono text-sm" />
        <Button variant="primary" disabled={!text.trim()} onClick={preparePaste} className="mt-2">Check decklist</Button>
      </TabPanel>
      <TabPanel baseId={baseId} tab="library" active={mode} className="mt-3">
        {libraryState === "loading" && <p role="status" className="text-sm text-ctp-subtext1">Loading your deck library…</p>}
        {libraryState === "signed-out" && <InlineState>Sign in from <Link to="/decks/edit" className="inline-flex min-h-control items-center text-ctp-blue underline">My Decks</Link> to import a saved deck.</InlineState>}
        {libraryState === "error" && <p role="alert" className="text-sm text-ctp-red">Your deck library could not be loaded. <Button onClick={() => setLibraryReload(value => value + 1)}>Try again</Button></p>}
        {libraryState === "ready" && <>{bookmarksUnavailable && <p role="status" className="mb-3 text-sm text-ctp-yellow">Community favorites could not be loaded. Your saved builds are available. <Button onClick={() => setLibraryReload(value => value + 1)}>Retry library</Button></p>}<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your decks…" aria-label="Search your decks" className="min-h-control w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm" />
          {!libraryDecks.length ? <InlineState className="mt-3">{owned.length || saved.length ? "No decks match this search. Try another name." : "No saved decks yet. Paste a decklist to get started."}</InlineState> : <div className="mt-3 grid gap-3 sm:grid-cols-2">{libraryDecks.map(deck => <article key={deck.key} className="min-w-0 rounded-xl border border-ctp-surface1 p-3">
            <DeckCardPreview compact newTab lines={(deck.decklist.material.length ? deck.decklist.material : deck.decklist.main).slice(0, 3).map(line => ({name: line.card, quantity: line.quantity}))} cardsByName={catalogByName} />
            <h3 className="mt-3 break-words font-semibold">{deck.title}</h3><p className="mt-1 text-xs text-ctp-subtext1">{deck.subtitle} · {deck.format === "PANTHEON" ? "Pantheon" : "Standard"}</p>
            <Button className="mt-2 w-full" aria-label={`Select ${deck.title}`} onClick={() => prepareLibraryDeck(deck)}>Select deck</Button>
          </article>)}</div>}
        </>}
      </TabPanel>
    </>}
    {notice && <p role="status" className="mt-2 text-sm text-ctp-yellow">{notice}</p>}
  </section>;
  return compact ? <DialogSheet title="Import deck" onDismiss={close} dirty={!!text.trim() || !!pending} footer={actions}>{body}</DialogSheet> : <div className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4">{body}</div>;
}
