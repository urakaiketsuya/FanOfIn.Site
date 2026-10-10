import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import type { Card, CollectionEntry, SavedDeck } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import Button from "../../components/ui/Button";
import DialogSheet from "../../components/ui/DialogSheet";
import Panel from "../../components/ui/Panel";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import { OWNERSHIP_COVERAGE_NOTE } from "./CollectionStatus";
import { collectionGoalOptions, collectionGoalProgress, parseCollectionGoal, type CollectionGoal } from "./collectionGoals";

export type CollectionSaveReceipt = { before: CollectionEntry[]; after: CollectionEntry[] };

export default function CollectionGoalPanel({ userId, cards, decks, entries, ready, decksError, busy, receipt, onReviewCard }: {
  userId: string; cards: Card[]; decks: SavedDeck[]; entries: CollectionEntry[];
  onReviewCard: () => void;
  ready: boolean; decksError: string | null; busy: boolean; receipt: CollectionSaveReceipt | null;
}) {
  const { phase } = useSyncProgress();
  const catalogReady = phase === "done" && cards.length > 0;
  const storageKey = `collection-goal:${userId}`;
  const [goal, setGoal] = useState<CollectionGoal | null>(null);
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState(12);
  const [pending, startTransition] = useTransition();
  const [ignoredReceipt, setIgnoredReceipt] = useState(receipt);
  const latestReceipt = useRef(receipt);
  useEffect(() => { latestReceipt.current = receipt; }, [receipt]);
  useEffect(() => {
    const read = () => {
      try { setGoal(parseCollectionGoal(localStorage.getItem(storageKey))); setError(""); }
      catch { setError("Your saved goal could not be loaded. Choose a goal to try again."); }
    };
    read();
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) { read(); setExpanded(false); setIgnoredReceipt(latestReceipt.current); } };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);
  const options = useMemo(() => collectionGoalOptions(cards, decks), [cards, decks]);
  const selected = options.find(option => option.kind === goal?.kind && option.id === goal.id);
  const progress = useMemo(() => collectionGoalProgress(selected?.requirements ?? [], entries), [selected, entries]);
  const available = ready && catalogReady && !(goal?.kind === "deck" && decksError);
  const celebrated = available && selected && receipt && receipt !== ignoredReceipt && progress.complete &&
    !collectionGoalProgress(selected.requirements, receipt.before).complete && collectionGoalProgress(selected.requirements, receipt.after).complete;
  function pin(next: CollectionGoal | null) {
    try {
      // One atomic replacement; failed writes leave the previous goal intact.
      localStorage.setItem(storageKey, JSON.stringify(next));
      setGoal(next); setError(""); setChoosing(false); setExpanded(false); setLimit(12); setIgnoredReceipt(receipt);
    } catch { setError("Could not save your goal on this device. Your previous goal is unchanged. Try again."); }
  }
  const missing = progress.rows.filter(row => row.missing > 0);
  const preview = (progress.complete ? progress.rows : missing).slice(0, expanded ? limit : 3);
  return <Panel className="mt-5 [overflow-wrap:anywhere]" data-component="CollectionGoalPanel">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">Your collection goal</h2>
      <Button disabled={busy} onClick={() => setChoosing(true)}>{goal ? "Change goal" : "Choose a goal"}</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-ctp-red">{error}</p>}
    {!goal ? <p className="mt-2 text-sm text-ctp-subtext1">Pick a set to collect or a saved deck to own. Your goal stays on this device.</p>
      : !available ? <p role="status" className="mt-3 text-sm">{decksError && goal.kind === "deck" ? decksError : phase === "error" ? "Card data could not load. Reload to retry; goal progress is unavailable." : "Waiting for collection and card data. Goal progress is unavailable."}</p>
      : !selected ? <p role="status" className="mt-3 text-sm">This goal’s deck or set is no longer available. Choose another goal.</p>
      : <>
        <h3 className="mt-3 break-words text-xl font-semibold">{selected.title}</h3>
        <p className="mt-1 text-sm text-ctp-subtext1">{goal.kind === "set" ? "One of each card · Any printing" : "Main + material · Saved deck’s current list"}</p>
        <p className="mt-3 font-medium">{progress.complete ? "Goal complete!" : `${progress.covered} of ${progress.total} ${goal.kind === "set" ? "cards" : "copies"} owned`}</p>
        {progress.total > 0 ? <progress aria-label="Saved ownership toward collection goal" value={progress.covered} max={progress.total} className="collection-progress mt-2 block h-2 w-full" /> : <p className="mt-2 text-sm">This deck has no main or material cards yet.</p>}
        {celebrated && <div role="status" className="state-arrive mt-3 rounded-xl bg-ctp-green/10 p-3 text-ctp-green"><p className="font-semibold">You did it! Your saved collection completes this goal.</p><Button className="mt-2" onClick={() => setIgnoredReceipt(receipt)}>Dismiss celebration</Button></div>}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {preview.map(row => <CardResult key={row.name} card={row.card} name={row.name}>
            <p className="text-sm text-ctp-subtext1">{row.missing ? `${row.missing} missing` : "Owned"}</p>
            {row.card && row.missing > 0 && <Link onClick={onReviewCard} to={`/collection?card=${encodeURIComponent(row.card.uuid)}`} className="mt-1 flex min-h-12 items-center rounded text-sm text-ctp-blue underline focus-visible:outline-2">Update ownership</Link>}
          </CardResult>)}
        </div>
        {missing.length > 0 && <Button className="mt-3" aria-expanded={expanded} aria-controls="goal-missing-status" onClick={() => startTransition(() => { setExpanded(!expanded); setLimit(12); })}>{expanded ? "Show fewer cards" : `View missing (${missing.length})`}<DisclosureChevron className={expanded ? "rotate-180" : ""} /></Button>}
        <p id="goal-missing-status" role="status" className="mt-2 text-sm text-ctp-subtext1">{pending ? "Recalculating…" : expanded && !progress.complete ? `Showing ${preview.length} of ${missing.length} missing cards` : "Progress uses saved quantities."}</p>
        {expanded && !progress.complete && missing.length > limit && <Button className="mt-2" onClick={() => startTransition(() => setLimit(limit + 24))}>Show more missing cards</Button>}
        {goal.kind === "deck" && <><p className="mt-3 text-xs text-ctp-subtext1">{OWNERSHIP_COVERAGE_NOTE}</p><Link to={`/decks/${encodeURIComponent(goal.id)}`} className="mt-2 inline-flex min-h-12 items-center rounded text-sm text-ctp-blue underline focus-visible:outline-2">Open deck</Link></>}
      </>}
    {choosing && <DialogSheet title="Choose a collection goal" dismissLabel="Done" onDismiss={() => setChoosing(false)}>
      <p className="mb-4 text-sm text-ctp-subtext1">Pin one goal on this device. This changes no owned quantities.</p>
      {error && <p role="alert" className="mb-3 text-sm text-ctp-red">{error}</p>}
      {decksError && <p role="alert" className="mb-3 text-sm text-ctp-red">{decksError}</p>}
      {!catalogReady && <p role="status">{phase === "error" ? "Card data could not load. Reload to retry." : "Waiting for card data…"}</p>}
      {(["deck", "set"] as const).map(kind => <section key={kind} className="mb-5"><h3 className="mb-2 font-semibold">{kind === "deck" ? "Saved decks" : "Sets · One of each card"}</h3>
        {kind === "deck" && !decks.length && !decksError && <p className="text-sm text-ctp-subtext1">Save a deck to make it a collection goal.</p>}
        <div className="grid gap-2">{options.filter(option => option.kind === kind).map(option => <Button key={`${kind}:${option.id}`} className="h-auto min-h-12 whitespace-normal break-words text-left" disabled={busy || !catalogReady || (kind === "deck" && !!decksError)} aria-pressed={goal?.kind === kind && goal.id === option.id} onClick={() => pin({ kind, id: option.id })}>{option.title}{goal?.kind === kind && goal.id === option.id ? " · Pinned" : ""}</Button>)}</div>
      </section>)}
      {goal && <Button disabled={busy} onClick={() => pin(null)}>Unpin goal</Button>}
    </DialogSheet>}
  </Panel>;
}
