import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useArchetypeTaxonomyData } from "./data";
import { useCardsByNames } from "../events/useCardsByNames";
import LoadMore from "../../components/LoadMore";
import StaleDataNotice from "../../components/StaleDataNotice";
import DecklistCoverageNotice from "../../components/DecklistCoverageNotice";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { InlineState } from "../../components/ui/ContentState";
import ArchetypeMetaMap from "./ArchetypeMetaMap";
import PageLayout from "../../components/layout/PageLayout";
import { ArchetypeComparisonBar, BuildResultCard, MaterialRouteCard } from "./ArchetypeIndexViews";

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

export interface DisplayRow {
  id: string;
  name: string;
  championName: string;
  /** Other Champions besides `championName` this build was also played under, if any — e.g. [] for a single-Champion build. Guarded with `?? []` at read sites for a stale IndexedDB copy from before this field shipped. */
  otherChampions: { championName: string; deckCount: number; playerCount: number }[];
  definingCards: string[];
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
  const [selectedCompareIds, setSelectedCompareIds] = useState<Set<string>>(new Set());

  function toggleCompare(id: string) {
    setSelectedCompareIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

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
            definingCards: c.definingCards.map((card) => card.name),
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
        definingCards: c.definingCards.map((card) => card.name),
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
  const materialArchetypes = useMemo(() => {
    if (!data?.materialArchetypes) return [];
    return data.materialArchetypes
      .filter((route) =>
        (!championFilter || route.championName === championFilter) &&
        (confidenceFilter === "all" || route.confidence === "established"),
      )
      .sort((a, b) => b.playerCount - a.playerCount);
  }, [data, championFilter, confidenceFilter]);
  const cardImages = useCardsByNames(view === "archetypes"
    ? materialArchetypes.flatMap((route) => route.definingCards.slice(0, 3).map((card) => card.name))
    : view === "builds" ? visibleRows.flatMap((row) => row.definingCards.slice(0, 3)) : []);

  return (
    <PageLayout data-component="ArchetypesIndex" width="wide">
      <PageHeader
        title="Archetypes"
        actions={
          <Link to="/battle-chart" className="text-sm text-ctp-blue hover:underline">
            Battle chart &rarr;
          </Link>
        }
      />
      <DecklistCoverageNotice />
      <StaleDataNotice generatedAt={[data?.generatedAt]} />
      {data?.coverage && <details className="mt-2 text-xs text-ctp-subtext0"><summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">Data coverage</summary><p className="mt-1">{(data.coverage.classificationRate * 100).toFixed(1)}% of public deck sightings are classified ({data.coverage.classifiedDeckCount.toLocaleString()} of {data.coverage.totalDeckCount.toLocaleString()}).</p></details>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {(["archetypes", "builds", "validation", "hurtYou"] as ViewMode[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setView(v);
              setSelectedCompareIds(new Set());
            }}
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
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <label className="sr-only" htmlFor="archetype-champion">Champion</label>
            <select id="archetype-champion" value={championFilter ?? ""} onChange={(event) => setChampionFilter(event.target.value || null)} className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
              <option value="">All champions</option>
              {championsPresent.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <label className="sr-only" htmlFor="archetype-confidence">Confidence</label>
            <select id="archetype-confidence" value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value as ConfidenceFilter)} className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
              <option value="established">Established</option>
              <option value="all">Established + emerging</option>
            </select>
          </div>
          {!data && <InlineState className="mt-6">Loading…</InlineState>}
          {data && materialArchetypes.length === 0 && <InlineState className="mt-6">No material archetypes match these filters.</InlineState>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {materialArchetypes.map((route) => {
              const childBuilds = route.buildIds
                .map((buildId) => data?.clusters.find((cluster) => cluster.id === buildId))
                .filter((build): build is NonNullable<typeof data>['clusters'][number] => !!build)
                .sort((a, b) => b.playerCount - a.playerCount);
              return (
                <MaterialRouteCard key={route.id} route={route} childBuilds={childBuilds} cardImages={cardImages} selected={selectedCompareIds.has(route.id)} onToggleCompare={() => toggleCompare(route.id)} />
              );
            })}
          </div>
        </>
      )}

      {view === "builds" && (
        <>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <select
          value={championFilter ?? ""}
          aria-label="Champion"
          onChange={(e) => {
            setChampionFilter(e.target.value || null);
            setBuildVisibleCount(BUILD_PAGE_SIZE);
          }}
          className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text"
        >
          <option value="">All champions</option>
          {championsPresent.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select value={sortMode} aria-label="Sort builds" onChange={(event) => { setSortMode(event.target.value as SortMode); setBuildVisibleCount(BUILD_PAGE_SIZE); }} className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2.5 text-sm text-ctp-text">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => <option key={mode} value={mode}>{SORT_LABELS[mode]}</option>)}
        </select>
      </div>
      <details className="mt-2 text-xs text-ctp-subtext0">
        <summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">More filters{seasonId !== null || confidenceFilter === "all" ? " · active" : ""}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
        <select
          value={seasonId ?? ""}
          aria-label="Season"
          onChange={(e) => {
            setSeasonId(e.target.value ? Number(e.target.value) : null);
            setBuildVisibleCount(BUILD_PAGE_SIZE);
          }}
          className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2 text-xs text-ctp-text"
        >
          <option value="">All seasons</option>
          {seasonsPresent.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={confidenceFilter}
          aria-label="Confidence"
          onChange={(e) => {
            setConfidenceFilter(e.target.value as ConfidenceFilter);
            setBuildVisibleCount(BUILD_PAGE_SIZE);
          }}
          className="min-w-0 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2 py-2 text-xs text-ctp-text"
        >
          <option value="established">Established</option>
          <option value="all">Established + emerging</option>
        </select>

        </div>
      </details>
      {seasonId !== null && (
        <p className="mt-2 text-xs text-ctp-subtext0">Season view uses season-specific results; top cut, placement, and price are only available all-time.</p>
      )}

      {rows.length > 1 && (
        <details className="mt-4 text-xs text-ctp-subtext0"><summary className="w-fit cursor-pointer py-1 hover:text-ctp-blue">Build metagame map</summary><ArchetypeMetaMap
          builds={rows}
          scopeLabel={`${seasonId === null ? "all seasons" : seasonsPresent.find(([id]) => id === seasonId)?.[1] ?? "selected season"}${championFilter ? ` · ${championFilter}` : ""}`}
        /></details>
      )}

      {!data && <InlineState className="mt-6">Loading…</InlineState>}
      {data && rows.length === 0 && (
        <InlineState className="mt-6">
          {seasonId !== null ? "No builds were played in this season yet." : "No builds have cleared the sample-size threshold yet."}
        </InlineState>
      )}

      {data && rows.length > 0 && <p className="mt-4 text-xs text-ctp-subtext0">Showing {visibleRows.length.toLocaleString()} of {rows.length.toLocaleString()} builds</p>}
      <div className="mt-2 grid gap-3 sm:grid-cols-2 sm:items-start">
        {visibleRows.map((build) => <BuildResultCard key={build.id} build={build} cardImages={cardImages} selected={selectedCompareIds.has(build.id)} onToggleCompare={() => toggleCompare(build.id)} />)}
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
      {(view === "archetypes" || view === "builds") && <ArchetypeComparisonBar selectedIds={selectedCompareIds} kind={view} onClear={() => setSelectedCompareIds(new Set())} />}
    </PageLayout>
  );
}
