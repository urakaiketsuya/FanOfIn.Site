import { useMemo, useState } from "react";
import type { Card, CompositionWinRateData } from "@gatcg/shared";
import CompositionChartGrid from "../../../components/CompositionChartGrid";
import { computeDeckComposition, computeMemoryCostCurve, computeReserveCostCurve } from "../../../lib/deckIdentity";
import { computeCompositionGaps } from "../engine/builderSelectors";
import Panel from "../../../components/ui/Panel";
import Section from "../../../components/ui/Section";
import { InlineState } from "../../../components/ui/ContentState";

type NamedLine = { name: string; quantity: number };

/** Composition charts and Composition suggestions are the two Stats-tab sections nothing outside
 * the tab depends on — unlike Synergy readiness/Package balance/Meta gaps/New release cards, which
 * feed the Stats tab's badge count and (for decay) the recommendation engine in `DeckBuilderIndex.tsx`,
 * so those stay eagerly computed at the top of that file. These two instead take raw deck lines and
 * compute their own data, deferred via `Section`'s `onOpen` until the section is actually expanded
 * (both default closed) — mirrors the lazy-expand pattern already used for `PopularDeckRow.tsx`'s
 * `ExpandedDeckRow`. */

export function CompositionChartsSection({ lines, cardsByName }: { lines: NamedLine[]; cardsByName: Map<string, Card> }) {
  const [opened, setOpened] = useState(false);
  return (
    <Panel className="mt-4">
      <Section heading="dense" collapsible defaultOpen={false} onOpen={() => setOpened(true)} title="Composition">
        {opened && <CompositionChartsBody lines={lines} cardsByName={cardsByName} />}
      </Section>
    </Panel>
  );
}

function CompositionChartsBody({ lines, cardsByName }: { lines: NamedLine[]; cardsByName: Map<string, Card> }) {
  const composition = useMemo(() => computeDeckComposition(lines, cardsByName), [lines, cardsByName]);
  const memoryCurve = useMemo(() => computeMemoryCostCurve(lines, cardsByName), [lines, cardsByName]);
  const reserveCurve = useMemo(() => computeReserveCostCurve(lines, cardsByName), [lines, cardsByName]);
  return <div className="mt-3">
    <CompositionChartGrid composition={composition} memoryCurve={memoryCurve} reserveCurve={reserveCurve} />
  </div>;
}

export function CompositionSuggestionsSection({
  mainLines,
  cardsByName,
  compositionWinRateData,
}: {
  mainLines: NamedLine[];
  cardsByName: Map<string, Card>;
  compositionWinRateData: CompositionWinRateData | undefined;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <Panel className="mt-4">
      <Section
        heading="dense"
        collapsible
        defaultOpen={false}
        onOpen={() => setOpened(true)}
        title="Composition suggestions"
        description="Across every public main deck (not scoped to this Champion), win rate by what share of the deck each card type makes up — correlational, not causal, same as everywhere else on this site."
      >
        {opened && <CompositionSuggestionsBody mainLines={mainLines} cardsByName={cardsByName} compositionWinRateData={compositionWinRateData} />}
      </Section>
    </Panel>
  );
}

function CompositionSuggestionsBody({
  mainLines,
  cardsByName,
  compositionWinRateData,
}: {
  mainLines: NamedLine[];
  cardsByName: Map<string, Card>;
  compositionWinRateData: CompositionWinRateData | undefined;
}) {
  const compositionGaps = useMemo(
    () => computeCompositionGaps(mainLines, cardsByName, compositionWinRateData),
    [mainLines, cardsByName, compositionWinRateData],
  );
  // Unlike the original always-eager version, this can't hide the whole section when there's
  // nothing to show — visibility itself would require computing gaps eagerly, defeating the point.
  if (compositionGaps.length === 0) return <InlineState className="mt-2 text-sm">No composition suggestions for this build.</InlineState>;
  return <ul className="mt-2 space-y-1.5 text-sm">
    {compositionGaps.map((g) => (
      <li key={g.type} className="text-ctp-subtext1">
        <span className="font-semibold text-ctp-text capitalize">{g.type.toLowerCase()}</span> is {g.currentBucket} of your main deck
        ({(g.currentWinRate * 100).toFixed(0)}% win rate) — decks at {g.bestBucket} average{" "}
        <span className="font-semibold text-ctp-green">{(g.bestWinRate * 100).toFixed(0)}%</span>.
      </li>
    ))}
  </ul>;
}
