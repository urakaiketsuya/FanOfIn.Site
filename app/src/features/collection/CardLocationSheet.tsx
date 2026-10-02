import { CollectionCopyStatus, CollectionStatusHelp } from "./CollectionStatus";
import { Link } from "react-router-dom";
import { cardLocationState, deckCardRequirements, locationCardKey, planCardTransfer, returnLoanCopies } from "@gatcg/shared";
import { useId, useState, type FormEvent } from "react";
import type { Card, CollectionCardTracking, CollectionCardTrackingUpdate, CollectionLoan, CollectionEntry, CollectionDeckAssignment, SavedDeck } from "@gatcg/shared";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";

function localDateInput(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

export default function CardLocationSheet({ cardUuid, name, card, record, entries, decks, onSave, onDismiss, initialBorrower, loansFirst = false }: {initialBorrower?: string; loansFirst?: boolean; entries: CollectionEntry[]; decks: SavedDeck[]; cardUuid: string; name: string; card?: Card; record?: CollectionCardTracking; onSave: (id: string, update: CollectionCardTrackingUpdate) => Promise<void>; onDismiss: () => void}) {
  const formId = useId();
  const [draftRevision] = useState(record?.revision ?? 0);
  const [baseline] = useState(() => JSON.stringify([record?.mightOwn ?? false, record?.loans ?? [], record?.assignments ?? []]));
  const [mightOwn, setMightOwn] = useState(record?.mightOwn ?? false);
  const [loans, setLoans] = useState<CollectionLoan[]>(() => [...(record?.loans ?? []), ...(initialBorrower !== undefined && (record?.loans.length ?? 0) < 100 ? [{id: crypto.randomUUID(), borrower: initialBorrower, quantity: 1, lentAt: new Date().toISOString()}] : [])]);
  const [assignments, setAssignments] = useState<CollectionDeckAssignment[]>(record?.assignments ?? []);
  const [transferNote, setTransferNote] = useState("");
  const draft = {tradeReservedQuantity:record?.tradeReservedQuantity,cardUuid,cardName:name,mightOwn,loans,assignments,revision:draftRevision,updatedAt:""};
  const location = cardLocationState(cardUuid, entries, draft);
  const candidates = decks.filter(deck => deckCardRequirements(deck.decklist).has(locationCardKey(name)) || assignments.some(row => row.deckId === deck.id));
  const missingDecks = assignments.filter(row => !decks.some(deck => deck.id === row.deckId));
  const setAssignment = (deckId: string, quantity: number) => setAssignments(current => [...current.filter(row => row.deckId !== deckId), ...(quantity > 0 ? [{deckId,quantity}] : [])]);
  const [returnQuantities, setReturnQuantities] = useState<Record<string,number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const revise = (id: string, update: Partial<CollectionLoan>) => setLoans(current=>current.map(loan=>loan.id === id ? {...loan,...update} : loan));
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave(cardUuid, {cardName:name, mightOwn, loans, assignments, revision:draftRevision}); onDismiss(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save tracking. Your changes are still here."); }
    finally { setBusy(false); }
  }
  const deckSection = <details open={!loansFirst}><summary className="flex min-h-12 cursor-pointer items-center gap-2 font-semibold">Decks using this card<DisclosureChevron/></summary><section aria-label="Deck locations">
          {!candidates.length && <p className="py-2 text-sm text-ctp-subtext1">No saved deck uses this card.</p>}
          {candidates.map(deck => { const required=deckCardRequirements(deck.decklist).get(locationCardKey(name))?.quantity ?? 0; const assigned=assignments.find(row=>row.deckId===deck.id)?.quantity ?? 0; return <div key={deck.id} className={`mt-2 rounded-lg border p-3 ${assigned>0 ? "border-ctp-blue bg-ctp-blue/5" : "border-ctp-surface1"}`}><p className="font-medium">{deck.title}</p><p className="text-sm text-ctp-subtext1">{assigned} here · {required} needed</p>{assigned > required && <p className="text-sm text-ctp-yellow">Decklist changed: review extra assigned copies.</p>}<button type="button" disabled={location.excess>0 || !required} onClick={()=>{ const plan=planCardTransfer(deck.id,required,location.owned,draft); setAssignments(plan.assignments); setTransferNote(plan.transfers.length ? `Will move ${plan.transfers.map(row=>`${row.quantity} from ${decks.find(d=>d.id===row.deckId)?.title ?? "unavailable deck"}`).join(", ")} to ${deck.title}. Save to confirm.` : `Assignment to ${deck.title} updated in this draft. ${plan.missing ? `${plan.missing} not owned. ` : ""}${plan.loanBlocked ? `${plan.loanBlocked} unavailable while lent or reserved for trades. ` : ""} Save to confirm.`); }} className="min-h-12 rounded px-2 text-sm text-ctp-blue">Set as current location</button><details><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">Split or unassign<DisclosureChevron /></summary><label className="block text-sm">Copies in this deck<input aria-label={`Copies in ${deck.title}`} type="number" min={0} max={9999} value={assigned} onChange={event=>setAssignment(deck.id,Math.max(0,Math.floor(Number(event.target.value)||0)))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label></details></div>; })}
          {missingDecks.map(row=><div key={row.deckId} className="mt-2 text-sm"><p>Unavailable deck · {row.quantity} copies. Review before unassigning.</p><button type="button" onClick={()=>setAssignment(row.deckId,0)} className="min-h-12 text-ctp-blue">Unassign these copies</button></div>)}
          {transferNote && <p role="status" className="mt-2 text-sm">{transferNote}</p>}
        </section></details>;
  return <EditorDialog title={loansFirst ? "Manage loans" : "Locations & loans"} doneLabel="Close" dirty={JSON.stringify([mightOwn, loans, assignments]) !== baseline} dismissible={!busy} footer={<>{error && <p role="alert" className="mb-2 text-sm text-ctp-red">{error}</p>}<button form={formId} type="submit" disabled={busy || location.excess > 0} className="min-h-12 w-full rounded-lg bg-ctp-blue px-4 font-semibold text-ctp-base disabled:opacity-40">{busy ? "Saving…" : "Save locations"}</button></>} onDismiss={()=>{if(!busy) onDismiss();}}>
    <div className="identity-surface mb-4 mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start gap-4 rounded-xl border border-ctp-surface1 p-3"><div className="min-w-0"><CardArtTile card={card} name={name} /></div><div className="min-w-0"><h3 className="break-words text-lg font-semibold">{name}</h3><CollectionCopyStatus state={location} />{card && <Link target="_blank" rel="noreferrer" to={`/cards/${card.slug}`} className="inline-flex min-h-12 items-center text-sm text-ctp-blue">Card details ↗</Link>}</div></div>
    <CollectionStatusHelp />
    <form id={formId} onChange={()=>setError("")} onSubmit={event=>void save(event)} className="space-y-4">
      <fieldset disabled={busy} className="flex flex-col gap-4">
        {location.excess > 0 && <p role="alert" className="text-sm text-ctp-yellow">Needs reconciliation: {location.excess} more copies are assigned or lent than you own. Reduce assignments, return loans, or correct your collection quantity.</p>}
        {!loansFirst && deckSection}


        <section aria-label="Loans"><h3 className="font-semibold">Lent to players</h3><p className="mt-1 text-sm text-ctp-subtext1">Lent copies remain owned. They are unavailable to put in a deck until returned. If copies are in a deck, release them below before saving the loan.</p>
          {location.excess > 0 && location.assigned > 0 && location.lent + location.reserved <= location.owned && <button type="button" className="mt-2 min-h-12 rounded-lg border border-ctp-yellow px-3 text-sm" onClick={() => {let remaining = location.excess; const releases: string[] = []; setAssignments(assignments.map(row => {const remove = Math.min(remaining,row.quantity); remaining -= remove; if(remove) releases.push(`${remove} from ${decks.find(deck=>deck.id===row.deckId)?.title ?? "unavailable deck"}`); return {...row,quantity:row.quantity-remove};}).filter(row=>row.quantity>0)); setTransferNote(`Will release ${releases.join(", ")} for this loan. Save to confirm.`);}}>Release {location.excess} deck {location.excess === 1 ? "copy" : "copies"} for this loan</button>}
          {transferNote && loansFirst && <p role="status" className="mt-2 text-sm">{transferNote}</p>}
          {loans.filter(loan=>!loan.returnedAt).map((loan,index)=><div key={loan.id} className="mt-3 space-y-2 rounded-xl border border-ctp-surface1 p-3">
            <label className="block text-sm">Lent to<input aria-label={`Borrower for loan ${index+1}`} required maxLength={120} value={loan.borrower} onChange={event=>revise(loan.id,{borrower:event.target.value})} placeholder="Name or nickname" className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label>
            <label className="block text-sm">Copies<input aria-label={`Copies for loan ${index+1}`} required type="number" min={1} max={9999} step={1} value={loan.quantity || ""} onChange={event=>revise(loan.id,{quantity:Number(event.target.value)})} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label>
            <label className="block text-sm">Date lent<input aria-label={`Date lent for loan ${index+1}`} type="date" required value={localDateInput(loan.lentAt)} max={localDateInput(new Date().toISOString())} onChange={event=>{if(event.target.value) revise(loan.id,{lentAt:new Date(`${event.target.value}T00:00:00`).toISOString()});}} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3"/></label>
            {record?.loans.some(old=>old.id === loan.id) ? <div className="flex flex-wrap items-end gap-2"><label className="text-sm">Copies returned<input aria-label={`Return quantity for loan ${index+1}`} type="number" min={1} max={loan.quantity} value={returnQuantities[loan.id] ?? loan.quantity} onChange={event=>setReturnQuantities({...returnQuantities,[loan.id]:Number(event.target.value)})} className="mt-1 min-h-12 w-24 rounded-lg border border-ctp-surface1 bg-ctp-base px-3"/></label><button type="button" onClick={()=>{try {setLoans(returnLoanCopies(loans,loan.id,returnQuantities[loan.id] ?? loan.quantity,new Date().toISOString(),crypto.randomUUID()));setReturnQuantities({});setError("");} catch(reason) {setError((reason as Error).message);}}} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue">Mark returned</button></div> : <button type="button" onClick={()=>setLoans(current=>current.filter(item=>item.id !== loan.id))} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue">Remove draft loan</button>}
          </div>)}
          <button type="button" disabled={loans.length >= 100} onClick={()=>setLoans(current=>[...current,{id:crypto.randomUUID(),borrower:"",quantity:1,lentAt:new Date().toISOString()}])} className="mt-3 min-h-12 rounded-lg border border-ctp-blue px-3 text-sm text-ctp-blue disabled:opacity-40">Record a loan</button>
          {loans.length >= 100 && <p className="text-sm">This card has reached the 100-record limit.</p>}
          {loans.some(loan=>loan.returnedAt) && <details className="mt-3"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">Returned loans<DisclosureChevron /></summary>{loans.filter(loan=>loan.returnedAt).map(loan=><div key={loan.id} className="border-t border-ctp-surface1 py-2 text-sm"><p>{loan.quantity}× to {loan.borrower} · returned {new Date(loan.returnedAt!).toLocaleDateString()}</p><button type="button" onClick={()=>revise(loan.id,{returnedAt:undefined})} className="min-h-12 px-2 text-ctp-blue">Reopen loan</button></div>)}</details>}
        </section>
        {loansFirst && deckSection}
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-ctp-surface1 p-3"><input type="checkbox" checked={mightOwn} onChange={event=>setMightOwn(event.target.checked)} />I might own this. I need to check.</label>
      </fieldset>
    </form>
  </EditorDialog>;
}
