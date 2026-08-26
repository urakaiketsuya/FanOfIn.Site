import { useMemo } from "react";
import { useSimulatorSummaryData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(0)}%`;
}

function formatAvg(value: number): string {
  return value.toFixed(1);
}

export default function SimulatorIndex() {
  useDocumentTitle("Simulator Data", "Experimental — anonymous match telemetry from Clarent, the community Grand Archive simulator.");
  const data = useSimulatorSummaryData();

  const champions = useMemo(() => [...(data?.champions ?? [])].sort((a, b) => b.games - a.games), [data]);
  const matchups = useMemo(() => [...(data?.matchups ?? [])].sort((a, b) => b.games - a.games), [data]);
  const cardStats = useMemo(() => [...(data?.cardStats ?? [])].sort((a, b) => b.games - a.games), [data]);
  const weapons = useMemo(() => [...(data?.weapons ?? [])].sort((a, b) => b.games - a.games), [data]);
  const turnStats = useMemo(() => [...(data?.turnStats ?? [])].sort((a, b) => a.turn - b.turn), [data]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ctp-blue">Simulator Data</h1>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Anonymous match telemetry submitted by{" "}
        <a href="https://clarent.net" target="_blank" rel="noreferrer" className="text-ctp-blue hover:underline">
          Clarent
        </a>
        , the community's TCGEngine-based Grand Archive simulator — no player identity is collected.
      </p>

      <div className="mt-4 rounded-lg border border-ctp-peach bg-ctp-peach/10 px-4 py-3 text-sm text-ctp-text">
        <p className="font-semibold text-ctp-peach">Experimental — very early data</p>
        <p className="mt-1 text-ctp-subtext1">
          This page is a first look at what the simulator pipeline publishes, not a finished feature. Everything
          below is simulator play, a genuinely different population from real tournament results shown everywhere
          else on this site — it is never blended into tournament win rates or Card Impact numbers. At this sample
          size, none of it is meaningful yet; treat it as a preview of the data shape, not a signal to act on.
        </p>
      </div>

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}

      {data && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-ctp-surface1 p-4">
            <div className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Overview</div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="text-ctp-subtext1">Games recorded: </span>
                <span className="font-medium text-ctp-text">{data.games}</span>
              </div>
              <div>
                <span className="text-ctp-subtext1">First-player win rate: </span>
                <span className="font-medium text-ctp-text">
                  {formatPercent(data.firstPlayer.winRate)} ({data.firstPlayer.wins}/{data.firstPlayer.games})
                </span>
              </div>
              <div>
                <span className="text-ctp-subtext1">Avg game length: </span>
                <span className="font-medium text-ctp-text">
                  {/* `typeof` guard, not `=== null` — a cached/stale published file from before
                      avgTurns existed leaves it `undefined`, not `null`; formatAvg(undefined)
                      would throw. See TopDecksList.tsx for the same pre-refresh-window pattern. */}
                  {typeof data.avgTurns === "number" ? `${formatAvg(data.avgTurns)} turns` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Champions</h2>
            <p className="mt-1 text-xs text-ctp-subtext1">
              Names are supplied by Clarent; its stable internal ID is retained as a fallback and for analytics joins.
            </p>
            {champions.length === 0 ? (
              <p className="mt-2 text-sm text-ctp-subtext1">No champion data yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-ctp-subtext0">
                      <th className="pb-1 pr-3 font-normal">Champion</th>
                      <th className="pb-1 pr-3 font-normal">Element</th>
                      <th className="pb-1 pr-3 font-normal">Games</th>
                      <th className="pb-1 font-normal">Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {champions.map((c) => (
                      <tr key={c.championId} className="border-t border-ctp-surface0">
                        <td className="py-1.5 pr-3 text-ctp-text">
                          <div>{c.championName ?? c.championId}</div>
                          {c.championName && <div className="font-mono text-[10px] text-ctp-overlay1">{c.championId}</div>}
                        </td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{c.element}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">
                          {c.wins}-{c.games - c.wins}
                        </td>
                        <td className="py-1.5 text-ctp-text">{formatPercent(c.winRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Matchups</h2>
            {matchups.length === 0 ? (
              <p className="mt-2 text-sm text-ctp-subtext1">No matchup data yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {matchups.map((m) => (
                  <li key={`${m.champion1}__${m.champion2}`} className="flex flex-wrap items-center gap-2">
                    <span className="text-ctp-text" title={m.champion1}>{m.champion1Name ?? m.champion1}</span>
                    <span className="text-ctp-subtext0">vs</span>
                    <span className="text-ctp-text" title={m.champion2}>{m.champion2Name ?? m.champion2}</span>
                    <span className="text-ctp-subtext1">
                      — {m.champion1Wins}-{m.champion2Wins} across {m.games} game{m.games === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Card stats</h2>
            <p className="mt-1 text-xs text-ctp-subtext1">
              Only shown for a card once it's appeared in at least 5 separate games — below that, an "average" would
              just be replaying one specific game's exact card usage, not actually aggregating anything. Card ID is
              Clarent/TCGEngine's internal identifier, same caveat as Champions above.
            </p>
            {cardStats.length === 0 ? (
              <p className="mt-2 text-sm text-ctp-subtext1">
                No card has reached 5 games yet ({data.games} game{data.games === 1 ? "" : "s"} recorded so far).
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-ctp-subtext0">
                      <th className="pb-1 pr-3 font-normal">Card ID</th>
                      <th className="pb-1 pr-3 font-normal">Games</th>
                      <th className="pb-1 pr-3 font-normal">Win rate</th>
                      <th className="pb-1 pr-3 font-normal">Avg drawn</th>
                      <th className="pb-1 pr-3 font-normal">Avg materialized</th>
                      <th className="pb-1 pr-3 font-normal">Avg activated</th>
                      <th className="pb-1 pr-3 font-normal">Avg discarded</th>
                      <th className="pb-1 pr-3 font-normal">Avg reserved</th>
                      <th className="pb-1 pr-3 font-normal">Attack events</th>
                      <th className="pb-1 pr-3 font-normal">Avg dmg dealt</th>
                      <th className="pb-1 font-normal">Lethal hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardStats.map((c) => (
                      <tr key={c.cardId} className="border-t border-ctp-surface0">
                        <td className="py-1.5 pr-3 font-mono text-xs text-ctp-text">{c.cardId}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{c.games}</td>
                        <td className="py-1.5 pr-3 text-ctp-text">{formatPercent(c.winRate)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(c.avgDrawn)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(c.avgMaterialized)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(c.avgActivated)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(c.avgDiscarded)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(c.avgReserved)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{c.attackEvents}</td>
                        <td className="py-1.5 pr-3 text-ctp-text">{formatAvg(c.avgDamageDealt)}</td>
                        <td className="py-1.5 text-ctp-text">{c.lethalHits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Weapons</h2>
            <p className="mt-1 text-xs text-ctp-subtext1">
              Same 5-game minimum. Cleave rate is the share of a weapon's attacks flagged as hitting multiple
              targets.
            </p>
            {weapons.length === 0 ? (
              <p className="mt-2 text-sm text-ctp-subtext1">
                No weapon has reached 5 games yet ({data.games} game{data.games === 1 ? "" : "s"} recorded so far).
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-ctp-subtext0">
                      <th className="pb-1 pr-3 font-normal">Weapon ID</th>
                      <th className="pb-1 pr-3 font-normal">Games</th>
                      <th className="pb-1 pr-3 font-normal">Attack events</th>
                      <th className="pb-1 font-normal">Cleave rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.map((w) => (
                      <tr key={w.weaponCardId} className="border-t border-ctp-surface0">
                        <td className="py-1.5 pr-3 font-mono text-xs text-ctp-text">{w.weaponCardId}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{w.games}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{w.attackEvents}</td>
                        <td className="py-1.5 text-ctp-text">{formatPercent(w.cleaveRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Turn stats</h2>
            <p className="mt-1 text-xs text-ctp-subtext1">
              Same 5-game minimum, per turn number — averaged across every seat that reported stats for that turn.
            </p>
            {turnStats.length === 0 ? (
              <p className="mt-2 text-sm text-ctp-subtext1">
                No turn has reached 5 games yet ({data.games} game{data.games === 1 ? "" : "s"} recorded so far).
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-ctp-subtext0">
                      <th className="pb-1 pr-3 font-normal">Turn</th>
                      <th className="pb-1 pr-3 font-normal">Games</th>
                      <th className="pb-1 pr-3 font-normal">Avg cards played</th>
                      <th className="pb-1 pr-3 font-normal">Avg memory spent</th>
                      <th className="pb-1 pr-3 font-normal">Avg reserve spent</th>
                      <th className="pb-1 pr-3 font-normal">Avg dmg dealt</th>
                      <th className="pb-1 pr-3 font-normal">Avg dmg taken</th>
                      <th className="pb-1 pr-3 font-normal">Avg healed</th>
                      <th className="pb-1 pr-3 font-normal">Avg level</th>
                      <th className="pb-1 font-normal">Avg HP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnStats.map((t) => (
                      <tr key={t.turn} className="border-t border-ctp-surface0">
                        <td className="py-1.5 pr-3 text-ctp-text">{t.turn}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{t.games}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(t.avgCardsPlayed)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(t.avgMemorySpent)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(t.avgReserveSpent)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(t.avgDamageDealt)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(t.avgDamageTaken)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(t.avgHealed)}</td>
                        <td className="py-1.5 pr-3 text-ctp-subtext1">{formatAvg(t.avgLevel)}</td>
                        <td className="py-1.5 text-ctp-text">{formatAvg(t.avgHp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
