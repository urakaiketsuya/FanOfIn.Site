import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ArchetypeSummary, Card, ChampionTrend } from "@gatcg/shared";
import { useArchetypeData, useChampionTrendsData } from "../archetypes/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { championNameToSlug } from "../../lib/championSlug";
import { useOmnidexIndex, useOmnidexIndexStatus } from "../tournaments/data";
import PageHeader from "../../components/ui/PageHeader";
import ElementIcon from "../../components/ElementIcon";
import CardArtTile from "../../components/CardArtTile";
import PageLayout from "../../components/layout/PageLayout";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import Section from "../../components/ui/Section";

const TREND_LABELS = { rising: "Rising", falling: "Falling", stable: "Stable", new: "New this season", absent: "Absent this season", "insufficient-data": "Not enough data to compare" };

function ChampionDirectoryCard({ summary, card, classes, trend, showTrend = false }: {
  summary: ArchetypeSummary;
  card: Card | undefined;
  classes?: string[];
  trend?: ChampionTrend;
  showTrend?: boolean;
}) {
  const latest = trend?.seasons.at(-1);
  const delta = trend?.trendDeltaPct == null ? null : Number(trend.trendDeltaPct.toFixed(1));
  return (
    <article className="min-w-0" data-component="ChampionGalleryCard">
      <CardHoverPreview image={card?.editions[0]?.image} alt={card?.name ?? summary.signature}>
        <Link
          to={`/champions/${championNameToSlug(summary.signature)}`}
          className="group flex h-full flex-wrap items-center gap-4 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors hover:border-ctp-blue/50 hover:bg-ctp-surface0/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
        >
          <div className="w-24 max-w-full shrink-0"><CardArtTile card={card} name={card?.name ?? summary.signature} /></div>
          <div className="min-w-0 flex-[1_1_8rem]">
            <h2 className="break-words text-lg font-semibold leading-snug text-ctp-text group-hover:text-ctp-blue">{summary.signature}</h2>
            {classes && <p className="mt-1 break-words text-xs text-ctp-subtext0">{classes.join(" / ")}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ctp-subtext0">
              {summary.elements.map((element) => <ElementIcon key={element} element={element} size={12} />)}
              <span className="break-words">{summary.elements.join(" / ")}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ctp-subtext1">
              <span className="tabular-nums">{summary.deckCount.toLocaleString()} decks</span>
              <span className="tabular-nums">{(summary.avgWinRate * 100).toFixed(0)}% avg. win rate</span>
            </div>
            {showTrend && <div className="mt-3 border-t border-ctp-surface1 pt-3 text-xs text-ctp-subtext1">
              <p className="font-semibold text-ctp-text">{trend ? TREND_LABELS[trend.trend] : "Season trend unavailable"}</p>
              {latest && <p className="mt-1 tabular-nums">{(latest.shareOfSeason * 100).toFixed(1)}% weighted result share</p>}
              {trend && trend.trend !== "insufficient-data" && delta !== null && <p className="mt-1 tabular-nums">{delta > 0 ? "+" : ""}{delta.toFixed(1)} percentage points vs. previous season</p>}
            </div>}
          </div>
        </Link>
      </CardHoverPreview>
    </article>
  );
}

export default function ChampionsIndex() {
  useDocumentTitle("Champions", "Grand Archive TCG Champion cards, decks, tournament results, and the current season.");
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
      <PageHeader title="Find your champion" eyebrow="Champions" description="Explore a champion’s cards, decks and tournament results. Statistics summarize recorded decks; they are not predictions for your next match." />

      <PublishedSourceStatus label="Champion statistics" status={dataStatus} hasData={!!data} />
      <PublishedSourceStatus label="Champion trends" status={trendStatus} hasData={!!trendsData} />
      <PublishedSourceStatus label="Seasons" status={seasonStatus} hasData={!!seasonIndex} />

      <Link to={currentSeason ? `/seasons/${currentSeason.slug}` : "/seasons"}
        className="inline-flex min-h-control items-center gap-2 rounded-lg px-3 text-sm font-medium text-ctp-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue">
        {currentSeason ? `Current season: ${currentSeason.name}` : "Browse seasons"}
        <span aria-hidden="true">→</span>
      </Link>

      {archetypes?.length === 0 && <p className="mt-6 rounded-xl border border-ctp-surface1 p-4 text-ctp-subtext1">No champion statistics have been published yet. Champions will appear when tournament decks are available.</p>}
      {archetypes && archetypes.length > 0 && <p className="mt-6 text-sm text-ctp-subtext1">{archetypes.length} champions · Deck and event counts cover the published tournament sample.</p>}

      {trendsData && <p className="mt-2 text-sm text-ctp-subtext1">{trendsData.seasonOrder.length > 1 ? `Season trends: ${trendsData.seasonOrder.at(-1)} compared with ${trendsData.seasonOrder.at(-2)}.` : "Season trends need two seasons of results to compare."}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {archetypes?.map((champion) => (
          <ChampionDirectoryCard key={champion.signature} summary={champion} card={championImages.get(champion.signature)} classes={champion.classes} trend={trendByName.get(champion.signature)} showTrend={!!trendsData} />
        ))}
      </div>

      {data?.namedSpirits && data.namedSpirits.length > 0 && (
        <Section
          className="mt-10"
          heading="compact"
          title="Named Spirits"
          description={<>Named companions such as Kaze, Spirit of Wind are tracked across every deck that includes them, regardless of champion. Generic spirits are excluded.</>}
        >
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.namedSpirits.map((spirit) => (
              <ChampionDirectoryCard key={spirit.signature} summary={spirit} card={namedSpiritImages.get(spirit.signature)} />
            ))}
          </div>
        </Section>
      )}
    </PageLayout>
  );
}
