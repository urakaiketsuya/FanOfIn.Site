import { Link } from "react-router-dom";
import type { ArchetypeTaxonomyValidationData } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";

function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function MetricCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <Panel className="shadow-sm">
      <p className="text-2xl font-semibold tracking-tight text-ctp-blue">{value}</p>
      <p className="mt-1 text-sm font-medium text-ctp-text">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-ctp-subtext0">{detail}</p>
    </Panel>
  );
}

export default function ArchetypeValidationPanel({ data }: { data: ArchetypeTaxonomyValidationData | undefined }) {
  if (!data) return <InlineState className="mt-6 text-sm">Loading validation report…</InlineState>;

  const baseline = data.thresholds.find((result) => result.threshold === data.baselineThreshold) ?? data.thresholds[0];
  const passedChecks = baseline.goldSet.filter((check) => check.passed).length;
  const overlappingChecks = baseline.goldSet.filter((check) => check.passed && check.separation < 0.05).length;

  return (
    <section className="mt-5 space-y-5" aria-labelledby="validation-heading">
      <Panel tone={overlappingChecks > 0 ? "warning" : "info"} padding="lg">
        <p className={`text-xs font-semibold tracking-wide uppercase ${overlappingChecks > 0 ? "text-ctp-yellow" : "text-ctp-blue"}`}>Current conclusion</p>
        <h2 id="validation-heading" className="mt-1 text-xl font-semibold text-ctp-text">
          {overlappingChecks > 0
            ? `${overlappingChecks} known ${overlappingChecks === 1 ? "package spans" : "packages span"} neighboring shells`
            : "Known strategy packages cleanly separate the current shells"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ctp-subtext1">
          Decks are grouped by recurring main-deck and material-deck strategy cards, excluding Champion and Spirit cards.
          Element and plurality Champion are applied afterward as readable labels. A package below 5 percentage points of
          separation is flagged as overlapping: the current model may be splitting variants of one strategy rather than finding distinct archetypes.
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          value={pct(data.temporalHoldout.assignmentAgreementWithFull)}
          label="Stable over time"
          detail={`Deck assignments using the first ${data.temporalHoldout.historicalDeckCount.toLocaleString()} sightings agreed with the full dataset.`}
        />
        <MetricCard
          value={pct(baseline.classificationRate)}
          label="Decks classified"
          detail={`${baseline.clusterCount} named shells, including ${baseline.establishedCount} established archetypes.`}
        />
        <MetricCard
          value={`${passedChecks}/${baseline.goldSet.length}`}
          label="Strategy packages detected"
          detail={`${overlappingChecks} also appear at nearly the same rate in a neighboring shell and need taxonomy review.`}
        />
      </div>

      <div className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-semibold text-ctp-text">Threshold tradeoff</h3>
            <p className="mt-1 text-xs text-ctp-subtext0">Coverage falls as shells become stricter and more internally similar.</p>
          </div>
          <span className="rounded-full bg-ctp-blue/10 px-2.5 py-1 text-xs font-medium text-ctp-blue">
            Selected: {data.baselineThreshold.toFixed(2)}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                <th className="pb-2 pr-5">Threshold</th>
                <th className="pb-2 pr-5">Coverage</th>
                <th className="pb-2 pr-5">Shells</th>
                <th className="pb-2 pr-5">Cohesion</th>
                <th className="pb-2">Agreement with 0.45</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ctp-surface0">
              {data.thresholds.map((result) => {
                const selected = result.threshold === data.baselineThreshold;
                return (
                  <tr key={result.threshold} className={selected ? "bg-ctp-blue/5" : undefined}>
                    <td className="py-3 pr-5 font-medium text-ctp-text">
                      {result.threshold.toFixed(2)} {selected && <span className="ml-1 text-xs text-ctp-blue">Current</span>}
                    </td>
                    <td className="py-3 pr-5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ctp-surface1">
                          <div className="h-full rounded-full bg-ctp-green" style={{ width: pct(result.classificationRate, 2) }} />
                        </div>
                        <span className="tabular-nums text-ctp-subtext1">{pct(result.classificationRate)}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-5 tabular-nums text-ctp-subtext1">{result.clusterCount}</td>
                    <td className="py-3 pr-5 tabular-nums text-ctp-subtext1">{pct(result.medianMeanSimilarity)}</td>
                    <td className="py-3 tabular-nums text-ctp-subtext1">{pct(result.assignmentAgreementWithBaseline)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 shadow-sm">
        <h3 className="font-semibold text-ctp-text">Strategy-package checks</h3>
        <p className="mt-1 text-xs leading-relaxed text-ctp-subtext0">
          These card bundles represent recognizable engines or win conditions. They test the output without manually assigning individual decks.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {baseline.goldSet.map((check) => (
            <div key={check.label} className="flex items-start gap-3 rounded-lg border border-ctp-surface0 bg-ctp-mantle p-3">
              <span className={`mt-0.5 text-sm ${check.passed ? "text-ctp-green" : "text-ctp-red"}`} aria-hidden="true">
                {check.passed ? "✓" : "!"}
              </span>
              <div className="min-w-0">
                {check.clusterId && check.clusterName ? (
                  <Link to={`/archetypes/${check.clusterId}`} className="text-sm font-medium text-ctp-text hover:text-ctp-blue">
                    {check.label}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-ctp-text">{check.label}</p>
                )}
                <p className="mt-0.5 text-xs text-ctp-subtext0">{check.requiredCards.join(" · ")}</p>
                <p className="mt-1 text-xs text-ctp-subtext1">
                  {pct(check.packagePrevalence)} together in this shell
                  <span className="text-ctp-subtext0"> · nearest rival {pct(check.nearestRivalPrevalence)} · separation {pct(check.separation)}</span>
                </p>
                {check.passed && check.separation < 0.05 && (
                  <p className="mt-1 text-xs font-medium text-ctp-yellow">Overlaps a neighboring shell</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ctp-subtext0">
        “Cohesion” is the typical weighted card-list similarity inside a shell. “Agreement” is the share of deck assignments
        that still map to the same 0.45 shell after matching clusters by membership. Results are diagnostics, not proof that
        every deck has one objectively correct label.
      </p>
    </section>
  );
}
