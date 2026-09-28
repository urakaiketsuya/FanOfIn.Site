import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cardLocationState, deckCardRequirements, locationCardKey, type AccountUser, type CollectionEntry, type SavedDeck } from "@gatcg/shared";
import { accountApi } from "../../lib/accountApi";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useCardLocations } from "./useCardLocations";
import PageLayout from "../../components/layout/PageLayout";
import CardArtTile from "../../components/CardArtTile";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import CardLocationSheet from "./CardLocationSheet";
import DeckLocationCoverage from "./DeckLocationCoverage";
import DeckAssignmentReview from "./DeckAssignmentReview";
import LoanLedger from "./LoanLedger";

export default function CardLocationsPage() {
  useDocumentTitle("Where are my cards?", "Find cards in your decks and track loans to friends.");
  const cards = useCardCatalog();
  const [params, setParams] = useSearchParams();
  const [user, setUser] = useState<AccountUser | null>();
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const tracking = useCardLocations(Boolean(user));
  const [tab, setTab] = useState(params.get("view") === "loans" ? "loans" : "decks");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  const [filter, setFilter] = useState("all");
  const [picker, setPicker] = useState<string | null>(null);
  const [loanBorrower, setLoanBorrower] = useState<string | undefined>();
  const [assignmentDeck, setAssignmentDeck] = useState<SavedDeck | null>(null);
  const [deckReview, setDeckReview] = useState(false);
  const editId = params.get("card");
  function edit(uuid: string, borrower?: string) {
    setLoanBorrower(borrower); setParams({ view: tab, card: uuid }, {replace: true});
  }
  async function load() {
    setReady(false); setError("");
    try {
      const session = await accountApi.session(); setUser(session.user);
      if (!session.user) return;
      try {setPendingQuantities(Object.keys(JSON.parse(sessionStorage.getItem(`collection-quantities:${session.user.id}`) ?? "{}")).length > 0);} catch {setPendingQuantities(false);}
      const [collection, saved] = await Promise.all([accountApi.collection(), accountApi.decks()]);
      setEntries(collection.entries); setDecks(saved.decks); setReady(true);
    } catch (reason) { setError(`Could not load card locations. ${reason instanceof Error ? reason.message : "Please try again."}`); }
  }
  useEffect(() => { void load(); }, []);
  const records = useMemo(() => new Map(tracking.records.map(record => [record.cardUuid, record])), [tracking.records]);
  const requirements = useMemo(() => decks.map(deck => ({deck, cards: deckCardRequirements(deck.decklist)})), [decks]);
  const pool = useMemo(() => {
    const names = new Map<string,string>();
    for (const entry of entries) if (entry.ownedQuantity > 0) names.set(entry.cardUuid,entry.cardName);
    for (const record of tracking.records) names.set(record.cardUuid,record.cardName);
    for (const card of cards) if (requirements.some(row => row.cards.has(locationCardKey(card.name)))) names.set(card.uuid,card.name);
    return [...names].map(([uuid,name]) => ({uuid,name,card:cards.find(card => card.uuid === uuid)})).sort((a,b)=>a.name.localeCompare(b.name));
  }, [entries,tracking.records,cards,requirements]);
  const matches = pool.filter(item => {
    if (!item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) return false;
    const state = cardLocationState(item.uuid, entries, records.get(item.uuid));
    if (picker !== null) return state.owned > 0;
    return filter === "all" || filter === "assigned" && state.assigned > 0 || filter === "unassigned" && state.unassigned > 0 || filter === "check" && (state.excess > 0 || records.get(item.uuid)?.mightOwn);
  });
  const selected = pool.find(item => item.uuid === editId) ?? (editId ? {uuid: editId, name: cards.find(card=>card.uuid===editId)?.name ?? editId, card: cards.find(card=>card.uuid===editId)} : undefined);
  const lent = tracking.records.reduce((sum,record)=>sum+record.loans.filter(loan=>!loan.returnedAt).reduce((total,loan)=>total+loan.quantity,0),0);
  const controls = "min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue";
  const grid = <><input aria-label="Find a card location" value={query} onChange={event=>{setQuery(event.target.value);setLimit(24);}} placeholder="Find a card…" className="my-3 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base"/>
    {picker === null && <select aria-label="Location status" value={filter} onChange={event=>{setFilter(event.target.value);setLimit(24);}} className={`${controls} mb-3 bg-ctp-base`}><option value="all">All matching cards</option><option value="assigned">In decks</option><option value="unassigned">Unassigned copies</option><option value="check">Needs checking</option></select>}
    {!matches.length && <p role="status" className="py-4 text-sm">{query ? "No matching cards." : "Add cards to your collection or save a deck to get started."} <Link to="/collection" className="text-ctp-blue underline">Open collection</Link></p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{matches.slice(0,limit).map(item=>{
      const record = records.get(item.uuid); const state = cardLocationState(item.uuid,entries,record);
      const matchingDecks = requirements.filter(row=>row.cards.has(locationCardKey(item.name)));
      return <article key={item.uuid} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2"><button type="button" onClick={()=>{edit(item.uuid,picker ?? undefined);setPicker(null);}} aria-label={`${picker !== null ? "Lend" : "Locate"} ${item.name}`} className="w-full rounded text-left focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={item.card} name={item.name}/><span className="flex min-h-12 items-center text-sm font-medium">{item.name}</span></button><p className="text-xs text-ctp-subtext1">{state.owned} owned · {state.lent} lent</p>{picker === null && <><p className="mt-2 text-xs">{record?.assignments?.length ? record.assignments.map(row=>`${row.quantity} in ${decks.find(deck=>deck.id===row.deckId)?.title ?? "unavailable deck"}`).join(" · ") : "No current deck"}</p><p className="mt-1 text-xs text-ctp-subtext1">{matchingDecks.length} matching decklists</p>{state.excess > 0 && <p className="mt-1 text-xs text-ctp-yellow">Needs reconciliation</p>}<button type="button" onClick={()=>edit(item.uuid)} className={`${controls} mt-2 w-full`}>Choose location</button></>}</article>;
    })}</div>{matches.length>limit && <button type="button" onClick={()=>setLimit(limit+24)} className={`${controls} mt-3`}>Show more cards</button>}</>;
  return <PageLayout width="wide" data-component="CardLocationsPage"><h1 className="text-2xl font-bold text-ctp-blue">Where are my cards?</h1><p className="mt-2 text-sm text-ctp-subtext1">Your copies can move between decks or be lent to friends. You still own them.</p>
    {error && <div role="alert" className="mt-4"><p>{error}</p><button type="button" onClick={()=>void load()} className={controls}>Retry</button></div>}
    {!error && user === undefined && <p role="status" className="mt-4">Loading account…</p>}
    {user === null && <Link to="/collection" className="mt-4 inline-flex min-h-12 items-center text-ctp-blue underline">Sign in to manage your cards</Link>}
    {user && !ready && !error && <p role="status" className="mt-4">Loading collection and decks…</p>}
    {tracking.error && <div role="alert" className="mt-3"><p>{tracking.error}</p><button type="button" className={controls} onClick={()=>void tracking.refresh()}>Retry locations</button></div>}
    {ready && !tracking.ready && !tracking.error && <p role="status" className="mt-4">Loading locations and loans…</p>}
    {ready && pendingQuantities && <p role="status" className="mt-3 text-sm text-ctp-yellow">You have unsaved collection quantities. Locations use your saved copies. <Link to="/collection" className="underline">Review quantities</Link></p>}
    {ready && tracking.ready && <>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Location views">{[["decks","In decks"],["loans",`Lent out · ${lent}`]].map(([value,label])=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>{setTab(value);setParams({view:value},{replace:true});}} className={`${controls} ${tab===value ? "border-ctp-blue text-ctp-blue" : ""}`}>{label}</button>)}</div>
      {tab === "decks" ? <><button type="button" onClick={()=>setDeckReview(true)} className={`${controls} mt-3`}>Move a whole deck</button>{grid}</> : <LoanLedger records={tracking.records} cards={cards} onEdit={uuid=>edit(uuid)} onAdd={borrower=>{setPicker(borrower ?? "");setQuery("");setLimit(24);}}/>}
      {picker !== null && <EditorDialog title={picker ? `Lend to ${picker}` : "Choose a card to lend"} doneLabel="Cancel" onDismiss={()=>setPicker(null)}>{grid}</EditorDialog>}
      {deckReview && <EditorDialog title="Choose a deck" doneLabel="Done" onDismiss={()=>setDeckReview(false)}><DeckLocationCoverage cards={cards} entries={entries} records={tracking.records} decks={decks} onAssign={deck=>{setDeckReview(false);setAssignmentDeck(deck);}}/></EditorDialog>}
      {assignmentDeck && <DeckAssignmentReview deck={assignmentDeck} decks={decks} cards={cards} entries={entries} records={tracking.records} onSave={tracking.save} onDismiss={()=>setAssignmentDeck(null)}/>}
      {selected && <CardLocationSheet key={selected.uuid} cardUuid={selected.uuid} name={selected.name} card={selected.card} record={records.get(selected.uuid)} entries={entries} decks={decks} onSave={tracking.save} onDismiss={()=>{setParams({view:tab},{replace:true});setLoanBorrower(undefined);}} initialBorrower={loanBorrower} loansFirst={tab === "loans"}/>}
    </>}
  </PageLayout>;
}
