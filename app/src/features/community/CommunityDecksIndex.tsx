import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DeckFormat } from "@gatcg/shared";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { championKeyToDisplayName, championNameToSlug } from "../../lib/championSlug";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import Section from "../../components/ui/Section";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import DisclosureChevron from "../../components/DisclosureChevron";
import { InlineState } from "../../components/ui/ContentState";
import { useCardsByNames } from "../events/useCardsByNames";
import CardArtTile from "../../components/CardArtTile";
import Button from "../../components/ui/Button";
import type { Card } from "@gatcg/shared";
import HorizontalBarChart, { type HorizontalBarChartBar } from "../../components/HorizontalBarChart";
import RangeBar from "../../components/RangeBar";
import BarChart, { type BarChartBar } from "../../components/BarChart";
import {
  useCommunityTrendStatus,
  useCommunityCardInclusion,
  useCommunityPopularity,
  useCommunityPriceDistribution,
  useCommunityArchetypes,
  useCommunityDeckEra,
} from "./data";

const TOP_CARDS_SHOWN = 30;
const TOP_ARCHETYPES_SHOWN = 20;

function TrendCard({ name, card }: { name: string; card: Card | undefined }) {
  const content = <><CardArtTile card={card} name={name} /><span className="mt-2 block break-words text-sm font-medium text-ctp-text">{name}</span></>;
  return card ? <Link to={`/cards/${card.slug}`} className="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">{content}</Link> : <div>{content}</div>;
}

function formatWholeUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function CommunityDecksIndex({ format = "STANDARD" }: { format?: DeckFormat }) {
  const isPantheon = format === "PANTHEON";
  useDocumentTitle(
    isPantheon ? "Pantheon Decks" : "Community Decks",
    "Grand Archive community deck-building trends, including card inclusion rates, champion and element popularity, price distribution, and recurring builds.",
  );

  const cardInclusion = useCommunityCardInclusion(format);
  const popularity = useCommunityPopularity(format);
  const priceDistribution = useCommunityPriceDistribution(format);
  const archetypes = useCommunityArchetypes(format);
  const deckEra = useCommunityDeckEra(format);
  const cardsStatus = useCommunityTrendStatus("card-inclusion", format);
  const popularityStatus = useCommunityTrendStatus("popularity", format);
  const priceStatus = useCommunityTrendStatus("price-distribution", format);
  const buildsStatus = useCommunityTrendStatus("archetypes", format);
  const eraStatus = useCommunityTrendStatus("deck-era", format);
  const sources = [
    { label: "Community card usage", status: cardsStatus, data: cardInclusion },
    { label: "Community popularity", status: popularityStatus, data: popularity },
    { label: "Community prices", status: priceStatus, data: priceDistribution },
    { label: "Community builds", status: buildsStatus, data: archetypes },
    { label: "Community deck eras", status: eraStatus, data: deckEra },
  ];

  const [championFilter, setChampionFilter] = useState<string>("");
  const [showAllTopCards, setShowAllTopCards] = useState(false);
  const [showAllClusters, setShowAllClusters] = useState(false);

  const championBars = useMemo<HorizontalBarChartBar[]>(
    () =>
      (popularity?.champion ?? []).map((b) => ({
        key: b.key,
        label: championKeyToDisplayName(b.key),
        value: b.deckCount,
        valueLabel: `${(b.percentOfDecks * 100).toFixed(1)}%`,
        href: `/champions/${championNameToSlug(championKeyToDisplayName(b.key))}`,
      })),
    [popularity],
  );
  const elementBars = useMemo<HorizontalBarChartBar[]>(
    () =>
      (popularity?.element ?? []).map((b) => ({
        key: b.key,
        label: b.key[0] + b.key.slice(1).toLowerCase(),
        value: b.deckCount,
        valueLabel: `${(b.percentOfDecks * 100).toFixed(1)}%`,
      })),
    [popularity],
  );

  const cardsForFilter = championFilter ? cardInclusion?.byChampion[championFilter]?.cards : cardInclusion?.overall;
  const cardsConsidered = championFilter ? cardInclusion?.byChampion[championFilter]?.deckCount : cardInclusion?.decksConsidered;
  const topCards = (cardsForFilter ?? []).slice(0, TOP_CARDS_SHOWN);
  const cardImages = useCardsByNames([
    ...topCards.map((card) => card.name),
    ...(archetypes?.clusters.slice(0, showAllClusters ? TOP_ARCHETYPES_SHOWN : 6).flatMap((cluster) => (cluster.definingCards?.length ? cluster.definingCards : cluster.mainDeck.map((card) => card.name)).slice(0, 3)) ?? []),
  ]);

  const price = championFilter ? priceDistribution?.byChampion[championFilter] : priceDistribution?.overall;

  const eraBars = useMemo<BarChartBar[]>(() => {
    if (!deckEra) return [];
    // Alternate-printing variants of the same set (e.g. "PTM" / "PTM 1st", "AMB" / "AMB Alter")
    // share a release date but publish as separate buckets – merge same-date buckets into one
    // point so the timeline reads as "when", not fragmented by print variant. See
    // docs/CALCULATIONS.md, "Deck era inference," for the known-wrinkle note this addresses.
    const byDate = new Map<string, { deckCount: number; sets: string[] }>();
    for (const b of deckEra.buckets) {
      const existing = byDate.get(b.earliestDate);
      if (existing) {
        existing.deckCount += b.deckCount;
        existing.sets.push(b.setPrefix);
      } else {
        byDate.set(b.earliestDate, { deckCount: b.deckCount, sets: [b.setPrefix] });
      }
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { deckCount, sets }]) => ({
        label: new Date(date).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        value: deckCount,
        title: `${sets.join(", ")} · ${deckCount.toLocaleString()} decks`,
      }));
  }, [deckEra]);



  return (
    <PageLayout data-component="CommunityDecksIndex" width="wide">
      <PageHeader
        title={isPantheon ? "Pantheon Decks" : "Deck Trends"}
        actions={<div className="flex flex-wrap gap-x-4 gap-y-1"><Link to="/community-decks/search" className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">Search decklists →</Link><Link to="/deck-builder" className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-ctp-blue">Build a deck →</Link></div>}
      />

      <div className="mt-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 text-sm">
        <Link to="/community-decks" className={`inline-flex min-h-control items-center rounded-md px-3 py-1.5 ${!isPantheon ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>Standard</Link>
        <Link to="/pantheon" className={`inline-flex min-h-control items-center rounded-md px-3 py-1.5 ${isPantheon ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>Pantheon</Link>
      </div>

      {popularity && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          {popularity.championDecksConsidered.toLocaleString()} decks total.
        </p>
      )}

      <div aria-label="Community data sources">
        {sources.map(({ label, status, data }) => <PublishedSourceStatus key={label} label={label} status={status} hasData={Boolean(data)} />)}
      </div>
      {cardInclusion && cardsForFilter?.length === 0 && <InlineState className="mt-4">No card usage is published for this selection.</InlineState>}
      {archetypes && archetypes.clusters.length === 0 && <InlineState className="mt-4">No recurring builds are published for this format.</InlineState>}
      {deckEra && eraBars.length === 0 && <InlineState className="mt-4">No deck era data is published for this format.</InlineState>}

      {cardInclusion && (
        <Section className="mt-6" heading="compact" title="Most played cards" actions={
          <select value={championFilter} aria-label="Champion" onChange={(event) => { setChampionFilter(event.target.value); setShowAllTopCards(false); }} className="min-h-control min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2 text-sm text-ctp-text">
            <option value="">All champions</option>
            {Object.keys(cardInclusion.byChampion).sort((a, b) => cardInclusion.byChampion[b].deckCount - cardInclusion.byChampion[a].deckCount).map((key) => <option key={key} value={key}>{championKeyToDisplayName(key)} ({cardInclusion.byChampion[key].deckCount.toLocaleString()})</option>)}
          </select>
        }>
          <p className="mb-3 text-xs text-ctp-subtext0">Share of {cardsConsidered?.toLocaleString()} community decks with a fetched card list</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(showAllTopCards ? topCards : topCards.slice(0, 8)).map((entry) => {
              const card = cardImages.get(entry.name);
              return <article key={entry.name} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-2">
                <TrendCard name={entry.name} card={card} />
                <div className="mt-1 text-sm font-semibold text-ctp-blue">{(entry.percentOfDecks * 100).toFixed(1)}% <span className="text-xs font-normal text-ctp-subtext0">of decks</span></div>
              </article>;
            })}
          </div>
          {topCards.length > 8 && <Button onClick={() => setShowAllTopCards((value) => !value)} aria-expanded={showAllTopCards} className="mt-3">{showAllTopCards ? "Show fewer cards" : `Show all ${topCards.length} cards`}</Button>}
        </Section>
      )}

      <details className="group mt-6 text-sm text-ctp-subtext1">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded font-semibold focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">Popularity and price trends<DisclosureChevron className="group-open:rotate-180" /></summary>
      {popularity && championBars.length === 0 && elementBars.length === 0 && <InlineState>No popularity data is published for this format.</InlineState>}
      {priceDistribution && !price && <InlineState>No price distribution is available for this selection.</InlineState>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {championBars.length > 0 && (
          <HorizontalBarChart
            title="Champion popularity"
            subtitle={`% of decks, out of ${popularity?.championDecksConsidered.toLocaleString()}`}
            bars={championBars}
          />
        )}
        {elementBars.length > 0 && (
          <HorizontalBarChart
            title="Element popularity"
            subtitle="% of decks containing that element. Decks can contain more than one element."
            bars={elementBars}
          />
        )}
      </div>

      {price && (
        <div className="mt-4">
          <RangeBar
            title="Price distribution"
            subtitle={`TCGPlayer-low, across ${price.count.toLocaleString()} priced decks${championFilter ? ` · ${championKeyToDisplayName(championFilter)}` : ""}`}
            stats={price}
            format={formatWholeUsd}
          />
        </div>
      )}
      </details>

      {archetypes && archetypes.clusters.length > 0 && (
        <Section
          className="mt-8"
          heading="compact"
          title={isPantheon ? "Recurring strategy shells" : "Recurring exact builds"}
        >
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {archetypes.clusters.slice(0, showAllClusters ? TOP_ARCHETYPES_SHOWN : 6).map((cluster) => {
              const names = (cluster.definingCards?.length ? cluster.definingCards : cluster.mainDeck.map((card) => card.name)).slice(0, 3);
              return <article key={`${cluster.champion}-${cluster.signature}`} className="min-w-0 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{names.map((name) => <TrendCard key={name} name={name} card={cardImages.get(name)} />)}</div>
                <p className="mt-2 text-xs text-ctp-subtext0">Selected cards from this build. Open the example for its full list.</p>
                <div className="mt-3 font-medium capitalize text-ctp-text">{championKeyToDisplayName(cluster.champion)}</div>
                <div className="mt-1 break-words text-sm text-ctp-subtext1" title={cluster.representative.title}>{cluster.representative.title || "Untitled deck"}</div>
                <div className="mt-2 text-sm text-ctp-subtext1">{cluster.size} community {cluster.size === 1 ? "deck" : "decks"}</div>
                <a href={cluster.representative.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-control items-center justify-center rounded-lg border border-ctp-blue px-3 py-2 text-sm text-ctp-blue hover:bg-ctp-surface0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">View example ↗</a>
              </article>;
            })}
          </div>
          {archetypes.clusters.length > 6 && <Button onClick={() => setShowAllClusters((value) => !value)} aria-expanded={showAllClusters} className="mt-3">{showAllClusters ? "Show fewer builds" : `Show ${Math.min(TOP_ARCHETYPES_SHOWN, archetypes.clusters.length)} builds`}</Button>}
        </Section>
      )}

      {eraBars.length > 0 && (
        <Section
          className="mt-8"
          heading="compact"
          title="Deck era"
          collapsible
          defaultOpen={false}
        >
          <div className="mt-2">
            <BarChart bars={eraBars} />
          </div>
        </Section>
      )}
    </PageLayout>
  );
}
