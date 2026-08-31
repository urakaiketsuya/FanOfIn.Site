import { useCallback, useEffect, useState } from "react";
import type { AccountUser, BookmarkedDeck, DeckFormat, DeckImportPreview, SavedDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { parseDecklist } from "../compare/parseDecklist";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "./GoogleSignInButton";
import { Link } from "react-router-dom";
import AccountChecklist from "./AccountChecklist";
import SavedDeckCard from "./SavedDeckCard";

type Provider = "omnidex" | "shoutatyourdecks";
type AddMode = "import" | "paste" | null;

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
  const [provider, setProvider] = useState<Provider>("omnidex");
  const [identifier, setIdentifier] = useState("");
  const [preview, setPreview] = useState<DeckImportPreview | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);

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

  if (user === undefined) return <div className="mx-auto max-w-4xl px-4 py-10 text-ctp-subtext1">Loading your account…</div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-12"><h1 className="text-2xl font-bold text-ctp-blue">My Decks</h1><p className="mt-2 text-ctp-subtext1">Sign in to save decklists and keep imported tournament and community builds together.</p><div className="mt-6"><GoogleSignInButton onCredential={(credential, nonce) => void run(async () => { const session = await accountApi.googleSignIn(credential, nonce); setUser(session.user); await refreshDecks(); })} /></div>{error && <p className="mt-4 text-sm text-ctp-red">{error}</p>}</div>;

  return <div className="mx-auto max-w-5xl px-4 py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-ctp-blue">My Decks</h1><p className="mt-2 text-sm text-ctp-subtext1">Your editable builds and saved community decks in one library.</p><p className="mt-1 text-xs text-ctp-subtext0">{decks.length} editable build{decks.length === 1 ? "" : "s"} · {bookmarks.length} saved deck{bookmarks.length === 1 ? "" : "s"}</p></div><div className="flex flex-wrap gap-2"><button type="button" aria-expanded={addMode === "paste"} onClick={() => setAddMode((current) => current === "paste" ? null : "paste")} className="rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base">Add deck</button><button type="button" aria-expanded={addMode === "import"} onClick={() => setAddMode((current) => current === "import" ? null : "import")} className="rounded-md border border-ctp-blue px-3 py-2 text-sm text-ctp-blue">Import decks</button><Link to="/account" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm text-ctp-subtext1 hover:text-ctp-text">Account</Link></div></div>
    {error && <p className="mt-4 rounded-md border border-ctp-red/50 bg-ctp-red/10 p-3 text-sm text-ctp-red">{error}</p>}
    {notice && <p className="mt-4 rounded-md border border-ctp-green/50 bg-ctp-green/10 p-3 text-sm text-ctp-green">{notice}</p>}

    <AccountChecklist user={user} decks={decks} />

    {addMode === "import" && <section className="mt-6 rounded-xl border border-ctp-blue/40 bg-ctp-mantle p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ctp-text">Import public decks</h2><p className="mt-1 text-xs text-ctp-subtext1">Link a public profile and preview its archived decklists. This does not verify ownership.</p></div><button type="button" onClick={() => setAddMode(null)} className="text-sm text-ctp-subtext1 hover:text-ctp-text" aria-label="Close import form">Close</button></div><div className="mt-4 flex max-w-xl flex-wrap gap-2"><select value={provider} onChange={(event) => { setProvider(event.target.value as Provider); setPreview(null); }} className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="omnidex">Omnidex ID</option><option value="shoutatyourdecks">Shout At Your Decks</option></select><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={provider === "omnidex" ? "Player ID" : "Username"} className="min-w-48 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /><button disabled={busy || !identifier.trim()} type="button" onClick={() => void run(async () => setPreview(await accountApi.previewImport(provider, identifier)))} className="rounded-md border border-ctp-blue px-3 py-2 text-sm text-ctp-blue disabled:opacity-50">Preview import</button></div>{preview && <div className="mt-4 max-w-xl rounded-md border border-ctp-surface0 p-3 text-sm"><p className="font-medium">{preview.displayName}</p><p className="text-ctp-subtext1">{preview.candidates.length} archived decklist{preview.candidates.length === 1 ? "" : "s"} found</p><ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-ctp-subtext1">{preview.candidates.slice(0, 50).map((candidate) => <li key={candidate.externalDeckId}>{candidate.title}</li>)}</ul><button disabled={busy || preview.candidates.length === 0} type="button" onClick={() => void run(async () => { const result = await accountApi.importDecks(provider, identifier); await refreshDecks(); setPreview(null); setAddMode(null); setNotice(`Imported ${result.created} new build${result.created === 1 ? "" : "s"}; linked ${result.linked} duplicate appearance${result.linked === 1 ? "" : "s"}.`); })} className="mt-3 rounded-md bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base disabled:opacity-50">Import all</button></div>}</section>}

    {addMode === "paste" && <section className="mt-6 rounded-xl border border-ctp-blue/40 bg-ctp-mantle p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-ctp-text">Add a pasted decklist</h2><p className="mt-1 text-xs text-ctp-subtext1">Paste a Grand Archive decklist to create an editable build.</p></div><button type="button" onClick={() => setAddMode(null)} className="text-sm text-ctp-subtext1 hover:text-ctp-text" aria-label="Close add deck form">Close</button></div><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deck name" aria-label="Deck name" className="rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /><select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat)} aria-label="Deck format" className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option><option value="UNKNOWN">Unknown</option></select></div><textarea rows={9} value={deckText} onChange={(event) => setDeckText(event.target.value)} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} aria-label="Decklist" className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 font-mono text-sm" /><button disabled={busy || !deckText.trim()} type="button" onClick={() => void run(async () => { const parsed = parseDecklist(deckText); if (parsed.decklist.main.length + parsed.decklist.material.length === 0) throw new Error("No main or material cards were recognized"); await accountApi.saveDeck({ title: title.trim() || "Untitled deck", format, decklist: parsed.decklist, source: { provider: "manual", externalDeckId: crypto.randomUUID(), label: "Pasted decklist" } }); setTitle(""); setDeckText(""); setAddMode(null); await refreshDecks(); setNotice("Deck added to your library."); })} className="mt-3 rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save deck</button></section>}

    <section className="mt-10"><h2 className="text-lg font-semibold">My editable decks</h2>{decks.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">Import or paste a decklist to start your library.</p> : <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{decks.map((deck) => <SavedDeckCard key={deck.id} deck={deck} onRename={() => { const next = window.prompt("Deck name", deck.title); if (next?.trim()) void run(async () => { await accountApi.renameDeck(deck.id, next); await refreshDecks(); }); }} onDelete={() => { if (window.confirm(`Delete ${deck.title}?`)) void run(async () => { await accountApi.deleteDeck(deck.id); await refreshDecks(); }); }} />)}</div>}</section>
    <section className="mt-8"><h2 className="text-lg font-semibold">Saved community decks</h2><p className="mt-1 text-sm text-ctp-subtext1">Bookmarks keep the exact version you saved, even when its author publishes a newer one.</p>{bookmarks.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">Decks you save from public pages will appear here.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{bookmarks.map((deck) => <Link key={deck.publicSlug} to={`/decklists/${deck.publicSlug}`} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-blue"><p className="font-semibold text-ctp-blue">{deck.title}</p><p className="mt-1 text-xs text-ctp-subtext1">by {deck.owner.displayName} · saved version {deck.versionNumber} · {deck.likeCount} like{deck.likeCount === 1 ? "" : "s"}</p></Link>)}</div>}</section>
  </div>;
}
