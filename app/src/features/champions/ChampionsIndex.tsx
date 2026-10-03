import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ArchetypeSummary, ChampionTrendDirection } from "@gatcg/shared";
import { useArchetypeData, useChampionTrendsData } from "../archetypes/data";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { championNameToSlug } from "../../lib/championSlug";
import ChampionMetaMap from "./ChampionMetaMap";
import PageHeader from "../../components/ui/PageHeader";
import ElementIcon from "../../components/ElementIcon";
import ClassIcon from "../../components/ClassIcon";
import CardArtTile from "../../components/CardArtTile";
import PageLayout from "../../components/layout/PageLayout";
import PublishedSourceStatus from "../../components/PublishedSourceStatus";
import DisclosureChevron from "../../components/DisclosureChevron";
import { usePublishedDataStatus } from "../../lib/sync/usePublishedData";
import Section from "../../components/ui/Section";

const TREND_LABEL: Record<ChampionTrendDirection, string> = {
  rising: "▲ Rising",
  falling: "▼ Falling",
  stable: "– Stable",
  new: "★ New",
  absent: "Absent",
  "insufficient-data": "",
};

const TREND_CLASS: Record<ChampionTrendDirection, string> = {
  rising: "text-ctp-green",
  falling: "text-ctp-red",
  stable: "text-ctp-subtext0",
  new: "text-ctp-blue",
  absent: "text-ctp-subtext0",
  "insufficient-data": "text-ctp-subtext0",
};

export default function ChampionsIndex() {
  useDocumentTitle("Champions", "Grand Archive TCG Champion performance stats and season trends.");
  const data = useArchetypeData();
  const trendsData = useChampionTrendsData();
  const dataStatus = usePublishedDataStatus("analysis-archetypes", "/data/analysis/archetypes.json");
  const trendStatus = usePublishedDataStatus("analysis-champion-trends", "/data/analysis/champion-trends.json");
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
  const latestSeasonName = trendsData?.seasonOrder[trendsData.seasonOrder.length - 1];

  return (
    <PageLayout width="wide" data-component="ChampionsIndex">
      <PageHeader title="Find your champion" eyebrow="Champions" description="Explore a champion’s cards, decks and tournament results. Statistics summarize recorded decks; they are not predictions for your next match." />

      <PublishedSourceStatus label="Champion statistics" status={dataStatus} hasData={!!data} />
      <PublishedSourceStatus label="Season trends" status={trendStatus} hasData={!!trendsData} />

      {archetypes && trendsData && <details className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle">
        <summary className="flex min-h-control cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-ctp-blue [&::-webkit-details-marker]:hidden">
          Explore the season metagame
          <DisclosureChevron className="group-open:rotate-180" />
        </summary>
        <div className="px-3 pb-3">
          {latestSeasonName && <p className="text-sm text-ctp-subtext1">Season: {latestSeasonName}</p>}
          <ChampionMetaMap champions={archetypes} trends={trendsData.champions} />
        </div>
      </details>}

      {archetypes?.length === 0 && <p className="mt-6 rounded-xl border border-ctp-surface1 p-4 text-ctp-subtext1">No champion statistics have been published yet. Champions will appear when tournament decks are available.</p>}
      {archetypes && archetypes.length > 0 && <p className="mt-6 text-sm text-ctp-subtext1">{archetypes.length} champions · Deck and event counts cover the published tournament sample. Trends compare {latestSeasonName ?? "the latest season"} with the prior season.</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {archetypes?.map((c) => {
          const card = championImages.get(c.signature);
          const trend = trendsData?.champions.find((t) => t.championName === c.signature);
          return (
            <CardHoverPreview key={c.signature} image={card?.editions[0]?.image} alt={c.signature}>
              <Link
                to={`/champions/${championNameToSlug(c.signature)}`}
                className="group grid h-full grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors hover:border-ctp-blue/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
              >
                <CardArtTile card={card} name={c.signature} />
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold leading-snug text-ctp-text group-hover:text-ctp-blue">{c.signature}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-ctp-subtext0">
                    {c.classes.map((cls) => (
                      <ClassIcon key={cls} cardClass={cls} size={11} />
                    ))}
                    {c.elements.map((element) => (
                      <ElementIcon key={element} element={element} size={11} />
                    ))}
                    <span className="break-words">{c.classes.join("/")} · {c.elements.join("/")}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-ctp-subtext1">
                    <span>{c.deckCount.toLocaleString()} decks</span>
                    <span className="font-medium text-ctp-text">{(c.avgWinRate * 100).toFixed(0)}% avg. win rate</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                    <span className="text-ctp-subtext0">{c.eventCount.toLocaleString()} events</span>
                    <span
                      className={trend ? TREND_CLASS[trend.trend] : "text-ctp-subtext0"}
                      title={latestSeasonName ? `Change in share of ${latestSeasonName} vs. the prior season` : undefined}
                    >
                      {trend ? TREND_LABEL[trend.trend] : ""}
                      {trend?.trendDeltaPct !== null && trend?.trendDeltaPct !== undefined && (
                        <span className="ml-1 text-ctp-subtext0">
                          ({trend.trendDeltaPct > 0 ? "+" : ""}
                          {trend.trendDeltaPct.toFixed(1)}pp)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            </CardHoverPreview>
          );
        })}
      </div>

      {data?.namedSpirits && data.namedSpirits.length > 0 && (
        <Section
          className="mt-10"
          heading="compact"
          title="Named Spirits"
          description={<>Named companions such as Kaze, Spirit of Wind are tracked across every deck that includes them, regardless of champion. Generic spirits are excluded.</>}
        >
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.namedSpirits.map((s: ArchetypeSummary) => {
              const card = namedSpiritImages.get(s.signature);
              return (
                <CardHoverPreview key={s.signature} image={card?.editions[0]?.image} alt={s.signature}>
                  <Link
                    to={`/champions/${championNameToSlug(s.signature)}`}
                    className="group grid h-full grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors hover:border-ctp-blue/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctp-blue"
                  >
                    <CardArtTile card={card} name={s.signature} />
                    <div className="min-w-0">
                      <p className="break-words text-lg font-semibold leading-snug text-ctp-text group-hover:text-ctp-blue">{s.signature}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-ctp-subtext0">
                        {s.elements.map((element) => (
                          <ElementIcon key={element} element={element} size={11} />
                        ))}
                        <span className="break-words">{s.elements.join("/")}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-ctp-subtext1">
                        <span>{s.deckCount.toLocaleString()} decks</span>
                        <span className="font-medium text-ctp-text">{(s.avgWinRate * 100).toFixed(0)}% avg. win rate</span>
                      </div>
                      <div className="mt-0.5 text-xs text-ctp-subtext0">{s.eventCount.toLocaleString()} events</div>
                    </div>
                  </Link>
                </CardHoverPreview>
              );
            })}
          </div>
        </Section>
      )}
    </PageLayout>
  );
}
