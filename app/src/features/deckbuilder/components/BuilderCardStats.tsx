import { useMemo, useState } from "react";
import { useCardStatsByChampionData, useCardStatsData } from "../../archetypes/data";
import { useDeckPriceByName } from "../../pricing/useDeckPriceByName";
import { usePriceTrendByName } from "../../pricing/usePriceTrendByName";
import { championSlugsFor, mergeCardInclusionBuckets, useCommunityBlendedCardInclusion } from "../../community/data";
import { useDeckBuilder } from "../useDeckBuilder";
import DisclosureChevron from "../../../components/DisclosureChevron";
import { formatUsd } from "../../../lib/format";

/** Published outcome statistics are independent of opt-in card recommendations. */
export function useBuilderCardStats() {
  const b = useDeckBuilder();
  const global = useCardStatsData();
  const champions = useCardStatsByChampionData(Boolean(b.championName));
  const [scope, setScope] = useState<"champion" | "all">("champion");
  const [visible, setVisible] = useState(true);
  const [moreRequested, setMoreRequested] = useState(false);
  const prices = useDeckPriceByName(moreRequested);
  const trends = usePriceTrendByName(moreRequested);
  const communityData = useCommunityBlendedCardInclusion(b.deckFormat, moreRequested && Boolean(b.championName));
  const communityStats = useMemo(() => {
    if (!communityData || !b.championName) return new Map();
    const slugs = championSlugsFor(Object.keys(communityData.byChampion), b.championName);
    return new Map(mergeCardInclusionBuckets(slugs.map(slug => communityData.byChampion[slug])).cards.map(card => [card.name, card]));
  }, [communityData, b.championName]);
  const championScope = scope === "champion" && Boolean(b.championName);
  const champion = champions?.champions.find(item => item.championName === b.championName);
  const data = championScope ? champion : global;
  const stats = useMemo(() => new Map(data?.cards.map(card => [card.name, card]) ?? []), [data]);
  const globalStats = useMemo(() => new Map(global?.cards.map(card => [card.name, card]) ?? []), [global]);
  // Champion deckCount includes known outcomes only; card counts include all appearances.
  // Do not divide those different populations to invent a Champion usage percentage.
  const population = championScope ? undefined : global?.decksConsidered;
  const scopeLabel = championScope ? `${b.championName} · all Spirits` : "All Champions";
  const controls = <details className="my-2 rounded-lg border border-ctp-surface1 px-3"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm">Card stats · {visible ? scopeLabel : "hidden"}<DisclosureChevron /></summary><div className="space-y-2 pb-3 text-sm">
    <label className="flex min-h-12 items-center gap-2"><input type="checkbox" checked={visible} onChange={event=>setVisible(event.target.checked)} />Show card stats</label>
    <label className="flex flex-wrap items-center gap-2">Tournament scope<select aria-label="Card statistics scope" value={championScope ? "champion" : "all"} onChange={event=>setScope(event.target.value as "champion" | "all")} className="min-h-12 max-w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-2"><option value="all">All Champions</option>{b.championName && <option value="champion">{b.championName} · all Spirits</option>}</select></label>
    <p className="text-xs text-ctp-subtext1">Historical tournament decks, Main and Material only. These statistics are not filtered by this deck’s format, Spirit, or archetype. Popularity shows deck appearances, or their share when a matching population total is available; adjusted win rate accounts for sample size. It is an observed result, not the card’s effect on winning.</p>
  </div></details>;
  function renderStats(name: string, collapsed = false) {
    if (!visible) return null;
    const stat = stats.get(name);
    const card = b.catalogByName.get(name);
    const price = prices.get(name) ?? b.priceByName.get(name) ?? globalStats.get(name)?.marketPrice;
    const trend = trends.get(name) ?? b.priceTrendByName.get(name);
    const community = communityStats.get(name) ?? b.communityInclusionByName?.get(name);
    const simulator = b.simulatorResult.evidenceByName.get(name);
    const decay = b.decaySignalByName?.get(name);
    const Evidence = collapsed ? "div" : "details";
    const content = <div className="my-2 space-y-1 text-xs text-ctp-subtext1" aria-label={`Statistics for ${name}`}>
      <p className="text-[11px] text-ctp-subtext0">{scopeLabel}</p>
      {stat ? <>
        <div className="flex flex-wrap justify-between gap-x-2"><span>Popularity</span><span className="tabular-nums">{population ? `${(stat.deckCount / population * 100).toFixed(1)}%` : `${stat.deckCount.toLocaleString()} decks`}</span></div>
        <div className="flex flex-wrap justify-between gap-x-2"><span>Adj. win rate</span><span className="tabular-nums">{(stat.adjustedWinRate * 100).toFixed(1)}%</span></div>
        {population && <p className="text-ctp-subtext0">Seen in {stat.deckCount.toLocaleString()} decks</p>}
      </> : <p>{(championScope ? !champions : !global) ? "Statistics unavailable or loading." : "No tournament sample in this scope."}</p>}
      <Evidence onToggle={()=>setMoreRequested(true)}>{!collapsed && <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-1">More stats<DisclosureChevron /></summary>}<div className="space-y-2 pb-2">
        {card?.cost && card.cost.type !== "none" && card.cost.value !== null && <p>Cost: {card.cost.value} {card.cost.type}</p>}
        <p>Market / copy: {price != null ? formatUsd(price) : "Unavailable"}</p>
        {trend && <p>Price trend ({trend.points} snapshots): {trend.pctChange >= 0 ? "+" : ""}{(trend.pctChange * 100).toFixed(0)}%</p>}
        {stat && <p>Appearance counts include decks without reported outcomes; the win-rate sample can be smaller.</p>}
        {stat && <p>Unadjusted win rate: {(stat.avgWinRate * 100).toFixed(1)}%</p>}
        {community && <p>{b.championName} community: {(community.percentOfDecks * 100).toFixed(1)}% of decks</p>}
        {decay && <p>Adoption change: {((decay.recentRate-decay.priorRate)*100).toFixed(1)} percentage points / 90 days</p>}
        {simulator && <p>Simulator (all Champions): {simulator.games} games{simulator.winRate == null ? "" : ` · ${(simulator.winRate*100).toFixed(1)}% wins`}</p>}
      </div></Evidence>
    </div>;
    return collapsed ? <details className="group/card-stats" onToggle={event=>{if(event.currentTarget.open) setMoreRequested(true);}}><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm text-ctp-subtext1 focus-visible:outline-2 focus-visible:outline-ctp-blue">Card statistics<DisclosureChevron className="group-open/card-stats:rotate-180" /></summary>{content}</details> : content;
  }
  return { controls, renderStats };
}
