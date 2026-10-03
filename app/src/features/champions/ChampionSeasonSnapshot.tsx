import { Link } from "react-router-dom";
import { useChampionTrendsData } from "../archetypes/data";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import DisclosureChevron from "../../components/DisclosureChevron";
import Panel from "../../components/ui/Panel";
import { championNameToSlug } from "../../lib/championSlug";

export default function ChampionSeasonSnapshot({ championName }: { championName: string }) {
  const data = useChampionTrendsData();
  const status = usePublishedDataStatus("analysis-champion-trends", "/data/analysis/champion-trends.json");
  const trend = data?.champions.find((entry) => entry.championName === championName);
  // Published order is chronological and includes seasons with no appearances.
  const latest = trend?.seasons.at(-1);
  const firstSeen = trend?.seasons.findIndex((season) => season.deckCount > 0) ?? -1;
  const history = firstSeen >= 0 ? trend!.seasons.slice(firstSeen) : [];
  return <Panel id="season" padding="lg" className="scroll-mt-48 rounded-3xl" aria-labelledby="champion-season-title">
    <h2 id="champion-season-title" className="text-xl font-semibold text-ctp-text">Latest season at a glance</h2>
    <PublishedSourceStatus label="Season statistics" status={status} hasData={!!data} />
    {latest ? <>
      <p className="mt-2 text-sm text-ctp-subtext1">{latest.seasonName} · Recorded tournament results</p>
      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-5">
        <div><dt className="text-sm text-ctp-subtext1">Weighted result share</dt><dd className="mt-1 text-3xl font-semibold tabular-nums text-ctp-text">{(latest.shareOfSeason * 100).toFixed(1)}%</dd></div>
        <div><dt className="text-sm text-ctp-subtext1">Recorded decks</dt><dd className="mt-1 text-3xl font-semibold tabular-nums text-ctp-text">{latest.deckCount.toLocaleString()}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-ctp-subtext0">Share of all champions' weighted placement scores this season, not the percentage of decks played.</p>
      {latest.deckCount === 0 && <p className="mt-3 text-sm text-ctp-subtext1">No recorded decks for this champion in this season.</p>}
      {history.length > 1 && <details className="group mt-4 border-t border-ctp-surface1">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-ctp-blue focus-visible:outline-2">Compare seasons<DisclosureChevron className="group-open:rotate-180" /></summary>
        <ul className="divide-y divide-ctp-surface1">{history.toReversed().map((season) => <li key={season.seasonId} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3 text-sm">
          <span className="font-medium text-ctp-text">{season.seasonName}</span>
          <span className="text-ctp-subtext1">{(season.shareOfSeason * 100).toFixed(1)}% weighted share · {season.deckCount.toLocaleString()} decks</span>
        </li>)}</ul>
        <Link to={`/champions/${championNameToSlug(championName)}/stats`} className="inline-flex min-h-control items-center rounded text-sm text-ctp-blue hover:underline focus-visible:outline-2">Full season statistics &rarr;</Link>
      </details>}
    </> : data && <p className="mt-3 text-sm text-ctp-subtext1">No season statistics are available for this champion yet.</p>}
  </Panel>;
}
