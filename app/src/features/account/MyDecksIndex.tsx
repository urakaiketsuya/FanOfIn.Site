import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountUser, BookmarkedDeck, DeckFormat, SavedDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { parseDecklist } from "../compare/parseDecklist";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "./GoogleSignInButton";
import { Link } from "react-router-dom";
import AccountChecklist from "./AccountChecklist";
import SavedDeckCard from "./SavedDeckCard";
import { useCardsByNames } from "../events/useCardsByNames";
import { findDeckChampionName } from "../../lib/ttsExport";
import { PublicDeckCard } from "./PublicDeckCard";
import PageLayout from "../../components/layout/PageLayout";
import ImportDecksPanel from "./ImportDecksPanel";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import Button from "../../components/ui/Button";
import { InlineState } from "../../components/ui/ContentState";

type AddMode = "choose" | "import" | "paste" | null;

export default function MyDecksIndex() {
  useDocumentTitle("My Decks", "Save and import your Grand Archive decklists.");
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedDeck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<DeckFormat>("STANDARD");
  const [deckText, setDeckText] = useState("");
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [deckSearch, setDeckSearch] = useState("");
  const [deckFormatFilter, setDeckFormatFilter] = useState<"ALL" | DeckFormat>("ALL");
  const [deckChampionFilter, setDeckChampionFilter] = useState("ALL");
  const [deckSort, setDeckSort] = useState<"updated" | "created" | "title">("updated");
  const pastedDeck = useMemo(() => parseDecklist(deckText).decklist, [deckText]);
  const pastedCardNames = useMemo(() => [...pastedDeck.main, ...pastedDeck.material, ...pastedDeck.sideboard].map((line) => line.card), [pastedDeck]);
  const pastedCardsByName = useCardsByNames(pastedCardNames);
  const pastedChampionName = useMemo(() => findDeckChampionName(pastedDeck.material, pastedCardsByName)?.split(",")[0].trim() ?? null, [pastedDeck.material, pastedCardsByName]);

  const deckChampionOptions = useMemo(
    () => Array.from(new Set(decks.map((deck) => deck.championName).filter((name): name is string => !!name))).sort((a, b) => a.localeCompare(b)),
    [decks],
  );
  const visibleDecks = useMemo(() => {
    const query = deckSearch.trim().toLowerCase();
    return decks
      .filter((deck) => !query || deck.title.toLowerCase().includes(query) || (deck.championName?.toLowerCase().includes(query) ?? false))
      .filter((deck) => deckFormatFilter === "ALL" || deck.format === deckFormatFilter)
      .filter((deck) => deckChampionFilter === "ALL" || deck.championName === deckChampionFilter)
      .sort((a, b) => deckSort === "title" ? a.title.localeCompare(b.title) : deckSort === "created" ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt));
  }, [decks, deckSearch, deckFormatFilter, deckChampionFilter, deckSort]);

  const refreshDecks = useCallback(async () => {
    const [owned, saved] = await Promise.all([accountApi.decks(), accountApi.bookmarks()]);
    setDecks(owned.decks); setBookmarks(saved.decks);
  }, []);
  useEffect(() => { void accountApi.session().then((session) => { setUser(session.user); if (session.user) void refreshDecks(); }).catch((reason: Error) => { setError(reason.message); setUser(null); }); }, [refreshDecks]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null); setNotice(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  if (user === undefined) return <PageLayout width="wide"><InlineState className="mt-10">Loading your account…</InlineState></PageLayout>;
  if (!user) return <PageLayout width="standard"><h1 className="text-2xl font-bold text-ctp-blue">My Decks</h1><p className="mt-2 text-ctp-subtext1">Sign in to save decklists and keep imported tournament and community builds together.</p><div className="mt-6"><GoogleSignInButton onCredential={(credential, nonce) => void run(async () => { const session = await accountApi.googleSignIn(credential, nonce); setUser(session.user); await refreshDecks(); })} /></div>{error && <InlineState tone="danger" className="mt-4 text-sm">{error}</InlineState>}</PageLayout>;

  return <PageLayout width="wide">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-ctp-blue">My Decks</h1><p className="mt-2 text-sm text-ctp-subtext1">Your editable builds and saved community decks in one library.</p><p className="mt-1 text-xs text-ctp-subtext0">{decks.length} editable build{decks.length === 1 ? "" : "s"} · {bookmarks.length} saved deck{bookmarks.length === 1 ? "" : "s"}</p></div><Button variant="primary" aria-expanded={addMode !== null} onClick={() => setAddMode((current) => current ? null : "choose")}>{addMode ? "Close" : "Add deck"}</Button></div>
    {error && <Panel tone="danger" padding="sm" className="mt-4 text-sm text-ctp-red">{error}</Panel>}
    {notice && <Panel tone="success" padding="sm" className="mt-4 text-sm text-ctp-green">{notice}</Panel>}

    <AccountChecklist user={user} decks={decks} />

    {addMode === "choose" && <section className="mt-6 rounded-xl border border-ctp-blue/40 bg-ctp-mantle p-5"><div><h2 className="font-semibold text-ctp-text">Add a deck</h2><p className="mt-1 text-sm text-ctp-subtext1">Start with guided recommendations or bring an existing list.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Link to="/deck-builder" className="rounded-lg border border-ctp-blue/60 bg-ctp-blue/10 p-4 hover:bg-ctp-blue/15"><span className="font-semibold text-ctp-blue">Guided Deck Builder →</span><p className="mt-1 text-sm text-ctp-subtext1">Build from tournament and community recommendations.</p></Link><button type="button" onClick={() => setAddMode("paste")} className="rounded-lg border border-ctp-surface1 bg-ctp-base p-4 text-left hover:border-ctp-blue/60"><span className="font-semibold text-ctp-text">Paste a decklist</span><p className="mt-1 text-sm text-ctp-subtext1">Create an editable deck from a list you already have.</p></button><button type="button" onClick={() => setAddMode("import")} className="rounded-lg border border-ctp-surface1 bg-ctp-base p-4 text-left hover:border-ctp-blue/60"><span className="font-semibold text-ctp-text">Import public decks</span><p className="mt-1 text-sm text-ctp-subtext1">Bring in archived Omnidex or Shout At Your Decks lists.</p></button></div></section>}

    {addMode === "import" && <ImportDecksPanel decks={decks} busy={busy} run={run} onClose={() => setAddMode(null)} onImported={async (result) => { await refreshDecks(); setNotice(`Imported ${result.created} new build${result.created === 1 ? "" : "s"}; linked ${result.linked} appearance${result.linked === 1 ? "" : "s"}${result.collectionChanged !== undefined ? `; updated ${result.collectionChanged} collection card${result.collectionChanged === 1 ? "" : "s"}` : ""}${result.skipped ? `; ${result.skipped} skipped. ${result.failures.slice(0, 2).map((failure) => `${failure.title}: ${failure.reason}`).join(" ")}` : "."}`); }} />}

    {addMode === "paste" && <section className="mt-6 rounded-xl border border-ctp-blue/40 bg-ctp-mantle p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ctp-text">Add a pasted decklist</h2><p className="mt-1 text-xs text-ctp-subtext1">Paste a Grand Archive decklist to create an editable build.</p></div><button type="button" onClick={() => setAddMode(null)} className="text-sm text-ctp-subtext1 hover:text-ctp-text" aria-label="Close add deck form">Close</button></div><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deck name" aria-label="Deck name" className="rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /><select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat)} aria-label="Deck format" className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option><option value="UNKNOWN">Unknown</option></select></div><textarea rows={9} value={deckText} onChange={(event) => setDeckText(event.target.value)} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} aria-label="Decklist" className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 font-mono text-sm" />{deckText.trim() && <p className={`mt-2 text-sm ${pastedChampionName ? "text-ctp-green" : "text-ctp-yellow"}`}>{pastedChampionName ? `Champion detected: ${pastedChampionName}` : "No Champion detected in the Material section."}</p>}<Button disabled={busy || !deckText.trim()} type="button" onClick={() => void run(async () => { const parsed = parseDecklist(deckText); if (parsed.decklist.main.length + parsed.decklist.material.length === 0) throw new Error("No main or material cards were recognized"); await accountApi.saveDeck({ title: title.trim() || "Untitled deck", format, championName: pastedChampionName, decklist: parsed.decklist, source: { provider: "manual", externalDeckId: crypto.randomUUID(), label: "Pasted decklist" } }); setTitle(""); setDeckText(""); setAddMode(null); await refreshDecks(); setNotice("Deck added to your library."); })} className="mt-3" variant="primary">Save deck</Button></section>}

    <Section className="mt-10" title="My editable decks">
      {decks.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">Import or paste a decklist to start your library.</p> : <>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={deckSearch} onChange={(event) => setDeckSearch(event.target.value)} placeholder="Search by name or Champion" aria-label="Search my decks" className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
          <select value={deckFormatFilter} onChange={(event) => setDeckFormatFilter(event.target.value as "ALL" | DeckFormat)} aria-label="Filter by format" className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm">
            <option value="ALL">All formats</option>
            <option value="STANDARD">Standard</option>
            <option value="PANTHEON">Pantheon</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          {deckChampionOptions.length > 0 && <select value={deckChampionFilter} onChange={(event) => setDeckChampionFilter(event.target.value)} aria-label="Filter by Champion" className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm">
            <option value="ALL">All Champions</option>
            {deckChampionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>}
          <select value={deckSort} onChange={(event) => setDeckSort(event.target.value as "updated" | "created" | "title")} aria-label="Sort my decks" className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm">
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="title">Name (A-Z)</option>
          </select>
        </div>
        {visibleDecks.length === 0
          ? <p className="mt-3 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">No decks match those filters.</p>
          : <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visibleDecks.map((deck) => <SavedDeckCard key={deck.id} deck={deck} onRename={() => { const next = window.prompt("Deck name", deck.title); if (next?.trim()) void run(async () => { await accountApi.renameDeck(deck.id, next); await refreshDecks(); }); }} onDelete={() => { if (window.confirm(`Delete ${deck.title}?`)) void run(async () => { await accountApi.deleteDeck(deck.id); await refreshDecks(); }); }} />)}</div>}
      </>}
    </Section>
    <Section className="mt-8" title="Saved community decks" description="Bookmarks keep the exact version you saved, even when its author publishes a newer one.">{bookmarks.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">Decks you save from public pages will appear here.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{bookmarks.map((deck) => <PublicDeckCard key={deck.publicSlug} deck={deck} />)}</div>}</Section>
  </PageLayout>;
}
