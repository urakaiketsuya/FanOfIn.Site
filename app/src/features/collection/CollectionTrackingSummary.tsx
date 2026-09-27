import { useState } from "react";
import type { CollectionCardTracking } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";

export default function CollectionTrackingSummary({records, ready, error, onReload, onEdit}: {records: CollectionCardTracking[]; ready: boolean; error: string | null; onReload: () => void; onEdit: (card: {uuid: string; name: string}) => void}) {
  const [filter,setFilter] = useState("active");
  const checking = records.filter(item=>item.mightOwn).length;
  const lent = records.filter(item=>item.loans.some(loan=>!loan.returnedAt)).length;
  const matching = records.filter(item=>filter === "check" ? item.mightOwn : filter === "loans" ? item.loans.some(loan=>!loan.returnedAt) : filter === "history" ? item.loans.some(loan=>loan.returnedAt) : item.mightOwn || item.loans.some(loan=>!loan.returnedAt));
  return <section aria-label="Collection tracking" className="mt-4 rounded-xl border border-ctp-surface1 p-3">
    {error ? <div role="alert" className="text-sm text-ctp-red">Tracking unavailable: {error}<button type="button" onClick={onReload} className="min-h-12 px-3 text-ctp-blue">Retry tracking</button></div> : !ready ? <p role="status" className="text-sm">Loading ownership reminders and loans…</p> : <details open><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm">Ownership & loans · {checking} to check · {lent} cards lent<DisclosureChevron /></summary>
      <p className="my-2 text-sm text-ctp-subtext1">Use Manage card in the card browser to add a reminder or loan.</p>
      <label className="flex min-h-12 flex-wrap items-center gap-2 text-sm">Show<select value={filter} onChange={event=>setFilter(event.target.value)} className="min-h-12 rounded-lg border border-ctp-surface1 bg-ctp-base px-3"><option value="active">Active reminders</option><option value="check">Might own</option><option value="loans">Lent out</option><option value="history">Returned loans</option></select></label>
      {!matching.length && <p className="py-3 text-sm text-ctp-subtext0">No cards in this view.</p>}
      <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">{matching.map(item=><li key={item.cardUuid}><button type="button" onClick={()=>onEdit({uuid:item.cardUuid,name:item.cardName})} className="min-h-12 w-full rounded-lg border border-ctp-surface1 p-3 text-left text-sm"><span className="font-semibold">{item.cardName}</span>{item.mightOwn && <span className="block text-ctp-yellow">Might own · check</span>}{item.loans.filter(loan=>!loan.returnedAt).map(loan=><span key={loan.id} className="block break-words text-ctp-subtext1">{loan.quantity}× lent to {loan.borrower}</span>)}</button></li>)}</ul>
      <button type="button" onClick={onReload} className="mt-2 min-h-12 px-2 text-sm text-ctp-blue">Reload tracking</button>
    </details>}
  </section>;
}
