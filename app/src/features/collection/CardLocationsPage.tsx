import { CollectionCopyStatus, CollectionStatusHelp } from "./CollectionStatus";
import { useEffect, useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cardLocationState, collectionLocationIndex, deckCardRequirements, locationCardKey, type AccountUser, type CollectionEntry, type OfficialProductDeckFavorite, type SavedDeck } from "@gatcg/shared";
import { subscribeCollectionChanges } from "../../lib/collectionEvents";
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
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";

export default function CardLocationsPage() {
  useDocumentTitle("Where are my cards?", "Find cards in your decks and track loans to friends.");
  const cards = useCardCatalog();
  const tabsId = useId();
  const [params, setParams] = useSearchParams();
  const [user, setUser] = useState<AccountUser | null>();
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [officialFavorites, setOfficialFavorites] = useState<OfficialProductDeckFavorite[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [ownershipError, setOwnershipError] = useState("");
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
  const deckId = params.get("deck");
  const locationDecks = useMemo(() => [...decks, ...officialFavorites.map((deck) => ({ id: deck.locationId, identityHash: deck.productDeckId, title: deck.title, format: deck.format, championName: deck.championName, decklist: deck.decklist, sources: [], createdAt: deck.favoritedAt, updatedAt: deck.favoritedAt }))], [decks, officialFavorites]);
  const focusedDeck = locationDecks.find(deck=>deck.id===deckId);
  const focusedRequirements = useMemo(()=>focusedDeck ? deckCardRequirements(focusedDeck.decklist) : null,[focusedDeck]);
  function navigationParams(view: string, card?: string) {
    return {view,...(deckId ? {deck:deckId} : {}),...(card ? {card} : {})};
  }
  function edit(uuid: string, borrower?: string) {
    setLoanBorrower(borrower); setParams(navigationParams(tab, uuid), {replace: true});
  }
  async function load() {
    setReady(false); setError(""); setOwnershipError("");
    try {
      const session = await accountApi.session(); setUser(session.user);
      if (!session.user) return;
      try {setPendingQuantities(Object.keys(JSON.parse(sessionStorage.getItem(`collection-save:${session.user.id}`) ?? localStorage.getItem(`collection-save:${session.user.id}`) ?? "null")?.drafts ?? JSON.parse(sessionStorage.getItem(`collection-quantities:${session.user.id}`) ?? "{}")).length > 0);} catch {setPendingQuantities(false);}
      const [collection, saved, official] = await Promise.all([accountApi.collection(), accountApi.decks(), accountApi.officialProductFavorites()]);
      setEntries(collection.entries); setDecks(saved.decks); setOfficialFavorites(official.decks); setReady(true);
    } catch (reason) { setError(`Could not load card locations. ${reason instanceof Error ? reason.message : "Please try again."}`); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    let revision = 0;
    const unsubscribe = subscribeCollectionChanges(() => {
      const request = ++revision;
      void accountApi.collection().then(result => {
        if (active && request === revision) { setEntries(result.entries); setOwnershipError(""); }
      }).catch(() => {
        if (active && request === revision) setOwnershipError("Ownership could not refresh. Your last loaded quantities are shown. Retry to load current counts.");
      });
    });
    return () => { active = false; unsubscribe(); };
  }, [user]);
  const records = useMemo(() => new Map(tracking.records.map(record => [record.cardUuid, record])), [tracking.records]);
  const requirements = useMemo(() => locationDecks.map(deck => ({deck, cards: deckCardRequirements(deck.decklist)})), [locationDecks]);
  const cardsById = useMemo(()=>new Map(cards.map(card=>[card.uuid,card])),[cards]);
  const states = useMemo(()=>collectionLocationIndex(entries,tracking.records),[entries,tracking.records]);
  const decksByCard = useMemo(()=>{
    const index = new Map<string, typeof requirements>();
    for(const row of requirements) for(const key of row.cards.keys()) {const matches=index.get(key) ?? [];matches.push(row);index.set(key,matches);}
    return index;
  },[requirements]);
  const pool = useMemo(() => {
    const names = new Map<string,string>();
    for (const entry of entries) if (entry.ownedQuantity > 0) names.set(entry.cardUuid,entry.cardName);
    for (const record of tracking.records) names.set(record.cardUuid,record.cardName);
    for (const card of cards) if (decksByCard.has(locationCardKey(card.name))) names.set(card.uuid,card.name);
    return [...names].map(([uuid,name]) => ({uuid,name,card:cardsById.get(uuid)})).sort((a,b)=>a.name.localeCompare(b.name));
  }, [entries,tracking.records,cards,cardsById,decksByCard]);
  const matches = useMemo(()=>pool.filter(item => {
    if (!item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) return false;
    const state = states.get(item.uuid) ?? cardLocationState(item.uuid, []);
    if (picker !== null) return state.owned > 0;
    if (focusedRequirements && !focusedRequirements.has(locationCardKey(item.name)) && !records.get(item.uuid)?.assignments?.some(row=>row.deckId===deckId)) return false;
    return filter === "all" || filter === "assigned" && state.assigned > 0 || filter === "unassigned" && state.unassigned > 0 || filter === "check" && (state.excess > 0 || records.get(item.uuid)?.mightOwn);
  }),[pool,query,states,records,picker,focusedRequirements,deckId,filter]);
  const selected = pool.find(item => item.uuid === editId) ?? (editId ? {uuid: editId, name: cards.find(card=>card.uuid===editId)?.name ?? editId, card: cards.find(card=>card.uuid===editId)} : undefined);
  const lent = tracking.records.reduce((sum,record)=>sum+record.loans.filter(loan=>!loan.returnedAt).reduce((total,loan)=>total+loan.quantity,0),0);
  const controls = "min-h-12 rounded-lg border border-ctp-surface1 px-3 text-sm focus-visible:outline-2 focus-visible:outline-ctp-blue";
  const grid = <><input aria-label="Find a card location" value={query} onChange={event=>{setQuery(event.target.value);setLimit(24);}} placeholder="Find a card…" className="my-3 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base"/>
    {picker === null && <select aria-label="Location status" value={filter} onChange={event=>{setFilter(event.target.value);setLimit(24);}} className={`${controls} mb-3 bg-ctp-base`}><option value="all">All matching cards</option><option value="assigned">In decks</option><option value="unassigned">Unassigned copies</option><option value="check">Needs checking</option></select>}
    {!matches.length && <div className="my-4 rounded-xl border border-ctp-surface1 p-4"><p role="status" className="font-semibold">{query || filter !== "all" ? "No cards match this search." : "Your card locations start here."}</p><p className="mt-1 text-sm text-ctp-subtext1">{query || filter !== "all" ? "Try a different name or clear your filters." : "Add owned copies to your collection, then record a deck location or loan."}</p>{query || filter !== "all" ? <Button className="mt-3" onClick={()=>{setQuery("");setFilter("all");setLimit(24);}}>Clear filters</Button> : <Link to="/collection" className="mt-3 inline-flex min-h-12 items-center text-ctp-blue underline">Open collection</Link>}</div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{matches.slice(0,limit).map(item=>{
      const record = records.get(item.uuid); const state = states.get(item.uuid) ?? cardLocationState(item.uuid,[]);
      const matchingDecks = decksByCard.get(locationCardKey(item.name)) ?? [];
      return <article key={item.uuid} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2"><button type="button" onClick={()=>{edit(item.uuid,picker ?? undefined);setPicker(null);}} aria-label={`${picker !== null ? "Lend" : "Locate"} ${item.name}`} className="w-full rounded text-left focus-visible:outline-2 focus-visible:outline-ctp-blue"><CardArtTile card={item.card} name={item.name}/><span className="flex min-h-12 items-center text-sm font-medium">{item.name}</span></button><CollectionCopyStatus state={state} />{Boolean(record?.tradeListedQuantity) && <Link to="/looking-for" className="flex min-h-12 items-center text-xs text-ctp-blue">{record?.tradeListedQuantity} listed for trade · {state.reserved} reserved</Link>}{picker === null && <><p className="mt-2 text-xs">{record?.assignments?.length ? record.assignments.map(row=>`${row.quantity} in ${locationDecks.find(deck=>deck.id===row.deckId)?.title ?? "unavailable deck"}`).join(" · ") : "No current deck"}</p><p className="mt-1 text-xs text-ctp-subtext1">{matchingDecks.length} matching decklists</p>{state.excess > 0 && <p className="mt-1 text-xs text-ctp-yellow">Needs reconciliation</p>}<button type="button" onClick={()=>edit(item.uuid)} className={`${controls} mt-2 w-full`}>Choose location</button></>}</article>;
    })}</div>{matches.length>limit && <button type="button" onClick={()=>setLimit(limit+24)} className={`${controls} mt-3`}>Show more cards</button>}</>;
  return <PageLayout width="wide" data-component="CardLocationsPage"><header className="identity-surface rounded-2xl border border-ctp-surface1 p-4 sm:p-6"><p className="text-sm text-ctp-subtext1">From your collection to the table</p><h1 className="mt-1 text-3xl font-bold text-ctp-text sm:text-4xl">Where are my cards?</h1><p className="mt-3 max-w-2xl text-sm text-ctp-subtext1">Find copies in your decks, record a loan, or check what is available to use. Unassigned copies still need a physical location check.</p><Link to="/collection" className="mt-3 inline-flex min-h-12 items-center text-sm text-ctp-blue underline">Edit owned quantities</Link></header><CollectionStatusHelp />
    {error && <div role="alert" className="mt-4"><p>{error}</p><button type="button" onClick={()=>void load()} className={controls}>Retry</button></div>}
    {!error && user === undefined && <p role="status" className="mt-4">Loading account…</p>}
    {user === null && <Link to="/collection" className="mt-4 inline-flex min-h-12 items-center text-ctp-blue underline">Sign in to manage your cards</Link>}
    {user && !ready && !error && <p role="status" className="mt-4">Loading collection and decks…</p>}
    {ownershipError && <p role="alert" className="mt-3 text-sm text-ctp-red">{ownershipError} <button type="button" className={controls} onClick={()=>void accountApi.collection().then(result=>{setEntries(result.entries);setOwnershipError("");}).catch(()=>setOwnershipError("Ownership could not refresh. Your last loaded quantities are shown."))}>Retry ownership</button></p>}
    {tracking.error && <div role="alert" className="mt-3"><p>{tracking.error}</p><button type="button" className={controls} onClick={()=>void tracking.refresh()}>Retry locations</button></div>}
    {ready && !tracking.ready && !tracking.error && <p role="status" className="mt-4">Loading locations and loans…</p>}
    {ready && pendingQuantities && <p role="status" className="mt-3 text-sm text-ctp-yellow">You have unsaved collection quantities. Locations use your saved copies. <Link to="/collection" className="underline">Review quantities</Link></p>}
    {ready && tracking.ready && <>
      {deckId && tab === "decks" && <section className="mt-4 rounded-xl border border-ctp-surface1 p-3"><h2 className="font-semibold">{focusedDeck?.title ?? "Deck unavailable"}</h2><p className="mt-1 text-sm text-ctp-subtext1">{focusedDeck ? "Showing cards in this decklist and copies already assigned here." : "This deck may have been removed. Showing all your cards."}</p><div className="mt-2 flex flex-wrap gap-2">{focusedDeck && <><button type="button" className={controls} onClick={()=>setAssignmentDeck(focusedDeck)}>Assign deck cards here</button>{!focusedDeck.id.startsWith("official-product:") && <Link className={`${controls} inline-flex items-center text-ctp-blue`} to={`/decks/${encodeURIComponent(focusedDeck.id)}`}>Open deck</Link>}</>}<button type="button" className={controls} onClick={()=>setParams({view:tab},{replace:true})}>Show all cards</button></div></section>}
      <div className="mt-4"><Tabs baseId={tabsId} variant="pill" label="Location views" tabs={[{key:"decks",label:"Cards & decks"},{key:"loans",label:`Lent to players · ${lent}`}]} active={tab} onChange={value=>{setTab(value);setParams(navigationParams(value),{replace:true});}} /></div>
      <TabPanel baseId={tabsId} tab="decks" active={tab}>{!focusedDeck && <Button className="mt-3" onClick={()=>setDeckReview(true)}>Move a whole deck</Button>}{grid}</TabPanel>
      <TabPanel baseId={tabsId} tab="loans" active={tab} keepMounted><LoanLedger records={tracking.records} cards={cards} onEdit={uuid=>edit(uuid)} onAdd={borrower=>{setPicker(borrower ?? "");setQuery("");setLimit(24);}}/></TabPanel>
      {picker !== null && <EditorDialog title={picker ? `Lend to ${picker}` : "Choose a card to lend"} doneLabel="Cancel" onDismiss={()=>setPicker(null)}>{grid}</EditorDialog>}
      {deckReview && <EditorDialog title="Choose a deck" doneLabel="Done" onDismiss={()=>setDeckReview(false)}><DeckLocationCoverage cards={cards} entries={entries} records={tracking.records} decks={locationDecks} onAssign={deck=>{setDeckReview(false);setAssignmentDeck(deck);}}/></EditorDialog>}
      {assignmentDeck && <DeckAssignmentReview deck={assignmentDeck} decks={locationDecks} cards={cards} entries={entries} records={tracking.records} onSave={tracking.saveBatch} onDismiss={()=>setAssignmentDeck(null)}/>}
      {selected && <CardLocationSheet key={selected.uuid} cardUuid={selected.uuid} name={selected.name} card={selected.card} record={records.get(selected.uuid)} entries={entries} decks={locationDecks} onSave={tracking.save} onDismiss={()=>{setParams(navigationParams(tab),{replace:true});setLoanBorrower(undefined);}} initialBorrower={loanBorrower} loansFirst={tab === "loans"}/>}
    </>}
  </PageLayout>;
}
