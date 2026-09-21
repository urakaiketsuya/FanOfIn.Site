import { useState } from "react";
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
    <span className="shrink-0 rounded-full border border-ctp-yellow px-1.5 text-[10px] text-ctp-yellow" title="Broader trigger, not yet checked against the full card corpus">
      experimental
    </span>
  );
}

function CardImpactRow({ entry, clusterName }: { entry: CardImpactEntry; clusterName: string }) {
  return (
    <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
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
      <div className="flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Linked card</span>
        <Link to={`/cards/${combo.with.slug}`} title={combo.with.name} className="truncate text-right font-medium text-ctp-mauve hover:underline">{combo.with.name}</Link>
      </div>
      <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Connection</span>
        <span className="flex min-w-0 items-center justify-end gap-1">
          <span className="truncate text-right text-ctp-text" title={combo.via}>{combo.via}</span>
          {combo.tier === "experimental" && <ExperimentalBadge />}
        </span>
      </div>
      {impact && <CardImpactRow entry={impact.entry} clusterName={impact.clusterName} />}
      <CardStatRows card={combo.with} unitPrice={stats.priceByName.get(combo.with.name)} priceTrend={stats.priceTrendByName.get(combo.with.name)} simulatorEvidence={stats.simulatorEvidenceByName.get(combo.with.name)} communityEntry={stats.communityInclusionByName?.get(combo.with.name)} fields={stats.fields} />
    </>
  );
}

export function NewReleaseComboFooter({ combos, stats }: { combos: NewReleaseCombo[]; stats: LinkedCardStatSources }) {
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = combos;
  const firstImpact = stats.cardImpactByName?.get(first.with.name);
  return (
    <div className="mt-1 border-t border-ctp-surface0 pt-1 text-[10px]">
      <div className="flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Linked card</span>
        <span className="flex min-w-0 items-baseline justify-end gap-1.5">
          <Link to={`/cards/${first.with.slug}`} title={first.with.name} className="truncate text-right font-medium text-ctp-mauve hover:underline">{first.with.name}</Link>
          {rest.length > 0 && <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="shrink-0 text-ctp-subtext0 underline decoration-dotted hover:text-ctp-text">{expanded ? "show less" : `+${rest.length} more`}</button>}
        </span>
      </div>
      <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-ctp-subtext1">
        <span className="shrink-0">Connection</span>
        <span className="flex min-w-0 items-center justify-end gap-1"><span className="truncate text-right text-ctp-text" title={first.via}>{first.via}</span>{first.tier === "experimental" && <ExperimentalBadge />}</span>
      </div>
      {firstImpact && <CardImpactRow entry={firstImpact.entry} clusterName={firstImpact.clusterName} />}
      <CardStatRows card={first.with} unitPrice={stats.priceByName.get(first.with.name)} priceTrend={stats.priceTrendByName.get(first.with.name)} simulatorEvidence={stats.simulatorEvidenceByName.get(first.with.name)} communityEntry={stats.communityInclusionByName?.get(first.with.name)} fields={stats.fields} />
      {expanded && rest.map((combo) => <div key={`${combo.with.uuid}-${combo.via}`} className="mt-1 border-t border-ctp-surface0 pt-1"><LinkedCardRow combo={combo} stats={stats} /></div>)}
    </div>
  );
}
