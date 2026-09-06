import { Link } from "react-router-dom";
import type { Card, CardImpactEntry } from "@gatcg/shared";
import CardHoverPreview from "./CardHoverPreview";
import ElementIcon from "./ElementIcon";

/** Shared row layout for every Card Impact surface — general, matchup-scoped ("my cards" and "opponent cards"), and Champion+Element-scoped. */
export default function CardImpactTable({
  cards,
  cardImages,
  withLabel,
  withoutLabel,
}: {
  cards: CardImpactEntry[];
  cardImages: Map<string, Card>;
  withLabel: string;
  withoutLabel: string;
}) {
  return (
    <div data-component="CardImpactTable" className="mt-3 overflow-x-auto">
      <table className="w-max min-w-full text-sm">
        <thead>
          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
            <th className="py-1 pr-6">Card</th>
            <th className="py-1 pr-6">Role</th>
            <th className="py-1 pr-6">{withLabel}</th>
            <th className="py-1 pr-6">{withoutLabel}</th>
            <th className="py-1 pr-6">Lift</th>
            <th className="py-1">Sample</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
          {cards.map((c) => {
            const card = cardImages.get(c.cardName);
            return (
              <tr key={c.cardName}>
                <td className="py-1.5 pr-6 whitespace-nowrap">
                  <CardHoverPreview image={card?.editions[0]?.image} alt={c.cardName}>
                    <span className="inline-flex items-center gap-1.5">
                      {card && card.element !== "NORM" && <ElementIcon element={card.element} size={14} />}
                      {card ? (
                        <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                          {c.cardName}
                        </Link>
                      ) : (
                        <span className="text-ctp-text">{c.cardName}</span>
                      )}
                    </span>
                  </CardHoverPreview>
                </td>
                <td className="py-1.5 pr-6 text-ctp-subtext1 capitalize">{c.role}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{(c.avgWinRateWith * 100).toFixed(0)}%</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{(c.avgWinRateWithout * 100).toFixed(0)}%</td>
                <td className={`py-1.5 pr-6 font-semibold ${c.adjustedLift >= 0 ? "text-ctp-green" : "text-ctp-red"}`}>
                  {c.adjustedLift >= 0 ? "+" : ""}
                  {(c.adjustedLift * 100).toFixed(1)}pp
                </td>
                <td className="py-1.5 text-xs text-ctp-subtext0">
                  {c.deckCountWith} vs {c.deckCountWithout}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
