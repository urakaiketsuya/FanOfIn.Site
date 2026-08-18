import { Link } from "react-router-dom";
import type { ChampionTrendDirection } from "@gatcg/shared";
import { useArchetypeData, useChampionTrendsData } from "../archetypes/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";

const TREND_LABEL: Record<ChampionTrendDirection, string> = {
  rising: "▲ Rising",
  falling: "▼ Falling",
  stable: "— Stable",
  new: "★ New",
  absent: "Absent",
  "insufficient-data": "",
};

const TREND_CLASS: Record<ChampionTrendDirection, string> = {
  rising: "text-ctp-green",
  falling: "text-ctp-red",
  stable: "text-ctp-subtext0",
  new: "text-ctp-blue",
  absent: "text-ctp-subtext0",
  "insufficient-data": "text-ctp-subtext0",
};

export default function ChampionsIndex() {
  const data = useArchetypeData();
  const trendsData = useChampionTrendsData();
  const championImages = useChampionCardImages(data?.archetypes.map((c) => c.signature) ?? []);
  const latestSeasonName = trendsData?.seasonOrder[trendsData.seasonOrder.length - 1];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Champions</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Each Champion's top decks, most-used cards, and most unusual builds.
      </p>

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
            <th className="py-1"></th>
            <th className="py-1">Champion</th>
            <th className="py-1">Decks</th>
            <th className="py-1">Events</th>
            <th className="py-1">Win rate</th>
            <th className="py-1" title={latestSeasonName ? `Change in share of ${latestSeasonName} vs. the prior season` : undefined}>
              Trend
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          {data?.archetypes.map((c) => {
            const card = championImages.get(c.signature);
            const trend = trendsData?.champions.find((t) => t.championName === c.signature);
            return (
              <tr key={c.signature}>
                <td className="w-12 py-1.5">
                  <CardHoverPreview image={card?.editions[0]?.image} alt={c.signature}>
                    <Link to={`/champions/${encodeURIComponent(c.signature)}`}>
                      {card?.editions[0] ? (
                        <CardImage
                          image={card.editions[0].image}
                          alt={c.signature}
                          className="h-14 w-10 rounded object-cover object-top"
                        />
                      ) : (
                        <div className="h-14 w-10 rounded bg-ctp-surface0" />
                      )}
                    </Link>
                  </CardHoverPreview>
                </td>
                <td className="py-1.5">
                  <Link to={`/champions/${encodeURIComponent(c.signature)}`} className="text-ctp-text hover:text-ctp-blue">
                    {c.signature}
                  </Link>
                  <span className="ml-2 text-xs text-ctp-subtext0">
                    {c.classes.join("/")} · {c.elements.join("/")}
                  </span>
                </td>
                <td className="py-1.5 text-ctp-subtext1">{c.deckCount}</td>
                <td className="py-1.5 text-ctp-subtext1">{c.eventCount}</td>
                <td className="py-1.5 text-ctp-subtext1">{(c.avgWinRate * 100).toFixed(0)}%</td>
                <td className={`py-1.5 text-xs ${trend ? TREND_CLASS[trend.trend] : "text-ctp-subtext0"}`}>
                  {trend ? TREND_LABEL[trend.trend] : ""}
                  {trend?.trendDeltaPct !== null && trend?.trendDeltaPct !== undefined && (
                    <span className="ml-1 text-ctp-subtext0">
                      ({trend.trendDeltaPct > 0 ? "+" : ""}
                      {trend.trendDeltaPct.toFixed(1)}pp)
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
