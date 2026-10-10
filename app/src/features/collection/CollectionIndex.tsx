import { collectionEntryKey } from "@gatcg/shared";
import { subscribeCollectionChanges } from "../../lib/collectionEvents";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import CollectionChangesReview from "./CollectionChangesReview";
import CollectionGoalPanel, { type CollectionSaveReceipt } from "./CollectionGoalPanel";
import CollectionValueSummary from "./CollectionValueSummary";
import { useCollectionSaveQueue } from "./useCollectionSaveQueue";
import { sendCollectionBatch } from "./collectionSaveQueue";
import { stageCollectionQuantities } from "./collectionQuantityDrafts";
import DisclosureChevron from "../../components/DisclosureChevron";
import { useCardLocations } from "./useCardLocations";
import CardLocationSummary from "./CardLocationSummary";
import CollectionBrowser from "./CollectionBrowser";
import Button from "../../components/ui/Button";
import { useEffect, useMemo, useState, useRef } from "react";
import { collectionTotalsByCard, type AccountUser, type CollectionEntry, type CollectionTransaction, type CollectionUpdateLine, type CollectionUpdateMode, type SavedDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import GoogleSignInButton from "../account/GoogleSignInButton";
import DiscordSignInButton from "../account/DiscordSignInButton";
import PasswordSignInPanel from "../account/PasswordSignInPanel";
import { COLLECTION_RARITY_LABELS, DEFAULT_SET_RARITY_QUANTITIES, collectionCsv, parseCollectionCsv, crossDeckCollectionShortages, deckCollectionLines, missingCollectionList, setRarityCollectionLines, summarizeAtLeastChanges } from "./collectionBatch";
import PageLayout from "../../components/layout/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";
import MissingCardsReview from "./MissingCardsReview";
import { collectionCompletionLines } from "@gatcg/shared";

function downloadCsv(entries: CollectionEntry[]) {
  const csv = collectionCsv(entries);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "fanofin-collection.csv"; anchor.click(); URL.revokeObjectURL(url);
}

function downloadMissingList(lines: { card: string; missing: number }[]) {
  const text = missingCollectionList(lines);
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "fanofin-missing-cards.txt"; anchor.click(); URL.revokeObjectURL(url);
}


export default function CollectionIndex() {
  useDocumentTitle("My Collection", "Track cards you own and see which decks you can build.");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusCardUuid = searchParams.get("card");
  const cards = useCardCatalog();
  const [shopping, setShopping] = useState(false);
  const cardsByName = useMemo(() => new Map(cards.map(card => [card.name, card])), [cards]);
  const [reviewChanges, setReviewChanges] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [view, setView] = useState<"sets" | "add" | "import" | "coverage" | "history">("sets");
  const [user, setUser] = useState<AccountUser | null | undefined>();
  const tracking = useCardLocations(Boolean(user));
  const openLocations = (uuid: string) => navigate(`/card-locations?card=${encodeURIComponent(uuid)}`);
  const trackingById = useMemo(()=>new Map(tracking.records.map(record=>[record.cardUuid,record])),[tracking.records]);
  const [collectionReady, setCollectionReady] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [savedEntries, setEntries] = useState<CollectionEntry[]>([]);
  const saveQueue = useCollectionSaveQueue(user?.id);
  const {drafts,setDrafts} = saveQueue;
  const savingRef = useRef(false);
  const [saveProgress,setSaveProgress] = useState("");
  const entries = useMemo(() => {
    const merged = new Map(savedEntries.map(entry => [collectionEntryKey(entry), entry]));
    for (const [key, line] of Object.entries(drafts)) merged.set(key, { ...line, ownedQuantity: line.quantity, proxyQuantity: line.proxyQuantity ?? 0, updatedAt: "" });
    return [...merged.values()];
  }, [savedEntries, drafts]);
  const pendingCount = Object.keys(drafts).length;
  useEffect(() => {
    if (!pendingCount) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pendingCount]);
  const [transactions, setTransactions] = useState<CollectionTransaction[]>([]);
  const [saveReceipt, setSaveReceipt] = useState<CollectionSaveReceipt | null>(null);
  const [decksError, setDecksError] = useState<string | null>(null);
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [csv, setCsv] = useState("");
  const [mode, setMode] = useState<CollectionUpdateMode>("at-least");
  const [selectedDeckId, setSelectedDeckId] = useState(""); const [includeSideboard, setIncludeSideboard] = useState(false); const [deckMode, setDeckMode] = useState<"at-least" | "add">("at-least");
  const [selectedSet, setSelectedSet] = useState(""); const [rarityQuantities, setRarityQuantities] = useState<Record<number, number>>({ ...DEFAULT_SET_RARITY_QUANTITIES });
  const [notice, setNotice] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  const readRevision = useRef(0);
  async function refresh() {
    const revision = ++readRevision.current;
    const [collectionResult, deckResult] = await Promise.allSettled([accountApi.collection(), accountApi.decks()]);
    if (revision !== readRevision.current) return;
    if (collectionResult.status === "fulfilled") { setEntries(collectionResult.value.entries); setTransactions(collectionResult.value.transactions); setCollectionReady(true); setCollectionError(null); }
    if (deckResult.status === "fulfilled") { setDecks(deckResult.value.decks); setDecksError(null); }
    else setDecksError("Saved decks could not refresh. Retry loading your collection.");
    if (collectionResult.status === "rejected") { setCollectionError("Could not load your collection. Your progress is unavailable until it loads."); throw collectionResult.reason; }
  }
  useEffect(() => { void accountApi.session().then((result) => { setUser(result.user); if (result.user) void refresh().catch(() => undefined); }).catch(() => setUser(null)); }, []);
  useEffect(() => {
    if (!user) return;
    return subscribeCollectionChanges(() => { void refresh().catch(() => undefined); });
  }, [user]);
  const totalsByName = useMemo(() => collectionTotalsByCard(entries), [entries]);
  const uniqueOwnedCount = [...totalsByName.values()].filter(total => total.ownedQuantity > 0).length;
  const setOptions = useMemo(() => {
    const byPrefix = new Map<string, string>();
    for (const card of cards) for (const edition of card.editions) if (!byPrefix.has(edition.set.prefix)) byPrefix.set(edition.set.prefix, edition.set.name);
    return Array.from(byPrefix, ([prefix, name]) => ({ prefix, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [cards]);
  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);
  const deckLines = useMemo(() => selectedDeck ? deckCollectionLines(selectedDeck.decklist, cards, includeSideboard) : [], [selectedDeck, cards, includeSideboard]);
  const deckPreview = useMemo(() => summarizeAtLeastChanges(deckLines, entries), [deckLines, entries]);
  const setRarities = useMemo(() => {
    const values = new Set<number>();
    for (const card of cards) for (const edition of card.editions) if (edition.set.prefix === selectedSet) values.add(edition.rarity);
    return Array.from(values).sort((a, b) => a - b);
  }, [cards, selectedSet]);
  const setLines = useMemo(() => setRarityCollectionLines(cards, selectedSet, rarityQuantities), [cards, selectedSet, rarityQuantities]);
  const setPreview = useMemo(() => summarizeAtLeastChanges(setLines, entries), [setLines, entries]);
  const crossDeckShortages = useMemo(() => crossDeckCollectionShortages(decks, entries, true), [decks, entries]);
  const crossDeckMissingCopies = crossDeckShortages.reduce((sum, entry) => sum + entry.missing, 0);
  const crossDeckRequired = crossDeckShortages.flatMap(line => {
    const card = cardsByName.get(line.card);
    return card ? [{ cardUuid: card.uuid, cardName: card.name, quantity: line.totalRequired }] : [];
  });
  const shoppingBlocked = !collectionReady || collectionError ? "Load your collection before adding missing copies." : saveQueue.pending ? "Retry the unconfirmed save before adding more quantities." : crossDeckRequired.length !== crossDeckShortages.length ? "Some cards are still unavailable in the catalog. You can shop now; wait for them to load before adding." : undefined;

  async function update(lines: CollectionUpdateLine[], _source: string, updateMode: CollectionUpdateMode = "set") {
    if(saveQueue.pending) {setNotice("Retry the unconfirmed save before editing quantities.");return;}
    setDrafts(current => {
      return stageCollectionQuantities(current, savedEntries, lines, updateMode);
    });
    setNotice(null);
  }
  async function saveQuantities() {
    if(savingRef.current) return;
    savingRef.current=true;
    setBusy(true); setNotice(null);
    let saved=0;
    const before = savedEntries;
    let confirmedEntries = savedEntries;
    try {
      for (;;) {
        const batch=saveQueue.prepare();
        if(!batch) break;
        setSaveProgress(`Saving ${saved + 1}–${saved + Object.keys(batch.lines).length} of ${pendingCount} changes…`);
        await sendCollectionBatch(()=>accountApi.updateCollection({requestId:batch.requestId, mode:"set",source:"Collection quantity edits",lines:Object.values(batch.lines)}));
        const applyBatch = (current: CollectionEntry[]) => {
          const merged = new Map(current.map(entry => [collectionEntryKey(entry), entry]));
          for (const [key,line] of Object.entries(batch.lines)) merged.set(key, {...line,ownedQuantity:line.quantity,proxyQuantity:line.proxyQuantity ?? 0,updatedAt:new Date().toISOString()});
          return [...merged.values()];
        };
        confirmedEntries = applyBatch(confirmedEntries);
        setEntries(applyBatch);
        saved+=Object.keys(batch.lines).length;
        saveQueue.acknowledge(batch.requestId);
      }
      setNotice("Quantities saved.");
      if (saved > 0) setSaveReceipt({ before, after: confirmedEntries });
      await refresh().catch(() => setNotice("Quantities saved. Reload to refresh collection details."));
    } catch (reason) {
      const status=typeof reason === "object" && reason !== null && "status" in reason ? Number(reason.status) : undefined;
      const rejected=status === 400 || status === 409 || status === 413;
      if(rejected) { saveQueue.rejected(); if (status === 409) await refresh().catch(() => undefined); }
      setNotice(`${reason instanceof Error ? reason.message : "Connection interrupted."} Remaining changes are kept. ${rejected ? "Review the changes and try again." : "Retry saving to confirm the last batch and continue."}`);
    }
    finally {savingRef.current=false; setBusy(false);setSaveProgress("");}
  }

  if (user === undefined) return <PageLayout data-component="CollectionIndex" width="wide"><InlineState className="mt-10">Loading collection…</InlineState></PageLayout>;
  if (!user) return <PageLayout data-component="CollectionIndex" width="standard"><PageHeader title="My Collection" description="Sign in to track your cards and build decks from what you own." /><div className="mt-6 flex flex-wrap items-center gap-3"><GoogleSignInButton onCredential={(credential, nonce) => void accountApi.googleSignIn(credential, nonce).then(async (result) => { setUser(result.user); await refresh(); })} /><DiscordSignInButton /><PasswordSignInPanel onSignedIn={(signedInUser) => { setUser(signedInUser); void refresh().catch(() => undefined); }} /></div><CollectionBrowser cards={cards} entries={[]} preview /></PageLayout>;

  const collectionTools = <div className="grid gap-2"><Link to="/card-locations" className="flex min-h-12 items-center rounded-lg border border-ctp-surface1 px-3 text-sm">Where are my cards? →</Link>{([
    ["sets", "Cards"], ["add", "Bulk add"], ["import", "Import / export"], ["coverage", "Deck ownership check"], ["history", "Recent changes"],
  ] as const).map(([destination, label]) => <button key={destination} type="button" onClick={() => {setView(destination); setToolsOpen(false);}} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-left text-sm">{label}</button>)}</div>;

  return <PageLayout data-component="CollectionIndex" width="wide">
    <section className="identity-surface rounded-2xl border border-ctp-surface1 p-4 sm:p-6" aria-labelledby="collection-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-ctp-subtext1">Your cards, ready for your next deck</p><h1 id="collection-title" className="mt-1 text-3xl font-bold text-ctp-text sm:text-4xl">My Collection</h1></div><Button onClick={() => setToolsOpen(true)}>Collection tools</Button></div>
      {collectionReady && !collectionError && <dl className="mt-5 grid grid-cols-2 gap-3">
        <div><dt className="text-sm text-ctp-subtext1">Unique cards owned</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{uniqueOwnedCount}</dd></div>
        <div><dt className="text-sm text-ctp-subtext1">Physical copies owned</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{entries.reduce((sum, entry) => sum + entry.ownedQuantity, 0)}</dd></div>
      </dl>}
      {pendingCount > 0 && <p className="mt-3 text-sm text-ctp-yellow">Overview includes your unsaved quantity changes.</p>}
      <p className="mt-3 max-w-2xl text-sm text-ctp-subtext1">Lent a card? Use the same cards across decks? Track your copies and find which ones are available to use.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="primary" onClick={() => setView("import")}>Import cards</Button><Link to="/card-locations" className="inline-flex min-h-12 items-center rounded-md border border-ctp-surface1 px-3 text-sm font-medium text-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">Find your copies</Link></div>
    </section>
    <CollectionGoalPanel key={user.id} userId={user.id} cards={cards} decks={decks} entries={savedEntries} ready={collectionReady && !collectionError} decksError={decksError} busy={busy} receipt={saveReceipt} onReviewCard={() => setView("sets")} />
    {decksError && <Button className="mt-2" disabled={busy} onClick={() => void refresh().catch(() => undefined)}>Retry collection and decks</Button>}
    {shopping && <MissingCardsReview lines={crossDeckShortages} cardsByName={cardsByName} draft busy={busy} blocked={shoppingBlocked} onDismiss={() => setShopping(false)} onAdd={() => {
      if (busy || shoppingBlocked) return;
      const lines = collectionCompletionLines(crossDeckRequired, entries);
      setDrafts(current => stageCollectionQuantities(current, savedEntries, lines, "at-least"));
      setShopping(false); setReviewChanges(true); setNotice(null);
    }} />}
    {toolsOpen && <EditorDialog title="Collection tools" doneLabel="Done" onDismiss={() => setToolsOpen(false)}>{collectionTools}</EditorDialog>}
    {collectionReady && !collectionError && <CollectionValueSummary entries={entries} cards={cards} pending={pendingCount > 0} />}
    {pendingCount > 0 && <div role="status" className="sticky top-2 z-20 my-3 flex flex-wrap items-center gap-3 rounded-xl border border-ctp-blue bg-ctp-base p-3 shadow-lg"><button type="button" disabled={busy} onClick={() => {setNotice(null); setReviewChanges(true);}} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue underline underline-offset-4">Preview {pendingCount} unsaved {pendingCount === 1 ? "change" : "changes"}</button><button type="button" disabled={busy} onClick={() => void saveQuantities()} className="min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-medium text-ctp-base">{busy ? "Saving…" : saveQueue.pending ? "Retry save" : "Save quantities"}</button><button type="button" disabled={busy || !!saveQueue.pending} onClick={() => setDrafts({})} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm">Discard changes</button></div>}
    {reviewChanges && <CollectionChangesReview drafts={drafts} savedEntries={savedEntries} cards={cards} busy={busy} locked={!!saveQueue.pending} notice={saveProgress || notice} onDismiss={() => setReviewChanges(false)} onSave={() => void saveQuantities()} onRevert={key => {setDrafts(current => {const next = {...current}; const cardUuid = next[key]?.cardUuid; for (const [entryKey, line] of Object.entries(next)) if (line.cardUuid === cardUuid) delete next[entryKey]; return next;}); setNotice(null);}} />}
    {saveProgress && <p role="status" className="my-2 text-sm">{saveProgress}</p>}
    {saveQueue.warning && <p role="alert" className="my-2 text-sm text-ctp-yellow">{saveQueue.warning}</p>}
    {saveQueue.pending && !busy && <p role="status" className="my-2 text-sm text-ctp-yellow">The last batch is unconfirmed. Retry save before editing or discarding these changes.</p>}
    {notice && <Panel key={notice} tone="info" padding="sm" className="state-arrive mt-4 text-sm text-ctp-subtext1">{notice}</Panel>}
    {tracking.error && <p role="alert" className="mt-2 text-sm text-ctp-red">{tracking.error}</p>}
    {view !== "sets" && <button type="button" onClick={() => setView("sets")} className="mt-3 min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm">Back to cards</button>}
    <div hidden={view !== "sets"}>
      {collectionError ? <div role="alert" className="mt-4 text-sm text-ctp-yellow"><p>{collectionError}</p><button type="button" onClick={() => void refresh().catch(() => undefined)} className="min-h-12 text-ctp-blue">Retry</button></div> : !collectionReady ? <p role="status" className="mt-4">Loading collection progress…</p> : <CollectionBrowser focusCardUuid={focusCardUuid} onReviewDraft={() => { setNotice(null); setReviewChanges(true); }} renderTracking={uuid => <Link to={`/card-locations?card=${encodeURIComponent(uuid)}`} target="_blank" rel="noreferrer" aria-label="Locations and loans, opens in a new tab" className="flex min-h-12 items-center text-sm text-ctp-blue">Locations & loans ↗</Link>} renderStatus={uuid => trackingById.has(uuid) ? <CardLocationSummary cardUuid={uuid} record={trackingById.get(uuid)} entries={savedEntries} decks={decks} disabled={!tracking.ready || pendingCount>0} onClick={()=>openLocations(uuid)}/> : null} cards={cards} entries={entries} busy={busy || !!saveQueue.pending} onUpdate={update} />}
    </div>
    <div hidden={view !== "add"}>

    <details className="mt-6 rounded-xl border border-ctp-surface1 p-3"><summary className="flex min-h-12 cursor-pointer items-center justify-between font-semibold">Add a deck or set<DisclosureChevron /></summary><p className="mt-1 text-xs text-ctp-subtext1">Build your collection from a deck or a set. Review your quantities, then save them together. Saved batches appear in Recent changes and can be undone.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-ctp-surface0 bg-ctp-base/40 p-4"><h3 className="font-medium">Add a deck</h3>{decks.length ? <><select value={selectedDeckId} onChange={(event) => setSelectedDeckId(event.target.value)} className="mt-3 w-full rounded border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm"><option value="">Choose a saved deck</option>{decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}</select><div className="mt-3 flex flex-wrap gap-3"><label className="flex items-center gap-1.5 text-xs text-ctp-subtext1"><input type="checkbox" checked={includeSideboard} onChange={(event) => setIncludeSideboard(event.target.checked)} /> Include sideboard</label><label className="text-xs text-ctp-subtext1">Intent <select value={deckMode} onChange={(event) => setDeckMode(event.target.value as "at-least" | "add")} className="ml-1 rounded border border-ctp-surface1 bg-ctp-base px-2 py-1"><option value="at-least">Make sure I own this deck</option><option value="add">I bought another copy</option></select></label></div>{selectedDeck && <div className="mt-3 rounded bg-ctp-mantle p-3 text-xs text-ctp-subtext1"><p>{deckLines.length} cards · {deckLines.reduce((sum, line) => sum + line.quantity, 0)} listed copies</p>{deckMode === "at-least" && <p className="mt-1">{deckPreview.addedCopies} copies would be added across {deckPreview.affectedCards} cards · {deckPreview.coveredCards} already covered</p>}<details className="mt-2"><summary className="cursor-pointer text-ctp-blue">Preview cards</summary><ul className="mt-2 max-h-44 columns-1 overflow-auto sm:columns-2">{deckLines.map((line) => <li key={line.cardUuid}>{line.quantity}× {line.cardName}</li>)}</ul></details></div>}<button type="button" disabled={busy || !selectedDeck || !deckLines.length} onClick={() => { if (!selectedDeck) return; const copies = deckLines.reduce((sum, line) => sum + line.quantity, 0); if (!window.confirm(`${deckMode === "add" ? "Add another copy of" : "Make sure your collection covers"} ${selectedDeck.title} (${copies} listed copies across ${deckLines.length} cards)?`)) return; void update(deckLines, `Deck: ${selectedDeck.title}`, deckMode); }} className="mt-3 rounded bg-ctp-green px-3 py-1.5 text-sm font-medium text-ctp-base disabled:opacity-50">Add deck to collection</button></> : <p className="mt-3 text-sm text-ctp-subtext1">Save a deck first, then it will appear here.</p>}</div>
      <div className="rounded-lg border border-ctp-surface0 bg-ctp-base/40 p-4"><h3 className="font-medium">Add by set and rarity</h3><p className="mt-1 text-xs text-ctp-subtext1">Card-level tracking: alternate printings of the same card are counted once.</p><select value={selectedSet} onChange={(event) => { setSelectedSet(event.target.value); setRarityQuantities({ ...DEFAULT_SET_RARITY_QUANTITIES }); }} className="mt-3 w-full rounded border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm"><option value="">Choose a set</option>{setOptions.map((set) => <option key={set.prefix} value={set.prefix}>{set.name} ({set.prefix})</option>)}</select>{selectedSet && <><div className="mt-3 grid grid-cols-[minmax(0,1fr)_5rem] gap-2 text-xs">{setRarities.map((rarity) => <label key={rarity} className="contents"><span className="self-center text-ctp-subtext1">{COLLECTION_RARITY_LABELS[rarity] ?? `Rarity ${rarity}`}{rarity === 6 || rarity === 9 ? " (promo)" : ""}</span><input aria-label={`${COLLECTION_RARITY_LABELS[rarity] ?? `Rarity ${rarity}`} copies per card`} type="number" min={0} max={99} value={rarityQuantities[rarity] ?? 0} onChange={(event) => setRarityQuantities((current) => ({ ...current, [rarity]: Math.max(0, Number(event.target.value) || 0) }))} className="rounded border border-ctp-surface1 bg-ctp-base px-2 py-1 text-right" /></label>)}</div><div className="mt-3 rounded bg-ctp-mantle p-3 text-xs text-ctp-subtext1"><p>{setLines.length} cards selected · {setLines.reduce((sum, line) => sum + line.quantity, 0)} target copies</p><p className="mt-1">{setPreview.addedCopies} copies would be added across {setPreview.affectedCards} cards · {setPreview.coveredCards} already covered</p><details className="mt-2"><summary className="cursor-pointer text-ctp-blue">Preview cards</summary><ul className="mt-2 max-h-44 columns-1 overflow-auto sm:columns-2">{setLines.map((line) => <li key={line.cardUuid}>{line.quantity}× {line.cardName}</li>)}</ul></details></div></>}<button type="button" disabled={busy || !selectedSet || !setLines.length} onClick={() => { const set = setOptions.find((option) => option.prefix === selectedSet); if (!set || !window.confirm(`Set your collection to at least the selected quantities for ${setLines.length} cards from ${set.name}?`)) return; void update(setLines, `Set playset: ${set.name}`, "at-least"); }} className="mt-3 rounded bg-ctp-blue px-3 py-1.5 text-sm font-medium text-ctp-base disabled:opacity-50">Add set cards</button></div>
    </div></details>
    </div>
    <div hidden={view !== "import"} className="[&_button]:min-h-12 [&_select]:min-h-12">
<button type="button" disabled={!entries.length} onClick={() => downloadCsv(entries)} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 py-2 text-sm disabled:opacity-50">Export CSV</button>
    <Panel className="mt-5"><h2 className="font-semibold">Import CSV or a quantity list</h2><p className="mt-1 text-xs text-ctp-subtext1">Accepts exported CSV or lines like <code>4,Dungeon Guide</code>. You’ll see unresolved rows before anything is saved.</p><textarea aria-label="Collection import text" rows={6} value={csv} onChange={(event) => setCsv(event.target.value)} className="mt-3 w-full rounded border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm" /><div className="mt-2 flex flex-wrap gap-2"><select aria-label="Import quantity mode" value={mode} onChange={(event) => setMode(event.target.value as CollectionUpdateMode)} className="rounded border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-sm"><option value="at-least">Set to at least</option><option value="add">Add quantities</option><option value="set">Replace quantities</option></select><button disabled={busy || !csv.trim()} onClick={() => { const parsed = parseCollectionCsv(csv, cards); if (parsed.unresolved.length) { setNotice(`${parsed.unresolved.length} row${parsed.unresolved.length === 1 ? "" : "s"} could not be resolved. Fix them before importing: ${parsed.unresolved.slice(0, 3).join(" | ")}`); return; } const copies = parsed.lines.reduce((sum, line) => sum + line.quantity, 0); if (!parsed.lines.length || !window.confirm(`${mode === "add" ? "Add" : mode === "set" ? "Set" : "Set to at least"} ${copies} copies across ${parsed.lines.length} cards?`)) return; void update(parsed.lines, "CSV import", mode).then(() => setCsv("")); }} className="rounded bg-ctp-blue px-3 py-1.5 text-sm text-ctp-base disabled:opacity-50">Preview and import</button></div></Panel>
    </div>
    <div hidden={view !== "coverage"}>
    <Link to="/card-locations" className="mt-4 inline-flex min-h-12 items-center text-ctp-blue underline">Manage deck locations and loans →</Link>
    <details className="mt-4"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">Build all decks simultaneously<DisclosureChevron/></summary>
    <Panel className="mt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">Build every saved deck</h2><p className="mt-1 max-w-2xl text-xs text-ctp-subtext1">Optional ownership check for keeping every deck assembled at once, including sideboards. It includes lent copies and does not mean you need to buy a playset per deck.</p></div>{crossDeckShortages.length > 0 && <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0"><button type="button" onClick={() => downloadMissingList(crossDeckShortages)} className="min-h-12 rounded-lg border border-ctp-surface1 px-3 text-xs font-medium text-ctp-text">Download list</button><button type="button" onClick={() => setShopping(true)} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-ctp-blue px-3 text-xs font-medium text-ctp-blue">Shop missing</button></div>}</div>{decks.length === 0 ? <p className="mt-4 text-sm text-ctp-subtext1">Save a deck to calculate collection coverage.</p> : crossDeckShortages.length === 0 ? <p className="mt-4 rounded-lg bg-ctp-green/10 p-3 text-sm text-ctp-green">Your collection covers all {decks.length} saved deck{decks.length === 1 ? "" : "s"} at the same time.</p> : <details className="mt-4"><summary className="cursor-pointer rounded-lg bg-ctp-yellow/10 p-3 text-sm text-ctp-text"><strong className="text-ctp-yellow">{crossDeckMissingCopies} missing cop{crossDeckMissingCopies === 1 ? "y" : "ies"}</strong> across {crossDeckShortages.length} card{crossDeckShortages.length === 1 ? "" : "s"}</summary><ul className="mt-3 grid gap-2 md:grid-cols-2">{crossDeckShortages.map((card) => <li key={card.card} className="rounded-lg border border-ctp-yellow/25 bg-ctp-base/40 p-3 text-sm"><div className="flex items-start justify-between gap-3"><span className="font-medium text-ctp-text">{card.card}</span><span className="shrink-0 rounded-full bg-ctp-yellow/15 px-2 py-0.5 text-xs font-semibold text-ctp-yellow">Missing {card.missing}</span></div><p className="mt-1 text-xs text-ctp-subtext1">{card.owned} owned · {card.totalRequired} needed</p><p className="mt-2 text-xs text-ctp-subtext0">{card.decks.map((deck) => `${deck.quantity}× ${deck.title}`).join(" · ")}</p></li>)}</ul></details>}</Panel>
    </details>
    </div>
    <div hidden={view !== "history"}>
    {transactions.length > 0 && <Section className="mt-8" title="Recent changes"><div className="mt-3 space-y-2">{transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded border border-ctp-surface1 px-3 py-2 text-sm"><span>{transaction.source} · {transaction.lineCount} card{transaction.lineCount === 1 ? "" : "s"}<span className="ml-2 text-xs text-ctp-subtext0">{new Date(transaction.createdAt).toLocaleString()}</span></span>{transaction.undoneAt ? <span className="text-xs text-ctp-subtext0">Undone</span> : <button disabled={busy || pendingCount > 0} onClick={() => void accountApi.undoCollectionTransaction(transaction.id).then(refresh).catch((reason: Error) => setNotice(reason.message))} className="text-xs text-ctp-blue hover:underline">Undo</button>}</div>)}</div></Section>}
{transactions.length === 0 && <InlineState className="mt-4">No recent changes.</InlineState>}    </div>
  </PageLayout>;
}
