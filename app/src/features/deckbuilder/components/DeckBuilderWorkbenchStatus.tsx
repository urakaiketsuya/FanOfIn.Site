import { Link } from "react-router-dom";
import DecklistCoverageNotice from "../../../components/DecklistCoverageNotice";
import StaleDataNotice from "../../../components/StaleDataNotice";
import { useDeckBuilder } from "../useDeckBuilder";
import BuilderWorkbenchNav from "./BuilderWorkbenchNav";

export function DeckBuilderWorkbenchStatus() {
  const {
    build, changeLog, championName, deckFormat, effectivePopulationSource,
    isPending, mainTotal, materialTotal, pendingActionRef,
    rejectedCards, setRejectedCards, setTab, sideboardTotal, simulatorResult, simulatorSummary,
    spiritFilter, startTransition, tab, validation,
  } = useDeckBuilder();

  return (
    <>
      {effectivePopulationSource === "simulator" && (
        <div className="mt-2 rounded-lg border border-ctp-mauve/50 bg-ctp-mauve/10 px-3 py-2 text-xs text-ctp-subtext1">
          <span className="font-semibold text-ctp-mauve">Experimental:</span>{" "}
          Clarent currently reports {simulatorSummary?.games ?? 0} game{simulatorSummary?.games === 1 ? "" : "s"} and {simulatorResult.matchedCards} catalog-resolved card sample{simulatorResult.matchedCards === 1 ? "" : "s"}. Community construction still supplies the legal shell — simulator rows only reorder card priority within it.{" "}
          <Link to="/methodology#simulator-data" className="text-ctp-blue hover:underline">Learn more</Link>
        </div>
      )}
      {isPending && <p role="status" className="mt-1 text-xs text-ctp-subtext0">Recalculating suggestions…</p>}
      {rejectedCards.size > 0 && (
        <p className="mt-1 text-xs text-ctp-subtext0">
          {rejectedCards.size} card{rejectedCards.size === 1 ? "" : "s"} excluded ·{" "}
          <button type="button" onClick={() => { pendingActionRef.current = { label: "Reset excluded cards", subject: null }; startTransition(() => setRejectedCards(new Set())); }} className="hover:text-ctp-blue hover:underline">reset</button>
        </p>
      )}
      {build.usedSpiritElementFallback && (
        <p className="mt-1 text-xs text-ctp-yellow">
          Too few {championName} decks run {spiritFilter} specifically — suggestions also draw on other {championName} decks with a same-element Spirit ({build.spiritElementFallbackSpirits.join(", ")}).
        </p>
      )}
      <BuilderWorkbenchNav
        activeView={tab}
        onViewChange={setTab}
        championName={championName!}
        spiritName={spiritFilter!}
        deckFormat={deckFormat}
        mainTotal={mainTotal}
        materialTotal={materialTotal}
        sideboardTotal={sideboardTotal}
        validationStatus={validation.status}
        changeLogCount={changeLog.length}
      />
    </>
  );
}

export function DeckBuilderMethodology() {
  const { build, effectivePopulationSource, popularityIndexData, simulatorSummary, validation } = useDeckBuilder();
  return (
    <details className="mt-8 border-t border-ctp-surface1 pt-3 text-xs text-ctp-subtext0">
      <summary className="cursor-pointer font-medium hover:text-ctp-text">Data &amp; methodology</summary>
      <div className="mt-2 space-y-2">
        <DecklistCoverageNotice />
        <StaleDataNotice generatedAt={[popularityIndexData?.generatedAt, effectivePopulationSource === "simulator" ? simulatorSummary?.generatedAt : undefined]} />
        <p>
          {effectivePopulationSource === "simulator" ? "Simulator ordering is an experimental overlay on a community-built legal shell." : "Suggestions are correlations from public tournament decklists, not causal or predictive claims."}{" "}
          <Link to={effectivePopulationSource === "simulator" ? "/methodology#simulator-data" : "/methodology#classification"} className="text-ctp-blue hover:underline">Learn more</Link>
        </p>
        {build.hasQuantityOptimizations && (
          <p>
            Starred quantities use copy-count evidence only when the gap is statistically significant, not just numerically different — checked first against this build&apos;s own population, then against the global copy-count dataset.{" "}
            <Link to="/methodology#small-samples" className="text-ctp-blue hover:underline">Learn more</Link>
          </p>
        )}
        <p>Validation does not cover {validation.unsupportedRules.join("; ")}.</p>
      </div>
    </details>
  );
}
