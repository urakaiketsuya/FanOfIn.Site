import DisclosureChevron from "../../components/DisclosureChevron";
import { Link } from "react-router-dom";
import type { CardImpactEntry, CardInclusionEntry } from "@gatcg/shared";
import type { NewReleaseCombo } from "../deckbuilder/newReleaseCards";
import { CardStatRows, type VisualFieldVisibility } from "../../components/VisualCardTile";
import type { PriceTrendEntry } from "../pricing/usePriceTrendByName";
import type { SimulatorCardEvidence } from "../deckbuilder/useSimulatorSuggestedBuild";

export interface LinkedCardStatSources {
  priceByName: Map<string, number>;
  priceTrendByName: Map<string, PriceTrendEntry>;
  simulatorEvidenceByName: Map<string, SimulatorCardEvidence>;
  communityInclusionByName: Map<string, CardInclusionEntry> | undefined;
  cardImpactByName: Map<string, { entry: CardImpactEntry; clusterName: string }> | undefined;
  fields: VisualFieldVisibility;
}

function ExperimentalBadge() {
  return (
    <span className="shrink-0 rounded-full border border-ctp-yellow px-1.5 text-xs text-ctp-yellow" title="Broader trigger, not yet checked against the full card corpus">
      experimental
    </span>
  );
}

function CardImpactRow({ entry, clusterName }: { entry: CardImpactEntry; clusterName: string }) {
  return (
    <div className="mt-0.5 flex min-w-0 flex-wrap items-center justify-between gap-2 text-ctp-subtext1">
      <span className="shrink-0">Win rate</span>
      <span className="text-ctp-text" title={`${(entry.avgWinRateWith * 100).toFixed(0)}% across ${entry.deckCountWith} decks in ${clusterName}`}>
        {(entry.avgWinRateWith * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function LinkedCardRow({ combo, stats }: { combo: NewReleaseCombo; stats: LinkedCardStatSources }) {
  const impact = stats.cardImpactByName?.get(combo.with.name);
  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Linked card</span>
        <Link to={`/cards/${combo.with.slug}`} title={combo.with.name} className="inline-flex min-h-control items-center rounded break-words font-medium text-ctp-mauve hover:underline focus-visible:outline-2">{combo.with.name}</Link>
      </div>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Connection</span>
        <span className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="text-ctp-text" title={combo.via}>{combo.via}</span>
          {combo.tier === "experimental" && <ExperimentalBadge />}
        </span>
      </div>
      {impact && <CardImpactRow entry={impact.entry} clusterName={impact.clusterName} />}
      <CardStatRows card={combo.with} unitPrice={stats.priceByName.get(combo.with.name)} priceTrend={stats.priceTrendByName.get(combo.with.name)} simulatorEvidence={stats.simulatorEvidenceByName.get(combo.with.name)} communityEntry={stats.communityInclusionByName?.get(combo.with.name)} fields={stats.fields} />
    </>
  );
}

export function NewReleaseComboFooter({ combos, stats }: { combos: NewReleaseCombo[]; stats: LinkedCardStatSources }) {
  if (combos.length === 0) return null;
  return (
    <details className="group/connections mt-2 border-t border-ctp-surface1 text-sm">
      <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-2 rounded text-ctp-blue focus-visible:outline-2">
        {combos.length} {combos.length === 1 ? "connection" : "connections"}
        <DisclosureChevron className="shrink-0 group-open/connections:rotate-180" />
      </summary>
      <p className="mb-3 text-ctp-subtext1">Connections to commonly played cards, not a tested deck recommendation.</p>
      {combos.map((combo) => <div key={`${combo.with.uuid}-${combo.via}`} className="mt-3 border-t border-ctp-surface0 pt-2"><LinkedCardRow combo={combo} stats={stats} /></div>)}
    </details>
  );
}
