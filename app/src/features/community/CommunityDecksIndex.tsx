import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DeckFormat } from "@gatcg/shared";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { useCardsByNames } from "../events/useCardsByNames";
import HorizontalBarChart, { type HorizontalBarChartBar } from "../../components/HorizontalBarChart";
import RangeBar from "../../components/RangeBar";
import BarChart, { type BarChartBar } from "../../components/BarChart";
import {
  useCommunityCardInclusion,
  useCommunityPopularity,
  useCommunityPriceDistribution,
  useCommunityArchetypes,
  useCommunityDeckEra,
  useCommunityFormatSummary,
} from "./data";

const TOP_CARDS_SHOWN = 30;
const TOP_ARCHETYPES_SHOWN = 20;

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** "diao-chan" -> "Diao Chan" — these keys are champion slugs, not display names. */
function formatChampionName(key: string): string {
  return key
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
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
  const formatSummary = useCommunityFormatSummary();

  const [championFilter, setChampionFilter] = useState<string>("");

  const championBars = useMemo<HorizontalBarChartBar[]>(
    () =>
      (popularity?.champion ?? []).map((b) => ({
        key: b.key,
        label: formatChampionName(b.key),
        value: b.deckCount,
        valueLabel: `${(b.percentOfDecks * 100).toFixed(1)}%`,
        href: `/champions/${encodeURIComponent(formatChampionName(b.key))}`,
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
  const cardImages = useCardsByNames(topCards.map((c) => c.name));
  const topCardBars = useMemo<HorizontalBarChartBar[]>(
    () =>
      topCards.map((c) => ({
        key: c.name,
        label: c.name,
        value: c.percentOfDecks,
        valueLabel: `${(c.percentOfDecks * 100).toFixed(1)}%`,
        href: cardImages.get(c.name)?.slug ? `/cards/${cardImages.get(c.name)!.slug}` : undefined,
      })),
    [topCards, cardImages],
  );

  const price = championFilter ? priceDistribution?.byChampion[championFilter] : priceDistribution?.overall;

  const eraBars = useMemo<BarChartBar[]>(() => {
    if (!deckEra) return [];
    // Alternate-printing variants of the same set (e.g. "PTM" / "PTM 1st", "AMB" / "AMB Alter")
    // share a release date but publish as separate buckets — merge same-date buckets into one
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

  const loading = !cardInclusion && !popularity && !priceDistribution && !archetypes;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={isPantheon ? "Pantheon Decks" : "Community Decks"}
        description={
          <>
            Community deck-building trends show what people are actually building, not tournament results. For creating and sharing your own lists, we recommend{" "}
            <a href="https://sleeved.gg" target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">
              Sleeved.gg
            </a>
            {" "}or{" "}
            {/* Link-only for now, no ingestion — see pipeline/src/sleeved/ for the shape a future
                TCGArchitect data source would take once API access is available. */}
            <a href="https://tcgarchitect.com/grand-archive" target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">
              TCGArchitect
            </a>
            {" "}as dedicated Grand Archive deck-building tools. {isPantheon ? "Pantheon lists are separated from Standard and never presented as tournament-performance evidence." : "Standard lists are separated from Pantheon and kept distinct from Omnidex tournament results."}
          </>
        }
      />

      <div className="mt-4 inline-flex rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 text-sm">
        <Link to="/community-decks" className={`rounded-md px-3 py-1.5 ${!isPantheon ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>Standard</Link>
        <Link to="/pantheon" className={`rounded-md px-3 py-1.5 ${isPantheon ? "bg-ctp-blue text-ctp-base" : "text-ctp-subtext1 hover:text-ctp-text"}`}>Pantheon</Link>
      </div>

      {formatSummary && (
        <p className="mt-3 rounded-lg border border-ctp-surface0 bg-ctp-mantle/50 p-3 text-xs text-ctp-subtext0">
          {formatSummary.counts[format].toLocaleString()} classified {isPantheon ? "Pantheon" : "Standard"} decks · {formatSummary.confirmedCounts[format].toLocaleString()} source-confirmed · {formatSummary.inferredCounts[format].toLocaleString()} inferred from deck construction. Unknown-format decks are excluded.
        </p>
      )}

      {popularity && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          {popularity.championDecksConsidered.toLocaleString()} decks total · {popularity.elementDecksConsidered.toLocaleString()} (
          {((popularity.elementDecksConsidered / popularity.championDecksConsidered) * 100).toFixed(0)}%) have a
          full card list — card inclusion, element popularity, and archetype clusters below are scoped to that set.
          Champion popularity and price cover every deck.
        </p>
      )}

      {loading && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
            subtitle="% of decks containing that element — not mutually exclusive, decks can and do run more than one"
            bars={elementBars}
          />
        )}
      </div>

      {price && (
        <div className="mt-4">
          <RangeBar
            title="Price distribution"
            subtitle={`TCGPlayer-low, across ${price.count.toLocaleString()} priced decks${championFilter ? ` · ${formatChampionName(championFilter)}` : ""}`}
            stats={price}
            format={formatUsd}
          />
        </div>
      )}

      {cardInclusion && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Top cards by inclusion rate</h2>
            <select
              value={championFilter}
              aria-label="Champion"
              onChange={(e) => setChampionFilter(e.target.value)}
              className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text focus:border-ctp-blue focus:outline-none"
            >
              <option value="">All champions</option>
              {Object.keys(cardInclusion.byChampion)
                .sort((a, b) => cardInclusion.byChampion[b].deckCount - cardInclusion.byChampion[a].deckCount)
                .map((key) => (
                  <option key={key} value={key}>
                    {formatChampionName(key)} ({cardInclusion.byChampion[key].deckCount.toLocaleString()})
                  </option>
                ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-ctp-subtext0">
            % of decks running at least one copy, out of {cardsConsidered?.toLocaleString()} decks
            {championFilter ? ` piloting ${formatChampionName(championFilter)}` : " with a fetched card list"}.
          </p>
          <div className="mt-2">{topCardBars.length > 0 && <HorizontalBarChart bars={topCardBars} />}</div>
        </div>
      )}

      {archetypes && archetypes.clusters.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">{isPantheon ? "Recurring strategy shells" : "Recurring exact builds"}</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            {isPantheon ? "Singleton lists grouped by meaningful main-deck overlap. Defining cards describe the shared shell; this is community adoption, not a performance ranking." : "Decks sharing the literal same champion + card list — real copies of a known build, not a fuzzy similar-archetype grouping. Most decks are one-offs and aren't shown here."}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-max min-w-full text-sm">
              <thead>
                <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                  <th className="py-1 pr-6">Copies</th>
                  <th className="py-1 pr-6">Champion</th>
                  <th className="py-1">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                {archetypes.clusters.slice(0, TOP_ARCHETYPES_SHOWN).map((cluster) => (
                  <tr key={`${cluster.champion}-${cluster.signature}`}>
                    <td className="py-1.5 pr-6 text-ctp-subtext1">{cluster.size}</td>
                    <td className="py-1.5 pr-6 text-ctp-subtext1 capitalize">{cluster.champion}</td>
                    <td className="py-1.5">
                      <span className="text-ctp-text">
                        {cluster.representative.title || "(untitled)"}
                      </span>
                      {isPantheon && cluster.definingCards && cluster.definingCards.length > 0 && <p className="mt-0.5 max-w-md text-xs text-ctp-subtext0">{cluster.definingCards.join(" · ")}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {eraBars.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Deck era</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            When decks were likely built, inferred from the newest card each one requires — a floor, not a real
            timestamp, since the source archive doesn't record a creation date. A deck built yesterday from only
            year-old cards reads as year-old here. Hover a bar for the set(s) behind it.
            {deckEra && deckEra.unresolvedDeckCount > 0 && (
              <> {deckEra.unresolvedDeckCount.toLocaleString()} decks couldn't be dated and are excluded.</>
            )}
          </p>
          <div className="mt-2">
            <BarChart bars={eraBars} />
          </div>
        </div>
      )}
    </div>
  );
}
