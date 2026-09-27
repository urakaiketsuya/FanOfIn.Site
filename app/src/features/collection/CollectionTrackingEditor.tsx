import { useState, type FormEvent } from "react";
import type { Card, CollectionCardTracking, CollectionCardTrackingUpdate, CollectionLoan } from "@gatcg/shared";
import EditorDialog from "../../components/deck-editor/EditorDialog";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";

export default function CollectionTrackingEditor({ cardUuid, name, card, record, onSave, onDismiss }: {cardUuid: string; name: string; card?: Card; record?: CollectionCardTracking; onSave: (id: string, update: CollectionCardTrackingUpdate) => Promise<void>; onDismiss: () => void}) {
  const [mightOwn, setMightOwn] = useState(record?.mightOwn ?? false);
  const [loans, setLoans] = useState<CollectionLoan[]>(record?.loans ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const revise = (id: string, update: Partial<CollectionLoan>) => setLoans(current=>current.map(loan=>loan.id === id ? {...loan,...update} : loan));
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave(cardUuid, {cardName:name, mightOwn, loans, revision:record?.revision ?? 0}); onDismiss(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save tracking. Your changes are still here."); }
    finally { setBusy(false); }
  }
  return <EditorDialog title="Ownership & loans" doneLabel="Cancel" dismissible={!busy} onDismiss={()=>{if(!busy) onDismiss();}}>
    <div className="mb-4 flex items-start gap-3"><div className="w-20 shrink-0"><CardArtTile card={card} name={name} /></div><div><h3 className="font-semibold">{name}</h3><p className="mt-2 text-sm text-ctp-subtext1">Private reminders for this card across all printings.</p></div></div>
    <form onSubmit={event=>void save(event)} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-ctp-surface1 p-3"><input type="checkbox" checked={mightOwn} onChange={event=>setMightOwn(event.target.checked)} />I might own this—need to check</label>
        <p className="text-sm text-ctp-subtext1">This flag doesn’t add confirmed copies. After checking, update your quantities and clear it.</p>
        <section aria-label="Loans"><h3 className="font-semibold">Lent out</h3><p className="mt-1 text-sm text-ctp-subtext1">Lent copies remain owned. These notes don’t change collection totals, deck coverage or trade availability.</p>
          {loans.filter(loan=>!loan.returnedAt).length === 0 && <p className="mt-3 text-sm text-ctp-subtext0">No active loans.</p>}
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
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-lg bg-ctp-blue px-4 font-semibold text-ctp-base disabled:opacity-40">{busy ? "Saving…" : "Save tracking"}</button>
    </form>
  </EditorDialog>;
}
