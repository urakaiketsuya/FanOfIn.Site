import { Link } from "react-router-dom";
import { formatUsd } from "../../../lib/format";
import type { SuggestedBuild } from "../useSuggestedBuild";

export default function BuilderReviewOverview({
  build, simulatorMode, simulatorMatchedCards, lockedCardCount, mainTotal, totalPrice,
  sideboardPrice, showProtectedCuts, onToggleShowProtectedCuts,
}: {
  build: SuggestedBuild;
  simulatorMode: boolean;
  simulatorMatchedCards: number;
  lockedCardCount: number;
  mainTotal: number;
  totalPrice: { sum: number; missing: number };
  sideboardPrice: { sum: number; missing: number };
  showProtectedCuts: boolean;
  onToggleShowProtectedCuts: () => void;
}) {
  return (
    <>
      <div className="mt-4 grid overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle sm:grid-cols-4">
        <Metric label="Evidence" value={`${build.matchingDeckCount} ${simulatorMode ? `game${build.matchingDeckCount === 1 ? "" : "s"}` : `deck${build.matchingDeckCount === 1 ? "" : "s"}`}`} detail={simulatorMode ? `${simulatorMatchedCards} qualifying cards` : build.matchingDeckCount >= 30 ? "Strong sample" : build.matchingDeckCount >= 10 ? "Limited sample" : "Exploratory"} />
        <Metric label="Performance" labelTitle="Win rate observed among matching decks." value={simulatorMode ? "Experimental" : build.conditionalWinRate === null ? "—" : `${(build.conditionalWinRate * 100).toFixed(0)}% observed`} detail={build.baselineWinRate !== null && lockedCardCount > 0 && build.conditionalWinRate !== null ? `${build.conditionalWinRate - build.baselineWinRate >= 0 ? "+" : ""}${((build.conditionalWinRate - build.baselineWinRate) * 100).toFixed(1)}% vs. baseline` : undefined} />
        <Metric label="Completion" value={`${mainTotal}/${mainTotal + build.unresolved.main} main`} detail={`${build.unresolved.main} flex slot${build.unresolved.main === 1 ? "" : "s"} open`} />
        <Metric label="Cost" value={formatUsd(totalPrice.sum)} detail={sideboardPrice.sum > 0 ? `+ ${formatUsd(sideboardPrice.sum)} sideboard` : totalPrice.missing > 0 ? `${totalPrice.missing} price${totalPrice.missing === 1 ? "" : "s"} missing` : "Main + material"} last />
      </div>

      {build.protectedPackages.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-teal/40 bg-ctp-teal/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ctp-teal">Protected packages</p>
          <ul className="mt-1 space-y-1.5">
            {build.protectedPackages.map((deckPackage) => <li key={deckPackage.id} className="text-xs text-ctp-subtext1"><span className="font-medium text-ctp-text">{deckPackage.label}</span>{" — "}{deckPackage.explanation} Individual cuts are hidden for {deckPackage.protectedCards.join(", ")}.</li>)}
          </ul>
          {build.protectedRemovalSuggestions.length > 0 && <button type="button" onClick={onToggleShowProtectedCuts} className="mt-2 rounded-md border border-ctp-teal/50 px-2 py-1 text-xs text-ctp-teal hover:bg-ctp-teal/10" aria-pressed={showProtectedCuts}>{showProtectedCuts ? "Hide protected cuts" : `Review anyway (${build.protectedRemovalSuggestions.length})`}</button>}
        </div>
      )}

      <details className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext1 hover:text-ctp-text">Package catalog ({build.packageCatalog.filter((entry) => entry.active).length}/{build.packageCatalog.length} active)</summary>
        <p className="mt-2 text-xs text-ctp-subtext0">Construction packages are explicit review guardrails and do not define the deck&apos;s archetype. <Link to="/cards/packages" className="text-ctp-blue hover:underline">Browse package definitions.</Link></p>
        <ul className="mt-3 space-y-2">
          {build.packageCatalog.map((entry) => (
            <li key={entry.id} className="rounded-md border border-ctp-surface1 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-ctp-text">{entry.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${entry.active ? "bg-ctp-teal/15 text-ctp-teal" : "bg-ctp-surface0 text-ctp-subtext0"}`}>{entry.active ? "Active" : "Inactive"}</span></div>
              <p className="mt-1 text-ctp-subtext1"><span className="font-medium text-ctp-text">Activates:</span> {entry.activation}</p>
              <p className="mt-1 text-ctp-subtext0">{entry.explanation}</p>
              {entry.active && entry.protectedCards.length > 0 && <p className="mt-1 text-ctp-teal"><span className="font-medium">Protecting:</span> {entry.protectedCards.join(", ")}</p>}
              {entry.observedSupport && <p className="mt-1 text-[10px] text-ctp-overlay1">Observed in {entry.observedSupport.matchingDecks.toLocaleString()} of {entry.observedSupport.populationDecks.toLocaleString()} decks ({entry.observedSupport.auditLabel}).</p>}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

function Metric({ label, value, detail, labelTitle, last = false }: { label: string; value: string; detail?: string; labelTitle?: string; last?: boolean }) {
  return <div className={`${last ? "" : "border-b border-ctp-surface1 sm:border-b-0 sm:border-r"} px-3 py-2`}><p className="text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext0" title={labelTitle}>{label}</p><p className="mt-0.5 text-sm font-semibold text-ctp-text">{value}</p>{detail && <p className="text-[10px] text-ctp-subtext0">{detail}</p>}</div>;
}
