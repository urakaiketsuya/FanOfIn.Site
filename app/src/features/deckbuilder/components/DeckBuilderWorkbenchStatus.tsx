import { Link } from "react-router-dom";
import DecklistCoverageNotice from "../../../components/DecklistCoverageNotice";
import StaleDataNotice from "../../../components/StaleDataNotice";
import { useDeckBuilder } from "../useDeckBuilder";
import BuilderWorkbenchNav from "./BuilderWorkbenchNav";

export function DeckBuilderWorkbenchStatus() {
  const { changeLog, isPending, setTab, tab, setCustomizeOpen } = useDeckBuilder();
  return <>
    {isPending && <p role="status" className="mt-1 text-sm text-ctp-subtext0">Updating deck…</p>}
    <BuilderWorkbenchNav activeView={tab} onViewChange={setTab} changeLogCount={changeLog.length}
      onOpenDisplay={() => { setTab("build"); setCustomizeOpen(true); }} />
  </>;
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
