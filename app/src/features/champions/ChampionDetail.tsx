import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import ChampionDecks from "./ChampionDecks";
import CardArtTile from "../../components/CardArtTile";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { slugToChampionName } from "../../lib/championSlug";
import { titleCase } from "../../lib/format";
import { useArchetypeData, useArchetypeTaxonomyData, useCardStatsByChampionData, useChampionTrendsData, useCompositionWinRateData, useSimilarityData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useEventNameById, useOmnidexIndex, useOmnidexIndexStatus } from "../tournaments/data";
import { useCardsByNames } from "../events/useCardsByNames";
import TopCardsSections from "../../components/TopCardsSections";
import { useChampionBonusCards } from "./useChampionBonusCards";
import { useChampionRegionalBreakdown } from "../regions/useChampionRegionalBreakdown";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import PageHeader from "../../components/ui/PageHeader";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import { cutoutsForChampion } from "../products/characterArt";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import { EmptyState, InlineState } from "../../components/ui/ContentState";
import { ChampionBonusSection, ChampionSeasonSection, SimilarDecksSection } from "./ChampionDetailViews";


type SpiritFilter = { kind: "all" } | { kind: "element"; element: string } | { kind: "spirit"; spiritName: string };
type ChampionTab = "season" | "cards" | "builds" | "decks" | "bonus" | "regions" | "similar";
type ChampionSurface = "overview" | "decks" | "more";

const SURFACES: { key: ChampionSurface; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "decks", label: "Decks" },
  { key: "more", label: "More" },
];
const OVERVIEW_TABS: ChampionTab[] = ["season", "cards", "builds"];
const MORE_TABS: { key: Extract<ChampionTab, "bonus" | "regions" | "similar">; label: string }[] = [
  { key: "bonus", label: "Bonus cards" },
  { key: "regions", label: "Regions" },
  { key: "similar", label: "Similar decks" },
];

const MAX_SIMILAR_DECKS_SHOWN = 10;
const TAB_KEYS: ChampionTab[] = [...OVERVIEW_TABS, "decks", ...MORE_TABS.map((tab) => tab.key)];

export default function ChampionDetail() {
  const { name = "" } = useParams<{ name: string }>();
  const championName = slugToChampionName(name);
  useDocumentTitle(`${championName} – Stats`, `${championName} deck builds, win rates, and season trends in Grand Archive TCG.`);

  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "season");
  const surface: ChampionSurface = OVERVIEW_TABS.includes(tab) ? "overview" : tab === "decks" ? "decks" : "more";
  const moreTab = MORE_TABS.some((item) => item.key === tab) ? tab as "bonus" | "regions" | "similar" : "bonus";
  const showOverview = surface === "overview";

  // Gate every large per-tab dataset behind the tab that actually needs it – this page used to
  // eagerly fetch every dataset below (similarity.json alone is 28MB, the single biggest dataset
  // this page touches) on every visit regardless of which of the 7 tabs the visitor opened, same
  // class of bug just fixed on CardDetail.tsx/ArchetypeDetail.tsx. archetypeData/trendsData stay
  // eager – the header and default "By Season" tab need them immediately.
  const archetypeData = useArchetypeData();
  const taxonomyData = useArchetypeTaxonomyData(showOverview);
  const trendsData = useChampionTrendsData();
  const archetypeStatus = usePublishedDataStatus("analysis-archetypes", "/data/analysis/archetypes.json");
  const trendStatus = usePublishedDataStatus("analysis-champion-trends", "/data/analysis/champion-trends.json");
  const popularityIndexData = useDeckPopularityIndexData(tab === "similar" || tab === "regions");
  const eventNameById = useEventNameById(tab === "similar");
  const similarityData = useSimilarityData(tab === "similar");
  const similarityStatus = usePublishedDataStatus("analysis-similarity", "/data/analysis/similarity.json");
  const popularityStatus = usePublishedDataStatus("analysis-deck-popularity-index", "/data/analysis/deck-popularity-index.json");
  const regionIndex = useOmnidexIndex(tab === "regions");
  const regionIndexStatus = useOmnidexIndexStatus();
  const compositionStatus = usePublishedDataStatus("analysis-composition-win-rates", "/data/analysis/composition-win-rates.json");
  const compositionData = useCompositionWinRateData(tab === "similar");
  const cardStatsByChampionData = useCardStatsByChampionData(showOverview);

  // Named Spirits (e.g. "Kaze, Spirit of Wind") are tracked as their own Champion-like entry in a
  // separate list, not merged into `archetypes` – fall back to it so this page works for either.
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
  const [showAllBuilds, setShowAllBuilds] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  // Only reset when navigating from one Champion's page to a different one (same component
  // instance reused by the router) – not on initial mount, which would otherwise clobber a
  // `?tab=` deep link.
  const prevChampionNameRef = useRef(championName);
  useEffect(() => {
    if (prevChampionNameRef.current !== championName) {
      setSpiritFilter({ kind: "all" });
      setShowAllBuilds(false);
      setTypeFilter("all");
      setTab("season");
      prevChampionNameRef.current = championName;
    }
  }, [championName, setTab]);

  // Switching Spirit/Element resets the type filter – the previously-selected type may not exist
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

  /** Card win rate specifically among this Champion's own decks (`data/analysis/card-stats-by-champion.json`) – Champion-wide, not re-scoped per Spirit/Element filter above (that dataset doesn't slice that finely; still meaningful at the Champion level regardless of which breakdown's card list is currently shown). */
  const winRateByName = useMemo(() => {
    const entry = cardStatsByChampionData?.champions.find((c) => c.championName === championName);
    return entry ? new Map(entry.cards.map((c) => [c.name, { adjustedWinRate: c.adjustedWinRate, deckCount: c.deckCount, baselineWinRate: entry.baselineWinRate }])) : undefined;
  }, [cardStatsByChampionData, championName]);

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

  // Type chips, most-represented first (by total deckCount across that type's cards) – mirrors
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

  const cutouts = useMemo(() => cutoutsForChampion(championName), [championName]);
  const cutoutCards = useCardsByNames(useMemo(() => cutouts.map((c) => c.cardName), [cutouts]));
  const bonus = useChampionBonusCards(champion ? championName : null);
  const regionalBreakdown = useChampionRegionalBreakdown(champion ? championName : null, moreTab === "regions" && surface === "more");

  // Cross-links to real decks similar to any of this Champion's own instances, resolved against
  // the already-loaded lean popularity index (deckId -> deckHash/championName) rather than the
  // full decoded-deck universe DeckDetail.tsx's own Similar Decks tab needs – cheap enough to
  // compute here since we only need a page link and a label, not the actual decklist. Verified
  // against real data before shipping: an early version excluded same-Champion matches to bias
  // toward cross-Champion shell crossover, but that turned out to filter out ~100% of real
  // matches (Diao Chan: 0/596 checked matches were a different Champion) – the material/Champion
  // section is itself part of the similarity signature, so a high-similarity match is almost
  // always the same Champion. Preserve same-Champion matches.
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

  // A compact "which composition sweet spot wins the most" summary, one row per card type – the
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

  if (archetypeData && !champion) {
    return (
      <PageLayout width="wide" data-component="ChampionDetail">
        <EmptyState
          title="Champion not found"
          description={<>Champion "{championName}" hasn't cleared the sample-size threshold (or doesn't exist).</>}
          action={<Link to="/champions" className="text-ctp-blue hover:underline">&larr; All champions</Link>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="wide" data-component="ChampionDetail">
      <PublishedSourceStatus label="Champion statistics" status={archetypeStatus} hasData={!!archetypeData} />
      {champion && (
        <>
          <PageHeader
            title={champion.signature}
            eyebrow={<Link to="/champions" className="hover:underline">&larr; All champions</Link>}
            description={<span className="flex flex-wrap gap-2"><span>{champion.classes.join(" / ")}</span><span aria-hidden="true">·</span><span>{champion.elements.join(" / ")}</span></span>}
          />

          {cutouts.length > 0 && (
            <section aria-label={`${championName} card portraits`} className="identity-surface mb-4 rounded-3xl border border-ctp-surface1 p-4">
              <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {cutouts.map((c) => {
                  const card = cutoutCards.get(c.cardName);
                  const content = <><CardArtTile card={card} name={c.cardName} /><span className="mt-2 block text-sm font-medium text-ctp-text">{c.cardName}</span></>;
                  return card?.slug ? (
                    <Link key={c.cardName} to={`/cards/${card.slug}`} className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ctp-blue hover:text-ctp-blue">
                      {content}
                    </Link>
                  ) : <div key={c.cardName} className="min-w-0">{content}</div>;
                })}
              </div>
            </section>
          )}

          <details className="group mb-6 rounded-2xl border border-ctp-surface1 bg-ctp-mantle px-4">
            <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue">
              All recorded results<DisclosureChevron className="group-open:rotate-180" />
            </summary>
            <p className="mb-3 text-sm text-ctp-subtext1">Totals across recorded events, separate from the season statistics below.</p>
            <dl className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-3">
              <div><dt className="text-sm text-ctp-subtext0">Average win rate</dt><dd className="text-2xl font-semibold text-ctp-text">{(champion.avgWinRate * 100).toFixed(0)}%</dd></div>
              <div><dt className="text-sm text-ctp-subtext0">Decks</dt><dd className="text-2xl font-semibold text-ctp-text">{champion.deckCount.toLocaleString()}</dd></div>
              <div><dt className="text-sm text-ctp-subtext0">Events</dt><dd className="text-2xl font-semibold text-ctp-text">{champion.eventCount.toLocaleString()}</dd></div>
            </dl>
          </details>

          <Tabs baseId="champion-statistics" tabs={SURFACES} active={surface} onChange={(next) => setTab(next === "overview" ? "season" : next === "decks" ? "decks" : moreTab)} label={`${champion.signature} details`} variant="pill" />

          <TabPanel baseId="champion-statistics" tab="overview" active={surface}>
          {showOverview && <>
            <PublishedSourceStatus label="Season statistics" status={trendStatus} hasData={!!trendsData} />
            {trendsData && <ChampionSeasonSection seasons={seasonHistory} trend={trend} />}
          </>}

          {showOverview && champion.topCards.main.length > 0 && (
            <Section className="mt-6" heading="compact" title="Most used cards">
              <p className="mt-2 text-sm text-ctp-subtext1">Explore the cards players bring with {championName}.</p>
              <p className="mt-2 text-sm text-ctp-subtext0">
                Showing {spiritFilter.kind === "all" ? "all elements and Spirits" : spiritFilter.kind === "element" ? titleCase(spiritFilter.element) : spiritFilter.spiritName}.
                {typeFilter !== "all" && ` Main cards: ${titleCase(typeFilter)}.`} Card win rates cover all {championName} decks, regardless of these filters.
              </p>
              <details className="group mt-3 rounded-xl border border-ctp-surface1 px-3">
                <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 text-sm text-ctp-blue focus-visible:outline-2">Filter cards<DisclosureChevron className="group-open:rotate-180" /></summary>
                <div className="pb-3 [&_button[aria-pressed=true]]:border-ctp-blue [&_button[aria-pressed=true]]:bg-ctp-blue/10 [&_button[aria-pressed=true]]:text-ctp-blue">
              {champion.elementBreakdown.length > 0 && (
                <>
                  <p className="mt-2 text-xs text-ctp-subtext0">
                    {championName}'s Spirit pick can drastically change card choices. Filter by Spirit element to explore them.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <Button aria-pressed={spiritFilter.kind === "all"} onClick={() => setSpiritFilter({ kind: "all" })}>
                      All ({champion.deckCount})
                    </Button>
                    {champion.elementBreakdown.map((e) => (
                      <Button
                        key={e.element}
                        aria-pressed={
                          (spiritFilter.kind === "element" && spiritFilter.element === e.element) ||
                          (spiritFilter.kind === "spirit" &&
                            champion.spirits.find((s) => s.spiritName === spiritFilter.spiritName)?.spiritElement === e.element)
                        }
                        onClick={() => setSpiritFilter({ kind: "element", element: e.element })}
                      >
                        {titleCase(e.element)} ({e.deckCount})
                      </Button>
                    ))}
                  </div>

                  {spiritsForSelectedElement.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-ctp-subtext0">Spirit:</span>
                      {spiritsForSelectedElement.map((s) => (
                        <Button
                          key={s.spiritName}
                          size="sm"
                          aria-pressed={spiritFilter.kind === "spirit" && spiritFilter.spiritName === s.spiritName}
                          onClick={() => setSpiritFilter({ kind: "spirit", spiritName: s.spiritName })}
                        >
                          {s.spiritName} ({s.deckCount})
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {typeFilterOptions.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-ctp-subtext0">Main card type:</span>
                  <Button size="sm" aria-pressed={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
                    All
                  </Button>
                  {typeFilterOptions.map(({ type }) => (
                    <Button key={type} size="sm" aria-pressed={typeFilter === type} onClick={() => setTypeFilter(type)}>
                      {titleCase(type)}
                    </Button>
                  ))}
                </div>
              )}

                </div>
              </details>
              {displayedTopCards && (
                <div className="mt-3">
                  <TopCardsSections topCards={displayedTopCards} cardImages={cardImages} mainOverride={displayedMainCards} winRateByName={winRateByName} layout="grid" initialVisible={4} />
                </div>
              )}
            </Section>
          )}

          {showOverview && builds.length > 0 && (
            <Section
              className="mt-6"
              heading="compact"
              title="Popular builds"
              description="Build families ranked by player count. Each family can contain several different decklists."
              actions={<Link to="/archetypes" className="inline-flex min-h-control items-center text-sm text-ctp-blue hover:underline">All archetypes &rarr;</Link>}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(showAllBuilds ? builds : builds.slice(0, 3)).map((b) => (
                  <Link key={b.id} to={`/archetypes/${b.id}`} className="flex min-h-20 items-center gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 transition-colors hover:border-ctp-blue">
                    <span className="min-w-0"><strong className="block break-words text-sm text-ctp-text">{b.name}</strong><span className="mt-1 block text-xs text-ctp-subtext0">{b.playerCount} players · {(b.avgWinRate * 100).toFixed(0)}% win rate</span></span>
                  </Link>
                ))}
              </div>
              {builds.length > 3 && <Button className="mt-3" aria-expanded={showAllBuilds} onClick={() => setShowAllBuilds((value) => !value)}>{showAllBuilds ? "Show fewer builds" : `Show all ${builds.length} builds`}</Button>}
            </Section>
          )}

          </TabPanel>

          <TabPanel baseId="champion-statistics" tab="decks" active={surface}>
            {tab === "decks" && <ChampionDecks key={championName} championName={championName} />}
          </TabPanel>

          <TabPanel baseId="champion-statistics" tab="more" active={surface}>

          <div className="mt-5">
            <Tabs baseId="champion-more" tabs={MORE_TABS} active={moreTab} onChange={setTab} label="More champion data" />
          </div>

          <TabPanel baseId="champion-more" tab="bonus" active={moreTab}>
          {surface === "more" && moreTab === "bonus" && (
            <ChampionBonusSection key={championName} championName={championName} {...bonus} />
          )}

          </TabPanel>

          <TabPanel baseId="champion-more" tab="regions" active={moreTab}>
          {surface === "more" && moreTab === "regions" && (
            <Section
              className="mt-6"
              heading="compact"
              title="Regional popularity"
              description={`Where ${championName} appears most often in recorded decks. Groups need at least three decks to appear. Unknown means no country was recorded.`}
              actions={<Link to="/regions?tab=champions" className="inline-flex min-h-control items-center rounded-md px-3 text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">Explore regions &rarr;</Link>}
            >
              <PublishedSourceStatus label="Regional events" status={regionIndexStatus} hasData={!!regionIndex} />
              <PublishedSourceStatus label="Tournament decks" status={popularityStatus} hasData={!!popularityIndexData} />
              {!regionalBreakdown.loading && regionalBreakdown.rows.length === 0 && (
                <InlineState className="mt-4 text-sm">Not enough regional data for {championName} yet.</InlineState>
              )}
              {regionalBreakdown.rows.length > 0 && (
                <>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {regionalBreakdown.rows.slice(0, 3).map((r) => (
                      <Link key={r.code} to={`/regions?group=country&region=${r.code}&tab=champions`} className="identity-surface min-w-0 rounded-2xl border border-ctp-surface1 p-4 transition-colors hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
                        <strong className="block break-words text-lg text-ctp-text">{r.label}</strong>
                        <span className="mt-3 block text-3xl font-semibold tabular-nums text-ctp-text">{r.deckCount.toLocaleString()} <span className="text-sm font-normal text-ctp-subtext0">decks</span></span>
                        <span className="mt-1 block text-sm text-ctp-subtext0">{(r.avgWinRate * 100).toFixed(0)}% average win rate</span>
                      </Link>
                    ))}
                  </div>
                  {regionalBreakdown.rows.length > 3 && (
                    <details className="group mt-4 rounded-xl border border-ctp-surface1" key={championName}>
                      <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">
                        {regionalBreakdown.rows.length - 3} more regions
                        <DisclosureChevron className="shrink-0 group-open:rotate-180" />
                      </summary>
                      <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                        {regionalBreakdown.rows.slice(3).map((r) => (
                          <Link key={r.code} to={`/regions?group=country&region=${r.code}&tab=champions`} className="min-h-control rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue">
                            <strong className="block break-words text-sm text-ctp-text">{r.label}</strong>
                            <span className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-ctp-subtext0"><span>{r.deckCount.toLocaleString()} decks</span><span>{(r.avgWinRate * 100).toFixed(0)}% average win rate</span></span>
                          </Link>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </Section>
          )}

          </TabPanel>

          <TabPanel baseId="champion-more" tab="similar" active={moreTab}>
          {surface === "more" && moreTab === "similar" && <>
            <PublishedSourceStatus label="Deck similarity" status={similarityStatus} hasData={!!similarityData} />
            <PublishedSourceStatus label="Tournament decks" status={popularityStatus} hasData={!!popularityIndexData} />
            {similarityData && popularityIndexData && <SimilarDecksSection key={championName} championName={championName} decks={similarDecks} />}
          </>}

          {surface === "more" && moreTab === "similar" && (
            <div>
              <PublishedSourceStatus label="Composition evidence" status={compositionStatus} hasData={!!compositionData} />
              <details className="group mt-6 rounded-2xl border border-ctp-surface1" key={championName}>
                <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 font-medium text-ctp-text focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">
                  <span>Deck composition evidence<span className="mt-1 block text-sm font-normal text-ctp-subtext0">Across all champions</span></span>
                  <DisclosureChevron className="shrink-0 group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4">
                  <p className="mb-4 text-sm text-ctp-subtext0">The share of the main deck with the highest adjusted win rate for each card type across all recorded decks. These results are not specific to {championName} and are not a recommended deck recipe.</p>
                  {compositionData && compositionBestByType.length === 0 && <InlineState>No composition evidence is available yet.</InlineState>}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {compositionBestByType.map((r) => (
                      <div key={r.type} className="rounded-xl bg-ctp-mantle p-4">
                        <h3 className="font-semibold text-ctp-text">{r.type}</h3>
                        <dl className="mt-3 space-y-2 text-sm">
                          <div className="flex flex-wrap justify-between gap-2"><dt className="text-ctp-subtext0">Share of main deck</dt><dd className="font-medium text-ctp-text">{r.bucket}</dd></div>
                          <div className="flex flex-wrap justify-between gap-2"><dt className="text-ctp-subtext0">Adjusted win rate</dt><dd className="text-ctp-text">{(r.adjustedWinRate * 100).toFixed(0)}%</dd></div>
                          <div className="flex flex-wrap justify-between gap-2"><dt className="text-ctp-subtext0">Recorded decks</dt><dd className="text-ctp-text">{r.deckCount.toLocaleString()}</dd></div>
                        </dl>
                      </div>
                    ))}
                  </div>
                  <Link to="/cards/stats" className="mt-3 inline-flex min-h-control items-center rounded-md px-3 text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">Full breakdown by type &rarr;</Link>
                </div>
              </details>
            </div>
          )}
          </TabPanel>
          </TabPanel>
        </>
      )}
    </PageLayout>
  );
}
