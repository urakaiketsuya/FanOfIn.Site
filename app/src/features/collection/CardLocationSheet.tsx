import { cardLocationState, deckCardRequirements, locationCardKey, planCardTransfer } from "@gatcg/shared";
import { useState, type FormEvent } from "react";
import type { Card, CollectionCardTracking, CollectionCardTrackingUpdate, CollectionLoan, CollectionEntry, CollectionDeckAssignment, SavedDeck } from "@gatcg/shared";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";

export default function CardLocationSheet({ cardUuid, name, card, record, entries, decks, onSave, onDismiss }: {entries: CollectionEntry[]; decks: SavedDeck[]; cardUuid: string; name: string; card?: Card; record?: CollectionCardTracking; onSave: (id: string, update: CollectionCardTrackingUpdate) => Promise<void>; onDismiss: () => void}) {
  const [mightOwn, setMightOwn] = useState(record?.mightOwn ?? false);
  const [loans, setLoans] = useState<CollectionLoan[]>(record?.loans ?? []);
  const [assignments, setAssignments] = useState<CollectionDeckAssignment[]>(record?.assignments ?? []);
  const [transferNote, setTransferNote] = useState("");
  const draft = {cardUuid,cardName:name,mightOwn,loans,assignments,revision:record?.revision ?? 0,updatedAt:""};
  const location = cardLocationState(cardUuid, entries, draft);
  const candidates = decks.filter(deck => deckCardRequirements(deck.decklist).has(locationCardKey(name)) || assignments.some(row => row.deckId === deck.id));
  const missingDecks = assignments.filter(row => !decks.some(deck => deck.id === row.deckId));
  const setAssignment = (deckId: string, quantity: number) => setAssignments(current => [...current.filter(row => row.deckId !== deckId), ...(quantity > 0 ? [{deckId,quantity}] : [])]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const revise = (id: string, update: Partial<CollectionLoan>) => setLoans(current=>current.map(loan=>loan.id === id ? {...loan,...update} : loan));
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave(cardUuid, {cardName:name, mightOwn, loans, assignments, revision:record?.revision ?? 0}); onDismiss(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save tracking. Your changes are still here."); }
    finally { setBusy(false); }
  }
  return <EditorDialog title="Where are these copies?" doneLabel="Cancel" dismissible={!busy} onDismiss={()=>{if(!busy) onDismiss();}}>
    <div className="mb-4 flex items-start gap-3"><div className="w-20 shrink-0"><CardArtTile card={card} name={name} /></div><div><h3 className="font-semibold">{name}</h3><p className="mt-2 text-sm text-ctp-subtext1">{location.owned} owned · {location.unassigned} unassigned · {location.lent} lent out</p></div></div>
    <form onChange={()=>setError("")} onSubmit={event=>void save(event)} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        {location.excess > 0 && <p role="alert" className="text-sm text-ctp-yellow">Needs reconciliation: {location.excess} more copies are assigned or lent than you own. Reduce assignments, return loans, or correct your collection quantity.</p>}
        <section aria-label="Deck locations"><h3 className="font-semibold">Decks using this card</h3>
          {!candidates.length && <p className="py-2 text-sm text-ctp-subtext1">No saved deck uses this card.</p>}
          {candidates.map(deck => { const required=deckCardRequirements(deck.decklist).get(locationCardKey(name))?.quantity ?? 0; const assigned=assignments.find(row=>row.deckId===deck.id)?.quantity ?? 0; return <div key={deck.id} className={`mt-2 rounded-lg border p-3 ${assigned>0 ? "border-ctp-blue bg-ctp-blue/5" : "border-ctp-surface1"}`}><p className="font-medium">{deck.title}</p><p className="text-sm text-ctp-subtext1">{assigned} here · {required} needed</p>{assigned > required && <p className="text-sm text-ctp-yellow">Decklist changed: review extra assigned copies.</p>}<button type="button" disabled={location.excess>0 || !required} onClick={()=>{ const plan=planCardTransfer(deck.id,required,location.owned,draft); setAssignments(plan.assignments); setTransferNote(plan.transfers.length ? `Will move ${plan.transfers.map(row=>`${row.quantity} from ${decks.find(d=>d.id===row.deckId)?.title ?? "unavailable deck"}`).join(", ")} to ${deck.title}. Save to confirm.` : `Assignment to ${deck.title} updated in this draft. ${plan.missing ? `${plan.missing} not owned. ` : ""}${plan.loanBlocked ? `${plan.loanBlocked} unavailable until loans return. ` : ""} Save to confirm.`); }} className="min-h-12 rounded px-2 text-sm text-ctp-blue">Move here</button><details><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">Split or unassign<DisclosureChevron /></summary><label className="block text-sm">Copies in this deck<input aria-label={`Copies in ${deck.title}`} type="number" min={0} max={9999} value={assigned} onChange={event=>setAssignment(deck.id,Math.max(0,Math.floor(Number(event.target.value)||0)))} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3" /></label></details></div>; })}
          {missingDecks.map(row=><div key={row.deckId} className="mt-2 text-sm"><p>Unavailable deck · {row.quantity} copies. Review before unassigning.</p><button type="button" onClick={()=>setAssignment(row.deckId,0)} className="min-h-12 text-ctp-blue">Unassign these copies</button></div>)}
          {transferNote && <p role="status" className="mt-2 text-sm">{transferNote}</p>}
        </section>
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-ctp-surface1 p-3"><input type="checkbox" checked={mightOwn} onChange={event=>setMightOwn(event.target.checked)} />I might own this—need to check</label>

        <section aria-label="Loans"><h3 className="font-semibold">Lent out</h3><p className="mt-1 text-sm text-ctp-subtext1">Lent copies remain owned. They are unavailable to put in a deck until returned. Unassign copies from a deck before lending them.</p>
          
          {loans.filter(loan=>!loan.returnedAt).map((loan,index)=><div key={loan.id} className="mt-3 space-y-2 rounded-xl border border-ctp-surface1 p-3">
            <label className="block text-sm">Lent to<input aria-label={`Borrower for loan ${index+1}`} required maxLength={120} value={loan.borrower} onChange={event=>revise(loan.id,{borrower:event.target.value})} placeholder="Name or nickname" className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label>
            <label className="block text-sm">Copies<input aria-label={`Copies for loan ${index+1}`} required type="number" min={1} max={9999} step={1} value={loan.quantity || ""} onChange={event=>revise(loan.id,{quantity:Number(event.target.value)})} className="mt-1 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" /></label>
            <p className="text-xs text-ctp-subtext0">Recorded {new Date(loan.lentAt).toLocaleDateString()}</p>
            {record?.loans.some(old=>old.id === loan.id) ? <button type="button" onClick={()=>revise(loan.id,{returnedAt:new Date().toISOString()})} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue">Mark returned</button> : <button type="button" onClick={()=>setLoans(current=>current.filter(item=>item.id !== loan.id))} className="min-h-12 rounded-lg px-3 text-sm text-ctp-blue">Remove draft loan</button>}
          </div>)}
          <button type="button" disabled={loans.length >= 100} onClick={()=>setLoans(current=>[...current,{id:crypto.randomUUID(),borrower:"",quantity:1,lentAt:new Date().toISOString()}])} className="mt-3 min-h-12 rounded-lg border border-ctp-blue px-3 text-sm text-ctp-blue disabled:opacity-40">Record a loan</button>
          {loans.length >= 100 && <p className="text-sm">This card has reached the 100-record limit.</p>}
          {loans.some(loan=>loan.returnedAt) && <details className="mt-3"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm">Returned loans<DisclosureChevron /></summary>{loans.filter(loan=>loan.returnedAt).map(loan=><div key={loan.id} className="border-t border-ctp-surface1 py-2 text-sm"><p>{loan.quantity}× to {loan.borrower} · returned {new Date(loan.returnedAt!).toLocaleDateString()}</p><button type="button" onClick={()=>revise(loan.id,{returnedAt:undefined})} className="min-h-12 px-2 text-ctp-blue">Reopen loan</button></div>)}</details>}
        </section>
      </fieldset>
      {error && <p role="alert" className="text-sm text-ctp-red">{error}</p>}
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-lg bg-ctp-blue px-4 font-semibold text-ctp-base disabled:opacity-40">{busy ? "Saving…" : "Save locations"}</button>
    </form>
  </EditorDialog>;
}
