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
  const cardStatsData = useCardStatsData();
  const cardCatalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(cardCatalog.map(card => [card.name, card])), [cardCatalog]);
  const keywordStatsData = useKeywordStatsData();
  const compositionData = useCompositionWinRateData();
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
  const [comboCollapsed, setComboCollapsed] = useState(false);
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

  const combination = useCardCombination(selectedCards);
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

  function toggleSelected(name: string) {
    setSelectedCards((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  return (
    <PageLayout width="fluid" data-component="CardStatsIndex">
      <PageHeader
        title="Card Stats"
        actions={
          <Link to="/cards" className="text-sm text-ctp-blue hover:underline">
            Browse the catalog &rarr;
          </Link>
        }
      />

      {selectedCards.length > 0 && (
        <div className="mt-4 rounded-lg border border-ctp-blue bg-ctp-mantle p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ctp-subtext0">Decks containing:</span>
            {selectedCards.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleSelected(name)}
                className="flex items-center gap-1 rounded-full border border-ctp-blue bg-ctp-surface0 px-2 py-0.5 text-xs text-ctp-blue"
              >
                {name}
                <span aria-hidden="true">&times;</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setComboCollapsed((v) => !v)}
              className="ml-auto text-xs text-ctp-subtext0 hover:text-ctp-text"
            >
              {comboCollapsed ? "Expand" : "Collapse"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedCards([])}
              className="text-xs text-ctp-subtext0 hover:text-ctp-text"
            >
              Clear
            </button>
          </div>

          <p className="mt-2 text-sm text-ctp-subtext1">
            {combination.deckCount === undefined ? "Loading deck data…" : `${combination.deckCount} decks match`}
          </p>

          {!comboCollapsed && combination.deckCount !== undefined && combination.deckCount > 0 && (
            <div className="mt-3">
              <TopCardsSections topCards={comboTopCards} cardImages={comboCardImages} />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2"><FilterQuery text={search} facets={{}} allowed={["classes", "types", "subtypes", "elements", "sets", "printingSets", "rarities"]} onChange={(text, facets) => setSearch(formatFilterQuery(text, facets))} /></div>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort cards" className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => <option key={mode} value={mode}>{SORT_LABELS[mode]}</option>)}
        </select>
        <select value={category ?? ""} onChange={(e) => setCategory(e.target.value || null)} aria-label="Tournament type" className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
          <option value="">All tournaments</option>
          {categoriesPresent.map((value) => <option key={value} value={value}>{EVENT_CATEGORY_LABELS[value] ?? value}</option>)}
        </select>
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

      {sortMode === "hype" && (
        <details className="mt-2 text-xs text-ctp-subtext0"><summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">What is the hype gap?</summary><p className="mt-1">Community usage from {communitySourceLabel} minus tournament usage. These populations have different goals; the gap is not a performance rating.</p></details>
      )}

      <details className="mt-2 text-xs text-ctp-subtext0">
        <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">Minimum sample · {minDecks === 0 ? "Any" : `${minDecks}+ decks`}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {MIN_DECKS_OPTIONS.map((count) => <button key={count} type="button" onClick={() => setMinDecks(count)} aria-pressed={minDecks === count} className={`min-h-control rounded-lg border px-3 py-1.5 text-xs ${minDecks === count ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1"}`}>{count === 0 ? "Any" : `${count}+ decks`}</button>)}
        </div>
      </details>

      {!cardStatsData && <InlineState className="mt-6">Loading…</InlineState>}
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
                  {entry.slug ? <Link to={`/cards/${entry.slug}`} className="font-medium text-ctp-text hover:text-ctp-blue">{entry.name}</Link> : <span className="font-medium text-ctp-text">{entry.name}</span>}
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
                  {isSelected ? "Remove from filter" : "Filter with card"}
                </button>
                {entry.slug && <Link to={`/cards/${entry.slug}`} className="inline-flex min-h-control items-center text-xs text-ctp-blue hover:underline">View card →</Link>}
              </div>
              <details className="mt-2 text-xs text-ctp-subtext0">
                <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">More statistics</summary>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  <span>{entry.eventCount.toLocaleString()} events</span>
                  <span>{(entry.avgWinRate * 100).toFixed(0)}% raw win rate</span>
                  {entry.communityPercent !== null && <span>{(entry.communityPercent * 100).toFixed(0)}% community usage</span>}
                </div>
                {packages.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{packages.map((packageEntry) => <Link key={packageEntry.id} to={`/cards/packages#${packageEntry.id}`} className="rounded-full border border-ctp-teal/40 bg-ctp-teal/10 px-2 py-1 text-ctp-teal" title={`${packageEntry.activation} Registry membership does not mean the package is active in every deck containing this card.`}>{packageEntry.label}</Link>)}</div>}
              </details>
            </article>
          );
        })}
      </div>}</GroupedCardResults>

      <KeywordStatsSection rows={keywordRows} loading={!keywordStatsData} sortMode={keywordSortMode} onSortChange={setKeywordSortMode} />
      <CompositionStatsSection rows={compositionRows} types={compositionTypesPresent} activeType={activeCompositionType} bestIndex={compositionBestIndex} loading={!compositionData} onTypeChange={setCompositionType} />
    </PageLayout>
  );
}
