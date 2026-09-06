import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useArchetypeTaxonomyData } from "./data";
import LoadMore from "../../components/LoadMore";
import StaleDataNotice from "../../components/StaleDataNotice";
import DecklistCoverageNotice from "../../components/DecklistCoverageNotice";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import PageHeader from "../../components/ui/PageHeader";
import { InlineState } from "../../components/ui/ContentState";
import { formatUsd } from "../../lib/format";
import { championNameToSlug } from "../../lib/championSlug";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import ArchetypeMetaMap from "./ArchetypeMetaMap";
import PageLayout from "../../components/layout/PageLayout";

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
  const materialArchetypes = useMemo(() => {
    if (!data?.materialArchetypes) return [];
    return data.materialArchetypes
      .filter((route) =>
        (!championFilter || route.championName === championFilter) &&
        (confidenceFilter === "all" || route.confidence === "established"),
      )
      .sort((a, b) => b.playerCount - a.playerCount);
  }, [data, championFilter, confidenceFilter]);
  const largestMaterialArchetype = materialArchetypes[0]?.playerCount ?? 1;

  return (
    <PageLayout data-component="ArchetypesIndex">
      <PageHeader
        title="Archetypes"
        description="Choose a recurring material build path first, then explore its main-deck engine and win condition. Smaller but coherent paths remain visible as emerging evidence instead of being blended into the most common shell."
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
          <div className="mt-5 grid gap-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle/50 p-3 text-xs sm:grid-cols-3">
            <div className="rounded-lg bg-ctp-base p-3">
              <span className="font-semibold text-ctp-mauve">1 · Material route</span>
              <p className="mt-1 text-ctp-subtext0">The Champion path and material cards you commit to.</p>
            </div>
            <div className="rounded-lg bg-ctp-base p-3">
              <span className="font-semibold text-ctp-blue">2 · Spirit</span>
              <p className="mt-1 text-ctp-subtext0">The Spirit version played within that route.</p>
            </div>
            <div className="rounded-lg bg-ctp-base p-3">
              <span className="font-semibold text-ctp-green">3 · Build</span>
              <p className="mt-1 text-ctp-subtext0">The distinct main-deck package you want to explore.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2 text-ctp-subtext0">Champion
              <select value={championFilter ?? ""} aria-label="Champion" onChange={(event) => setChampionFilter(event.target.value || null)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">
                <option value="">All champions</option>
                {championsPresent.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-ctp-subtext0">Confidence
              <select value={confidenceFilter} aria-label="Confidence" onChange={(event) => setConfidenceFilter(event.target.value as ConfidenceFilter)} className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text">
                <option value="established">Established</option>
                <option value="all">Established + emerging</option>
              </select>
            </label>
          </div>
          {!data && <InlineState className="mt-6">Loading…</InlineState>}
          {data && materialArchetypes.length === 0 && <InlineState className="mt-6">No material archetypes match these filters.</InlineState>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {materialArchetypes.map((route) => {
              const primaryBuildId = route.buildIds[0];
              const childBuilds = route.buildIds
                .map((buildId) => data?.clusters.find((cluster) => cluster.id === buildId))
                .filter((build): build is NonNullable<typeof data>['clusters'][number] => !!build)
                .sort((a, b) => b.playerCount - a.playerCount);
              return (
                <article key={route.id} className="group relative overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-base shadow-sm transition hover:-translate-y-0.5 hover:border-ctp-blue/50 hover:shadow-md">
                  <div className="h-1 bg-ctp-surface0">
                    <div className="h-full rounded-r bg-gradient-to-r from-ctp-mauve to-ctp-blue" style={{ width: `${Math.max(4, (route.playerCount / largestMaterialArchetype) * 100)}%` }} />
                  </div>
                  <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-semibold tracking-widest text-ctp-mauve uppercase">Material route</p>
                      <h2 className="flex items-center gap-2 text-base font-semibold text-ctp-text">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ctp-mauve/25 to-ctp-blue/20 text-xs font-bold text-ctp-mauve" aria-hidden="true">{route.championName.slice(0, 1)}</span>
                        {primaryBuildId ? <Link to={`/archetypes/${primaryBuildId}`} className="hover:text-ctp-blue">{route.name}</Link> : route.name}
                      </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {route.confidence === "emerging" && <span className="rounded-full bg-ctp-yellow/15 px-2 py-1 text-[10px] font-medium text-ctp-yellow">Emerging</span>}
                      <button type="button" onClick={() => toggleCompare(route.id)} aria-pressed={selectedCompareIds.has(route.id)} className={`rounded-md border px-2 py-1 text-[10px] font-medium ${selectedCompareIds.has(route.id) ? "border-ctp-green bg-ctp-green/10 text-ctp-green" : "border-ctp-surface1 text-ctp-subtext0 hover:border-ctp-blue hover:text-ctp-blue"}`}>
                        {selectedCompareIds.has(route.id) ? "Selected" : "Compare"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 divide-x divide-ctp-surface1 rounded-lg bg-ctp-mantle py-2 text-center">
                    <div><strong className="block text-sm text-ctp-text">{route.playerCount.toLocaleString()}</strong><span className="text-[10px] text-ctp-subtext0">players</span></div>
                    <div><strong className="block text-sm text-ctp-text">{route.deckCount.toLocaleString()}</strong><span className="text-[10px] text-ctp-subtext0">appearances</span></div>
                    <div><strong className="block text-sm text-ctp-text">{route.buildIds.length}</strong><span className="text-[10px] text-ctp-subtext0">{route.buildIds.length === 1 ? "build" : "builds"}</span></div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold tracking-wider text-ctp-blue uppercase">Spirits</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {route.spiritBreakdown.slice(0, 4).map((spirit) => <span key={spirit.name} className="rounded-full border border-ctp-blue/25 bg-ctp-blue/5 px-2 py-1 text-xs text-ctp-subtext1">{spirit.name} <span className="text-ctp-subtext0">{spirit.playerCount}p</span></span>)}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold tracking-wider text-ctp-mauve uppercase">Signature material cards</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {route.definingCards.slice(0, 4).map((card) => <span key={card.name} className="rounded-md bg-ctp-surface0 px-2 py-1 text-xs text-ctp-subtext1">{card.name} <span className="text-ctp-subtext0">{(card.prevalence * 100).toFixed(0)}%</span></span>)}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-ctp-surface0 pt-3">
                    <p className="text-[10px] font-semibold tracking-wider text-ctp-green uppercase">Main-deck builds</p>
                    <div className="mt-1.5 space-y-1">
                      {childBuilds.slice(0, 3).map((build) => <Link key={build.id} to={`/archetypes/${build.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-blue"><span className="truncate">{build.name}</span><span className="shrink-0 text-ctp-subtext0">{build.playerCount}p &rarr;</span></Link>)}
                      {childBuilds.length > 3 && <p className="px-2 pt-1 text-[10px] text-ctp-subtext0">+{childBuilds.length - 3} more builds</p>}
                    </div>
                  </div>
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

      {!data && <InlineState className="mt-6">Loading…</InlineState>}
      {data && rows.length === 0 && (
        <InlineState className="mt-6">
          {seasonId !== null ? "No builds were played in this season yet." : "No builds have cleared the sample-size threshold yet."}
        </InlineState>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="w-16 py-1 pr-3">Compare</th>
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
                <td className="py-1.5 pr-3">
                  <button type="button" onClick={() => toggleCompare(c.id)} aria-label={`${selectedCompareIds.has(c.id) ? "Remove" : "Add"} ${c.name} ${selectedCompareIds.has(c.id) ? "from" : "to"} comparison`} aria-pressed={selectedCompareIds.has(c.id)} className={`grid h-6 w-6 place-items-center rounded border text-xs ${selectedCompareIds.has(c.id) ? "border-ctp-green bg-ctp-green/10 text-ctp-green" : "border-ctp-surface1 text-ctp-subtext0 hover:border-ctp-blue hover:text-ctp-blue"}`}>
                    {selectedCompareIds.has(c.id) ? "✓" : "+"}
                  </button>
                </td>
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
                  <Link to={`/champions/${championNameToSlug(c.championName)}`} className="text-ctp-subtext1 hover:text-ctp-blue">
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
      {(view === "archetypes" || view === "builds") && selectedCompareIds.size > 0 && (
        <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border border-ctp-blue/40 bg-ctp-mantle/95 p-3 shadow-xl backdrop-blur">
          <div className="min-w-0 text-sm">
            <span className="font-semibold text-ctp-text">{selectedCompareIds.size} of 4 selected</span>
            <span className="ml-2 hidden text-xs text-ctp-subtext0 sm:inline">Choose at least two {view === "archetypes" ? "material archetypes" : "builds"}.</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setSelectedCompareIds(new Set())} className="rounded-md px-2 py-1.5 text-xs text-ctp-subtext1 hover:text-ctp-text">Clear</button>
            {selectedCompareIds.size >= 2 ? (
              <Link to={`/archetypes/compare?type=${view === "archetypes" ? "route" : "build"}&ids=${Array.from(selectedCompareIds).join(",")}`} className="rounded-md bg-ctp-blue px-3 py-1.5 text-xs font-semibold text-ctp-base hover:brightness-110">Compare selected &rarr;</Link>
            ) : (
              <span className="rounded-md bg-ctp-surface1 px-3 py-1.5 text-xs font-semibold text-ctp-overlay1">Select one more</span>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
