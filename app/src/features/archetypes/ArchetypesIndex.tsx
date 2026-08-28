import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useArchetypeTaxonomyData } from "./data";
import LoadMore from "../../components/LoadMore";
import StaleDataNotice from "../../components/StaleDataNotice";
import DecklistCoverageNotice from "../../components/DecklistCoverageNotice";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { formatUsd } from "../../lib/format";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import ArchetypeMetaMap from "./ArchetypeMetaMap";

const ArchetypeValidationView = lazy(() => import("./ArchetypeValidationView"));
const ArchetypeHurtYouView = lazy(() => import("./ArchetypeHurtYouView"));

type SortMode = "players" | "winRate" | "metaShare" | "topCutRate" | "avgPlacement" | "avgPrice";

const SORT_LABELS: Record<SortMode, string> = {
  players: "Players",
  winRate: "Win rate",
  metaShare: "Meta share",
  topCutRate: "Top cut rate",
  avgPlacement: "Avg placement",
  avgPrice: "Avg price",
};

type ViewMode = "archetypes" | "builds" | "validation" | "hurtYou";
type ConfidenceFilter = "established" | "all";
const BUILD_PAGE_SIZE = 40;

interface DisplayRow {
  id: string;
  name: string;
  championName: string;
  /** Other Champions besides `championName` this build was also played under, if any — e.g. [] for a single-Champion build. Guarded with `?? []` at read sites for a stale IndexedDB copy from before this field shipped. */
  otherChampions: { championName: string; deckCount: number; playerCount: number }[];
  playerCount: number;
  deckCount: number;
  eventCount: number;
  avgWinRate: number;
  winRateInterval?: { low: number; high: number; matches: number };
  quality?: { meanSimilarity: number; minSimilarity: number; meanAssignmentMargin: number };
  confidence: "established" | "emerging";
  /** Share is all-time or recalculated from the selected season; the remaining optional figures are all-time-only. */
  metaShare?: number;
  topCutRate?: number;
  avgPlacement?: number | null;
  avgPrice?: number | null;
}

export default function ArchetypesIndex() {
  useDocumentTitle("Archetypes", "Data-derived Grand Archive TCG deck archetypes and named builds by Champion.");
  const data = useArchetypeTaxonomyData();
  const [championFilter, setChampionFilter] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("players");
  const [view, setView] = useState<ViewMode>("archetypes");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("established");
  const [buildVisibleCount, setBuildVisibleCount] = useState(BUILD_PAGE_SIZE);

  // Every Champion a build was ever played under, not just each cluster's plurality Champion —
  // otherwise a Champion who only shows up as the minority side of a shared shell (e.g. Merlin in
  // a mostly-Lorraine cluster) would silently disappear from the filter. `?? []` guards a stale
  // published copy from before this field shipped — same rollout-window issue as `seasons` below.
  const championsPresent = useMemo(() => {
    if (!data) return [];
    const names = new Set<string>();
    for (const c of data.clusters) for (const b of c.championBreakdown ?? []) names.add(b.championName);
    return Array.from(names).sort();
  }, [data]);

  const seasonsPresent = useMemo(() => {
    if (!data) return [];
    const bySeasonId = new Map<number, string>();
    for (const c of data.clusters) {
      // `seasons` guards against a stale IndexedDB copy from before this field shipped — same
      // rollout-window issue as the deck-card-index dictionary encoding.
      for (const s of c.seasons ?? []) bySeasonId.set(s.seasonId, s.seasonName);
    }
    return Array.from(bySeasonId.entries()).sort((a, b) => a[0] - b[0]);
  }, [data]);

  const rows = useMemo((): DisplayRow[] => {
    if (!data) return [];
    // `?? []` + the `c.championName ===` fallback both guard a stale published copy from before
    // `championBreakdown` shipped — filtering still works (against the older single-Champion
    // field) rather than throwing on `undefined.some(...)`.
    let filtered = championFilter
      ? data.clusters.filter((c) => c.championName === championFilter || (c.championBreakdown ?? []).some((b) => b.championName === championFilter))
      : data.clusters;
    if (confidenceFilter === "established") {
      filtered = filtered.filter((cluster) => (cluster.confidence ?? "established") === "established");
    }

    let displayRows: DisplayRow[];
    if (seasonId !== null) {
      const seasonDeckTotal = data.clusters.reduce(
        (sum, cluster) => sum + (cluster.seasons?.find((season) => season.seasonId === seasonId)?.deckCount ?? 0),
        0,
      );
      // A build not played at all in the selected season simply isn't shown — same convention as
      // Top Decks' season filter. Stats shown are that season's, not all-time.
      displayRows = filtered
        .map((c) => {
          const season = c.seasons?.find((s) => s.seasonId === seasonId);
          if (!season) return null;
          return {
            id: c.id,
            name: c.name,
            championName: c.championName,
            otherChampions: (c.championBreakdown ?? []).filter((b) => b.championName !== c.championName),
            playerCount: season.playerCount,
            deckCount: season.deckCount,
            eventCount: season.eventCount,
            avgWinRate: season.avgWinRate,
            confidence: c.confidence ?? "established",
            metaShare: seasonDeckTotal > 0 ? season.deckCount / seasonDeckTotal : 0,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
    } else {
      displayRows = filtered.map((c) => ({
        id: c.id,
        name: c.name,
        championName: c.championName,
        otherChampions: (c.championBreakdown ?? []).filter((b) => b.championName !== c.championName),
        playerCount: c.playerCount,
        deckCount: c.deckCount,
        eventCount: c.eventCount,
        avgWinRate: c.avgWinRate,
        winRateInterval: c.winRateInterval,
        quality: c.quality,
        confidence: c.confidence ?? "established",
        metaShare: c.metaShare,
        topCutRate: c.topCutRate,
        avgPlacement: c.avgPlacement,
        avgPrice: c.avgPrice,
      }));
    }

    return displayRows.sort((a, b) => {
      switch (sortMode) {
        case "winRate":
          return b.avgWinRate - a.avgWinRate;
        case "metaShare":
          return (b.metaShare ?? 0) - (a.metaShare ?? 0);
        case "topCutRate":
          return (b.topCutRate ?? 0) - (a.topCutRate ?? 0);
        case "avgPlacement":
          // Lower placement is better — nulls (unknown) sort last regardless of direction.
          return (a.avgPlacement ?? Infinity) - (b.avgPlacement ?? Infinity);
        case "avgPrice":
          return (b.avgPrice ?? 0) - (a.avgPrice ?? 0);
        default:
          return b.playerCount - a.playerCount;
      }
    });
  }, [data, championFilter, confidenceFilter, seasonId, sortMode]);

  const visibleRows = rows.slice(0, buildVisibleCount);
  const strategyArchetypes = useMemo(() => {
    if (!data?.strategyArchetypes) return [];
    return data.strategyArchetypes.filter((strategy) =>
      (!championFilter || strategy.championName === championFilter) &&
      (confidenceFilter === "all" || strategy.confidence === "established"),
    );
  }, [data, championFilter, confidenceFilter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Archetypes"
        description="Strategy archetypes are defined by recurring main-deck engines and win conditions. Each archetype contains one or more concrete builds whose quantities, material package, or tech choices differ."
        actions={
          <Link to="/battle-chart" className="text-sm text-ctp-blue hover:underline">
            Battle chart &rarr;
          </Link>
        }
      />
      <DecklistCoverageNotice />
      <StaleDataNotice generatedAt={[data?.generatedAt]} />
      {data?.coverage && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          {(data.coverage.classificationRate * 100).toFixed(1)}% of public deck sightings are classified
          ({data.coverage.classifiedDeckCount.toLocaleString()} of {data.coverage.totalDeckCount.toLocaleString()}).
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["archetypes", "builds", "validation", "hurtYou"] as ViewMode[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              view === v ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {v === "archetypes" ? "Archetypes" : v === "builds" ? "Builds" : v === "validation" ? "Validation" : "Cards That Hurt You"}
          </button>
        ))}
      </div>

      {view === "archetypes" && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ctp-subtext0">Champion:</span>
            <select value={championFilter ?? ""} aria-label="Champion" onChange={(event) => setChampionFilter(event.target.value || null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">
              <option value="">All champions</option>
              {championsPresent.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <span className="ml-2 text-ctp-subtext0">Confidence:</span>
            <select value={confidenceFilter} aria-label="Confidence" onChange={(event) => setConfidenceFilter(event.target.value as ConfidenceFilter)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">
              <option value="established">Established</option>
              <option value="all">Established + emerging</option>
            </select>
          </div>
          {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
          {data && strategyArchetypes.length === 0 && <p className="mt-6 text-ctp-subtext1">No strategy archetypes match these filters.</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {strategyArchetypes.map((strategy) => {
              const primaryBuildId = strategy.buildIds[0];
              return (
                <article key={strategy.id} className="rounded-xl border border-ctp-surface1 bg-ctp-base p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-1.5 font-semibold text-ctp-text">
                        <ArchetypeElementIcon name={strategy.name} />
                        {primaryBuildId ? <Link to={`/archetypes/${primaryBuildId}`} className="hover:text-ctp-blue">{strategy.name}</Link> : strategy.name}
                      </h2>
                      <p className="mt-1 text-xs text-ctp-subtext0">{strategy.playerCount} players · {strategy.deckCount} decks · {strategy.buildIds.length} {strategy.buildIds.length === 1 ? "build" : "builds"}</p>
                    </div>
                    {strategy.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-1 text-[10px] font-medium text-ctp-yellow">Emerging</span>}
                  </div>
                  <p className="mt-3 text-xs font-medium text-ctp-subtext1">Defining main-deck package</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {strategy.definingCards.slice(0, 5).map((card) => <span key={card.name} className="rounded-md bg-ctp-mantle px-2 py-1 text-xs text-ctp-subtext1">{card.name} <span className="text-ctp-subtext0">{(card.prevalence * 100).toFixed(0)}%</span></span>)}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {view === "builds" && (
        <>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Champion:</span>
        <select
          value={championFilter ?? ""}
          aria-label="Champion"
          onChange={(e) => {
            setChampionFilter(e.target.value || null);
            setBuildVisibleCount(BUILD_PAGE_SIZE);
          }}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All champions</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <span className="ml-2 text-ctp-subtext0">Season:</span>
        <select
          value={seasonId ?? ""}
          aria-label="Season"
          onChange={(e) => {
            setSeasonId(e.target.value ? Number(e.target.value) : null);
            setBuildVisibleCount(BUILD_PAGE_SIZE);
          }}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="">All seasons</option>
          {seasonsPresent.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <span className="ml-2 text-ctp-subtext0">Confidence:</span>
        <select
          value={confidenceFilter}
          aria-label="Confidence"
          onChange={(e) => {
            setConfidenceFilter(e.target.value as ConfidenceFilter);
            setBuildVisibleCount(BUILD_PAGE_SIZE);
          }}
          className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
        >
          <option value="established">Established</option>
          <option value="all">Established + emerging</option>
        </select>

        <span className="ml-2 text-ctp-subtext0">Sort by:</span>
        {(["players", "winRate", "metaShare", "topCutRate", "avgPlacement", "avgPrice"] as SortMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setSortMode(mode);
              setBuildVisibleCount(BUILD_PAGE_SIZE);
            }}
            aria-pressed={sortMode === mode}
            className={`rounded-md border px-2 py-1 text-xs ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {SORT_LABELS[mode]}
          </button>
        ))}
      </div>
      {seasonId !== null && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          Build share is calculated within this season's clustered deck population. Top cut rate, avg placement, and
          avg price remain "—" because those figures aren't published per season.
        </p>
      )}

      {rows.length > 1 && (
        <ArchetypeMetaMap
          builds={rows}
          scopeLabel={`${seasonId === null ? "all seasons" : seasonsPresent.find(([id]) => id === seasonId)?.[1] ?? "selected season"}${championFilter ? ` · ${championFilter}` : ""}`}
        />
      )}

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {data && rows.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">
          {seasonId !== null ? "No builds were played in this season yet." : "No builds have cleared the sample-size threshold yet."}
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1 pr-6">Build</th>
              <th className="py-1 pr-6">Champion</th>
              <th className="py-1 pr-6">Players</th>
              <th className="py-1 pr-6">Events</th>
              <th className="py-1 pr-6">Win rate</th>
              <th className="py-1 pr-6">Meta share</th>
              <th className="py-1 pr-6">Top cut rate</th>
              <th className="py-1 pr-6">Avg placement</th>
              <th className="py-1">Avg price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
            {visibleRows.map((c) => {
              return (
              <tr key={c.id}>
                <td className="py-1.5 pr-6 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <ArchetypeElementIcon name={c.name} />
                    <Link to={`/archetypes/${c.id}`} className="text-ctp-text hover:text-ctp-blue">
                      {c.name}
                    </Link>
                    {c.confidence === "emerging" && (
                      <span className="rounded-full bg-ctp-yellow/15 px-1.5 py-0.5 text-[10px] font-medium text-ctp-yellow">Emerging</span>
                    )}
                  </span>
                </td>
                <td className="py-1.5 pr-6 whitespace-nowrap">
                  <Link to={`/champions/${encodeURIComponent(c.championName)}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                    {c.championName}
                  </Link>
                  {c.otherChampions.length > 0 && (
                    <span
                      className="ml-1 text-xs text-ctp-subtext0"
                      title={`Also played under: ${c.otherChampions.map((b) => `${b.championName} (${b.playerCount}p)`).join(", ")}`}
                    >
                      +{c.otherChampions.length}
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{c.playerCount}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{c.eventCount}</td>
                <td
                  className="py-1.5 pr-6 text-ctp-subtext1"
                  title={c.winRateInterval ? `95% interval: ${(c.winRateInterval.low * 100).toFixed(1)}–${(c.winRateInterval.high * 100).toFixed(1)}% across ${c.winRateInterval.matches} matches${c.quality ? ` · ${(c.quality.meanSimilarity * 100).toFixed(0)}% mean cohesion` : ""}` : undefined}
                >
                  {(c.avgWinRate * 100).toFixed(0)}%
                </td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{c.metaShare !== undefined ? `${(c.metaShare * 100).toFixed(1)}%` : "—"}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">{c.topCutRate !== undefined ? `${(c.topCutRate * 100).toFixed(0)}%` : "—"}</td>
                <td className="py-1.5 pr-6 text-ctp-subtext1">
                  {c.avgPlacement !== undefined && c.avgPlacement !== null ? `#${c.avgPlacement.toFixed(0)}` : "—"}
                </td>
                <td className="py-1.5 text-ctp-subtext1">
                  {c.avgPrice !== undefined && c.avgPrice !== null ? formatUsd(c.avgPrice) : "—"}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <LoadMore
        remaining={rows.length - buildVisibleCount}
        onLoadMore={() => setBuildVisibleCount((count) => count + BUILD_PAGE_SIZE)}
        label="Load more builds"
      />
        </>
      )}

      {view === "hurtYou" && (
        <Suspense fallback={<p className="mt-6 text-ctp-subtext1">Loading…</p>}>
          <ArchetypeHurtYouView taxonomy={data} />
        </Suspense>
      )}

      {view === "validation" && (
        <Suspense fallback={<p className="mt-6 text-ctp-subtext1">Loading…</p>}>
          <ArchetypeValidationView />
        </Suspense>
      )}
    </div>
  );
}
