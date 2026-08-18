import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useArchetypeTaxonomyData } from "./data";

type SortMode = "players" | "winRate";

interface DisplayRow {
  id: string;
  name: string;
  championName: string;
  playerCount: number;
  eventCount: number;
  avgWinRate: number;
}

export default function ArchetypesIndex() {
  const data = useArchetypeTaxonomyData();
  const [championFilter, setChampionFilter] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("players");

  const championsPresent = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.clusters.map((c) => c.championName))).sort();
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
    let filtered = championFilter ? data.clusters.filter((c) => c.championName === championFilter) : data.clusters;

    let displayRows: DisplayRow[];
    if (seasonId !== null) {
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
            playerCount: season.playerCount,
            eventCount: season.eventCount,
            avgWinRate: season.avgWinRate,
          };
        })
        .filter((r): r is DisplayRow => r !== null);
    } else {
      displayRows = filtered.map((c) => ({
        id: c.id,
        name: c.name,
        championName: c.championName,
        playerCount: c.playerCount,
        eventCount: c.eventCount,
        avgWinRate: c.avgWinRate,
      }));
    }

    return displayRows.sort((a, b) => (sortMode === "winRate" ? b.avgWinRate - a.avgWinRate : b.playerCount - a.playerCount));
  }, [data, championFilter, seasonId, sortMode]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">Archetypes</h1>
        <Link to="/battle-chart" className="text-sm text-ctp-blue hover:underline">
          Battle chart &rarr;
        </Link>
      </div>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Named builds within each Champion, derived from real decklists — decks are grouped by exact
        card list, then clustered by similarity. Groups below a minimum sample size are hidden as
        noise.
      </p>

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

        <span className="ml-2 text-ctp-subtext0">Sort by:</span>
        {(["players", "winRate"] as SortMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSortMode(mode)}
            className={`rounded-md border px-2 py-1 text-xs ${
              sortMode === mode ? "border-ctp-blue text-ctp-blue" : "border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text"
            }`}
          >
            {mode === "players" ? "Players" : "Win rate"}
          </button>
        ))}
      </div>

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {data && rows.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">
          {seasonId !== null ? "No builds were played in this season yet." : "No builds have cleared the sample-size threshold yet."}
        </p>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
            <th className="py-1">Build</th>
            <th className="py-1">Champion</th>
            <th className="py-1">Players</th>
            <th className="py-1">Events</th>
            <th className="py-1">Win rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="py-1.5">
                <Link to={`/archetypes/${c.id}`} className="text-ctp-text hover:text-ctp-blue">
                  {c.name}
                </Link>
              </td>
              <td className="py-1.5">
                <Link to={`/champions/${encodeURIComponent(c.championName)}`} className="text-ctp-subtext1 hover:text-ctp-blue">
                  {c.championName}
                </Link>
              </td>
              <td className="py-1.5 text-ctp-subtext1">{c.playerCount}</td>
              <td className="py-1.5 text-ctp-subtext1">{c.eventCount}</td>
              <td className="py-1.5 text-ctp-subtext1">{(c.avgWinRate * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
