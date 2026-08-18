import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOmnidexTeams, useOmnidexPlayers } from "../tournaments/data";
import PlayerLink from "../players/PlayerLink";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function TeamsIndex() {
  useDocumentTitle(
    "Teams",
    "Grand Archive TCG team registrations from 3v3 team-format events, searchable by team name or player.",
  );
  const teamsData = useOmnidexTeams();
  const playersData = useOmnidexPlayers();
  const [search, setSearch] = useState("");

  const usernameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of playersData?.players ?? []) map.set(p.id, p.username);
    return map;
  }, [playersData]);

  function playerName(id: number): string {
    return usernameById.get(id) ?? `Player #${id}`;
  }

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const teams = teamsData?.teams ?? [];
    if (!needle) return teams;
    return teams.filter(
      (t) => t.teamName.toLowerCase().includes(needle) || t.players.some((p) => playerName(p.id).toLowerCase().includes(needle)),
    );
  }, [teamsData, search, usernameById]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Teams</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Team registrations from 3v3 team-format events. Each row is one team at one event — team names aren't a
        reliable identity (the same name can belong to unrelated teams, and generic names like "Team 1" repeat
        across unrelated local events), so this isn't deduplicated into one profile per team.
      </p>

      <input
        type="text"
        placeholder="Search by team or player…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none"
      />

      {!teamsData && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {teamsData && rows.length === 0 && <p className="mt-6 text-ctp-subtext1">No teams match "{search}".</p>}

      <div className="mt-4 space-y-2">
        {rows.map((t, i) => (
          <div key={i} className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="font-medium text-ctp-text">{t.teamName.trim() || "(unnamed team)"}</span>
              {t.finalPlacement !== null && <span className="text-xs text-ctp-subtext0">Placed #{t.finalPlacement}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-ctp-subtext1">
              <Link to={`/events/${t.eventId}`} className="text-ctp-blue hover:underline">
                {t.eventName}
              </Link>
              <span className="text-xs text-ctp-subtext0">{new Date(t.eventDate).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 text-ctp-subtext1">
              {t.players.map((p, j) => (
                <span key={p.id}>
                  {j > 0 && ", "}
                  <PlayerLink id={p.id} username={playerName(p.id)} className="hover:text-ctp-blue" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
