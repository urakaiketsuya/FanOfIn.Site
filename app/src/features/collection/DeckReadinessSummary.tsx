import { Link } from "react-router-dom";
import DisclosureChevron from "../../components/DisclosureChevron";
import type { deckLocationSummary } from "@gatcg/shared";

/** Ownership and availability overlap; each is measured against this deck's requirements. */
export default function DeckReadinessSummary({ summary, availabilityKnown }: {
  summary: ReturnType<typeof deckLocationSummary>; availabilityKnown: boolean;
}) {
  if (!summary.required) return null;
  return <div className="mt-3" data-component="DeckReadinessSummary">
    <dl className="grid grid-cols-2 gap-3">
      {([['Owned', summary.owned, true], ['Available to use', summary.available, availabilityKnown]] as const).map(([label, count, known]) => <div key={label} className="rounded-xl bg-ctp-base p-3">
        <dt className="text-xs text-ctp-subtext1">{label}</dt>
        <dd className="mt-1 text-2xl font-bold tabular-nums">{known ? count : '—'} <span className="text-sm font-normal text-ctp-subtext1">/ {summary.required}</span></dd>
        {known && <progress aria-label={`${label} copies for this deck`} value={count} max={summary.required} className="collection-progress mt-2 block h-1.5 w-full" />}
      </div>)}
    </dl>
    {summary.unresolved > 0 && <p className="mt-2 text-sm text-ctp-yellow">{summary.unresolved} card names need catalog data before availability can be verified.</p>}
    {availabilityKnown && <div className="mt-2 space-y-1 text-sm text-ctp-subtext1">
      {summary.blocked > 0 && <p>{summary.blocked} required {summary.blocked === 1 ? "copy is" : "copies are"} owned but lent out or reserved for trades.</p>}
      {summary.move > 0 && <p>{summary.move} available {summary.move === 1 ? "copy needs" : "copies need"} to move from other decks.</p>}
      {summary.reconcile && <p className="text-ctp-yellow">Some locations exceed your owned quantities. Reconcile them before assembling this deck.</p>}
      {!summary.unresolved && !summary.reconcile && summary.available === summary.required && <p>All required copies are available in your records. Check their locations before assembling.</p>}
    </div>}
    {availabilityKnown && summary.lines.some(line => line.blocked || line.move || line.reconcile) && <details className="group mt-2">
      <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 text-sm text-ctp-blue">Review locations to resolve<DisclosureChevron className="shrink-0 group-open:rotate-180" /></summary>
      <ul className="space-y-2">{summary.lines.filter(line => line.blocked || line.move || line.reconcile).map(line => <li key={line.name} className="rounded-lg border border-ctp-surface1 p-3">
        <p className="break-words text-sm font-medium">{line.name}</p><p className="mt-1 text-xs text-ctp-subtext1">{line.available} of {line.quantity} available{line.blocked ? ` · ${line.blocked} lent or reserved` : ""}{line.move ? ` · ${line.move} in other decks` : ""}{line.reconcile ? " · Check recorded quantities" : ""}</p>
        {line.cardUuid && <Link to={`/card-locations?card=${encodeURIComponent(line.cardUuid)}`} className="mt-1 inline-flex min-h-control items-center text-sm text-ctp-blue underline">Locate {line.name}</Link>}
      </li>)}</ul>
    </details>}
  </div>;
}
