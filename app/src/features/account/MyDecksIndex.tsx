import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountUser, BookmarkedDeck, DeckFormat, SavedDeck, TournamentDeckFavorite } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { trackEvent } from "../../lib/analytics";
import { parseDecklist } from "../compare/parseDecklist";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "./GoogleSignInButton";
import DiscordSignInButton from "./DiscordSignInButton";
import PasswordSignInPanel from "./PasswordSignInPanel";
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
import { loadDeckLibrary } from "./loadDeckLibrary";

type AddMode = "choose" | "import" | "paste" | null;

export default function MyDecksIndex() {
  useDocumentTitle("My Decks", "Save and import your Grand Archive decklists.");
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedDeck[]>([]);
  const [tournamentFavorites, setTournamentFavorites] = useState<TournamentDeckFavorite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<DeckFormat>("STANDARD");
  const [deckText, setDeckText] = useState("");
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [deckSearch, setDeckSearch] = useState("");
  const [favoriteSearch, setFavoriteSearch] = useState("");
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
  const visibleBookmarks = useMemo(() => {
    const query = favoriteSearch.trim().toLowerCase();
    return bookmarks.filter((deck) => !query || deck.title.toLowerCase().includes(query) || (deck.championName?.toLowerCase().includes(query) ?? false));
  }, [bookmarks, favoriteSearch]);
  const visibleTournamentFavorites = useMemo(() => {
    const query = favoriteSearch.trim().toLowerCase();
    return tournamentFavorites.filter((deck) => !query || deck.title.toLowerCase().includes(query) || (deck.championName?.toLowerCase().includes(query) ?? false) || (deck.sourceEventName?.toLowerCase().includes(query) ?? false));
  }, [tournamentFavorites, favoriteSearch]);
  const favoriteCount = bookmarks.length + tournamentFavorites.length;

  const refreshDecks = useCallback(async () => {
    const library = await loadDeckLibrary(accountApi);
    setDecks(library.decks);
    setBookmarks(library.bookmarks);
    setTournamentFavorites(library.tournamentFavorites);
    if (library.optionalLoadFailed) setError("Your decks loaded, but some favorites are temporarily unavailable.");
  }, []);
  useEffect(() => { void accountApi.session().then((session) => { setUser(session.user); if (session.user) void refreshDecks(); }).catch((reason: Error) => { setError(reason.message); setUser(null); }); }, [refreshDecks]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null); setNotice(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  if (user === undefined) return <PageLayout data-component="MyDecksIndex" width="wide"><InlineState className="mt-10">Loading your account…</InlineState></PageLayout>;
  if (!user) return <PageLayout data-component="MyDecksIndex" width="standard"><Panel className="mt-8 text-center"><h1 className="text-2xl font-bold text-ctp-blue">Make My Decks your deck-building home</h1><p className="mx-auto mt-2 max-w-xl text-ctp-subtext1">Sign in to save builds, track versions, compare lists, and keep imported tournament and community decks together.</p><div className="mt-6 flex flex-wrap items-center justify-center gap-3"><GoogleSignInButton onCredential={(credential, nonce) => void run(async () => { const session = await accountApi.googleSignIn(credential, nonce); setUser(session.user); await refreshDecks(); })} /><DiscordSignInButton /><PasswordSignInPanel onSignedIn={(signedInUser) => { setUser(signedInUser); void refreshDecks(); }} />{import.meta.env.DEV && <Button variant="primary" onClick={() => void run(async () => { const session = await accountApi.devSignIn(); setUser(session.user); await refreshDecks(); })}>Use local test account</Button>}<Link to="/deck-builder" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Try Guided Deck Builder</Link></div>{error && error !== "Failed to fetch" && <InlineState tone="danger" className="mt-4 text-sm">{error}</InlineState>}</Panel></PageLayout>;

  return <PageLayout data-component="MyDecksIndex" width="wide">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-ctp-blue">My Decks</h1><p className="mt-2 text-sm text-ctp-subtext1">Your editable builds and favorite community or tournament decks.</p><p className="mt-1 text-xs text-ctp-subtext0">{decks.length} editable build{decks.length === 1 ? "" : "s"} · {favoriteCount} favorite{favoriteCount === 1 ? "" : "s"}</p></div><Button variant="primary" aria-expanded={addMode !== null} onClick={() => setAddMode((current) => current ? null : "choose")}>{addMode ? "Close" : "Add deck"}</Button></div>
    {error && <Panel tone="danger" padding="sm" className="mt-4 text-sm text-ctp-red">{error}</Panel>}
    {notice && <Panel tone="success" padding="sm" className="mt-4 text-sm text-ctp-green">{notice}</Panel>}

    <AccountChecklist user={user} decks={decks} />

    {addMode && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ctp-crust/80 p-4 pt-[10vh]" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setAddMode(null); }}><div role="dialog" aria-modal="true" aria-label="Add a deck" className="w-full max-w-4xl rounded-2xl border border-ctp-surface1 bg-ctp-base p-4 shadow-2xl sm:p-6"><div className="flex justify-end"><button type="button" onClick={() => setAddMode(null)} className="rounded-md px-3 py-2 text-sm text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text">Close</button></div>

    {addMode === "choose" && <section><div><h2 className="text-xl font-semibold text-ctp-text">Add a deck</h2><p className="mt-1 text-sm text-ctp-subtext1">Get recommendations as you build.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Link to="/deck-builder" className="rounded-lg border border-ctp-blue/60 bg-ctp-blue/10 p-4 hover:bg-ctp-blue/15"><span className="font-semibold text-ctp-blue">Guided Deck Builder →</span><p className="mt-1 text-sm text-ctp-subtext1">Build from tournament and community recommendations.</p></Link><button type="button" onClick={() => setAddMode("paste")} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 text-left hover:border-ctp-blue/60"><span className="font-semibold text-ctp-text">Paste a decklist</span><p className="mt-1 text-sm text-ctp-subtext1">Create an editable deck from a list you already have.</p></button><button type="button" onClick={() => setAddMode("import")} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4 text-left hover:border-ctp-blue/60"><span className="font-semibold text-ctp-text">Import public decks</span><p className="mt-1 text-sm text-ctp-subtext1">Bring in archived Omnidex or Shout At Your Decks lists.</p></button></div></section>}

    {addMode === "import" && <ImportDecksPanel decks={decks} busy={busy} run={run} onClose={() => setAddMode(null)} onImported={async (result) => { await refreshDecks(); setNotice(`Imported ${result.created} new build${result.created === 1 ? "" : "s"}; linked ${result.linked} appearance${result.linked === 1 ? "" : "s"}${result.collectionChanged !== undefined ? `; updated ${result.collectionChanged} collection card${result.collectionChanged === 1 ? "" : "s"}` : ""}${result.skipped ? `; ${result.skipped} skipped. ${result.failures.slice(0, 2).map((failure) => `${failure.title}: ${failure.reason}`).join(" ")}` : "."}`); }} />}

    {addMode === "paste" && <section><div><h2 className="text-xl font-semibold text-ctp-text">Add a pasted decklist</h2><p className="mt-1 text-xs text-ctp-subtext1">Paste a list formatted for Omnidex.</p></div><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deck name" aria-label="Deck name" className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm" /><select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat)} aria-label="Deck format" className="rounded-md border border--surface1 bg-ctp-mantle px-2 py-2 text-sm"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option><option value="UNKNOWN">Unknown</option></select></div><textarea rows={9} value={deckText} onChange={(event) => setDeckText(event.target.value)} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} aria-label="Decklist" className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 font-mono text-sm" />{deckText.trim() && <p className={`mt-2 text-sm ${pastedChampionName ? "text-ctp-green" : "text-ctp-yellow"}`}>{pastedChampionName ? `Champion detected: ${pastedChampionName}` : "No Champion detected in the Material section."}</p>}<Button disabled={busy || !deckText.trim()} type="button" onClick={() => void run(async () => { const parsed = parseDecklist(deckText); if (parsed.decklist.main.length + parsed.decklist.material.length === 0) throw new Error("No main or material cards were recognized"); await accountApi.saveDeck({ title: title.trim() || "Untitled deck", format, championName: pastedChampionName, decklist: parsed.decklist, source: { provider: "manual", externalDeckId: crypto.randomUUID(), label: "Pasted decklist" } }); trackEvent("deck_created", { source: "paste" }); setTitle(""); setDeckText(""); setAddMode(null); await refreshDecks(); setNotice("Deck added to your library."); })} className="mt-3" variant="primary">Save deck</Button></section>}
    </div></div>}

    <Section className="mt-10" title="Your builds" description={`${decks.length} editable deck${decks.length === 1 ? "" : "s"} that you own and version.`}>
      {decks.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-ctp-surface1 p-8 text-center text-sm text-ctp-subtext1">Build, import, or paste a deck to start your library.</p> : <>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input value={deckSearch} onChange={(event) => setDeckSearch(event.target.value)} placeholder="Search decks or Champions" aria-label="Search my decks" className="min-w-0 flex-1 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm focus:border-ctp-blue focus:outline-none" />
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
          ? <p className="mt-4 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">No decks match these filters.</p>
          : <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleDecks.map((deck) => <SavedDeckCard key={deck.id} deck={deck} onRename={() => { const next = window.prompt("Deck name", deck.title); if (next?.trim()) void run(async () => { await accountApi.renameDeck(deck.id, next); trackEvent("deck_renamed"); await refreshDecks(); }); }} onDelete={() => { if (window.confirm(`Delete ${deck.title}?`)) void run(async () => { await accountApi.deleteDeck(deck.id); trackEvent("deck_deleted"); await refreshDecks(); }); }} />)}
          </div>}
      </>}
    </Section>
    <Section className="mt-10" title={`Favorites (${favoriteCount})`} description="Community publications and tournament builds you want to revisit. Favorites preserve the deck snapshot you selected.">
      {favoriteCount === 0 ? <p className="mt-4 rounded-lg border border-dashed border-ctp-surface1 p-8 text-center text-sm text-ctp-subtext1">No favorites yet. Add one from a community or tournament deck page.</p> : <><input value={favoriteSearch} onChange={(event) => setFavoriteSearch(event.target.value)} placeholder="Search favorites, Champions, or events" aria-label="Search favorite decks" className="mt-4 min-h-11 w-full max-w-md rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 text-sm focus:border-ctp-yellow focus:outline-none" />{visibleBookmarks.length + visibleTournamentFavorites.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">No favorites match your search.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visibleTournamentFavorites.map((deck) => <article key={`tournament-${deck.deckHash}`} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-ctp-yellow">Tournament build</p><h3 className="mt-1 font-semibold text-ctp-text">{deck.title}</h3>{deck.sourceEventName && <p className="mt-1 text-xs text-ctp-subtext0">{deck.sourcePlayerName ? `${deck.sourcePlayerName} · ` : ""}{deck.sourceEventName}</p>}</div><span aria-hidden="true" className="text-ctp-yellow">★</span></div><div className="mt-4 flex flex-wrap gap-2"><Link to={`/decks/${deck.deckHash}`} className="inline-flex min-h-11 items-center rounded-lg bg-ctp-blue px-3 text-sm font-semibold text-ctp-base">Open deck</Link><button type="button" onClick={() => void run(async () => { await accountApi.favoriteTournamentDeck(deck.deckHash, { favorited: false }); await refreshDecks(); setNotice(`${deck.title} removed from favorites.`); })} className="min-h-11 rounded-lg px-3 text-xs font-medium text-ctp-red hover:bg-ctp-red/10">Remove favorite</button></div></article>)}{visibleBookmarks.map((deck) => <PublicDeckCard key={deck.publicSlug} deck={deck} onRemoveFavorite={() => void run(async () => { await accountApi.bookmarkDeck(deck.publicSlug, false); await refreshDecks(); setNotice(`${deck.title} removed from favorites.`); })} />)}</div>}</>}
    </Section>
  </PageLayout>;
}
