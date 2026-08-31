import { useCallback, useEffect, useState } from "react";
import type { AccountUser, BookmarkedDeck, DeckFormat, DeckImportPreview, SavedDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { parseDecklist } from "../compare/parseDecklist";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "./GoogleSignInButton";
import { Link } from "react-router-dom";

type Provider = "omnidex" | "shoutatyourdecks";

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
  const [username, setUsername] = useState("");

  const refreshDecks = useCallback(async () => {
    const [owned, saved] = await Promise.all([accountApi.decks(), accountApi.bookmarks()]);
    setDecks(owned.decks); setBookmarks(saved.decks);
  }, []);
  useEffect(() => { void accountApi.session().then((session) => { setUser(session.user); setUsername(session.user?.displayName ?? ""); if (session.user) void refreshDecks(); }).catch((reason: Error) => { setError(reason.message); setUser(null); }); }, [refreshDecks]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null); setNotice(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  async function downloadAccountExport() {
    const data = await accountApi.exportAccount();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `fanofin-account-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    URL.revokeObjectURL(url);
  }

  if (user === undefined) return <div className="mx-auto max-w-4xl px-4 py-10 text-ctp-subtext1">Loading your account…</div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-12"><h1 className="text-2xl font-bold text-ctp-blue">My Decks</h1><p className="mt-2 text-ctp-subtext1">Sign in to save decklists and keep imported tournament and community builds together.</p><div className="mt-6"><GoogleSignInButton onCredential={(credential, nonce) => void run(async () => { const session = await accountApi.googleSignIn(credential, nonce); setUser(session.user); await refreshDecks(); })} /></div>{error && <p className="mt-4 text-sm text-ctp-red">{error}</p>}</div>;

  return <div className="mx-auto max-w-4xl px-4 py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-ctp-blue">My Decks</h1><p className="mt-1 text-sm text-ctp-subtext1">Signed in as {user.displayName} · {decks.length} unique build{decks.length === 1 ? "" : "s"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void run(downloadAccountExport)} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 hover:text-ctp-text">Export my data</button><button type="button" onClick={() => void run(async () => { await accountApi.logout(); setUser(null); setDecks([]); })} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 hover:text-ctp-text">Sign out</button><button type="button" onClick={() => void run(async () => { await accountApi.logoutAll(); setUser(null); setDecks([]); })} className="rounded-md border border-ctp-surface1 px-3 py-1.5 text-sm text-ctp-subtext1 hover:text-ctp-text">Sign out all devices</button><button type="button" onClick={() => { if (window.prompt("Permanently delete your account and saved decks? Type DELETE to confirm.") === "DELETE") void run(async () => { await accountApi.deleteAccount(); setUser(null); setDecks([]); }); }} className="rounded-md border border-ctp-red/60 px-3 py-1.5 text-sm text-ctp-red">Delete account</button></div></div>
    {error && <p className="mt-4 rounded-md border border-ctp-red/50 bg-ctp-red/10 p-3 text-sm text-ctp-red">{error}</p>}
    {notice && <p className="mt-4 rounded-md border border-ctp-green/50 bg-ctp-green/10 p-3 text-sm text-ctp-green">{notice}</p>}

    <section className="mt-8 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <h2 className="font-semibold text-ctp-text">Profile</h2>
      <p className="mt-1 text-xs text-ctp-subtext1">Choose the username shown with your account. It can be 2–32 characters.</p>
      <form className="mt-3 flex max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await accountApi.updateUsername(username); setUser(result.user); setUsername(result.user.displayName); setNotice("Username updated."); }); }}>
        <label htmlFor="account-username" className="sr-only">Username</label>
        <input id="account-username" autoComplete="nickname" minLength={2} maxLength={32} required value={username} onChange={(event) => setUsername(event.target.value)} className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
        <button disabled={busy || username.trim() === user.displayName} type="submit" className="rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save username</button>
      </form>
    </section>

    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <section className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Import public decks</h2><p className="mt-1 text-xs text-ctp-subtext1">This links a public profile for importing; it does not verify ownership.</p><div className="mt-3 flex gap-2"><select value={provider} onChange={(event) => { setProvider(event.target.value as Provider); setPreview(null); }} className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="omnidex">Omnidex ID</option><option value="shoutatyourdecks">Shout At Your Decks</option></select><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={provider === "omnidex" ? "Player ID" : "Username"} className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /></div><button disabled={busy || !identifier.trim()} type="button" onClick={() => void run(async () => setPreview(await accountApi.previewImport(provider, identifier)))} className="mt-3 rounded-md border border-ctp-blue px-3 py-1.5 text-sm text-ctp-blue disabled:opacity-50">Preview import</button>{preview && <div className="mt-3 rounded-md border border-ctp-surface0 p-3 text-sm"><p className="font-medium">{preview.displayName}</p><p className="text-ctp-subtext1">{preview.candidates.length} archived decklist{preview.candidates.length === 1 ? "" : "s"} found</p><ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-ctp-subtext1">{preview.candidates.slice(0, 50).map((candidate) => <li key={candidate.externalDeckId}>{candidate.title}</li>)}</ul><button disabled={busy || preview.candidates.length === 0} type="button" onClick={() => void run(async () => { const result = await accountApi.importDecks(provider, identifier); await refreshDecks(); setPreview(null); setNotice(`Imported ${result.created} new build${result.created === 1 ? "" : "s"}; linked ${result.linked} duplicate appearance${result.linked === 1 ? "" : "s"}.`); })} className="mt-3 rounded-md bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base disabled:opacity-50">Import all</button></div>}</section>

      <section className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><h2 className="font-semibold text-ctp-text">Save a pasted decklist</h2><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deck name" className="mt-3 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /><select value={format} onChange={(event) => setFormat(event.target.value as DeckFormat)} className="mt-2 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-2 text-sm"><option value="STANDARD">Standard</option><option value="PANTHEON">Pantheon</option><option value="UNKNOWN">Unknown</option></select><textarea rows={7} value={deckText} onChange={(event) => setDeckText(event.target.value)} placeholder={"Main\n4x Dungeon Guide\n\nMaterial\n1x Spirit of Water"} className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" /><button disabled={busy || !deckText.trim()} type="button" onClick={() => void run(async () => { const parsed = parseDecklist(deckText); if (parsed.decklist.main.length + parsed.decklist.material.length === 0) throw new Error("No main or material cards were recognized"); await accountApi.saveDeck({ title: title.trim() || "Untitled deck", format, decklist: parsed.decklist, source: { provider: "manual", externalDeckId: crypto.randomUUID(), label: "Pasted decklist" } }); setTitle(""); setDeckText(""); await refreshDecks(); })} className="mt-2 rounded-md bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base disabled:opacity-50">Save deck</button></section>
    </div>

    <section className="mt-8"><h2 className="text-lg font-semibold">My editable decks</h2>{decks.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">Import or paste a decklist to start your library.</p> : <div className="mt-3 space-y-3">{decks.map((deck) => <div key={deck.id} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"><div className="flex items-center justify-between gap-3"><div><Link to={`/my-decks/${encodeURIComponent(deck.id)}`} className="font-semibold text-ctp-blue hover:underline">{deck.title}</Link><p className="text-xs text-ctp-subtext1">{deck.championName ?? "Unknown champion"} · {deck.format} · {deck.sources.length} source{deck.sources.length === 1 ? "" : "s"}</p></div><span className="text-xs text-ctp-subtext0">{deck.decklist.main.reduce((sum, line) => sum + line.quantity, 0)} main</span></div><div className="mt-3 flex flex-wrap gap-2"><Link to={`/my-decks/${encodeURIComponent(deck.id)}`} className="rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue">Open deck</Link><button type="button" onClick={() => { const next = window.prompt("Deck name", deck.title); if (next?.trim()) void run(async () => { await accountApi.renameDeck(deck.id, next); await refreshDecks(); }); }} className="rounded border border-ctp-surface1 px-2 py-1 text-xs">Rename</button><button type="button" onClick={() => { if (window.confirm(`Delete ${deck.title}?`)) void run(async () => { await accountApi.deleteDeck(deck.id); await refreshDecks(); }); }} className="rounded border border-ctp-red/60 px-2 py-1 text-xs text-ctp-red">Delete</button></div></div>)}</div>}</section>
    <section className="mt-8"><h2 className="text-lg font-semibold">Saved community decks</h2><p className="mt-1 text-sm text-ctp-subtext1">Bookmarks keep the exact version you saved, even when its author publishes a newer one.</p>{bookmarks.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-ctp-surface1 p-6 text-center text-sm text-ctp-subtext1">Decks you save from public pages will appear here.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{bookmarks.map((deck) => <Link key={deck.publicSlug} to={`/decklists/${deck.publicSlug}`} className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 hover:border-ctp-blue"><p className="font-semibold text-ctp-blue">{deck.title}</p><p className="mt-1 text-xs text-ctp-subtext1">by {deck.owner.displayName} · saved version {deck.versionNumber} · {deck.likeCount} like{deck.likeCount === 1 ? "" : "s"}</p></Link>)}</div>}</section>
  </div>;
}
