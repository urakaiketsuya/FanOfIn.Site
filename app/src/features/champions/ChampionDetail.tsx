import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useArchetypeData, useChampionTrendsData } from "../archetypes/data";
import { useDeckSightingsData } from "../topdecks/data";
import { useHipsterData } from "../players/data";
import { useOmnidexPlayers } from "../tournaments/data";
import { useCardsByNames } from "../events/useCardsByNames";
import TopCardsSections from "../../components/TopCardsSections";
import TopDecksList from "../../components/TopDecksList";
import UniqueDeckRow from "./UniqueDeckRow";

const MAX_TOP_DECKS_SHOWN = 5;
const MAX_UNIQUE_DECKS_SHOWN = 3;

type SpiritFilter = { kind: "all" } | { kind: "element"; element: string } | { kind: "spirit"; spiritName: string };

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default function ChampionDetail() {
  const { name = "" } = useParams<{ name: string }>();
  const championName = decodeURIComponent(name);

  const archetypeData = useArchetypeData();
  const trendsData = useChampionTrendsData();
  const sightingsData = useDeckSightingsData();
  const hipsterData = useHipsterData();
  const playersData = useOmnidexPlayers();

  const champion = archetypeData?.archetypes.find((a) => a.signature === championName);
  const trend = trendsData?.champions.find((t) => t.championName === championName);
  const seasonHistory = useMemo(() => {
    if (!trend) return [];
    const firstSeen = trend.seasons.findIndex((s) => s.deckCount > 0);
    return firstSeen === -1 ? [] : trend.seasons.slice(firstSeen);
  }, [trend]);

  const [spiritFilter, setSpiritFilter] = useState<SpiritFilter>({ kind: "all" });
  useEffect(() => {
    setSpiritFilter({ kind: "all" });
  }, [championName]);

  const displayedTopCards = useMemo(() => {
    if (!champion) return null;
    if (spiritFilter.kind === "element") {
      return champion.elementBreakdown.find((e) => e.element === spiritFilter.element)?.topCards ?? champion.topCards;
    }
    if (spiritFilter.kind === "spirit") {
      return champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.topCards ?? champion.topCards;
    }
    return champion.topCards;
  }, [champion, spiritFilter]);

  const spiritsForSelectedElement = useMemo(() => {
    if (!champion) return [];
    const element = spiritFilter.kind === "element" ? spiritFilter.element : spiritFilter.kind === "spirit" ? champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement : undefined;
    if (!element) return [];
    return champion.spirits.filter((s) => s.spiritElement === element);
  }, [champion, spiritFilter]);

  const topDecks = useMemo(() => {
    if (!sightingsData) return [];
    return sightingsData.sightings
      .filter((s) => s.championName === championName)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, MAX_TOP_DECKS_SHOWN);
  }, [sightingsData, championName]);

  const uniqueDecks = useMemo(() => {
    if (!hipsterData) return [];
    return hipsterData.deckScores
      .filter((d) => d.championName === championName)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_UNIQUE_DECKS_SHOWN);
  }, [hipsterData, championName]);

  const allTopCardNames = useMemo(() => {
    if (!displayedTopCards) return [];
    return [...displayedTopCards.main, ...displayedTopCards.material, ...displayedTopCards.sideboard].map((c) => c.name);
  }, [displayedTopCards]);
  const cardImages = useCardsByNames(allTopCardNames);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  if (archetypeData && !champion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-red">Champion "{championName}" hasn't cleared the sample-size threshold (or doesn't exist).</p>
        <Link to="/champions" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; All champions
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/champions" className="text-sm text-ctp-blue hover:underline">
        &larr; All champions
      </Link>

      {champion && (
        <>
          <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{champion.signature}</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">
            {champion.classes.join("/")} · {champion.elements.join("/")} · {champion.deckCount} decks across{" "}
            {champion.eventCount} events · {(champion.avgWinRate * 100).toFixed(0)}% avg win rate
          </p>

          {seasonHistory.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">By season</h2>
                {trend && trend.trend !== "insufficient-data" && (
                  <span
                    className={`text-xs ${
                      trend.trend === "rising"
                        ? "text-ctp-green"
                        : trend.trend === "falling"
                          ? "text-ctp-red"
                          : trend.trend === "new"
                            ? "text-ctp-blue"
                            : "text-ctp-subtext0"
                    }`}
                  >
                    {trend.trend === "rising" && "▲ Rising"}
                    {trend.trend === "falling" && "▼ Falling"}
                    {trend.trend === "stable" && "— Stable"}
                    {trend.trend === "new" && "★ New this season"}
                    {trend.trend === "absent" && "Absent last season"}
                    {trend.trendDeltaPct !== null && (
                      <span className="ml-1 text-ctp-subtext0">
                        ({trend.trendDeltaPct > 0 ? "+" : ""}
                        {trend.trendDeltaPct.toFixed(1)}pp share)
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Share of season = this Champion's weighted placement score as a fraction of every Champion's
                combined score that season — comparable across seasons regardless of how many events were played.
              </p>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                    <th className="py-1">Season</th>
                    <th className="py-1">Decks</th>
                    <th className="py-1">Wins</th>
                    <th className="py-1">Top cut</th>
                    <th className="py-1">Win rate</th>
                    <th className="py-1">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ctp-surface0">
                  {seasonHistory.map((s) => (
                    <tr key={s.seasonId}>
                      <td className="py-1 text-ctp-text">{s.seasonName}</td>
                      <td className="py-1 text-ctp-subtext1">{s.deckCount}</td>
                      <td className="py-1 text-ctp-subtext1">{s.winCount}</td>
                      <td className="py-1 text-ctp-subtext1">{s.topCutCount}</td>
                      <td className="py-1 text-ctp-subtext1">{s.deckCount > 0 ? `${(s.avgWinRate * 100).toFixed(0)}%` : "—"}</td>
                      <td className="py-1 text-ctp-subtext1">{(s.shareOfSeason * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {champion.topCards.main.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Most used cards</h2>
              </div>

              {champion.elementBreakdown.length > 0 && (
                <>
                  <p className="mt-2 text-xs text-ctp-subtext0">
                    {championName}'s Spirit pick can drastically change card choices — filter by Spirit element to
                    see it.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setSpiritFilter({ kind: "all" })}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        spiritFilter.kind === "all"
                          ? "border-ctp-blue text-ctp-blue"
                          : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                      }`}
                    >
                      All ({champion.deckCount})
                    </button>
                    {champion.elementBreakdown.map((e) => (
                      <button
                        key={e.element}
                        type="button"
                        onClick={() => setSpiritFilter({ kind: "element", element: e.element })}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          (spiritFilter.kind === "element" && spiritFilter.element === e.element) ||
                          (spiritFilter.kind === "spirit" &&
                            champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement === e.element)
                            ? "border-ctp-blue text-ctp-blue"
                            : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                        }`}
                      >
                        {titleCase(e.element)} ({e.deckCount})
                      </button>
                    ))}
                  </div>

                  {spiritsForSelectedElement.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-ctp-subtext0">Spirit:</span>
                      {spiritsForSelectedElement.map((s) => (
                        <button
                          key={s.spiritName}
                          type="button"
                          onClick={() => setSpiritFilter({ kind: "spirit", spiritName: s.spiritName })}
                          className={`rounded-md border px-1.5 py-0.5 ${
                            spiritFilter.kind === "spirit" && spiritFilter.spiritName === s.spiritName
                              ? "border-ctp-blue text-ctp-blue"
                              : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                          }`}
                        >
                          {s.spiritName} ({s.deckCount})
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {displayedTopCards && (
                <div className="mt-3">
                  <TopCardsSections topCards={displayedTopCards} cardImages={cardImages} />
                </div>
              )}
            </div>
          )}

          {topDecks.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Top decks</h2>
                <Link
                  to={`/top-decks?champion=${encodeURIComponent(championName)}`}
                  className="text-xs text-ctp-blue hover:underline"
                >
                  View all &rarr;
                </Link>
              </div>
              <div className="mt-2">
                <TopDecksList decks={topDecks} playerName={playerName} />
              </div>
            </div>
          )}

          {uniqueDecks.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Most unique decks</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Builds with the most uncommon card choices relative to other {championName} decks at the time they
                were played.
              </p>
              <div className="mt-2 space-y-2">
                {uniqueDecks.map((d) => (
                  <UniqueDeckRow key={`${d.eventId}:${d.player}`} score={d} playerName={playerName(d.player)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
