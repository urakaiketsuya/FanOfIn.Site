import { useDecklistCoverage } from "../features/tournaments/useDecklistCoverage";

/** Context for a page built from decklists: most tracked tournaments never had one to begin with,
 * so what's shown here is a sample of the field, not the full one. See useDecklistCoverage's own
 * doc comment for the real-data numbers behind this. */
export default function DecklistCoverageNotice() {
  const coverage = useDecklistCoverage();
  if (coverage.loading || coverage.totalEvents === 0) return null;

  return (
    <p className="mt-2 text-xs text-ctp-subtext0">
      Built from the {(coverage.coverageRate * 100).toFixed(0)}% of tracked tournaments with public decklists
      {coverage.latestSeasonName && coverage.latestSeasonCoverageRate !== null && (
        <> ({(coverage.latestSeasonCoverageRate * 100).toFixed(0)}% in {coverage.latestSeasonName})</>
      )}{" "}
      — most events don't publish one, so this reflects a sample of the field, not the full one.
    </p>
  );
}
