import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OmnidexPlayer } from "@gatcg/shared";
import { gatcgApi, isApiErrorBody } from "../../lib/api/client";
import PlayerLink from "../players/PlayerLink";

function findPlayer(players: OmnidexPlayer[], id: number): OmnidexPlayer | undefined {
  return players.find((p) => p.id === id);
}

export default function EventPairings({ eventId, players, swissRounds }: { eventId: number; players: OmnidexPlayer[]; swissRounds: number }) {
  const [round, setRound] = useState(swissRounds);

  const pairings = useQuery({
    queryKey: ["omnidex-pairings", eventId, round],
    queryFn: () => gatcgApi.getOmnidexPairings(eventId, round),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Pairings</h2>
        {swissRounds > 1 && (
          <select
            value={round}
            onChange={(e) => setRound(Number(e.target.value))}
            className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
          >
            {Array.from({ length: swissRounds }, (_, i) => i + 1).map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        )}
      </div>

      {pairings.isPending && <p className="mt-2 text-sm text-ctp-subtext1">Loading…</p>}

      {pairings.data && !isApiErrorBody(pairings.data) && (
        <div className="mt-2 space-y-1">
          {pairings.data.pairings.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              {p.pairing.map((side, i) => {
                const player = findPlayer(players, side.id);
                const colorClass = side.status === "winner" ? "text-ctp-green" : "text-ctp-subtext1";
                return (
                  <span key={side.id} className={colorClass}>
                    {i > 0 && <span className="mx-1 text-ctp-subtext0">vs</span>}
                    {player ? (
                      <PlayerLink id={side.id} username={player.username} className={`hover:underline ${colorClass}`} />
                    ) : (
                      `Player #${side.id}`
                    )}{" "}
                    ({side.score})
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {pairings.data && isApiErrorBody(pairings.data) && (
        <p className="mt-2 text-sm text-ctp-subtext0">{pairings.data.error}</p>
      )}
    </div>
  );
}
