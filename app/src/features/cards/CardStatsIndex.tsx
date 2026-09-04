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
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

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
    const filtered = source.filter((c) => c.deckCount >= minDecks && (query === "" || c.name.toLowerCase().includes(query)));
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
  }, [cardStatsData, sortMode, minDecks, category, search, communityByName, totalTournamentDecks]);

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
    <PageLayout>
      <PageHeader
        title="Card Stats"
        description={
          <>
            Usage and win rate across every public decklist. Add cards to the filter below to see what's played
            alongside them. "Adjusted" win rate is shrunk toward 50% for small samples —{" "}
            <Link to="/methodology#small-samples" className="text-ctp-blue hover:underline">learn more</Link>.
          </>
        }
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

      <input
        type="text"
        aria-label="Search by card name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by card name…"
        className="mt-4 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Type:</span>
        <button
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={`rounded-md border px-2 py-1 text-xs ${
            category === null ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
          }`}
        >
          All
        </button>
        {categoriesPresent.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-md border px-2 py-1 text-xs ${
              category === c ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {EVENT_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Sort by:</span>
        {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            aria-pressed={sortMode === mode}
            className={`rounded-md border px-2 py-1 text-xs ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {SORT_LABELS[mode]}
          </button>
        ))}
      </div>

      {sortMode === "hype" && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          Community usage (blended brew lists from {communitySourceLabel}) minus tournament share of decks — sorted
          highest first: cards brewers reach for far more than tournament players do. Two different populations
          optimizing for different things (fun/budget/theme vs. winning), not a performance verdict on either.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Min decks:</span>
        {MIN_DECKS_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => setMinDecks(n)}
            aria-pressed={minDecks === n}
            className={`rounded-md border px-2 py-1 text-xs ${
              minDecks === n ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {n === 0 ? "Any" : `${n}+`}
          </button>
        ))}
      </div>

      {!cardStatsData && <InlineState className="mt-6">Loading…</InlineState>}
      {cardStatsData && rows.length === 0 && <InlineState className="mt-6">No cards match this filter yet.</InlineState>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1 pr-6">Card</th>
              <th className="py-1 pr-6">Decks</th>
              <th className="py-1 pr-6">Events</th>
              <th className="py-1 pr-6">Win rate</th>
              <th className="py-1 pr-6">Adjusted</th>
              <th className="py-1 pr-6" title={`Share of blended community decks (${communitySourceLabel}) that include this card`}>Community usage</th>
              <th className="py-1 pr-6">Packages</th>
              <th className="py-1"></th>
            </tr>
          </thead>
        <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
          {visibleRows.map((c) => {
            const card = cardImages.get(c.name);
            const isSelected = selectedCards.includes(c.name);
            const packages = getCardPackageMembership(c.name);
            return (
              <tr key={c.name}>
                <td className="py-1.5 pr-6">
                  <CardHoverPreview image={card?.editions[0]?.image} alt={c.name}>
                    {c.slug ? (
                      <Link to={`/cards/${c.slug}`} className="flex items-center gap-2 text-ctp-text hover:text-ctp-blue">
                        {card?.editions[0] && (
                          <CardImage image={card.editions[0].image} alt={c.name} className="h-10 w-7 rounded object-cover object-top" />
                        )}
                        {c.name}
                      </Link>
                    ) : (
                      <span className="text-ctp-text">{c.name}</span>
                    )}
                  </CardHoverPreview>
                </td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{c.deckCount}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{c.eventCount}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{(c.avgWinRate * 100).toFixed(0)}%</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{(c.adjustedWinRate * 100).toFixed(0)}%</td>
                <td className="py-1.5 pr-6 text-ctp-mauve">{c.communityPercent !== null ? `${(c.communityPercent * 100).toFixed(0)}%` : "—"}</td>
                <td className="py-1.5 pr-6">
                  {packages.length === 0 ? <span className="text-ctp-overlay0">—</span> : (
                    <div className="flex flex-wrap gap-1">
                      {packages.map((entry) => (
                        <Link
                          key={entry.id}
                          to={`/cards/packages#${entry.id}`}
                          className="rounded-full border border-ctp-teal/40 bg-ctp-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-ctp-teal"
                          title={`${entry.activation} Registry membership does not mean the package is active in every deck containing this card.`}
                        >
                          {entry.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSelected(c.name)}
                    aria-pressed={isSelected}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      isSelected
                        ? "border-ctp-blue text-ctp-blue"
                        : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                    }`}
                  >
                    {isSelected ? "− Remove" : "+ Filter"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <LoadMore remaining={rows.length - visibleCount} onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)} />

      <Section
        className="mt-10"
        heading="compact"
        title="Keywords"
        description="Ability keyword usage and win rate across every public decklist (main + material, weighted by copies)."
      >
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ctp-subtext0">Sort by:</span>
          {(["usage", "adjusted", "raw"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setKeywordSortMode(mode)}
              className={`rounded-md border px-2 py-1 text-xs ${
                keywordSortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
              }`}
            >
              {mode === "usage" ? "Usage" : mode === "adjusted" ? "Win rate (adjusted)" : "Win rate (raw)"}
            </button>
          ))}
        </div>

        {!keywordStatsData && <InlineState className="mt-4">Loading…</InlineState>}

        <div className="mt-2 overflow-x-auto">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                <th className="py-1 pr-6">Keyword</th>
                <th className="py-1 pr-6">Decks</th>
                <th className="py-1 pr-6">Events</th>
                <th className="py-1 pr-6">Win rate</th>
                <th className="py-1">Adjusted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
              {keywordRows.map((k) => (
                <tr key={k.keyword}>
                  <td className="py-1.5 pr-6 whitespace-nowrap text-ctp-text">{k.keyword}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{k.deckCount}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{k.eventCount}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{(k.avgWinRate * 100).toFixed(0)}%</td>
                  <td className="py-1.5 text-ctp-subtext1">{(k.adjustedWinRate * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        className="mt-10"
        heading="compact"
        title="Deck Composition"
        description="Does running more of a card type change your odds? Every public main deck (weighted by copies), bucketed by what share of it one type makes up, with the average win rate in each bucket."
      >
        {compositionTypesPresent.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ctp-subtext0">Type:</span>
            {compositionTypesPresent.map((t) => (
              <button
                key={t}
                onClick={() => setCompositionType(t)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  activeCompositionType === t ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {!compositionData && <InlineState className="mt-4">Loading…</InlineState>}

        <div className="mt-2 overflow-x-auto">
          <table className="w-max min-w-full text-sm">
            <thead>
              <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                <th className="py-1 pr-6">Share of main deck</th>
                <th className="py-1 pr-6">Decks</th>
                <th className="py-1 pr-6">Win rate</th>
                <th className="py-1">Adjusted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
              {compositionRows.map((r, i) => (
                <tr key={r.bucket}>
                  <td className="py-1.5 pr-6 whitespace-nowrap text-ctp-text">{r.bucket}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{r.deckCount}</td>
                  <td className="py-1.5 pr-6 text-ctp-subtext1">{(r.avgWinRate * 100).toFixed(0)}%</td>
                  <td className={`py-1.5 font-semibold ${i === compositionBestIndex ? "text-ctp-green" : "text-ctp-subtext1"}`}>
                    {(r.adjustedWinRate * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </PageLayout>
  );
}
