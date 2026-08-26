import { useMemo, useState } from "react";
import type { OmnidexPlayer, OmnidexTeamsResponse } from "@gatcg/shared";
import PlayerLink from "../players/PlayerLink";

export default function EventTeamsSection({ teams, players }: { teams: OmnidexTeamsResponse; players: OmnidexPlayer[] }) {
  const [search, setSearch] = useState("");

  function playerName(id: number): string {
    return players.find((p) => p.id === id)?.username ?? `Player #${id}`;
  }

  const sorted = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...teams]
      .filter(
        (t) =>
          !needle || t.name.toLowerCase().includes(needle) || t.players.some((p) => playerName(p.id).toLowerCase().includes(needle)),
      )
      .sort((a, b) => (a.finalPlacement ?? Infinity) - (b.finalPlacement ?? Infinity) || a.name.localeCompare(b.name));
  }, [teams, search, players]);

  if (teams.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Teams ({teams.length})</h2>

      {teams.length > 10 && (
        <input
          type="text"
          aria-label="Search by team or player"
          placeholder="Search by team or player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
        />
      )}

      {sorted.length === 0 && <p className="mt-2 text-sm text-ctp-subtext1">No teams match "{search}".</p>}

      <div className="mt-2 space-y-1 text-sm">
        {sorted.map((team, i) => (
          <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="w-6 shrink-0 text-right text-ctp-subtext0">{team.finalPlacement ?? ""}</span>
            <span className="font-medium text-ctp-text">{team.name.trim() || "(unnamed team)"}</span>
            {team.players.length > 0 ? (
              <span className="text-ctp-subtext1">
                {team.players.map((p, j) => (
                  <span key={p.id}>
                    {j > 0 && ", "}
                    <PlayerLink id={p.id} username={playerName(p.id)} className="hover:text-ctp-blue" />
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-xs text-ctp-subtext0">No players listed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
