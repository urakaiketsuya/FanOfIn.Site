import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { OmnidexDecklistEntry, OmnidexPlayer, OmnidexStage } from "@gatcg/shared";
import { gatcgApi, isApiErrorBody } from "../../lib/api/client";
import PlayerLink from "../players/PlayerLink";
import { buildCompareLink } from "../compare/deepLink";
import { buildClarentPlaytestUrl } from "../../lib/clarentPlaytest";

function findPlayer(players: OmnidexPlayer[], id: number): OmnidexPlayer | undefined {
  return players.find((p) => p.id === id);
}

function stageLabel(type: string): string {
  if (type === "swiss") return "Swiss";
  if (type === "single-elimination") return "Top Cut";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Round count for a stage — Omnidex doesn't return this directly per stage, only the event-level
 * `swissRounds`/`singleEliminationCutSize`. A single-elimination bracket's round count is derived
 * from its cut size (8 -> quarters/semis/final = 3 rounds); anything else defaults to 1 rather
 * than guessing.
 */
function roundsForStage(stage: OmnidexStage, swissRounds: number | null, singleEliminationCutSize: number | null): number {
  if (stage.type === "swiss") return swissRounds ?? 1;
  if (stage.type === "single-elimination") {
    return singleEliminationCutSize ? Math.max(1, Math.ceil(Math.log2(singleEliminationCutSize))) : 1;
  }
  return 1;
}

/**
 * Events can run multiple stages (e.g. Swiss, then a single-elimination Top Cut) — verified live
 * against a real Worlds event: 32 players, `stages: [{id:1,type:"swiss"}, {id:2,type:"single-
 * elimination"}]`. Omnidex's pairings endpoint needs an explicit `stage` param to pick the right
 * one; without it, "Round 1" silently returned Top Cut's round 1 (4 matches) instead of Swiss
 * round 1 (16 matches) — the stage this component now defaults to.
 */
export default function EventPairings({
  eventId,
  players,
  stages,
  swissRounds,
  singleEliminationCutSize,
  decklists,
}: {
  eventId: number;
  players: OmnidexPlayer[];
  stages: OmnidexStage[];
  swissRounds: number | null;
  singleEliminationCutSize: number | null;
  decklists?: OmnidexDecklistEntry[];
}) {
  const sortedStages = [...stages].sort((a, b) => a.id - b.id);
  const [stageId, setStageId] = useState(sortedStages[0]?.id);
  const [round, setRound] = useState(1);
  const stage = sortedStages.find((s) => s.id === stageId) ?? sortedStages[0];
  const totalRounds = stage ? roundsForStage(stage, swissRounds, singleEliminationCutSize) : 1;

  const pairings = useQuery({
    queryKey: ["omnidex-pairings", eventId, round, stageId],
    queryFn: () => gatcgApi.getOmnidexPairings(eventId, round, stageId),
    enabled: stageId !== undefined,
  });

  function handleStageChange(id: number) {
    setStageId(id);
    setRound(1);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Pairings</h2>
        <div className="flex items-center gap-2">
          {sortedStages.length > 1 && (
            <select
              value={stageId}
              aria-label="Stage"
              onChange={(e) => handleStageChange(Number(e.target.value))}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {stageLabel(s.type)}
                </option>
              ))}
            </select>
          )}
          {totalRounds > 1 && (
            <select
              value={round}
              aria-label="Round"
              onChange={(e) => setRound(Number(e.target.value))}
              className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
            >
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  Round {r}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {pairings.isPending && <p className="mt-2 text-sm text-ctp-subtext1">Loading…</p>}

      {pairings.data && !isApiErrorBody(pairings.data) && (
        <div className="mt-2 space-y-1">
          {pairings.data.pairings.map((p) => {
            const bothNumeric = p.pairing.length === 2 && p.pairing.every((side) => typeof side.id === "number");
            const matchupDecks = bothNumeric
              ? p.pairing.map((side) => decklists?.find((entry) => entry.player === side.id)?.decklist)
              : [];
            const clarentUrl = matchupDecks.length === 2 && matchupDecks[0] && matchupDecks[1]
              ? buildClarentPlaytestUrl(matchupDecks[0], matchupDecks[1])
              : null;
            return (
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
                      {side.dropped && (
                        <span className="ml-1 rounded-full border border-ctp-red px-1.5 text-[10px] text-ctp-red">Dropped</span>
                      )}
                    </span>
                  );
                })}
                {bothNumeric && (
                  <Link
                    to={buildCompareLink(p.pairing.map((side) => ({ eventId, player: side.id })))}
                    className="ml-1 text-xs text-ctp-blue hover:underline"
                  >
                    Compare decklists &rarr;
                  </Link>
                )}
                {clarentUrl && (
                  <a
                    href={clarentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-xs text-ctp-green hover:underline"
                    title="Opens both public decklists in Clarent Hotseat mode"
                  >
                    Playtest matchup &rarr;
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pairings.data && isApiErrorBody(pairings.data) && (
        <p className="mt-2 text-sm text-ctp-subtext0">{pairings.data.error}</p>
      )}
    </div>
  );
}
