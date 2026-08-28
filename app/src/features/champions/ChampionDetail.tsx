import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useArchetypeData, useArchetypeTaxonomyData, useChampionTrendsData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useHipsterData } from "../players/data";
import { useOmnidexPlayers, useEventNameById } from "../tournaments/data";
import { useCardsByNames } from "../events/useCardsByNames";
import TopCardsSections from "../../components/TopCardsSections";
import TopDecksList from "../../components/TopDecksList";
import UniqueDeckRow from "./UniqueDeckRow";
import CardGrid from "../cards/CardGrid";
import { useChampionBonusCards } from "./useChampionBonusCards";
import { useChampionRegionalBreakdown } from "../regions/useChampionRegionalBreakdown";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import ChampionSeasonChart from "./ChampionSeasonChart";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import { cutoutsForChampion } from "../products/characterArt";

const MAX_TOP_DECKS_SHOWN = 5;
const MAX_UNIQUE_DECKS_SHOWN = 3;

type SpiritFilter = { kind: "all" } | { kind: "element"; element: string } | { kind: "spirit"; spiritName: string };
type ChampionTab = "season" | "cards" | "builds" | "decks" | "bonus" | "regions";

const TABS: { key: ChampionTab; label: string }[] = [
  { key: "season", label: "By Season" },
  { key: "cards", label: "Most Used Cards" },
  { key: "builds", label: "Builds" },
  { key: "decks", label: "Decks" },
  { key: "bonus", label: "Bonus Cards" },
  { key: "regions", label: "Regions" },
];
const TAB_KEYS = TABS.map((t) => t.key);

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default function ChampionDetail() {
  const { name = "" } = useParams<{ name: string }>();
  const championName = decodeURIComponent(name);
  useDocumentTitle(championName, `${championName} deck builds, win rates, and season trends in Grand Archive TCG.`);

  const archetypeData = useArchetypeData();
  const taxonomyData = useArchetypeTaxonomyData();
  const trendsData = useChampionTrendsData();
  const popularityIndexData = useDeckPopularityIndexData();
  const eventNameById = useEventNameById();
  const hipsterData = useHipsterData();
  const playersData = useOmnidexPlayers();

  // Named Spirits (e.g. "Kaze, Spirit of Wind") are tracked as their own Champion-like entry in a
  // separate list, not merged into `archetypes` — fall back to it so this page works for either.
  const champion =
    archetypeData?.archetypes.find((a) => a.signature === championName) ??
    archetypeData?.namedSpirits?.find((s) => s.signature === championName);
  const trend = trendsData?.champions.find((t) => t.championName === championName);
  const seasonHistory = useMemo(() => {
    if (!trend) return [];
    const firstSeen = trend.seasons.findIndex((s) => s.deckCount > 0);
    return firstSeen === -1 ? [] : trend.seasons.slice(firstSeen);
  }, [trend]);

  const [spiritFilter, setSpiritFilter] = useState<SpiritFilter>({ kind: "all" });
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "season");
  // Only reset when navigating from one Champion's page to a different one (same component
  // instance reused by the router) — not on initial mount, which would otherwise clobber a
  // `?tab=` deep link.
  const prevChampionNameRef = useRef(championName);
  useEffect(() => {
    if (prevChampionNameRef.current !== championName) {
      setSpiritFilter({ kind: "all" });
      setTab("season");
      prevChampionNameRef.current = championName;
    }
  }, [championName, setTab]);

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

  const builds = useMemo(() => {
    if (!taxonomyData) return [];
    return taxonomyData.clusters
      .filter((c) => c.championName === championName)
      .sort((a, b) => b.playerCount - a.playerCount);
  }, [taxonomyData, championName]);

  const topDecks = useMemo(() => {
    if (!popularityIndexData) return [];
    return popularityIndexData.entries
      .filter((e) => e.championName === championName)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, MAX_TOP_DECKS_SHOWN)
      .map((e) => ({
        deckId: e.deckId,
        player: e.player,
        eventId: e.eventId,
        eventName: eventNameById.get(e.eventId) ?? `Event #${e.eventId}`,
        placement: e.placement,
        wins: e.wins,
        losses: e.losses,
        ties: e.ties,
        underplaced: e.underplaced,
      }));
  }, [popularityIndexData, championName, eventNameById]);

  const cutouts = useMemo(() => cutoutsForChampion(championName), [championName]);
  const cutoutCards = useCardsByNames(useMemo(() => cutouts.map((c) => c.cardName), [cutouts]));
  const bonusCards = useChampionBonusCards(champion ? championName : null);
  const regionalBreakdown = useChampionRegionalBreakdown(champion ? championName : null);

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
      {champion && (
        <>
          <PageHeader
            title={champion.signature}
            eyebrow={<Link to="/champions" className="hover:underline">&larr; All Champions</Link>}
            description={<>{champion.classes.join("/")} · {champion.elements.join("/")} · <strong className="font-semibold text-ctp-text">{champion.deckCount.toLocaleString()}</strong> decks across {champion.eventCount.toLocaleString()} events · <strong className="font-semibold text-ctp-text">{(champion.avgWinRate * 100).toFixed(0)}%</strong> average win rate</>}
          />

          {cutouts.length > 0 && (
            <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-ctp-surface0 bg-gradient-to-b from-ctp-mantle to-ctp-crust p-3">
              {cutouts.map((c) => {
                const slug = cutoutCards.get(c.cardName)?.slug;
                const img = <img src={c.image} alt={c.cardName} className="h-40 w-auto object-contain shadow-[0_14px_18px_-8px_rgba(0,0,0,0.5)] transition-transform hover:scale-105" />;
                return slug ? (
                  <Link key={c.cardName} to={`/cards/${slug}`} title={c.cardName} className="shrink-0">
                    {img}
                  </Link>
                ) : (
                  <div key={c.cardName} title={c.cardName} className="shrink-0">
                    {img}
                  </div>
                );
              })}
            </div>
          )}

          <Tabs tabs={TABS} active={tab} onChange={setTab} label={`${champion.signature} details`} />

          {tab === "season" && seasonHistory.length > 0 && (
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
              <ChampionSeasonChart seasons={seasonHistory} />
              <div className="overflow-x-auto">
                <table className="w-max min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                      <th className="py-1 pr-6">Season</th>
                      <th className="py-1 pr-6">Decks</th>
                      <th className="py-1 pr-6">Wins</th>
                      <th className="py-1 pr-6">Top cut</th>
                      <th className="py-1 pr-6">Win rate</th>
                      <th className="py-1 pr-6">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                    {seasonHistory.map((s) => (
                      <tr key={s.seasonId}>
                        <td className="py-1 pr-6 text-ctp-text">{s.seasonName}</td>
                        <td className="py-1 pr-6 text-ctp-subtext1">{s.deckCount}</td>
                        <td className="py-1 pr-6 text-ctp-subtext1">{s.winCount}</td>
                        <td className="py-1 pr-6 text-ctp-subtext1">{s.topCutCount}</td>
                        <td className="py-1 pr-6 text-ctp-subtext1">{s.deckCount > 0 ? `${(s.avgWinRate * 100).toFixed(0)}%` : "—"}</td>
                        <td className="py-1 pr-6 text-ctp-subtext1">{(s.shareOfSeason * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "cards" && champion.topCards.main.length > 0 && (
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

          {tab === "builds" && builds.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Builds</h2>
                <Link to="/archetypes" className="text-xs text-ctp-blue hover:underline">
                  All archetypes &rarr;
                </Link>
              </div>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Named builds within {championName}, derived from real decklists.
              </p>
              <div className="overflow-x-auto">
                <table className="w-max min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                      <th className="py-1 pr-6">Build</th>
                      <th className="py-1 pr-6">Players</th>
                      <th className="py-1 pr-6">Win rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                    {builds.map((b) => (
                      <tr key={b.id}>
                        <td className="py-1.5 pr-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <ArchetypeElementIcon name={b.name} />
                            <Link to={`/archetypes/${b.id}`} className="text-ctp-text hover:text-ctp-blue">
                              {b.name}
                            </Link>
                          </span>
                        </td>
                        <td className="py-1.5 pr-6 text-ctp-subtext1">{b.playerCount}</td>
                        <td className="py-1.5 pr-6 text-ctp-subtext1">{(b.avgWinRate * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "decks" && topDecks.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Top decks</h2>
                <Link
                  to={`/decks?view=sightings&champion=${encodeURIComponent(championName)}`}
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

          {tab === "decks" && uniqueDecks.length > 0 && (
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

          {tab === "bonus" && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Bonus cards</h2>
              <p className="mt-1 text-xs text-ctp-subtext0">
                Cards with an effect that specifically triggers or improves when your Champion is {championName}.
              </p>
              {bonusCards.length === 0 ? (
                <p className="mt-4 text-sm text-ctp-subtext1">No published cards have a bonus tied to {championName} yet.</p>
              ) : (
                <CardGrid cards={bonusCards} />
              )}
            </div>
          )}

          {tab === "regions" && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Regional popularity</h2>
                <Link to="/regions?tab=champions" className="text-xs text-ctp-blue hover:underline">
                  Full Regions page &rarr;
                </Link>
              </div>
              <p className="mt-1 text-xs text-ctp-subtext0">Where {championName} gets played the most.</p>
              {regionalBreakdown.loading && <p className="mt-4 text-ctp-subtext1">Loading…</p>}
              {!regionalBreakdown.loading && regionalBreakdown.rows.length === 0 && (
                <p className="mt-4 text-sm text-ctp-subtext1">Not enough regional data for {championName} yet.</p>
              )}
              {regionalBreakdown.rows.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                        <th className="py-1 pr-6">Country</th>
                        <th className="py-1 pr-6">Decks</th>
                        <th className="py-1">Win rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                      {regionalBreakdown.rows.map((r) => (
                        <tr key={r.code}>
                          <td className="py-1.5 pr-6 whitespace-nowrap">
                            <Link
                              to={`/regions?group=country&region=${r.code}&tab=champions`}
                              className="text-ctp-text hover:text-ctp-blue"
                            >
                              {r.label}
                            </Link>
                          </td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCount}</td>
                          <td className="py-1.5 text-ctp-subtext1">{(r.avgWinRate * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
