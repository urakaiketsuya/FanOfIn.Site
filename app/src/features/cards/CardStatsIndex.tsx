import { useBrowseState } from "../../lib/useBrowseState";
import GroupedCardResults from "../../components/GroupedCardResults";
import FilterQuery from "../../components/filters/FilterQuery";
import { filterCardNames } from "./filters";
import { cardAdoption, formatFilterQuery } from "@gatcg/shared";
import { cardImagePath } from "../../lib/previewCards";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER, type TopCardsBySection } from "@gatcg/shared";
import { useCardStatsData, useKeywordStatsData, useCompositionWinRateData } from "../archetypes/data";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCombination } from "./useCardCombination";
import { useCommunityBlendedCardInclusion, useCommunitySourceCounts } from "../community/data";
import CardArtTile from "../../components/CardArtTile";
import CardHoverPreview from "../../components/CardHoverPreview";
import TopCardsSections from "../../components/TopCardsSections";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { getPublishedPackageMembership as getCardPackageMembership } from "@gatcg/shared";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";
import { useCardCatalog } from "./useCardCatalog";
import { CompositionStatsSection, KeywordStatsSection } from "./CardStatsSupplementalSections";
import { primaryAlternateFace } from "../../lib/cardFaces";
import Button from "../../components/ui/Button";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";

type StatsView = "cards" | "combinations" | "keywords" | "composition";
const STATS_TABS: { key: StatsView; label: string }[] = [
  { key: "cards", label: "Cards" },
  { key: "combinations", label: "Combinations" },
  { key: "keywords", label: "Keywords" },
  { key: "composition", label: "Composition" },
];

type SortMode = "usage" | "adjusted" | "raw" | "hot" | "hype";

const SORT_LABELS: Record<SortMode, string> = {
  usage: "Usage",
  adjusted: "Win rate (adjusted)",
  raw: "Win rate (raw)",
  hot: "Adoption change",
  hype: "Hype gap",
};

const MIN_DECKS_OPTIONS = [0, 5, 10, 20];

export default function CardStatsIndex() {
  useDocumentTitle("Card Stats", "Card usage and win-rate stats across ranked Grand Archive TCG tournaments.");
  const [view, setView] = useState<StatsView>("cards");
  const cardStatsData = useCardStatsData();
  const cardsStatus = usePublishedDataStatus("analysis-cards", "/data/analysis/cards.json", view === "cards");
  const keywordsStatus = usePublishedDataStatus("analysis-keyword-stats", "/data/analysis/keyword-stats.json", view === "keywords");
  const compositionStatus = usePublishedDataStatus("analysis-composition-win-rates", "/data/analysis/composition-win-rates.json", view === "composition");
  const cardCatalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(cardCatalog.map(card => [card.name, card])), [cardCatalog]);
  const keywordStatsData = useKeywordStatsData(view === "keywords");
  const compositionData = useCompositionWinRateData(view === "composition");
  const communityCardInclusion = useCommunityBlendedCardInclusion();
  const communitySourceCounts = useCommunitySourceCounts();
  // Published data is cached in IndexedDB and can briefly outlive the schema that produced it.
  // In particular, source-count records from before TCGArchitect was added have no
  // `tcgarchitect` field. Treat missing counts as zero so an old cache cannot crash the page while
  // the current artifact refreshes in the background.
  const standardCommunitySources = communitySourceCounts?.byFormat?.STANDARD;
  const communitySourceLabel = standardCommunitySources
    ? `community archive (${(standardCommunitySources.shoutatyourdecks ?? 0).toLocaleString()}) + Sleeved.gg (${(standardCommunitySources.sleeved ?? 0).toLocaleString()}) + TCGArchitect (${(standardCommunitySources.tcgarchitect ?? 0).toLocaleString()})`
    : "the community archive, Sleeved.gg, and TCGArchitect";
  const communityByName = useMemo(
    () => new Map((communityCardInclusion?.overall ?? []).map((c) => [c.name, c])),
    [communityCardInclusion],
  );
  // cards.json (already fetched on this page) publishes this directly – avoids fetching the
  // ~10MB deck-popularity-index.json/deck-sightings.json just for their own .length.
  const totalTournamentDecks = cardStatsData?.decksConsidered ?? 0;
  const [sortMode, setSortMode] = useBrowseState<SortMode>('cards/CardStatsIndex.sortMode', "usage");
  const [minDecks, setMinDecks] = useBrowseState('cards/CardStatsIndex.minDecks', 5);
  const [category, setCategory] = useBrowseState<string | null>('cards/CardStatsIndex.category', null);
  const [search, setSearch] = useBrowseState('cards/CardStatsIndex.search', "");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [keywordSortMode, setKeywordSortMode] = useBrowseState<"usage" | "adjusted" | "raw">('cards/CardStatsIndex.keywordSortMode', "usage");
  const [compositionType, setCompositionType] = useBrowseState<string | null>('cards/CardStatsIndex.compositionType', null);

  const keywordRows = useMemo(() => {
    if (!keywordStatsData) return [];
    return [...keywordStatsData.keywords].sort((a, b) => {
      switch (keywordSortMode) {
        case "adjusted":
          return b.adjustedWinRate - a.adjustedWinRate;
        case "raw":
          return b.avgWinRate - a.avgWinRate;
        default:
          return b.deckCount - a.deckCount;
      }
    });
  }, [keywordStatsData, keywordSortMode]);

  const compositionTypesPresent = useMemo(() => {
    if (!compositionData) return [];
    return Array.from(new Set(compositionData.stats.map((s) => s.type))).sort();
  }, [compositionData]);

  const activeCompositionType = compositionType ?? compositionTypesPresent[0] ?? null;

  const compositionRows = useMemo(() => {
    if (!compositionData || !activeCompositionType) return [];
    return compositionData.stats
      .filter((s) => s.type === activeCompositionType)
      .sort((a, b) => parseInt(a.bucket, 10) - parseInt(b.bucket, 10));
  }, [compositionData, activeCompositionType]);

  const compositionBestIndex = useMemo(() => {
    if (compositionRows.length < 2) return -1;
    const max = Math.max(...compositionRows.map((r) => r.adjustedWinRate));
    if (compositionRows.filter((r) => r.adjustedWinRate === max).length > 1) return -1;
    return compositionRows.findIndex((r) => r.adjustedWinRate === max);
  }, [compositionRows]);

  const categoriesPresent = useMemo(() => {
    if (!cardStatsData) return [];
    return EVENT_CATEGORY_ORDER.filter((c) => c in cardStatsData.byCategory);
  }, [cardStatsData]);

  const adoptionPeriods = category ? cardStatsData?.adoptionPeriodsByCategory?.[category] : cardStatsData?.adoptionPeriods;

  const rows = useMemo(() => {
    if (!cardStatsData) return [];
    const source = category ? (cardStatsData.byCategory[category] ?? []) : cardStatsData.cards;
    const matchingNames = new Set(filterCardNames(source.map(card => card.name), catalogByName, search));
    const filtered = source.filter((c) => c.deckCount >= minDecks && matchingNames.has(c.name));
    // "Hype gap" – community popularity minus tournament popularity, two different real
    // percentages of two different populations (brewers optimizing for fun/budget/theme vs
    // tournament players optimizing for winning), not a performance judgment. Community usage
    // is null (not 0) when the blended community dataset has no data for this card at all, so a
    // genuinely unbrewed card doesn't outrank one that's merely below the community dataset's own
    // floor. "Community" here blends ShoutAtYourDecks + Sleeved + TCGArchitect (see pipeline/src/community/blend.ts).
    const withHype = filtered.map((c) => {
      const communityEntry = communityByName.get(c.name);
      const communityPercent = communityEntry?.percentOfDecks ?? null;
      const tournamentPercent = totalTournamentDecks > 0 ? c.deckCount / totalTournamentDecks : 0;
      return { ...c, adoption: cardAdoption(c, adoptionPeriods), communityPercent, hypeGap: communityPercent !== null ? communityPercent - tournamentPercent : null };
    });
    return withHype.sort((a, b) => {
      switch (sortMode) {
        case "adjusted":
          return b.adjustedWinRate - a.adjustedWinRate;
        case "raw":
          return b.avgWinRate - a.avgWinRate;
        case "hot":
          if (!a.adoption) return b.adoption ? 1 : a.name.localeCompare(b.name);
          if (!b.adoption) return -1;
          return b.adoption.change - a.adoption.change || b.recentDeckCount - a.recentDeckCount || a.name.localeCompare(b.name);
        case "hype":
          return (b.hypeGap ?? -1) - (a.hypeGap ?? -1);
        default:
          return b.deckCount - a.deckCount;
      }
    });
  }, [cardStatsData, adoptionPeriods, sortMode, minDecks, category, search, catalogByName, communityByName, totalTournamentDecks]);

  const showCombination = view === "combinations" && selectedCards.length > 0;
  const combination = useCardCombination(selectedCards, showCombination);
  const combinationStatus = usePublishedDataStatus("analysis-deck-card-index", "/data/analysis/deck-card-index.json", showCombination);
  const comboNames = useMemo(
    () => [...combination.main, ...combination.material, ...combination.sideboard].map((c) => c.name),
    [combination],
  );
  const comboCardImages = useCardsByNames(comboNames);
  const comboTopCards: TopCardsBySection = useMemo(
    () => ({
      main: combination.main.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
      material: combination.material.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
      sideboard: combination.sideboard.map((c) => ({ ...c, slug: comboCardImages.get(c.name)?.slug ?? null })),
    }),
    [combination, comboCardImages],
  );

  function openStatsView(next: StatsView) {
    setView(next);
    document.getElementById(`card-stats-tab-${next}`)?.focus();
  }

  function toggleSelected(name: string) {
    setSelectedCards((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <PageLayout width="fluid" data-component="CardStatsIndex">
      <PageHeader
        title="Card Stats"
        actions={
          <Link to="/cards" className="inline-flex min-h-control items-center text-sm text-ctp-blue hover:underline">
            Browse the catalog &rarr;
          </Link>
        }
      />

      <Tabs baseId="card-stats" active={view} tabs={STATS_TABS} onChange={setView} label="Card statistics views" variant="pill" wrap />
      <TabPanel baseId="card-stats" tab="cards" active={view} keepMounted>
      <PublishedSourceStatus label="Card stats" status={cardsStatus} hasData={!!cardStatsData} />
      {selectedCards.length > 0 && <Button className="mt-3" onClick={() => openStatsView("combinations")}>View combination ({selectedCards.length} selected)</Button>}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2"><FilterQuery text={search} facets={{}} allowed={["classes", "types", "subtypes", "elements", "sets", "printingSets", "rarities"]} onChange={(text, facets) => setSearch(formatFilterQuery(text, facets))} /></div>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort cards" className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => <option key={mode} value={mode}>{SORT_LABELS[mode]}</option>)}
        </select>
        <select value={category ?? ""} onChange={(e) => setCategory(e.target.value || null)} aria-label="Tournament type" className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
          <option value="">All tournaments</option>
          {categoriesPresent.map((value) => <option key={value} value={value}>{EVENT_CATEGORY_LABELS[value] ?? value}</option>)}
        </select>
        <label className="flex min-h-control items-center justify-between gap-2 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 text-sm">
          Minimum sample
          <select value={minDecks} onChange={event => setMinDecks(Number(event.target.value))} className="min-h-control min-w-0 bg-ctp-mantle text-sm">
            {MIN_DECKS_OPTIONS.map(count => <option key={count} value={count}>{count === 0 ? "Any" : `${count}+ decks`}</option>)}
          </select>
        </label>
      </div>

      {sortMode === "hot" && cardStatsData && (
        <section aria-label="Adoption periods" className="mt-4 rounded-xl border border-ctp-surface1 p-3">
          <h2 className="font-semibold">Deck inclusion · 30-day change</h2>
          {adoptionPeriods ? <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {(["prior", "recent"] as const).map(key => {
              const period = adoptionPeriods[key];
              const date = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
              return <div key={key}><span className="font-medium">{key === "prior" ? "Previous" : "Recent"} · {period.decks.toLocaleString()} decks</span><div className="mt-1 text-ctp-subtext0">{date(period.start)} – {date(new Date(Date.parse(period.end) - 86400000).toISOString())}</div></div>;
            })}
          </div> : <p className="mt-2 text-sm text-ctp-subtext0">Adoption data unavailable.</p>}
          {adoptionPeriods && (!adoptionPeriods.prior.decks || !adoptionPeriods.recent.decks) && <p className="mt-2 text-sm text-ctp-subtext0">Adoption change unavailable for this tournament type.</p>}
        </section>
      )}

      {sortMode === "hype" && <p className="mt-2 text-xs text-ctp-subtext0">Usage gap between {communitySourceLabel} and tournament decks.</p>}

      {cardStatsData && rows.length === 0 && <InlineState className="mt-6">No cards match this filter yet.</InlineState>}

      {cardStatsData && rows.length > 0 && <p className="mt-4 text-xs text-ctp-subtext0">{rows.length.toLocaleString()} matching cards</p>}
      <GroupedCardResults resultKey={JSON.stringify(rows.map(entry => entry.name))} items={rows} cardFor={entry => catalogByName.get(entry.name)} pageSize={50}>{visibleRows => <div className="mt-2 grid gap-3 sm:grid-cols-2 sm:items-start">
        {visibleRows.map((entry) => {
          const card = catalogByName.get(entry.name);
          const alternateFace = primaryAlternateFace(card);
          const isSelected = selectedCards.includes(entry.name);
          const packages = getCardPackageMembership(entry.name);
          return (
            <article key={entry.name} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm shadow-black/20">
              <div className="flex flex-wrap items-start gap-3">
                <CardHoverPreview image={cardImagePath(card)} backImage={alternateFace?.edition.image} backAlt={alternateFace?.name} alt={entry.name}>
                  <div className="w-24 shrink-0">
                    {entry.slug || card?.slug ? <Link to={`/cards/${entry.slug ?? card?.slug}`} aria-label={`View ${entry.name}`}><CardArtTile card={card} name={entry.name} /></Link> : <CardArtTile card={card} name={entry.name} />}
                  </div>
                </CardHoverPreview>
                <div className="min-w-0 flex-1 basis-36 break-words">
                  <h2 className="font-medium text-ctp-text">{entry.name}</h2>
                  {sortMode === "hot" && <div className="mt-2" aria-label="Deck inclusion change">
                    {entry.adoption ? <>
                      <div className="text-lg font-semibold tabular-nums">{(entry.adoption.prior * 100).toFixed(1)}% → {(entry.adoption.recent * 100).toFixed(1)}%</div>
                      <div aria-label={`${(entry.adoption.change * 100).toFixed(1)} percentage points`} className="text-sm font-medium tabular-nums text-ctp-subtext1">{entry.adoption.change > 0 ? "+" : ""}{(entry.adoption.change * 100).toFixed(1)} pp</div>
                    </> : <span className="text-sm text-ctp-subtext0">Change unavailable</span>}
                  </div>}
                  <div className="mt-2 text-sm font-semibold text-ctp-text">{entry.deckCount.toLocaleString()} decks{sortMode === "hot" ? " · all time" : ""}</div>
                  <div className="mt-1 text-xs text-ctp-subtext1">{(entry.adjustedWinRate * 100).toFixed(0)}% adjusted win rate</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ctp-surface1 pt-3">
                <button type="button" onClick={() => toggleSelected(entry.name)} aria-pressed={isSelected} className={`min-h-control rounded-lg border px-3 py-2 text-xs font-medium ${isSelected ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-blue"}`}>
                  {isSelected ? "Remove from combination" : "Add to combination"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ctp-subtext0">
                <span>{entry.eventCount.toLocaleString()} events</span>
                <span>{(entry.avgWinRate * 100).toFixed(0)}% raw win rate</span>
                {entry.communityPercent !== null && <span>{(entry.communityPercent * 100).toFixed(0)}% community usage</span>}
              </div>
              {packages.length > 0 && <div className="mt-1 flex flex-wrap gap-x-3">{packages.map(packageEntry => <Link key={packageEntry.id} to={`/cards/packages#${packageEntry.id}`} className="inline-flex min-h-control items-center text-xs text-ctp-teal hover:underline">{packageEntry.label}</Link>)}</div>}
            </article>
          );
        })}
      </div>}</GroupedCardResults>

      </TabPanel>
      <TabPanel baseId="card-stats" tab="combinations" active={view} className="mt-4">
        {!selectedCards.length ? <InlineState>Select one or more cards in <Button onClick={() => openStatsView("cards")}>Cards</Button> to find decks that play them together.</InlineState> : <>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCards.map(name => <Button key={name} aria-label={`Remove ${name}`} onClick={() => toggleSelected(name)}>{name} ×</Button>)}
            <Button onClick={() => setSelectedCards([])}>Clear selection</Button>
          </div>
          <PublishedSourceStatus label="Deck data" status={combinationStatus} hasData={combination.deckCount !== undefined} />
          {combination.deckCount !== undefined && <p className="mt-3 text-sm text-ctp-subtext1" role="status">
            {combination.deckCount ? `${combination.deckCount} decks match` : "No decks match this combination."}
          </p>}
          {!!combination.deckCount && <div className="mt-3"><TopCardsSections topCards={comboTopCards} cardImages={comboCardImages} /></div>}
        </>}
      </TabPanel>
      <TabPanel baseId="card-stats" tab="keywords" active={view}>
        <PublishedSourceStatus label="Keyword statistics" status={keywordsStatus} hasData={!!keywordStatsData} />
        {keywordStatsData && <KeywordStatsSection rows={keywordRows} sortMode={keywordSortMode} onSortChange={setKeywordSortMode} />}
      </TabPanel>
      <TabPanel baseId="card-stats" tab="composition" active={view}>
        <PublishedSourceStatus label="Deck composition" status={compositionStatus} hasData={!!compositionData} />
        {compositionData && <CompositionStatsSection rows={compositionRows} types={compositionTypesPresent} activeType={activeCompositionType} bestIndex={compositionBestIndex} onTypeChange={setCompositionType} />}
      </TabPanel>
    </PageLayout>
  );
}
