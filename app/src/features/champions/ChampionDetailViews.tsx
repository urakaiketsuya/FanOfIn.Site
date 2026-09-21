import { Link } from "react-router-dom";
import type { ChampionSeasonPerformance, ChampionTrend } from "@gatcg/shared";
import ChampionSeasonChart from "./ChampionSeasonChart";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

export interface SimilarDeckSummary {
  hash: string;
  championName: string | null;
  eventName: string;
  score: number;
}

export function ChampionSeasonSection({ seasons, trend }: { seasons: ChampionSeasonPerformance[]; trend: ChampionTrend | undefined }) {
  if (seasons.length === 0) return null;
  const trendTone = trend?.trend === "rising" ? "text-ctp-green" : trend?.trend === "falling" ? "text-ctp-red" : trend?.trend === "new" ? "text-ctp-blue" : "text-ctp-subtext0";
  return (
    <Section className="mt-6" heading="compact" title="By season" description="Share of season = this Champion's weighted placement score as a fraction of every Champion's combined score that season — comparable across seasons regardless of how many events were played." actions={trend && trend.trend !== "insufficient-data" && <span className={`text-xs ${trendTone}`}>{trend.trend === "rising" && "▲ Rising"}{trend.trend === "falling" && "▼ Falling"}{trend.trend === "stable" && "— Stable"}{trend.trend === "new" && "★ New this season"}{trend.trend === "absent" && "Absent last season"}{trend.trendDeltaPct !== null && <span className="ml-1 text-ctp-subtext0">({trend.trendDeltaPct > 0 ? "+" : ""}{trend.trendDeltaPct.toFixed(1)}pp share)</span>}</span>}>
      <ChampionSeasonChart seasons={seasons} />
      <div className="overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead><tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase"><th className="py-1 pr-6">Season</th><th className="py-1 pr-6">Decks</th><th className="py-1 pr-6">Wins</th><th className="py-1 pr-6">Top cut</th><th className="py-1 pr-6">Win rate</th><th className="py-1 pr-6">Share</th></tr></thead>
          <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">{seasons.map((season) => <tr key={season.seasonId}><td className="py-1 pr-6 text-ctp-text">{season.seasonName}</td><td className="py-1 pr-6 text-ctp-subtext1">{season.deckCount}</td><td className="py-1 pr-6 text-ctp-subtext1">{season.winCount}</td><td className="py-1 pr-6 text-ctp-subtext1">{season.topCutCount}</td><td className="py-1 pr-6 text-ctp-subtext1">{season.deckCount > 0 ? `${(season.avgWinRate * 100).toFixed(0)}%` : "—"}</td><td className="py-1 pr-6 text-ctp-subtext1">{(season.shareOfSeason * 100).toFixed(1)}%</td></tr>)}</tbody>
        </table>
      </div>
    </Section>
  );
}

export function SimilarDecksSection({ championName, decks }: { championName: string; decks: SimilarDeckSummary[] }) {
  return (
    <Section className="mt-6" heading="compact" title="Similar Decks" description={<>Real decks with a similar card shell to a {championName} build.</>}>
      {decks.length === 0 ? <InlineState className="mt-4 text-sm">No similar decks found yet.</InlineState> : <ul className="mt-2 space-y-1">{decks.map((deck) => <li key={deck.hash} className="flex flex-wrap items-center gap-1.5 text-sm"><Link to={`/decks/${deck.hash}`} className="text-ctp-text hover:text-ctp-blue">{deck.championName ?? "Unknown Champion"} &middot; {deck.eventName}</Link><span className="text-xs text-ctp-subtext0">({(deck.score * 100).toFixed(0)}% similar)</span></li>)}</ul>}
    </Section>
  );
}
