import type { cardLocationState } from "@gatcg/shared";
import DisclosureChevron from "../../components/DisclosureChevron";

export const OWNERSHIP_COVERAGE_NOTE = "Ownership includes copies lent to other players or reserved for trades. Check locations to see which copies are available to use.";

const DEFINITIONS = [
  ["Owned", "Physical copies recorded in your collection, including copies lent to other players or reserved for trades. Proxies are tracked separately."],
  ["Available to use", "Owned copies that are neither lent out nor reserved for trades. Some may need to move from another deck."],
  ["Assigned to decks", "Copies recorded in a specific deck. Adding a card to a decklist does not assign a physical copy."],
  ["Unassigned", "Available copies with no recorded deck assignment. This does not confirm their physical location."],
  ["Lent to players", "Copies on active loans. They remain owned and become available again when recorded as returned."],
  ["Reserved for trades", "Copies held for trades and excluded from availability. Listing a copy for trade alone does not reserve it."],
] as const;

/** Presentation only. Counts come from shared collection location calculations. */
export function CollectionCopyStatus({ state }: { state: ReturnType<typeof cardLocationState> }) {
  const rows = [
    ["Owned", state.owned], ["Available to use", state.available],
    ["Assigned to decks", state.assigned], ["Unassigned", state.unassigned],
    ["Lent to players", state.lent], ["Reserved for trades", state.reserved],
  ] as const;
  return <div className="mt-2">
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
      {rows.map(([label, count]) => <div key={label}><dt className="text-ctp-subtext1">{label}</dt><dd className="mt-0.5 font-semibold tabular-nums text-ctp-text">{count}</dd></div>)}
    </dl>
    {state.excess > 0 && <p className="mt-2 text-xs text-ctp-yellow">Check quantities: assignments, loans, and trade reservations exceed owned copies by {state.excess}.</p>}
  </div>;
}

export function CollectionStatusHelp() {
  return <details className="group mt-3 rounded-lg border border-ctp-surface1 px-3">
    <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ctp-blue">
      What do these collection statuses mean?<DisclosureChevron className="shrink-0 group-open:rotate-180" />
    </summary>
    <dl className="space-y-3 pb-3 text-sm">{DEFINITIONS.map(([label, description]) => <div key={label}><dt className="font-semibold text-ctp-text">{label}</dt><dd className="mt-1 text-ctp-subtext1">{description}</dd></div>)}</dl>
  </details>;
}
