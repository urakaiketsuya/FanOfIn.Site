import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CardImpactRole } from "@gatcg/shared";
import { useArchetypeTaxonomyData, useMatchupCardImpactData } from "./data";
import { useCardsByNames } from "../events/useCardsByNames";
import CardHoverPreview from "../../components/CardHoverPreview";
import LoadMore from "../../components/LoadMore";
import StaleDataNotice from "../../components/StaleDataNotice";
import DecklistCoverageNotice from "../../components/DecklistCoverageNotice";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { formatUsd } from "../../lib/format";
import ArchetypeElementIcon from "../../components/ArchetypeElementIcon";
import ArchetypeMetaMap from "./ArchetypeMetaMap";

type SortMode = "players" | "winRate" | "metaShare" | "topCutRate" | "avgPlacement" | "avgPrice";

const SORT_LABELS: Record<SortMode, string> = {
  players: "Players",
  winRate: "Win rate",
  metaShare: "Meta share",
  topCutRate: "Top cut rate",
  avgPlacement: "Avg placement",
  avgPrice: "Avg price",
};

type ViewMode = "builds" | "hurtYou";
type ConfidenceFilter = "established" | "all";
const ROLE_LABEL: Record<CardImpactRole, string> = { main: "Main", material: "Material", sideboard: "Sideboard", mixed: "Mixed" };
const HURT_YOU_PAGE_SIZE = 30;
interface HurtYouRow {
  key: string;
  cardName: string;
  role: CardImpactRole;
  adjustedLift: number;
  deckCountWith: number;
  deckCountWithout: number;
  myClusterId: string;
  myClusterName: string;
  opponentClusterId: string;
  opponentClusterName: string;
  games: number;
}

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
  const matchupData = useMatchupCardImpactData();
  const [championFilter, setChampionFilter] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("players");
  const [view, setView] = useState<ViewMode>("builds");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("established");
  const [hurtYouClusterId, setHurtYouClusterId] = useState<string | null>(null);
  const [hurtYouVisibleCount, setHurtYouVisibleCount] = useState(HURT_YOU_PAGE_SIZE);

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

  const clusterNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.clusters ?? []) map.set(c.id, c.name);
    return map;
  }, [data]);

  // One row per (matchup, opponent card) — deliberately not collapsed across matchups: each
  // adjustedLift is only meaningful against its own matchup's population/baseline, so blending
  // different matchups' numbers into one score per card would mix incomparable denominators.
  const hurtYouRows = useMemo((): HurtYouRow[] => {
    if (!matchupData) return [];
    const rows: HurtYouRow[] = [];
    for (const m of matchupData.matchups) {
      if (hurtYouClusterId && m.clusterId !== hurtYouClusterId) continue;
      for (const c of m.opponentCards) {
        rows.push({
          key: `${m.clusterId}:${m.opponentClusterId}:${c.cardName}`,
          cardName: c.cardName,
          role: c.role,
          adjustedLift: c.adjustedLift,
          deckCountWith: c.deckCountWith,
          deckCountWithout: c.deckCountWithout,
          myClusterId: m.clusterId,
          myClusterName: clusterNameById.get(m.clusterId) ?? m.clusterId,
          opponentClusterId: m.opponentClusterId,
          opponentClusterName: m.opponentClusterName,
          games: m.games,
        });
      }
    }
    return rows.sort((a, b) => a.adjustedLift - b.adjustedLift);
  }, [matchupData, hurtYouClusterId, clusterNameById]);

  const hurtYouVisible = hurtYouRows.slice(0, hurtYouVisibleCount);
  const hurtYouCardImages = useCardsByNames(useMemo(() => hurtYouVisible.map((r) => r.cardName), [hurtYouVisible]));

  const buildOptions = useMemo(() => {
    if (!data) return [];
    return [...data.clusters].sort((a, b) => b.playerCount - a.playerCount);
  }, [data]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">Archetypes</h1>
        <Link to="/battle-chart" className="text-sm text-ctp-blue hover:underline">
          Battle chart &rarr;
        </Link>
      </div>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Named builds derived from real decklists by their cards alone — decks are grouped by exact
        card list, then clustered by similarity, regardless of Champion. A build played under more
        than one Champion shows a "+N" next to its main Champion. Groups below a minimum sample
        size are hidden as noise.
      </p>
      <DecklistCoverageNotice />
      <StaleDataNotice generatedAt={[data?.generatedAt]} />
      {data?.coverage && (
        <p className="mt-2 text-xs text-ctp-subtext0">
          {(data.coverage.classificationRate * 100).toFixed(1)}% of public deck sightings are classified
          ({data.coverage.classifiedDeckCount.toLocaleString()} of {data.coverage.totalDeckCount.toLocaleString()}).
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["builds", "hurtYou"] as ViewMode[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              view === v ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {v === "builds" ? "Builds" : "Cards That Hurt You"}
          </button>
        ))}
      </div>

      {view === "builds" && (
        <>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ctp-subtext0">Champion:</span>
        <select
          value={championFilter ?? ""}
          onChange={(e) => setChampionFilter(e.target.value || null)}
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
          onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : null)}
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
          onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceFilter)}
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
            onClick={() => setSortMode(mode)}
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
            {rows.map((c) => {
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
        </>
      )}

      {view === "hurtYou" && (
        <>
          <p className="mt-3 text-xs text-ctp-subtext0">
            Opponent cards that correlate with beating a build, from real pairing outcomes — the same "Cards that hurt
            you" numbers shown per-matchup on a build's own Card Impact tab, gathered here across every matchup at
            once. Each row is scoped to its own matchup's population, so lifts aren't comparable across different
            opponents — correlational, not a guarantee.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ctp-subtext0">My build:</span>
            <select
              value={hurtYouClusterId ?? ""}
              onChange={(e) => {
                setHurtYouClusterId(e.target.value || null);
                setHurtYouVisibleCount(HURT_YOU_PAGE_SIZE);
              }}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              <option value="">All builds</option>
              {buildOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.championName})
                </option>
              ))}
            </select>
          </div>

          {!matchupData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
          {matchupData && hurtYouRows.length === 0 && (
            <p className="mt-6 text-ctp-subtext1">
              {hurtYouClusterId
                ? "No matchup for this build has enough games to break down card-by-card yet."
                : "No matchups have enough games to break down card-by-card yet."}
            </p>
          )}

          {hurtYouRows.length > 0 && (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-max min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                      <th className="py-1 pr-6">Card</th>
                      <th className="py-1 pr-6">Role</th>
                      <th className="py-1 pr-6">Lift</th>
                      <th className="py-1 pr-6">Sample</th>
                      <th className="py-1 pr-6">My build</th>
                      <th className="py-1 pr-6">Opponent</th>
                      <th className="py-1">Games</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                    {hurtYouVisible.map((r) => {
                      const card = hurtYouCardImages.get(r.cardName);
                      return (
                        <tr key={r.key}>
                          <td className="py-1.5 pr-6 whitespace-nowrap">
                            <CardHoverPreview image={card?.editions[0]?.image} alt={r.cardName}>
                              {card ? (
                                <Link to={`/cards/${card.slug}`} className="text-ctp-text hover:text-ctp-blue">
                                  {r.cardName}
                                </Link>
                              ) : (
                                <span className="text-ctp-text">{r.cardName}</span>
                              )}
                            </CardHoverPreview>
                          </td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{ROLE_LABEL[r.role]}</td>
                          <td className="py-1.5 pr-6 font-semibold text-ctp-red">{(r.adjustedLift * 100).toFixed(1)}pp</td>
                          <td className="py-1.5 pr-6 text-xs text-ctp-subtext0">
                            {r.deckCountWith} vs {r.deckCountWithout}
                          </td>
                          <td className="py-1.5 pr-6 whitespace-nowrap">
                            <Link to={`/archetypes/${r.myClusterId}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                              {r.myClusterName}
                            </Link>
                          </td>
                          <td className="py-1.5 pr-6 whitespace-nowrap">
                            <Link to={`/archetypes/${r.opponentClusterId}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                              {r.opponentClusterName}
                            </Link>
                          </td>
                          <td className="py-1.5 text-ctp-subtext1">{r.games}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <LoadMore remaining={hurtYouRows.length - hurtYouVisibleCount} onLoadMore={() => setHurtYouVisibleCount((v) => v + HURT_YOU_PAGE_SIZE)} />
            </>
          )}
        </>
      )}
    </div>
  );
}
