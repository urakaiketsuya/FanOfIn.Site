import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EVENT_CATEGORY_LABELS, EVENT_CATEGORY_ORDER, type TopCardsBySection } from "@gatcg/shared";
import { useCardStatsData, useKeywordStatsData, useCompositionWinRateData } from "../archetypes/data";
import { useCardsByNames } from "../events/useCardsByNames";
import { useCardCombination } from "./useCardCombination";
import { useCommunityBlendedCardInclusion, useCommunitySourceCounts } from "../community/data";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import TopCardsSections from "../../components/TopCardsSections";
import LoadMore from "../../components/LoadMore";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { getCardPackageMembership } from "../deckbuilder/packageGuardrails";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState } from "../../components/ui/ContentState";
import { useCardCatalog } from "./useCardCatalog";
import { CompositionStatsSection, KeywordStatsSection } from "./CardStatsSupplementalSections";

type SortMode = "usage" | "adjusted" | "raw" | "hot" | "hype";

const SORT_LABELS: Record<SortMode, string> = {
  usage: "Usage",
  adjusted: "Win rate (adjusted)",
  raw: "Win rate (raw)",
  hot: "Hot",
  hype: "Hype gap",
};

const MIN_DECKS_OPTIONS = [0, 5, 10, 20];
const PAGE_SIZE = 50;

export default function CardStatsIndex() {
  useDocumentTitle("Card Stats", "Card usage and win-rate stats across ranked Grand Archive TCG tournaments.");
  const cardStatsData = useCardStatsData();
  const cardCatalog = useCardCatalog();
  const searchableTextByName = useMemo(() => new Map(cardCatalog.map((card) => [card.name, `${card.name} ${card.effect ?? ""}`.replace(/\*\*/g, "").toLowerCase()])), [cardCatalog]);
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
  // cards.json (already fetched on this page) publishes this directly — avoids fetching the
  // ~10MB deck-popularity-index.json/deck-sightings.json just for their own .length.
  const totalTournamentDecks = cardStatsData?.decksConsidered ?? 0;
  const [sortMode, setSortMode] = useState<SortMode>("usage");
  const [minDecks, setMinDecks] = useState(5);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [comboCollapsed, setComboCollapsed] = useState(false);
  const [keywordSortMode, setKeywordSortMode] = useState<"usage" | "adjusted" | "raw">("usage");
  const [compositionType, setCompositionType] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const rows = useMemo(() => {
    if (!cardStatsData) return [];
    const source = category ? (cardStatsData.byCategory[category] ?? []) : cardStatsData.cards;
    const query = search.trim().toLowerCase();
    const filtered = source.filter((c) => c.deckCount >= minDecks && (query === "" || (searchableTextByName.get(c.name) ?? c.name.toLowerCase()).includes(query)));
    // "Hype gap" — community popularity minus tournament popularity, two different real
    // percentages of two different populations (brewers optimizing for fun/budget/theme vs
    // tournament players optimizing for winning), not a performance judgment. Community usage
    // is null (not 0) when the blended community dataset has no data for this card at all, so a
    // genuinely unbrewed card doesn't outrank one that's merely below the community dataset's own
    // floor. "Community" here blends ShoutAtYourDecks + Sleeved + TCGArchitect (see pipeline/src/community/blend.ts).
    const withHype = filtered.map((c) => {
      const communityEntry = communityByName.get(c.name);
      const communityPercent = communityEntry?.percentOfDecks ?? null;
      const tournamentPercent = totalTournamentDecks > 0 ? c.deckCount / totalTournamentDecks : 0;
      return { ...c, communityPercent, hypeGap: communityPercent !== null ? communityPercent - tournamentPercent : null };
    });
    return withHype.sort((a, b) => {
      switch (sortMode) {
        case "adjusted":
          return b.adjustedWinRate - a.adjustedWinRate;
        case "raw":
          return b.avgWinRate - a.avgWinRate;
        case "hot":
          return b.recentDeckCount - b.priorDeckCount - (a.recentDeckCount - a.priorDeckCount);
        case "hype":
          return (b.hypeGap ?? -1) - (a.hypeGap ?? -1);
        default:
          return b.deckCount - a.deckCount;
      }
    });
  }, [cardStatsData, sortMode, minDecks, category, search, searchableTextByName, communityByName, totalTournamentDecks]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortMode, minDecks, category, search]);

  const visibleRows = rows.slice(0, visibleCount);
  const cardImages = useCardsByNames(visibleRows.map((c) => c.name));

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
    <PageLayout data-component="CardStatsIndex">
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <input
          type="text"
          aria-label="Search by card name or effect text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards…"
          className="col-span-2 min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
        />
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} aria-label="Sort cards" className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => <option key={mode} value={mode}>{SORT_LABELS[mode]}</option>)}
        </select>
        <select value={category ?? ""} onChange={(e) => setCategory(e.target.value || null)} aria-label="Tournament type" className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
          <option value="">All tournaments</option>
          {categoriesPresent.map((value) => <option key={value} value={value}>{EVENT_CATEGORY_LABELS[value] ?? value}</option>)}
        </select>
      </div>

      {sortMode === "hype" && (
        <details className="mt-2 text-xs text-ctp-subtext0"><summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">What is the hype gap?</summary><p className="mt-1">Community usage from {communitySourceLabel} minus tournament usage. These populations have different goals; the gap is not a performance rating.</p></details>
      )}

      <details className="mt-2 text-xs text-ctp-subtext0">
        <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">Minimum sample · {minDecks === 0 ? "Any" : `${minDecks}+ decks`}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {MIN_DECKS_OPTIONS.map((count) => <button key={count} type="button" onClick={() => setMinDecks(count)} aria-pressed={minDecks === count} className={`rounded-lg border px-3 py-1.5 text-xs ${minDecks === count ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1"}`}>{count === 0 ? "Any" : `${count}+ decks`}</button>)}
        </div>
      </details>

      {!cardStatsData && <InlineState className="mt-6">Loading…</InlineState>}
      {cardStatsData && rows.length === 0 && <InlineState className="mt-6">No cards match this filter yet.</InlineState>}

      {cardStatsData && rows.length > 0 && <p className="mt-4 text-xs text-ctp-subtext0">Showing {visibleRows.length.toLocaleString()} of {rows.length.toLocaleString()} cards</p>}
      <div className="mt-2 grid gap-3 sm:grid-cols-2 sm:items-start">
        {visibleRows.map((entry) => {
          const card = cardImages.get(entry.name);
          const isSelected = selectedCards.includes(entry.name);
          const packages = getCardPackageMembership(entry.name);
          return (
            <article key={entry.name} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 shadow-sm shadow-black/20">
              <div className="flex items-start gap-3">
                <CardHoverPreview image={card?.editions[0]?.image} alt={entry.name}>
                  {card?.editions[0]?.image ? (
                    <Link to={`/cards/${entry.slug ?? card.slug}`} className="block shrink-0" aria-label={`View ${entry.name}`}>
                      <CardImage image={card.editions[0].image} alt={entry.name} className="h-32 w-24 rounded-md object-cover object-top" />
                    </Link>
                  ) : <div className="h-32 w-24 shrink-0 rounded-md bg-ctp-surface0" />}
                </CardHoverPreview>
                <div className="min-w-0 flex-1">
                  {entry.slug ? <Link to={`/cards/${entry.slug}`} className="font-medium text-ctp-text hover:text-ctp-blue">{entry.name}</Link> : <span className="font-medium text-ctp-text">{entry.name}</span>}
                  <div className="mt-2 text-sm font-semibold text-ctp-text">{entry.deckCount.toLocaleString()} decks</div>
                  <div className="mt-1 text-xs text-ctp-subtext1">{(entry.adjustedWinRate * 100).toFixed(0)}% adjusted win rate</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-ctp-surface1 pt-3">
                <button type="button" onClick={() => toggleSelected(entry.name)} aria-pressed={isSelected} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-medium ${isSelected ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-blue"}`}>
                  {isSelected ? "Remove from filter" : "Filter with card"}
                </button>
                {entry.slug && <Link to={`/cards/${entry.slug}`} className="text-xs text-ctp-blue hover:underline">View card →</Link>}
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
      </div>

      <LoadMore remaining={rows.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />

      <KeywordStatsSection rows={keywordRows} loading={!keywordStatsData} sortMode={keywordSortMode} onSortChange={setKeywordSortMode} />
      <CompositionStatsSection rows={compositionRows} types={compositionTypesPresent} activeType={activeCompositionType} bestIndex={compositionBestIndex} loading={!compositionData} onTypeChange={setCompositionType} />
    </PageLayout>
  );
}
