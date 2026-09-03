import type { DeckComposition } from "../lib/deckIdentity";
import type { BarChartBar } from "./BarChart";
import BarChart from "./BarChart";
import RankedCompositionChart from "./RankedCompositionChart";
import { buildChartSegments } from "./DonutChart";

/** Memory/Reserve cost curves + Type/Element/Subtype breakdowns — the chart block shared by the
 * Guided Deck Builder's Stats tab and the account/public deck Analysis tab. Purely presentational;
 * callers already have `composition`/`memoryCurve`/`reserveCurve` computed via `computeDeckComposition`/
 * `computeMemoryCostCurve`/`computeReserveCostCurve` (`lib/deckIdentity.ts`). */
export default function CompositionChartGrid({
  composition,
  memoryCurve,
  reserveCurve,
}: {
  composition: DeckComposition;
  memoryCurve: BarChartBar[];
  reserveCurve: BarChartBar[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BarChart title="Memory Cost Curve" bars={memoryCurve} />
      <BarChart title="Reserve Cost Curve" bars={reserveCurve} />
      <RankedCompositionChart title="Card Types" segments={buildChartSegments(composition.types)} />
      <RankedCompositionChart title="Elements" segments={buildChartSegments(composition.elements)} />
      <RankedCompositionChart title="Card Subtypes" segments={buildChartSegments(composition.subtypes)} />
    </div>
  );
}
