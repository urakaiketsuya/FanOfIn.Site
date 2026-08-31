import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { SavedDeckDetail } from "@gatcg/shared";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { buildDecklistText } from "../events/DecklistView";
import { parseDecklist } from "../compare/parseDecklist";

export default function MyDeckDetail() {
  const { deckId = "" } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<SavedDeckDetail | null>();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deckText, setDeckText] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [busy, setBusy] = useState(false);
  useDocumentTitle(deck?.title ?? "Saved Deck", "View a private saved deck and its version history.");

  useEffect(() => {
    let active = true;
    void accountApi.deck(deckId).then(({ deck: result }) => {
      if (active) setDeck(result);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof AccountApiError && reason.status === 401 ? "Sign in to view this deck." : reason instanceof Error ? reason.message : "Deck could not be loaded");
      setDeck(null);
    });
    return () => { active = false; };
  }, [deckId]);

  async function refresh() {
    const result = await accountApi.deck(deckId);
    setDeck(result.deck);
    setDeckText(buildDecklistText(result.deck.decklist));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  if (deck === undefined) return <div className="mx-auto max-w-4xl px-4 py-10 text-ctp-subtext1">Loading deck…</div>;
  if (!deck) return <div className="mx-auto max-w-4xl px-4 py-10"><h1 className="text-2xl font-bold text-ctp-text">Deck unavailable</h1><p className="mt-2 text-ctp-subtext1">{error}</p><Link to="/my-decks" className="mt-5 inline-block text-ctp-blue hover:underline">Back to My Decks</Link></div>;

  return <div className="mx-auto max-w-4xl px-4 py-8">
    <Link to="/my-decks" className="text-sm text-ctp-blue hover:underline">← My Decks</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-ctp-text">{deck.title}</h1><p className="mt-1 text-sm text-ctp-subtext1">{deck.championName ?? "Unknown champion"} · {deck.format}</p></div>
      <span className="rounded-full border border-ctp-surface1 px-3 py-1 text-xs capitalize text-ctp-subtext1">{deck.visibility}</span>
    </div>
    <section className="mt-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-ctp-text">Current decklist</h2><button type="button" onClick={() => { setDeckText(buildDecklistText(deck.decklist)); setEditing((value) => !value); }} className="rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue">{editing ? "Cancel" : "Edit deck"}</button></div>
      {error && <p className="mt-3 rounded border border-ctp-red/50 bg-ctp-red/10 p-2 text-sm text-ctp-red">{error}</p>}
      {editing ? <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void run(async () => { const parsed = parseDecklist(deckText); await accountApi.createDeckVersion(deck.id, { decklist: parsed.decklist, format: deck.format, championName: deck.championName, changeNote }); await refresh(); setChangeNote(""); setEditing(false); }); }}>
        <textarea rows={18} required value={deckText} onChange={(event) => setDeckText(event.target.value)} className="w-full rounded-md border border-ctp-surface1 bg-ctp-base p-4 font-mono text-sm text-ctp-text" />
        <input value={changeNote} maxLength={240} onChange={(event) => setChangeNote(event.target.value)} placeholder="What changed? (optional)" className="mt-2 w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm" />
        <button disabled={busy} type="submit" className="mt-3 rounded-md bg-ctp-blue px-3 py-2 text-sm text-ctp-base disabled:opacity-50">Save new version</button>
      </form> : <pre className="mt-3 max-h-[36rem] overflow-auto whitespace-pre-wrap rounded-md bg-ctp-base p-4 text-sm text-ctp-subtext1">{buildDecklistText(deck.decklist)}</pre>}
    </section>
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-ctp-text">Version history</h2>
      <div className="mt-3 space-y-2">{deck.versions.map((version) => <details key={version.id} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3" open={version.id === deck.currentVersionId}>
        <summary className="cursor-pointer text-sm"><span className="font-medium">Version {version.versionNumber}</span><span className="ml-2 text-ctp-subtext1">{new Date(version.createdAt).toLocaleString()} · {version.changeNote || "Deck updated"}</span>{version.id === deck.currentVersionId && <span className="ml-2 text-ctp-green">Current</span>}</summary>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-ctp-base p-3 text-xs text-ctp-subtext1">{buildDecklistText(version.decklist)}</pre>
        {version.id !== deck.currentVersionId && <button disabled={busy} type="button" onClick={() => void run(async () => { await accountApi.restoreDeckVersion(deck.id, version.id); await refresh(); })} className="mt-2 rounded border border-ctp-blue px-2 py-1 text-xs text-ctp-blue disabled:opacity-50">Restore as new version</button>}
      </details>)}</div>
    </section>
  </div>;
}
