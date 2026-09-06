import { Link } from "react-router-dom";
import CardHoverPreview from "../../components/CardHoverPreview";
import CardImage from "../../components/CardImage";
import CostIcon from "../../components/CostIcon";
import ElementIcon from "../../components/ElementIcon";
import { formatUsd } from "../../lib/format";
import { useCardComparison } from "./useCardComparison";

/** Index of the best value in `values`, or -1 if there's nothing to compare (fewer than 2 real values, or a tie). `direction: "min"` is for stats where lower is better (price). */
function bestIndex(values: (number | null)[], direction: "max" | "min" = "max"): number {
  const real = values.filter((v): v is number => v !== null);
  if (real.length < 2) return -1;
  const target = direction === "max" ? Math.max(...real) : Math.min(...real);
  if (real.filter((v) => v === target).length > 1) return -1; // tied — nothing to highlight
  return values.indexOf(target);
}

/**
 * Side-by-side stats for an arbitrary set of individual cards — usage, win rate, price, trend —
 * the per-card sibling of `ComparisonGrid`'s deck-vs-deck table, sourced from the same published
 * `cards.json` stats CardStatsIndex already uses. Reused on the Compare page's "Cards" mode and as
 * a compact quick-compare widget on card detail pages.
 */
export default function CardComparisonTable({ names, onRemove }: { names: string[]; onRemove?: (name: string) => void }) {
  const rows = useCardComparison(names);
  if (rows.length === 0) return null;

  const bestRawIndex = bestIndex(rows.map((r) => r.stat?.avgWinRate ?? null));
  const bestAdjustedIndex = bestIndex(rows.map((r) => r.stat?.adjustedWinRate ?? null));
  const bestPriceIndex = bestIndex(
    rows.map((r) => r.stat?.marketPrice ?? null),
    "min",
  );

  return (
    <div data-component="CardComparisonTable" className="overflow-x-auto">
      <table className="w-max min-w-full text-sm">
        <thead>
          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
            <th className="sticky left-0 z-10 bg-ctp-base py-1 pr-6">Card</th>
            {rows.map((r) => (
              <th key={r.name} className="min-w-[8rem] py-1 pr-6 font-medium normal-case text-ctp-text">
                <div className="flex items-center gap-1.5">
                  <CardHoverPreview image={r.card?.editions[0]?.image} alt={r.name}>
                    {r.card?.slug ? (
                      <Link to={`/cards/${r.card.slug}`} className="flex items-center gap-1.5 text-ctp-text hover:text-ctp-blue">
                        {r.card.editions[0] && (
                          <CardImage image={r.card.editions[0].image} alt={r.name} className="h-8 w-6 shrink-0 rounded object-cover object-top" />
                        )}
                        {r.name}
                      </Link>
                    ) : (
                      <span>{r.name}</span>
                    )}
                  </CardHoverPreview>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(r.name)}
                      aria-label={`Remove ${r.name}`}
                      className="shrink-0 text-ctp-subtext0 hover:text-ctp-red"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Class</td>
            {rows.map((r) => (
              <td key={r.name} className="py-1.5 pr-6 text-ctp-subtext1">
                {r.card && r.card.classes.length > 0 ? r.card.classes.join("/") : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Element</td>
            {rows.map((r) => (
              <td key={r.name} className="py-1.5 pr-6 text-ctp-subtext1">
                {r.card ? (
                  <span className="flex items-center gap-1">
                    {r.card.element !== "NORM" && <ElementIcon element={r.card.element} size={14} />}
                    {r.card.elements.length > 0 ? r.card.elements.join("/") : r.card.element}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Cost</td>
            {rows.map((r) => (
              <td key={r.name} className="py-1.5 pr-6 text-ctp-subtext1">
                {r.card && r.card.cost.type !== "none" && r.card.cost.value !== null ? (
                  <span className="flex items-center gap-1">
                    <CostIcon kind={r.card.cost.type} size={12} />
                    {r.card.cost.value}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Decks</td>
            {rows.map((r) => (
              <td key={r.name} className="py-1.5 pr-6 text-ctp-subtext1">
                {r.stat ? r.stat.deckCount : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Events</td>
            {rows.map((r) => (
              <td key={r.name} className="py-1.5 pr-6 text-ctp-subtext1">
                {r.stat ? r.stat.eventCount : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Win rate</td>
            {rows.map((r, i) => (
              <td key={r.name} className={`py-1.5 pr-6 font-semibold ${i === bestRawIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>
                {r.stat ? `${(r.stat.avgWinRate * 100).toFixed(0)}%` : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 pl-3 text-xs text-ctp-subtext0">Adjusted</td>
            {rows.map((r, i) => (
              <td key={r.name} className={`py-1.5 pr-6 text-xs ${i === bestAdjustedIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>
                {r.stat ? `${(r.stat.adjustedWinRate * 100).toFixed(0)}%` : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Price</td>
            {rows.map((r, i) => (
              <td key={r.name} className={`py-1.5 pr-6 ${i === bestPriceIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>
                {r.stat?.marketPrice != null ? formatUsd(r.stat.marketPrice) : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-ctp-base py-1.5 pr-6 text-xs font-semibold uppercase text-ctp-subtext0">Trend</td>
            {rows.map((r) => {
              if (!r.stat) {
                return (
                  <td key={r.name} className="py-1.5 pr-6 text-ctp-subtext1">
                    —
                  </td>
                );
              }
              const delta = r.stat.recentDeckCount - r.stat.priorDeckCount;
              return (
                <td
                  key={r.name}
                  className={`py-1.5 pr-6 text-xs font-semibold ${delta > 0 ? "text-ctp-green" : delta < 0 ? "text-ctp-red" : "text-ctp-subtext1"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta} decks
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
