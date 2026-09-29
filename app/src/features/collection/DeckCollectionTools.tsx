import { useToast } from "../../components/ui/toast/ToastContext";
import SavedDeckLocations from "./SavedDeckLocations";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card, CollectionEntry, CollectionUpdateLine, CollectionUpdateMode, OmnidexDecklist } from "@gatcg/shared";
import { collectionCompletionLines, computeDeckCollectionStatus } from "@gatcg/shared";
import { Link } from "react-router-dom";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { useDeckPriceByName } from "../pricing/useDeckPriceByName";
import { formatUsd } from "../../lib/format";
import { buildTcgplayerMassEntryUrl } from "../../lib/tcgplayerMassEntry";
import Panel from "../../components/ui/Panel";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import CardResult from "../../components/CardResult";
import DisclosureChevron from "../../components/DisclosureChevron";
import DeckOwnershipEditor from "./DeckOwnershipEditor";
import { deckCollectionLines } from "./collectionBatch";

const linkClass = "inline-flex min-h-12 items-center rounded-lg px-3 text-sm text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue";

export default function DeckCollectionTools({ decklist, cardsByName, source, ownerDeckId, onCollectionChange, onIncludeSideboardChange }: {
  ownerDeckId?: string; decklist: OmnidexDecklist; cardsByName: Map<string, Card>; source: string;
  onCollectionChange?: (entries: CollectionEntry[]) => void; onIncludeSideboardChange?: (include: boolean) => void;
}) {
  const [collection, setCollection] = useState<CollectionEntry[] | null>(null);
  const [includeSideboard, setIncludeSideboard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [shopping, setShopping] = useState(false);
  const { notify, dismiss } = useToast();
  const updateToast = useRef("");
  const mutationBusy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  const pending = useRef<{ signature: string; requestId: string } | null>(null);
  const active = useRef(true);
  const priceByName = useDeckPriceByName();
  const acceptCollection = useCallback((entries: CollectionEntry[]) => {
    if (!active.current) return;
    setCollection(entries); setSignedOut(false); onCollectionChange?.(entries);
  }, [onCollectionChange]);
  const refresh = useCallback(async () => {
    const result = await accountApi.collection();
    acceptCollection(result.entries);
  }, [acceptCollection]);
  useEffect(() => {
    active.current = true;
    const load = () => { void refresh().catch(reason => {
      if (!active.current) return;
      if (reason instanceof AccountApiError && reason.status === 401) setSignedOut(true);
      else setError("Collection could not be loaded. Retry to see your latest ownership.");
    }); };
    load();
    window.addEventListener("fanofin:collection-updated", load);
    return () => { active.current = false; window.removeEventListener("fanofin:collection-updated", load); };
  }, [refresh]);

  const status = useMemo(() => collection ? computeDeckCollectionStatus(decklist, collection, includeSideboard) : null, [decklist, collection, includeSideboard]);
  const required = useMemo(() => deckCollectionLines(decklist, [...cardsByName.values()], includeSideboard), [decklist, cardsByName, includeSideboard]);
  const missingLines = status?.lines.filter(line => line.missing > 0) ?? [];
  const missingCost = missingLines.reduce((sum, line) => sum + (priceByName.get(line.card) ?? 0) * line.missing, 0);
  const unresolved = Math.max(0, (status?.lines.length ?? 0) - required.length);

  async function retry() {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setBusy(true); setError(null);
    try { await refresh(); } catch { setError("Collection could not be loaded. Please try again."); }
    finally { mutationBusy.current = false; setBusy(false); }
  }
  async function update(mode: CollectionUpdateMode, lines: CollectionUpdateLine[]): Promise<boolean> {
    if (mutationBusy.current || !lines.length) return false;
    mutationBusy.current = true;
    dismiss(updateToast.current);
    setBusy(true); setError(null);
    const signature = JSON.stringify({ mode, source, lines });
    if (pending.current?.signature !== signature) pending.current = { signature, requestId: crypto.randomUUID() };
    try {
      const result = await accountApi.updateCollection({ mode, source, lines, requestId: pending.current.requestId });
      pending.current = null;
      updateToast.current = notify({ key: "collection", message: result.changed ? "Ownership saved. Your deck coverage has been updated." : "Your collection already covers these quantities.", action: result.changed ? { label: "Undo", onClick: () => undo(result.transactionId) } : undefined });
      try { await refresh(); }
      catch { setError("Ownership was saved, but the updated counts could not be loaded. Retry to refresh them."); }
      window.dispatchEvent(new Event("fanofin:collection-updated"));
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ownership could not be saved. Please try again.");
      notify({ tone: "error", key: "collection", message: "Could not save ownership. Your changes have not been confirmed; please retry." });
      return false;
    } finally { mutationBusy.current = false; setBusy(false); }
  }
  async function ownAll() {
    if (!collection || unresolved || busy) return;
    const lines = collectionCompletionLines(required, collection);
    if (!lines.length) return;
    return update("at-least", lines);
  }
  async function undo(transactionId: string) {
    if (mutationBusy.current) throw new Error("Wait for the current collection update to finish.");
    mutationBusy.current = true;
    setBusy(true); setError(null);
    try {
      await accountApi.undoCollectionTransaction(transactionId);
      notify({ message: "Ownership update undone.", key: "collection" });
      try { await refresh(); } catch { setError("The update was undone, but counts could not refresh. Please retry."); }
      window.dispatchEvent(new Event("fanofin:collection-updated"));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not undo this update."); throw reason; }
    finally { mutationBusy.current = false; setBusy(false); }
  }

  if (signedOut) return <Panel as="aside" data-component="DeckCollectionTools"><h3 className="font-semibold">Your collection</h3><p className="mt-1 text-sm text-ctp-subtext1">Sign in to check and update the cards you own for this deck.</p><Link to="/decks/edit" className={linkClass}>Sign in</Link></Panel>;
  if (!collection || !status) return <Panel as="aside" data-component="DeckCollectionTools"><p role={error ? "alert" : "status"} className="text-sm text-ctp-subtext1">{error ?? "Loading collection…"}</p>{error && <Button className="mt-2" disabled={busy} onClick={() => void retry()}>Retry</Button>}</Panel>;

  return <Panel data-component="DeckCollectionTools" as="aside" tone={status.complete ? "success" : "default"}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">Your collection</h3><p className="mt-1 text-sm text-ctp-subtext1" aria-live="polite">{status.requiredCopies === 0 ? "No cards in this list." : status.complete ? "You own every required card." : `${status.ownedCopies} / ${status.requiredCopies} copies owned · ${status.missingCopies} missing`}{status.proxyCopies ? ` · ${status.proxyCopies} proxied` : ""}</p></div><Link to="/collection" className={linkClass}>Open collection</Link></div>
    {decklist.sideboard.length > 0 && <label className="mt-2 flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={includeSideboard} disabled={busy} onChange={event => { setIncludeSideboard(event.target.checked); onIncludeSideboardChange?.(event.target.checked); }} className="h-5 w-5" />Include sideboard</label>}
    <div className="mt-3 flex flex-wrap gap-2">
      {!status.complete && <Button variant="primary" disabled={busy || !!unresolved || !required.length} onClick={() => void ownAll()}>{busy ? "Saving…" : "I own all these cards"}</Button>}
      <Button disabled={busy || !required.length} onClick={() => setEditing(true)}>Edit owned quantities</Button>
    </div>
    {!status.complete && <p className="mt-2 text-xs text-ctp-subtext1">“I own all these cards” adds only the missing physical copies as unspecified printings. It keeps any higher quantities and recorded printings.</p>}
    {unresolved > 0 && <p role="status" className="mt-2 text-sm text-ctp-yellow">{unresolved} card{unresolved === 1 ? " is" : "s are"} still unavailable in the catalog. You can edit resolved cards; marking the whole deck owned is unavailable until all cards resolve.</p>}

    {error && <div className="mt-3"><p role="alert" className="text-sm text-ctp-red">{error}</p><Button className="mt-2" disabled={busy} onClick={() => void retry()}>Refresh ownership</Button></div>}
    {missingLines.length > 0 && <details className="group mt-3"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue">Missing cards{missingCost > 0 ? ` · about ${formatUsd(missingCost)}` : ""}<DisclosureChevron className="shrink-0 group-open:rotate-180" /></summary><ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{missingLines.map(line => <li key={line.card}>{line.missing}× {line.card}</li>)}</ul><Button className="mt-2" onClick={() => setShopping(true)}>Shop missing cards</Button></details>}
    <details className="group mt-2"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue">More collection actions<DisclosureChevron className="group-open:rotate-180" /></summary><p className="my-2 text-xs text-ctp-subtext1">Add another full copy of this deck to your existing inventory{includeSideboard ? ", including sideboard" : ""}.</p><Button disabled={busy || !!unresolved || !required.length} onClick={() => void update("add", required)}>Add another copy of this deck</Button></details>
    {ownerDeckId && <SavedDeckLocations decklist={decklist} deckId={ownerDeckId} cards={[...cardsByName.values()]} />}
    {editing && <DeckOwnershipEditor required={required} entries={collection} cardsByName={cardsByName} onSave={lines => update("set", lines)} onDismiss={() => setEditing(false)} />}
    {shopping && <DialogSheet title="Shop missing cards" onDismiss={() => setShopping(false)} dismissible={!busy} footer={<div className="space-y-2">
      {error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}
      {missingLines.length > 0 && <a href={buildTcgplayerMassEntryUrl(missingLines.map(line => ({ name: line.card, quantity: line.missing })))} target="_blank" rel="noreferrer" className={`${linkClass} w-full justify-center`}>Shop on TCGplayer ↗</a>}
      <Button variant="primary" className="w-full" disabled={busy || !!unresolved || !missingLines.length} onClick={async () => { if (await ownAll()) setShopping(false); }}>{busy ? "Adding…" : "Add missing copies to collection"}</Button>
    </div>}>
      <p className="mb-3 text-sm text-ctp-subtext1">Shop for these cards, then add them to your collection when you have them. Opening the shop leaves your collection unchanged.</p>
      {missingLines.length > 0 ? <>
        <p className="mb-3 text-sm">{status.missingCopies} missing {status.missingCopies === 1 ? "copy" : "copies"} across {missingLines.length} {missingLines.length === 1 ? "card" : "cards"}{missingCost > 0 ? ` · about ${formatUsd(missingCost)}` : ""}.</p>
        <div className="grid grid-cols-2 items-start gap-3">{missingLines.map(line => <CardResult key={line.card} card={cardsByName.get(line.card)} name={line.card} newTab><p className="text-sm">{line.missing}× missing</p></CardResult>)}</div>

        <p className="mt-2 text-xs text-ctp-subtext1">Adding fills only the missing physical copies as unspecified printings. Existing printings, extra copies, and proxies are preserved. You can undo the update.</p>
        {unresolved > 0 && <p role="status" className="mt-2 text-sm text-ctp-yellow">Some cards are unavailable in the catalog. Shopping is available; adding to your collection will be available when every card resolves.</p>}
      </> : <p role="status">Your collection already covers this list.</p>}
    </DialogSheet>}
  </Panel>;
}
