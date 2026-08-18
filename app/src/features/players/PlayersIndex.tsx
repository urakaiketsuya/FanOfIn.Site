import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOmnidexPlayers } from "../tournaments/data";
import { useEloData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

export default function PlayersIndex() {
  useDocumentTitle("Players", "Grand Archive TCG player rankings by Elo rating across ingested tournaments.");
  const playersData = useOmnidexPlayers();
  const eloData = useEloData();
  const [search, setSearch] = useState("");

  const ranked = useMemo(() => {
    if (!playersData || !eloData) return [];
    const ratingById = new Map(eloData.ratings.map((r) => [r.playerId, r]));
    return playersData.players
      .map((p) => ({ player: p, rating: ratingById.get(p.id) }))
      .filter((r) => r.rating && r.rating.matches > 0)
      .sort((a, b) => (b.rating?.rating ?? 0) - (a.rating?.rating ?? 0))
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [playersData, eloData]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return ranked;
    return ranked.filter((r) => r.player.username.toLowerCase().includes(needle));
  }, [ranked, search]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Players</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Ratings are reconstructed from Omnidex's own per-match Elo deltas across every ingested event.
      </p>

      <input
        type="text"
        placeholder="Search by username…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full rounded-md border border-ctp-surface1 bg-ctp-mantle px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:max-w-sm"
      />

      {(!playersData || !eloData) && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {playersData && eloData && rows.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No rated players match "{search}".</p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
              <th className="py-1">#</th>
              <th className="py-1">Player</th>
              <th className="py-1">Rating</th>
              <th className="py-1">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ctp-surface0">
            {rows.map(({ player, rating, rank }) => (
              <tr key={player.id}>
                <td className="py-1.5 text-ctp-subtext1">{rank}</td>
                <td className="py-1.5 whitespace-nowrap">
                  <Link to={`/players/${player.id}`} className="text-ctp-text hover:text-ctp-blue">
                    {player.username}
                  </Link>
                </td>
                <td className="py-1.5 text-ctp-subtext1">{Math.round(rating?.rating ?? 0)}</td>
                <td className="py-1.5 text-ctp-subtext1">
                  {rating?.wins}-{rating?.losses}-{rating?.ties}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
