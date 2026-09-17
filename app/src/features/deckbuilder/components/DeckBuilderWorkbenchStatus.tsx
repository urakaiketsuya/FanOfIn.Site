import { Link } from "react-router-dom";
import DecklistCoverageNotice from "../../../components/DecklistCoverageNotice";
import StaleDataNotice from "../../../components/StaleDataNotice";
import NotificationBanner from "../../../components/ui/NotificationBanner";
import { useDeckBuilder } from "../useDeckBuilder";
import BuilderWorkbenchNav from "./BuilderWorkbenchNav";

export function DeckBuilderWorkbenchStatus() {
  const {
    build, changeLog, championName, deckFormat, effectivePopulationSource, importedCardCount,
    isImproving, isPending, mainTotal, materialTotal, newReleaseCards, pendingActionRef,
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
      <section className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3" aria-labelledby="deck-builder-checklist">
        <h2 id="deck-builder-checklist" className="text-sm font-semibold text-ctp-text">Deck-building checklist</h2>
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
          {isImproving && <p className={importedCardCount > 0 ? "text-ctp-green" : "text-ctp-yellow"}>{importedCardCount > 0 ? `✓ ${importedCardCount} baseline cards loaded` : "○ Imported deck is empty"}</p>}
          <p className="text-ctp-green">✓ Champion selected</p>
          <p className="text-ctp-green">✓ Spirit selected</p>
          <p className={validation.status === "Legal" ? "text-ctp-green" : "text-ctp-yellow"}>{validation.status === "Legal" ? "✓ Construction checks pass" : `○ ${validation.status}: review deck size and legality`}</p>
        </div>
      </section>
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
      {newReleaseCards.length > 0 && (
        <div className="mt-4">
          <NotificationBanner tone="highlight" title="New cards available" description={`${newReleaseCards.length} new card${newReleaseCards.length === 1 ? "" : "s"} from recent sets`} action={{ label: "Explore new cards", to: "/card-discovery" }} />
        </div>
      )}
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
