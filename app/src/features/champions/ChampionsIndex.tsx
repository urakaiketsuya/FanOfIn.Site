import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ArchetypeSummary, Card, ChampionTrend } from "@gatcg/shared";
import { useArchetypeData, useChampionTrendsData } from "../archetypes/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardsByNames } from "../events/useCardsByNames";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { championNameToSlug } from "../../lib/championSlug";
import { useOmnidexIndex, useOmnidexIndexStatus } from "../tournaments/data";
import PageHeader from "../../components/ui/PageHeader";
import CardArtTile from "../../components/CardArtTile";
import PageLayout from "../../components/layout/PageLayout";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import Button from "../../components/ui/Button";
import Tabs, { TabPanel } from "../../components/ui/Tabs";
import ChampionMetaRace from "./ChampionMetaRace";

const TREND_LABELS = { rising: "Gaining ground", falling: "Losing ground", stable: "Holding steady", new: "New this season", absent: "Not seen this season", "insufficient-data": "Not enough results yet" };
const TREND_ICONS = { rising: "↗", falling: "↘", stable: "→", new: "+", absent: "—", "insufficient-data": "—" };

function ChampionDirectoryCard({ summary, card, trend, showTrend = false, showStats }: {
  summary: ArchetypeSummary; card: Card | undefined; trend?: ChampionTrend;
  showTrend?: boolean; showStats: boolean;
}) {
  return <article className="min-w-0" data-component="ChampionGalleryCard">
    <Link to={`/champions/${championNameToSlug(summary.signature)}`}
      className="card-art-action group flex h-full flex-col overflow-hidden rounded-2xl border border-ctp-surface1 bg-ctp-mantle hover:border-ctp-blue/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
      <CardArtTile card={card} name={card?.name ?? summary.signature} artworkOnly />
      <div className="p-4">
        <h2 className="break-words text-xl font-semibold leading-snug text-ctp-text group-hover:text-ctp-blue">{summary.signature}</h2>
        {showTrend && <p className="mt-2 flex items-center gap-2 text-sm text-ctp-subtext1">
          <span aria-hidden="true" className={`text-xl ${trend?.trend === "rising" ? "text-ctp-green" : trend?.trend === "falling" ? "text-ctp-peach" : "text-ctp-subtext1"}`}>{trend ? TREND_ICONS[trend.trend] : "—"}</span>
          {trend ? TREND_LABELS[trend.trend] : "Season trend unavailable"}
        </p>}
        {showStats && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-ctp-surface1 pt-3 text-sm text-ctp-subtext1">
          <span className="tabular-nums">{summary.deckCount.toLocaleString()} recorded decks</span>
          <span className="tabular-nums">{(summary.avgWinRate * 100).toFixed(0)}% avg. win rate</span>
        </div>}
      </div>
    </Link>
  </article>;
}

export default function ChampionsIndex() {
  useDocumentTitle("Champions", "Grand Archive TCG Champion cards, decks, tournament results, and the current season.");
  const [showStats, setShowStats] = useState(true);
  const [view, setView] = useState<"champions" | "spirits" | "race">("champions");
  const [limit, setLimit] = useState(6);
  const data = useArchetypeData();
  const trendsData = useChampionTrendsData();
  const trendStatus = usePublishedDataStatus("analysis-champion-trends", "/data/analysis/champion-trends.json");
  const trendByName = useMemo(() => new Map(trendsData?.champions.map((trend) => [trend.championName, trend])), [trendsData]);
  const seasonIndex = useOmnidexIndex();
  const seasonStatus = useOmnidexIndexStatus();
  const dataStatus = usePublishedDataStatus("analysis-archetypes", "/data/analysis/archetypes.json");
  // Several distinct draft-only identities all share the literal signature "Nameless Champion"
  // (different classes/elements), so dedupe by signature or React sees duplicate keys.
  const archetypes = useMemo(() => {
    if (!data) return undefined;
    const bySignature = new Map<string, (typeof data.archetypes)[number]>();
    for (const a of data.archetypes) {
      if (!bySignature.has(a.signature)) bySignature.set(a.signature, a);
    }
    return Array.from(bySignature.values());
  }, [data]);
  const championImages = useChampionCardImages(archetypes?.map((c) => c.signature) ?? []);
  const namedSpiritImages = useCardsByNames(data?.namedSpirits?.map((s) => s.signature) ?? []);
  const now = Date.now();
  const currentSeason = seasonIndex?.seasons.filter(season => Date.parse(season.dateStart) <= now && Date.parse(season.dateEnd) >= now)
    .sort((a, b) => b.dateStart.localeCompare(a.dateStart))[0];

  return (
    <PageLayout width="wide" data-component="ChampionsIndex">
      <PageHeader title="Choose a champion" description="Explore their cards and builds." />

      <PublishedSourceStatus label="Champion statistics" status={dataStatus} hasData={!!data} />
      <PublishedSourceStatus label="Champion trends" status={trendStatus} hasData={!!trendsData} />
      <PublishedSourceStatus label="Seasons" status={seasonStatus} hasData={!!seasonIndex} />

      <Link to={currentSeason ? `/seasons/${currentSeason.slug}` : "/seasons"}
        className="inline-flex min-h-control items-center gap-2 rounded-lg px-3 text-sm font-medium text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
        {currentSeason ? `Current season: ${currentSeason.name}` : "Browse seasons"}
        <span aria-hidden="true">→</span>
      </Link>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs baseId="champion-directory" label="Champion views" variant="pill" wrap active={view} onChange={setView} tabs={[{ key: "champions", label: "Champions" }, { key: "spirits", label: "Named spirits" }, { key: "race", label: "Meta race" }]} />
        {view !== "race" && <Button aria-pressed={showStats} onClick={() => setShowStats(value => !value)}>{showStats ? "Hide tournament stats" : "Show tournament stats"}</Button>}
      </div>
      {showStats && view !== "race" && <p className="mt-3 text-sm text-ctp-subtext1">Statistics cover the published tournament sample.</p>}
      <TabPanel baseId="champion-directory" tab="champions" active={view} keepMounted>
        {archetypes?.length === 0 && <p role="status" className="mt-6 text-ctp-subtext1">No champions have been published yet.</p>}
        {trendsData && <p className="mt-3 text-sm text-ctp-subtext1">{trendsData.seasonOrder.length > 1 ? `Tournament trends · ${trendsData.seasonOrder.at(-1)} compared with ${trendsData.seasonOrder.at(-2)}` : "Season trends need two seasons of results to compare."}</p>}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archetypes?.slice(0, limit).map(champion => <ChampionDirectoryCard key={champion.signature} summary={champion} card={championImages.get(champion.signature)} trend={trendByName.get(champion.signature)} showTrend={!!trendsData} showStats={showStats} />)}
        </div>
        {archetypes && archetypes.length > limit && <Button className="mt-5" onClick={() => setLimit(count => count + 6)}>Show more champions</Button>}
      </TabPanel>
      <TabPanel baseId="champion-directory" tab="spirits" active={view}>
        {data && !data.namedSpirits?.length && <p role="status" className="mt-6 text-ctp-subtext1">No named spirits have been published yet.</p>}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.namedSpirits?.map(spirit => <ChampionDirectoryCard key={spirit.signature} summary={spirit} card={namedSpiritImages.get(spirit.signature)} showStats={showStats} />)}
        </div>
      </TabPanel>
      <TabPanel baseId="champion-directory" tab="race" active={view} keepMounted>
        {trendsData && <ChampionMetaRace data={trendsData} active={view === "race"} />}
      </TabPanel>
    </PageLayout>
  );
}
