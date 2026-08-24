import { useMemo, useState } from "react";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
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

export default function CommunityDecksIndex() {
  useDocumentTitle(
    "Community Decks",
    "Deck-building trends from the Grand Archive TCG community deck builder Shout At Your Decks — card inclusion rates, champion/element popularity, price distribution, and recurring exact builds.",
  );

  const cardInclusion = useCommunityCardInclusion();
  const popularity = useCommunityPopularity();
  const priceDistribution = useCommunityPriceDistribution();
  const archetypes = useCommunityArchetypes();
  const deckEra = useCommunityDeckEra();

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
      <h1 className="text-2xl font-bold text-ctp-blue">Community Decks</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Deck-building trends from{" "}
        <a href="https://shoutatyourdecks.com" target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">
          Shout At Your Decks
        </a>
        , a community Grand Archive TCG deck builder — what people are actually building, not tournament results.
        Deliberately kept separate from the Omnidex-derived stats elsewhere on this site.
      </p>

      {popularity && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          {popularity.championDecksConsidered.toLocaleString()} decks total · {popularity.elementDecksConsidered.toLocaleString()} (
          {((popularity.elementDecksConsidered / popularity.championDecksConsidered) * 100).toFixed(0)}%) have a
          full card list fetched so far — card inclusion, element popularity, and archetype clusters below are scoped
          to that smaller, still-growing subset. Champion popularity and price cover every deck already.
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
          <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Recurring exact builds</h2>
          <p className="mt-1 text-xs text-ctp-subtext0">
            Decks sharing the literal same champion + card list — real copies of a known build, not a fuzzy "similar
            archetype" grouping. Most decks are one-offs and aren't shown here.
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
                      <a href={cluster.representative.url} target="_blank" rel="noreferrer" className="text-ctp-text hover:text-ctp-blue">
                        {cluster.representative.title || "(untitled)"}
                      </a>
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
            timestamp, since Shout At Your Decks doesn't record a creation date. A deck built yesterday from only
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
