import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { championNameToSlug, slugToChampionName } from "../../lib/championSlug";
import { useArchetypeData, useArchetypeTaxonomyData, useChampionTrendsData, useCompositionWinRateData, useSimilarityData } from "../archetypes/data";
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
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import Chip from "../../components/ui/Chip";
import { EmptyState, InlineState } from "../../components/ui/ContentState";

const MAX_TOP_DECKS_SHOWN = 5;
const MAX_UNIQUE_DECKS_SHOWN = 3;

type SpiritFilter = { kind: "all" } | { kind: "element"; element: string } | { kind: "spirit"; spiritName: string };
type ChampionTab = "season" | "cards" | "builds" | "decks" | "bonus" | "regions" | "similar";

const TABS: { key: ChampionTab; label: string }[] = [
  { key: "season", label: "By Season" },
  { key: "cards", label: "Most Used Cards" },
  { key: "builds", label: "Builds" },
  { key: "decks", label: "Decks" },
  { key: "bonus", label: "Bonus Cards" },
  { key: "regions", label: "Regions" },
  { key: "similar", label: "Similar Decks" },
];

const MAX_SIMILAR_DECKS_SHOWN = 10;
const TAB_KEYS = TABS.map((t) => t.key);

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default function ChampionDetail() {
  const { name = "" } = useParams<{ name: string }>();
  const championName = slugToChampionName(name);
  useDocumentTitle(`${championName} — Stats`, `${championName} deck builds, win rates, and season trends in Grand Archive TCG.`);

  const archetypeData = useArchetypeData();
  const taxonomyData = useArchetypeTaxonomyData();
  const trendsData = useChampionTrendsData();
  const popularityIndexData = useDeckPopularityIndexData();
  const eventNameById = useEventNameById();
  const hipsterData = useHipsterData();
  const playersData = useOmnidexPlayers();
  const similarityData = useSimilarityData();
  const compositionData = useCompositionWinRateData();

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
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "season");
  // Only reset when navigating from one Champion's page to a different one (same component
  // instance reused by the router) — not on initial mount, which would otherwise clobber a
  // `?tab=` deep link.
  const prevChampionNameRef = useRef(championName);
  useEffect(() => {
    if (prevChampionNameRef.current !== championName) {
      setSpiritFilter({ kind: "all" });
      setTypeFilter("all");
      setTab("season");
      prevChampionNameRef.current = championName;
    }
  }, [championName, setTab]);

  // Switching Spirit/Element resets the type filter — the previously-selected type may not exist
  // (or may mean something very different) in the newly-selected breakdown's card pool.
  useEffect(() => {
    setTypeFilter("all");
  }, [spiritFilter]);

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

  const displayedMainByType = useMemo(() => {
    if (!champion) return null;
    if (spiritFilter.kind === "element") {
      return champion.elementBreakdown.find((e) => e.element === spiritFilter.element)?.mainByType ?? champion.mainByType;
    }
    if (spiritFilter.kind === "spirit") {
      return champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.mainByType ?? champion.mainByType;
    }
    return champion.mainByType;
  }, [champion, spiritFilter]);

  // Type chips, most-represented first (by total deckCount across that type's cards) — mirrors
  // the deckCount-desc ordering already used for the Spirit dropdown/element buttons.
  const typeFilterOptions = useMemo(() => {
    if (!displayedMainByType) return [];
    return Object.entries(displayedMainByType)
      .map(([type, cards]) => ({ type, total: cards.reduce((sum, c) => sum + c.deckCount, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [displayedMainByType]);

  const displayedMainCards = typeFilter === "all" ? undefined : displayedMainByType?.[typeFilter];

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

  // Cross-links to real decks similar to any of this Champion's own instances, resolved against
  // the already-loaded lean popularity index (deckId -> deckHash/championName) rather than the
  // full decoded-deck universe DeckDetail.tsx's own Similar Decks tab needs — cheap enough to
  // compute here since we only need a page link and a label, not the actual decklist. Verified
  // against real data before shipping: an early version excluded same-Champion matches to bias
  // toward cross-Champion shell crossover, but that turned out to filter out ~100% of real
  // matches (Diao Chan: 0/596 checked matches were a different Champion) — the material/Champion
  // section is itself part of the similarity signature, so a high-similarity match is almost
  // always the same Champion. Kept as a plain "similar decks" list instead.
  const similarDecks = useMemo(() => {
    if (!similarityData || !popularityIndexData) return [];
    const entryByDeckId = new Map(popularityIndexData.entries.map((e) => [e.deckId, e]));
    const bestByHash = new Map<string, { hash: string; championName: string | null; eventName: string; score: number }>();
    for (const entry of similarityData.decks) {
      if (entry.championName !== championName) continue;
      for (const match of entry.topMatches) {
        if (match.deckId === entry.deckId) continue;
        const target = entryByDeckId.get(match.deckId);
        if (!target?.deckHash) continue;
        const existing = bestByHash.get(target.deckHash);
        if (!existing || match.score > existing.score) {
          bestByHash.set(target.deckHash, {
            hash: target.deckHash,
            championName: target.championName,
            eventName: eventNameById.get(target.eventId) ?? `Event #${target.eventId}`,
            score: match.score,
          });
        }
      }
    }
    return Array.from(bestByHash.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SIMILAR_DECKS_SHOWN);
  }, [similarityData, popularityIndexData, championName, eventNameById]);

  // A compact "which composition sweet spot wins the most" summary, one row per card type — the
  // best-win-rate share-of-deck bucket for each, distinct from /cards/stats' own per-type toggle
  // view (which shows every bucket for one type at a time, not a cross-type comparison).
  const compositionBestByType = useMemo(() => {
    if (!compositionData) return [];
    const byType = new Map<string, typeof compositionData.stats>();
    for (const stat of compositionData.stats) {
      const list = byType.get(stat.type) ?? [];
      list.push(stat);
      byType.set(stat.type, list);
    }
    const rows: { type: string; bucket: string; adjustedWinRate: number; deckCount: number }[] = [];
    for (const [type, stats] of byType) {
      if (stats.length < 2) continue;
      const best = stats.reduce((a, b) => (b.adjustedWinRate > a.adjustedWinRate ? b : a));
      rows.push({ type, bucket: best.bucket, adjustedWinRate: best.adjustedWinRate, deckCount: best.deckCount });
    }
    return rows.sort((a, b) => b.adjustedWinRate - a.adjustedWinRate);
  }, [compositionData]);

  const allTopCardNames = useMemo(() => {
    if (!displayedTopCards) return [];
    const names = new Set([...displayedTopCards.main, ...displayedTopCards.material, ...displayedTopCards.sideboard].map((c) => c.name));
    if (displayedMainByType) {
      for (const cards of Object.values(displayedMainByType)) {
        for (const c of cards) names.add(c.name);
      }
    }
    return Array.from(names);
  }, [displayedTopCards, displayedMainByType]);
  const cardImages = useCardsByNames(allTopCardNames);

  function playerName(id: number): string {
    return playersData?.players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  if (archetypeData && !champion) {
    return (
      <PageLayout data-component="ChampionDetail">
        <EmptyState
          title="Champion not found"
          description={<>Champion "{championName}" hasn't cleared the sample-size threshold (or doesn't exist).</>}
          action={<Link to="/champions" className="text-ctp-blue hover:underline">&larr; All champions</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout data-component="ChampionDetail">
      {champion && (
        <>
          <PageHeader
            title={champion.signature}
            eyebrow={<Link to={`/champions/${championNameToSlug(championName)}`} className="hover:underline">&larr; {champion.signature}</Link>}
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
            <Section
              className="mt-6"
              heading="compact"
              title="By season"
              description="Share of season = this Champion's weighted placement score as a fraction of every Champion's combined score that season — comparable across seasons regardless of how many events were played."
              actions={trend && trend.trend !== "insufficient-data" && (
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
            >
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
            </Section>
          )}

          {tab === "cards" && champion.topCards.main.length > 0 && (
            <Section className="mt-6" heading="compact" title="Most used cards">
              {champion.elementBreakdown.length > 0 && (
                <>
                  <p className="mt-2 text-xs text-ctp-subtext0">
                    {championName}'s Spirit pick can drastically change card choices — filter by Spirit element to
                    see it.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <Chip active={spiritFilter.kind === "all"} onClick={() => setSpiritFilter({ kind: "all" })}>
                      All ({champion.deckCount})
                    </Chip>
                    {champion.elementBreakdown.map((e) => (
                      <Chip
                        key={e.element}
                        active={
                          (spiritFilter.kind === "element" && spiritFilter.element === e.element) ||
                          (spiritFilter.kind === "spirit" &&
                            champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement === e.element)
                        }
                        onClick={() => setSpiritFilter({ kind: "element", element: e.element })}
                      >
                        {titleCase(e.element)} ({e.deckCount})
                      </Chip>
                    ))}
                  </div>

                  {spiritsForSelectedElement.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-ctp-subtext0">Spirit:</span>
                      {spiritsForSelectedElement.map((s) => (
                        <Chip
                          key={s.spiritName}
                          size="sm"
                          active={spiritFilter.kind === "spirit" && spiritFilter.spiritName === s.spiritName}
                          onClick={() => setSpiritFilter({ kind: "spirit", spiritName: s.spiritName })}
                        >
                          {s.spiritName} ({s.deckCount})
                        </Chip>
                      ))}
                    </div>
                  )}
                </>
              )}

              {typeFilterOptions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-ctp-subtext0">Main card type:</span>
                  <Chip size="sm" active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
                    All
                  </Chip>
                  {typeFilterOptions.map(({ type }) => (
                    <Chip key={type} size="sm" active={typeFilter === type} onClick={() => setTypeFilter(type)}>
                      {titleCase(type)}
                    </Chip>
                  ))}
                </div>
              )}

              {displayedTopCards && (
                <div className="mt-3">
                  <TopCardsSections topCards={displayedTopCards} cardImages={cardImages} mainOverride={displayedMainCards} />
                </div>
              )}
            </Section>
          )}

          {tab === "builds" && builds.length > 0 && (
            <Section
              className="mt-6"
              heading="compact"
              title="Builds"
              description={<>Named builds within {championName}, derived from real decklists.</>}
              actions={<Link to="/archetypes" className="text-xs text-ctp-blue hover:underline">All archetypes &rarr;</Link>}
            >
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
            </Section>
          )}

          {tab === "decks" && topDecks.length > 0 && (
            <Section
              className="mt-6"
              heading="compact"
              title="Top decks"
              actions={<Link to={`/decks?view=sightings&champion=${encodeURIComponent(championName)}`} className="text-xs text-ctp-blue hover:underline">View all &rarr;</Link>}
            >
              <div className="mt-2">
                <TopDecksList decks={topDecks} playerName={playerName} />
              </div>
            </Section>
          )}

          {tab === "decks" && uniqueDecks.length > 0 && (
            <Section
              className="mt-6"
              heading="compact"
              title="Most unique decks"
              description={<>Builds with the most uncommon card choices relative to other {championName} decks at the time they were played.</>}
            >
              <div className="mt-2 space-y-2">
                {uniqueDecks.map((d) => (
                  <UniqueDeckRow key={`${d.eventId}:${d.player}`} score={d} playerName={playerName(d.player)} />
                ))}
              </div>
            </Section>
          )}

          {tab === "bonus" && (
            <Section
              className="mt-6"
              heading="compact"
              title="Bonus cards"
              description={<>Cards with an effect that specifically triggers or improves when your Champion is {championName}.</>}
            >
              {bonusCards.length === 0 ? (
                <InlineState className="mt-4 text-sm">No published cards have a bonus tied to {championName} yet.</InlineState>
              ) : (
                <CardGrid cards={bonusCards} />
              )}
            </Section>
          )}

          {tab === "regions" && (
            <Section
              className="mt-6"
              heading="compact"
              title="Regional popularity"
              description={<>Where {championName} gets played the most.</>}
              actions={<Link to="/regions?tab=champions" className="text-xs text-ctp-blue hover:underline">Full Regions page &rarr;</Link>}
            >
              {regionalBreakdown.loading && <InlineState className="mt-4">Loading…</InlineState>}
              {!regionalBreakdown.loading && regionalBreakdown.rows.length === 0 && (
                <InlineState className="mt-4 text-sm">Not enough regional data for {championName} yet.</InlineState>
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
            </Section>
          )}

          {tab === "similar" && (
            <Section
              className="mt-6"
              heading="compact"
              title="Similar Decks"
              description={<>Real decks with a similar card shell to a {championName} build.</>}
            >
              {similarDecks.length === 0 ? (
                <InlineState className="mt-4 text-sm">No similar decks found yet.</InlineState>
              ) : (
                <ul className="mt-2 space-y-1">
                  {similarDecks.map((s) => (
                    <li key={s.hash} className="flex flex-wrap items-center gap-1.5 text-sm">
                      <Link to={`/decks/${s.hash}`} className="text-ctp-text hover:text-ctp-blue">
                        {s.championName ?? "Unknown Champion"} &middot; {s.eventName}
                      </Link>
                      <span className="text-xs text-ctp-subtext0">({(s.score * 100).toFixed(0)}% similar)</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {tab === "similar" && compositionBestByType.length > 0 && (
            <Section
              className="mt-6"
              heading="compact"
              title="Deck composition guide"
              description="Across all decks, the best-performing share-of-main-deck bucket for each card type — a cross-type summary, not scoped to this Champion."
              actions={<Link to="/cards/stats" className="text-xs text-ctp-blue hover:underline">Full breakdown by type &rarr;</Link>}
            >
              <div className="mt-2 overflow-x-auto">
                <table className="w-max min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                      <th className="py-1 pr-6">Type</th>
                      <th className="py-1 pr-6">Best share of main deck</th>
                      <th className="py-1 pr-6">Win rate</th>
                      <th className="py-1">Decks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                    {compositionBestByType.map((r) => (
                      <tr key={r.type}>
                        <td className="py-1.5 pr-6 whitespace-nowrap text-ctp-text">{r.type}</td>
                        <td className="py-1.5 pr-6 text-ctp-subtext1">{r.bucket}</td>
                        <td className="py-1.5 pr-6 font-semibold text-ctp-text">{(r.adjustedWinRate * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-ctp-subtext1">{r.deckCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </PageLayout>
  );
}
