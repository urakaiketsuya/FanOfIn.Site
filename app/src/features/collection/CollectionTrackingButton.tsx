import type { CollectionCardTracking } from "@gatcg/shared";

export default function CollectionTrackingButton({ record, name, disabled, onClick }: {record?: CollectionCardTracking; name: string; disabled?: boolean; onClick: () => void}) {
  const lent = record?.loans.filter(loan=>!loan.returnedAt).reduce((sum,loan)=>sum+loan.quantity,0) ?? 0;
  return <div className="mt-2 text-xs">
    {record?.mightOwn && <p className="text-ctp-yellow">Might own · check</p>}
    {lent > 0 && <p className="text-ctp-mauve">{lent} lent out</p>}
    <button type="button" disabled={disabled} onClick={onClick} aria-label={`Ownership and loans for ${name}`} className="min-h-12 rounded-lg px-2 text-left text-ctp-blue disabled:opacity-40">Ownership & loans</button>
  </div>;
}
