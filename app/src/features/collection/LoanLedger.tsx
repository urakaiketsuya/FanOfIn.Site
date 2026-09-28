import { useState } from "react";
import type { Card, CollectionCardTracking } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import DisclosureChevron from "../../components/DisclosureChevron";

export default function LoanLedger({ records, cards, onEdit, onAdd }: {
  records: CollectionCardTracking[]; cards: Card[];
  onEdit: (uuid: string) => void; onAdd: (borrower?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState(false);
  const groups = new Map<string, { borrower: string; rows: { record: CollectionCardTracking; loan: CollectionCardTracking["loans"][number] }[] }>();
  for (const record of records) for (const loan of record.loans) {
    if (Boolean(loan.returnedAt) !== history) continue;
    if (!`${loan.borrower} ${record.cardName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) continue;
    const key = loan.borrower.trim().toLocaleLowerCase();
    const group = groups.get(key) ?? { borrower: loan.borrower, rows: [] };
    group.rows.push({ record, loan }); groups.set(key, group);
  }
  return <section className="mt-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{history ? "Returned loans" : "Lent to friends"}</h2><button type="button" onClick={() => onAdd()} className="min-h-12 rounded-lg bg-ctp-blue px-3 text-sm text-ctp-base">Record a loan</button></div>
    <input aria-label="Search loans" placeholder="Find a friend or card…" value={query} onChange={event => setQuery(event.target.value)} className="my-3 min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-base" />
    <button type="button" aria-pressed={history} onClick={() => setHistory(!history)} className="mb-3 flex min-h-12 items-center gap-2 text-sm text-ctp-blue">{history ? "Show outstanding loans" : "Returned history"}<DisclosureChevron className={history ? "rotate-180" : ""}/></button>
    {!groups.size && <p role="status" className="py-4 text-sm text-ctp-subtext1">{query ? "No matching loans." : history ? "No returned loans yet." : "No cards lent out. Record a loan to keep track of who has your cards."}</p>}
    <div className="space-y-4">{[...groups].sort((a,b) => a[1].borrower.localeCompare(b[1].borrower)).map(([key, group]) => <section key={key} className="rounded-xl border border-ctp-surface1 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{group.borrower} · {group.rows.reduce((sum,row) => sum + row.loan.quantity, 0)} {group.rows.reduce((sum,row) => sum + row.loan.quantity, 0) === 1 ? "copy" : "copies"}</h3>{!history && <button type="button" onClick={() => onAdd(group.borrower)} className="min-h-12 px-3 text-sm text-ctp-blue">Lend another card</button>}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{group.rows.map(({ record, loan }) => <article key={`${record.cardUuid}:${loan.id}`} className="min-w-0 rounded-xl bg-ctp-mantle p-2"><button type="button" aria-label={`Manage loan of ${record.cardName} to ${loan.borrower}`} onClick={() => onEdit(record.cardUuid)} className="w-full text-left"><CardArtTile card={cards.find(card => card.uuid === record.cardUuid)} name={record.cardName}/><span className="flex min-h-12 items-center text-sm font-medium">{record.cardName}</span></button><p className="text-sm">{loan.quantity} {loan.quantity === 1 ? "copy" : "copies"}</p><p className="mt-1 text-xs text-ctp-subtext1">{history ? "Returned" : "Lent"} {new Date(loan.returnedAt ?? loan.lentAt).toLocaleDateString()}</p><button type="button" onClick={() => onEdit(record.cardUuid)} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-surface1 px-2 text-sm">{history ? "View loan" : "Return / edit"}</button></article>)}</div>
    </section>)}</div>
  </section>;
}
