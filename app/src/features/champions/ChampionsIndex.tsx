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
import { InlineState } from "../../components/ui/ContentState";
import Section from "../../components/ui/Section";

const TREND_LABEL: Record<ChampionTrendDirection, string> = {
  rising: "▲ Rising",
  falling: "▼ Falling",
  stable: "— Stable",
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
    <PageLayout data-component="ChampionsIndex">
      <PageHeader title="Champions" description="Compare current metagame position, tournament performance, season movement, and the builds defining each Champion." />

      {!data && <InlineState className="mt-6">Loading…</InlineState>}

      {archetypes && trendsData && <ChampionMetaMap champions={archetypes} trends={trendsData.champions} />}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {archetypes?.map((c) => {
          const card = championImages.get(c.signature);
          const trend = trendsData?.champions.find((t) => t.championName === c.signature);
          return (
            <CardHoverPreview key={c.signature} image={card?.editions[0]?.image} alt={c.signature}>
              <Link
                to={`/champions/${championNameToSlug(c.signature)}`}
                className="group block rounded-lg border border-ctp-surface1 bg-ctp-mantle p-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-ctp-surface2 hover:shadow-md hover:shadow-black/20"
              >
                <CardArtTile card={card} name={c.signature} />
                <p className="mt-2 truncate text-sm font-semibold text-ctp-text group-hover:text-ctp-blue">{c.signature}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ctp-subtext0">
                  {c.classes.map((cls) => (
                    <ClassIcon key={cls} cardClass={cls} size={11} />
                  ))}
                  {c.elements.filter((element) => element !== "NORM").map((element) => (
                    <ElementIcon key={element} element={element} size={11} />
                  ))}
                  <span className="truncate">{c.classes.join("/")} · {c.elements.join("/")}</span>
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-ctp-subtext1">
                  <span>{c.deckCount.toLocaleString()} decks</span>
                  <span className="font-medium text-ctp-text">{(c.avgWinRate * 100).toFixed(0)}% WR</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px]">
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
          description={<>Named Spirit companions (e.g. "Kaze, Spirit of Wind" — distinct from the generic "Spirit of Wind"), tracked with the same stats as a Champion, across every deck that runs them regardless of which Champion is present.</>}
        >
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.namedSpirits.map((s: ArchetypeSummary) => {
              const card = namedSpiritImages.get(s.signature);
              return (
                <CardHoverPreview key={s.signature} image={card?.editions[0]?.image} alt={s.signature}>
                  <Link
                    to={`/champions/${championNameToSlug(s.signature)}`}
                    className="group block rounded-lg border border-ctp-surface1 bg-ctp-mantle p-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-ctp-surface2 hover:shadow-md hover:shadow-black/20"
                  >
                    <CardArtTile card={card} name={s.signature} />
                    <p className="mt-2 truncate text-sm font-semibold text-ctp-text group-hover:text-ctp-blue">{s.signature}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ctp-subtext0">
                      {s.elements.filter((element) => element !== "NORM").map((element) => (
                        <ElementIcon key={element} element={element} size={11} />
                      ))}
                      <span className="truncate">{s.elements.join("/")}</span>
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-ctp-subtext1">
                      <span>{s.deckCount.toLocaleString()} decks</span>
                      <span className="font-medium text-ctp-text">{(s.avgWinRate * 100).toFixed(0)}% WR</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-ctp-subtext0">{s.eventCount.toLocaleString()} events</div>
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
