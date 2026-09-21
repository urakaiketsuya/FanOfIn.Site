import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { priceKey, type PackageCandidateEvidence, type PriceHistoryPoint, type TopCardsBySection } from "@gatcg/shared";
import { gatcgApi } from "../../lib/api/client";
import { useCard } from "./useCard";
import { usePriceLookup } from "../pricing/usePriceLookup";
import { usePriceHistoryData } from "../pricing/usePriceHistory";
import { useCardStatsData, useArchetypeTaxonomyData, useCardQuantityStatsData } from "../archetypes/data";
import { useCardCatalog } from "./useCardCatalog";
import { useCardCombination } from "./useCardCombination";
import { useCardSynergy } from "./useCardSynergy";
import { useSimilarCards } from "./useSimilarCards";
import { earliestReleaseDate } from "../../lib/cardSimilarity";
import { useIntentCards } from "./useIntentCards";
import { getCardPackageMembership } from "../deckbuilder/packageGuardrails";
import { useMinedPackageCandidates } from "../deckbuilder/useMinedPackageCandidates";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCommunityBlendedCardInclusion, useCommunityBlendedDeckReferences } from "../community/data";
import { useHipsterData } from "../players/data";
import { usePlayerNameById, useEventNameById } from "../tournaments/data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import Tabs from "../../components/ui/Tabs";
import PageLayout from "../../components/layout/PageLayout";
import { InlineState, EmptyState } from "../../components/ui/ContentState";
import { CardComparePanel, CardPlayedWithPanel, CardSynergyPanel } from "./CardRelationshipPanels";
import CardInfoPanel from "./CardInfoPanel";
import CardDecksPanel from "./CardDecksPanel";
import CardSimilarEffectsPanel from "./CardSimilarEffectsPanel";
import CardIntentPanel from "./CardIntentPanel";
import CardHero from "./CardHero";
import { toTopDecksListEntry } from "../topdecks/topDecksListEntry";

const MAX_TOP_DECKS_SHOWN = 5;
const MAX_RECENT_DECKS_SHOWN = 5;
const MAX_UNIQUE_DECKS_SHOWN = 3;
const MAX_CHAMPIONS_SHOWN = 8;
/** Picks which market-price series to chart: Normal if it has enough real points, else Foil, else nothing (ThemaSparkline itself already no-ops under 2 points, but this also decides which label to show). */
function selectPriceSeries(points: PriceHistoryPoint[]): { label: string; dated: { date: string; value: number }[] } | null {
  const normal = points.filter((p) => p.normalMarket !== null).map((p) => ({ date: p.date, value: p.normalMarket as number }));
  if (normal.length >= 2) return { label: "Normal", dated: normal };
  const foil = points.filter((p) => p.foilMarket !== null).map((p) => ({ date: p.date, value: p.foilMarket as number }));
  if (foil.length >= 2) return { label: "Foil", dated: foil };
  return null;
}

type CardTab = "info" | "usedWith" | "synergy" | "similar" | "intent" | "decks" | "compare";

const TABS: { key: CardTab; label: string }[] = [
  { key: "info", label: "Info" },
  { key: "usedWith", label: "Played With" },
  { key: "synergy", label: "Synergy" },
  { key: "similar", label: "Similar Effects" },
  { key: "intent", label: "Intent Cards" },
  { key: "decks", label: "Decks" },
  { key: "compare", label: "Compare" },
];
const TAB_KEYS = TABS.map((t) => t.key);

export default function CardDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { card, loading } = useCard(slug);
  useDocumentTitle(
    card?.name,
    card && `${[card.types.join("/"), card.classes.join("/"), card.elements.join("/")].filter(Boolean).join(" · ")}${
      card.effect ? ` — ${card.effect.replace(/\s+/g, " ").slice(0, 140)}` : ""
    }`,
  );
  const [editionIndex, setEditionIndex] = useState(0);
  const [editionsExpanded, setEditionsExpanded] = useState(false);
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "info");
  const options = useQuery({ queryKey: ["option-definitions"], queryFn: gatcgApi.getOptionDefinitions });
  const rarityDisplay = (rarity: number) =>
    options.data?.rarity.find((r) => r.value === String(rarity))?.display ?? String(rarity);
  // Gate every large published dataset behind the tab that actually needs it — CardDetail used to
  // eagerly fetch every dataset below (roughly 60MB+ combined: deck-card-index, deck-popularity-index,
  // hipster, omnidex index/players, archetype-taxonomy, community deck-references) on every page
  // load regardless of which of the 7 tabs (if any) the visitor opened, since "info" is the default.
  // Only "info"/"similar" need cardStatsData/quantity/community-inclusion; the rest are per-tab.
  const needsDecksTab = tab === "decks";
  const needsUsedWithTab = tab === "usedWith";
  const needsSynergyTab = tab === "synergy";
  const needsIntentTab = tab === "intent";
  const needsPopularityIndex = needsDecksTab || needsSynergyTab;

  const prices = usePriceLookup();
  const priceHistoryData = usePriceHistoryData();
  const cardStatsData = useCardStatsData(tab === "info" || tab === "similar");
  const cardStat = cardStatsData?.cards.find((c) => c.name === card?.name);
  const metaShare = cardStat && cardStatsData && cardStatsData.decksConsidered > 0 ? cardStat.deckCount / cardStatsData.decksConsidered : null;
  const communityCardInclusion = useCommunityBlendedCardInclusion("STANDARD", tab === "info");
  const communityInclusion = communityCardInclusion?.overall.find((c) => c.name === card?.name);
  const cardQuantityStatsData = useCardQuantityStatsData(tab === "info");
  const cardQuantityStat = cardQuantityStatsData?.cards.find((c) => c.name === card?.name);
  // Below this many decks, a quantity bucket is more likely a one-off brew or data quirk than a
  // real signal — same MIN_SAMPLE_SIZE magnitude used everywhere else in this codebase.
  const quantityBuckets = cardQuantityStat?.quantities.filter((q) => q.deckCount >= 5) ?? [];

  const cardCatalog = useCardCatalog();
  // Same slug-first, name-fallback resolution DecklistView.tsx's own Tokens section already uses —
  // a CardReference only carries {kind, name, slug, direction}, no image, so References/Referenced
  // by need this to show a thumbnail/hover-preview instead of plain text links.
  const catalogBySlug = useMemo(() => new Map(cardCatalog.map((c) => [c.slug, c])), [cardCatalog]);
  function resolveReference(ref: { slug: string; name: string }) {
    return catalogBySlug.get(ref.slug) ?? cardCatalog.find((c) => c.name === ref.name);
  }
  const compareCardNames = useMemo(() => Array.from(new Set(cardCatalog.map((c) => c.name))).sort(), [cardCatalog]);
  const [compareWith, setCompareWith] = useState<string[]>([]);
  const [compareInput, setCompareInput] = useState("");
  // Reseeds to just this page's card whenever it changes (navigating to a different card) —
  // otherwise a stale comparison from the previous card page would carry over.
  useEffect(() => {
    if (card) setCompareWith([card.name]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.name]);

  function addCompareCard(name: string) {
    if (!compareCardNames.includes(name) || compareWith.includes(name)) return;
    setCompareWith((prev) => [...prev, name]);
    setCompareInput("");
  }

  function removeCompareCard(name: string) {
    setCompareWith((prev) => prev.filter((n) => n !== name));
  }

  const archetypeTaxonomyData = useArchetypeTaxonomyData(needsDecksTab);
  const popularityIndexData = useDeckPopularityIndexData(needsPopularityIndex);
  const eventNameById = useEventNameById(needsDecksTab);
  const hipsterData = useHipsterData(needsDecksTab);
  const playerName = usePlayerNameById(needsDecksTab);
  const cardDeckReferences = useCommunityBlendedDeckReferences(needsDecksTab);
  const communityDeckRefs = card ? (cardDeckReferences?.byCardName[card.name] ?? []) : [];

  const selectedCardNames = useMemo(() => (card ? [card.name] : []), [card]);
  const combination = useCardCombination(selectedCardNames, needsDecksTab || needsUsedWithTab);
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

  const deckIdSet = useMemo(() => new Set(combination.deckIds), [combination.deckIds]);

  const synergy = useCardSynergy(card?.name ?? null, needsSynergyTab);
  const synergyCardImages = useCardsByNames(useMemo(() => synergy.cards.map((c) => c.cardName), [synergy.cards]));

  const similarCardsList = useSimilarCards(card ?? null);
  const similarCardsSorted = useMemo(
    () => [...similarCardsList].sort((a, b) => (earliestReleaseDate(a) ?? "").localeCompare(earliestReleaseDate(b) ?? "")),
    [similarCardsList],
  );

  const intent = useIntentCards(card ?? null);
  const cardPackages = useMemo(() => (card ? getCardPackageMembership(card.name) : []), [card]);
  const [showExperimentalIntent, setShowExperimentalIntent] = useState(false);
  const visibleIntentFeeds = useMemo(
    () => intent.feeds.filter((m) => showExperimentalIntent || m.tier === "validated"),
    [intent.feeds, showExperimentalIntent],
  );
  const visibleIntentPoweredBy = useMemo(
    () => intent.poweredBy.filter((m) => showExperimentalIntent || m.tier === "validated"),
    [intent.poweredBy, showExperimentalIntent],
  );
  const experimentalIntentCount =
    intent.feeds.filter((m) => m.tier === "experimental").length + intent.poweredBy.filter((m) => m.tier === "experimental").length;

  // Real-deck corroboration for Intent Cards matches: package-candidate mining scores the exact
  // same kind of relationship against actual deck data, and (via `archetypeSources`) ties some of
  // it to specific concrete builds. Only pair-level candidates (memberCards.length === 1) apply
  // here — a multi-card family candidate doesn't confirm any one pair by itself.
  const minedPackages = useMinedPackageCandidates(needsIntentTab);
  const packageEvidenceByPair = useMemo(() => {
    const map = new Map<string, PackageCandidateEvidence>();
    for (const candidate of minedPackages?.candidates ?? []) {
      if (candidate.memberCards.length !== 1) continue;
      const key = [candidate.anchorCard, candidate.memberCards[0]].sort().join("\u0000");
      const existing = map.get(key);
      if (!existing || candidate.confidenceScore > existing.confidenceScore) map.set(key, candidate);
    }
    return map;
  }, [minedPackages]);
  const intentPackageEvidence = (otherCardName: string): PackageCandidateEvidence | undefined =>
    card ? packageEvidenceByPair.get([card.name, otherCardName].sort().join("\u0000")) : undefined;

  const topDecks = useMemo(() => {
    if (!popularityIndexData) return [];
    return popularityIndexData.entries
      .filter((e) => deckIdSet.has(e.deckId))
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, MAX_TOP_DECKS_SHOWN)
      .map((entry) => ({
        ...toTopDecksListEntry(entry, eventNameById),
        eventDate: entry.eventDate,
        deckHash: entry.deckHash,
      }));
  }, [popularityIndexData, deckIdSet, eventNameById]);

  const recentDecks = useMemo(() => {
    if (!popularityIndexData) return [];
    return popularityIndexData.entries
      .filter((entry) => deckIdSet.has(entry.deckId))
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || b.weightedScore - a.weightedScore)
      .slice(0, MAX_RECENT_DECKS_SHOWN)
      .map((entry) => ({
        ...toTopDecksListEntry(entry, eventNameById),
        eventDate: entry.eventDate,
        deckHash: entry.deckHash,
      }));
  }, [popularityIndexData, deckIdSet, eventNameById]);

  const uniqueDecks = useMemo(() => {
    if (!hipsterData) return [];
    return hipsterData.deckScores
      .filter((d) => deckIdSet.has(`${d.eventId}:${d.player}`))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_UNIQUE_DECKS_SHOWN);
  }, [hipsterData, deckIdSet]);

  // Cluster-level ("Water Diao Chan", not just "Diao Chan") builds this card is a *defining*
  // member of — a strict upgrade over the older per-Champion `playedByChampions` this replaced,
  // via `cardClusterIndex` (pipeline/src/analysis/archetypeTaxonomy.ts). `?? []`/`?.` guard a
  // stale IndexedDB copy from before this field shipped, same convention as `c.seasons ?? []`
  // elsewhere in this codebase.
  const playedByArchetypes = useMemo(() => {
    if (!archetypeTaxonomyData || !card) return [];
    const hits = archetypeTaxonomyData.cardClusterIndex?.[card.name] ?? [];
    const clusterById = new Map(archetypeTaxonomyData.clusters.map((c) => [c.id, c]));
    return hits
      .map((hit) => {
        const cluster = clusterById.get(hit.clusterId);
        return cluster ? { cluster, prevalence: hit.prevalence } : null;
      })
      .filter((row): row is { cluster: (typeof archetypeTaxonomyData.clusters)[number]; prevalence: number } => row !== null)
      .sort((a, b) => b.cluster.playerCount - a.cluster.playerCount)
      .slice(0, MAX_CHAMPIONS_SHOWN);
  }, [archetypeTaxonomyData, card]);

  if (loading) {
    return (
      <PageLayout data-component="CardDetail" width="standard">
        <InlineState className="mt-10">Loading…</InlineState>
      </PageLayout>
    );
  }

  if (!card) {
    return (
      <PageLayout data-component="CardDetail" width="standard">
        <EmptyState
          title="Card not found"
          description={`Card "${slug}" not found.`}
          action={<Link to="/cards" className="text-ctp-blue hover:underline">Back to Cards</Link>}
        />
      </PageLayout>
    );
  }

  const edition = card.editions[editionIndex] ?? card.editions[0];
  const price = edition ? prices.get(priceKey(edition.set.prefix, edition.collector_number)) : undefined;
  const priceHistoryPoints = edition ? priceHistoryData?.history[priceKey(edition.set.prefix, edition.collector_number)] : undefined;
  const priceSeries = priceHistoryPoints ? selectPriceSeries(priceHistoryPoints) : null;

  return (
    <PageLayout data-component="CardDetail" width="standard">
      <Link to="/cards" className="text-sm text-ctp-blue hover:underline">
        &larr; Back to Cards
      </Link>

      <CardHero card={card} edition={edition} editionIndex={editionIndex} editionsExpanded={editionsExpanded} price={price} priceSeries={priceSeries} rarityLabel={rarityDisplay} onEditionChange={setEditionIndex} onEditionsExpandedChange={setEditionsExpanded} />

      <div className="sticky top-0 z-20 -mx-2 mt-5 rounded-xl border border-ctp-surface1/70 bg-ctp-base/95 px-2 pt-1 shadow-md shadow-black/20 backdrop-blur">
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Card data" variant="pill" />
      </div>

      {tab === "info" && (
        <CardInfoPanel card={card} illustrator={edition?.illustrator} cardStat={cardStat} metaShare={metaShare} communityShare={communityInclusion?.percentOfDecks} quantityBuckets={quantityBuckets} resolveReference={resolveReference} />
      )}

      {tab === "decks" && <CardDecksPanel cardName={card.name} archetypes={playedByArchetypes} recentDecks={recentDecks} topDecks={topDecks} uniqueDecks={uniqueDecks} communityDecks={communityDeckRefs} playerName={playerName} />}

      {tab === "usedWith" && (
        <CardPlayedWithPanel cardName={card.name} deckCount={combination.deckCount} topCards={comboTopCards} cardImages={comboCardImages} />
      )}

      {tab === "synergy" && (
        <CardSynergyPanel cardName={card.name} cards={synergy.cards} totalDecks={synergy.totalDecks} cardImages={synergyCardImages} />
      )}

      {tab === "similar" && (
        <CardSimilarEffectsPanel card={card} cardStat={cardStat} similarCards={similarCardsSorted} resolveReference={resolveReference} />
      )}

      {tab === "intent" && (
        <CardIntentPanel cardName={card.name} packages={cardPackages} feeds={visibleIntentFeeds} poweredBy={visibleIntentPoweredBy} experimentalCount={experimentalIntentCount} showExperimental={showExperimentalIntent} onShowExperimentalChange={setShowExperimentalIntent} evidenceFor={intentPackageEvidence} />
      )}


      {tab === "compare" && (
        <CardComparePanel options={compareCardNames} input={compareInput} selected={compareWith} onInputChange={setCompareInput} onAdd={addCompareCard} onRemove={removeCompareCard} />
      )}
    </PageLayout>
  );
}
