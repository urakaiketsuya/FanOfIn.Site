import { useEffect, useMemo, useState } from "react";
import type { Card, CollectionEntry, CollectionUpdateMode, OmnidexDecklist } from "@gatcg/shared";
import { computeDeckCollectionStatus } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { formatUsd } from "../../lib/format";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";

export default function DeckCollectionTools({ decklist, cardsByName, source }: { decklist: OmnidexDecklist; cardsByName: Map<string, Card>; source: string }) {
  const [collection, setCollection] = useState<CollectionEntry[] | null>(null);
  const [includeSideboard, setIncludeSideboard] = useState(true);
  const [mode, setMode] = useState<CollectionUpdateMode>("at-least");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const priceByName = useDeckPriceByName();

  useEffect(() => {
    let active = true;
    void accountApi.collection().then((result) => { if (active) setCollection(result.entries); }).catch((reason: unknown) => {
      if (active && reason instanceof AccountApiError && reason.status === 401) setSignedOut(true);
    });
    return () => { active = false; };
  }, []);

  const status = useMemo(() => collection ? computeDeckCollectionStatus(decklist, collection, includeSideboard) : null, [decklist, collection, includeSideboard]);
  const missingLines = useMemo(() => status?.lines.filter((line) => line.missing > 0) ?? [], [status]);
  const missingCost = useMemo(() => missingLines.reduce((sum, line) => sum + (priceByName.get(line.card) ?? 0) * line.missing, 0), [missingLines, priceByName]);
  const updateLines = useMemo(() => {
    const sections = includeSideboard ? [decklist.main, decklist.material, decklist.sideboard] : [decklist.main, decklist.material];
    const quantities = new Map<string, { cardUuid: string; cardName: string; quantity: number }>();
    for (const section of sections) for (const line of section) {
      const card = cardsByName.get(line.card);
      if (!card) continue;
      const existing = quantities.get(card.uuid);
      if (existing) existing.quantity += line.quantity;
      else quantities.set(card.uuid, { cardUuid: card.uuid, cardName: card.name, quantity: line.quantity });
    }
    return Array.from(quantities.values());
  }, [decklist, cardsByName, includeSideboard]);

  if (signedOut) return <p className="mt-3 text-xs text-ctp-subtext1"><Link to="/my-decks" className="text-ctp-blue hover:underline">Sign in</Link> to compare this deck with your collection.</p>;
  if (!collection) return null;

  async function addDeck() {
    if (!updateLines.length) return;
    if (!window.confirm(`${mode === "add" ? "Add" : mode === "set" ? "Set" : "Set to at least"} ${updateLines.reduce((sum, line) => sum + line.quantity, 0)} copies across ${updateLines.length} cards${includeSideboard ? ", including sideboard" : ""}?`)) return;
    setBusy(true); setNotice(null);
    try {
      const result = await accountApi.updateCollection({ mode, source, lines: updateLines });
      const refreshed = await accountApi.collection();
      setCollection(refreshed.entries);
      window.dispatchEvent(new Event("fanofin:collection-updated"));
      setNotice(result.changed ? `${result.changed} collection entr${result.changed === 1 ? "y" : "ies"} updated. You can undo this from Collection.` : "Your collection already covers these quantities.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Collection could not be updated"); }
    finally { setBusy(false); }
  }

  return <aside className="rounded-lg border border-ctp-green/40 bg-ctp-green/5 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-ctp-text">Collection</h3><p className={`mt-1 text-sm ${status?.complete ? "text-ctp-green" : "text-ctp-subtext1"}`}>{status?.complete ? "You own every card in this list." : `${status?.ownedCopies ?? 0} / ${status?.requiredCopies ?? 0} copies owned · ${status?.missingCopies ?? 0} missing`}{status?.proxyCopies ? ` · ${status.proxyCopies} proxied` : ""}</p></div><Link to="/collection" className="text-sm text-ctp-blue hover:underline">Open collection →</Link></div>
    {status && !status.complete && <details className="mt-2"><summary className="cursor-pointer text-xs text-ctp-subtext1">Show missing cards{missingCost > 0 ? ` · about ${formatUsd(missingCost)}` : ""}</summary><ul className="mt-2 grid gap-1 text-xs text-ctp-subtext1 sm:grid-cols-2">{missingLines.map((line) => <li key={line.card}>{line.missing}× {line.card}</li>)}</ul><a href={buildTcgplayerMassEntryUrl(missingLines.map((line) => ({ name: line.card, quantity: line.missing })))} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-ctp-blue hover:underline">Shop missing cards on TCGplayer ↗</a></details>}
    <details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-ctp-blue">Update collection</summary><div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center"><select value={mode} onChange={(event) => setMode(event.target.value as CollectionUpdateMode)} className="max-w-full rounded border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs"><option value="at-least">Set to at least deck quantities</option><option value="add">Add another copy of this deck</option><option value="set">Set these cards to deck quantities</option></select><label className="flex items-center gap-1.5 text-xs text-ctp-subtext1"><input type="checkbox" checked={includeSideboard} onChange={(event) => setIncludeSideboard(event.target.checked)} /> Include sideboard</label><button type="button" disabled={busy || !updateLines.length} onClick={() => void addDeck()} className="rounded bg-ctp-green px-3 py-1.5 text-xs font-medium text-ctp-base disabled:opacity-50">{busy ? "Updating…" : "Add deck to collection"}</button></div></details>
    {updateLines.length < (status?.lines.length ?? 0) && <p className="mt-2 text-xs text-ctp-yellow">Some card names have not resolved against the catalog yet and will not be changed.</p>}
    {notice && <p className="mt-2 text-xs text-ctp-subtext1">{notice}</p>}
  </aside>;
}
