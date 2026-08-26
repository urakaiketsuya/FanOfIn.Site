import { useMemo } from "react";
import { useSimulatorSummaryData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(0)}%`;
}

export default function SimulatorIndex() {
  useDocumentTitle("Simulator Data", "Experimental — anonymous match telemetry from Clarent, the community Grand Archive simulator.");
  const data = useSimulatorSummaryData();

  const champions = useMemo(() => [...(data?.champions ?? [])].sort((a, b) => b.games - a.games), [data]);
  const matchups = useMemo(() => [...(data?.matchups ?? [])].sort((a, b) => b.games - a.games), [data]);

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
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">Champions</h2>
            <p className="mt-1 text-xs text-ctp-subtext1">
              Champion ID is Clarent/TCGEngine's own internal identifier — this site has no known mapping from it
              back to a card name yet, so ids are shown as-is.
            </p>
            {champions.length === 0 ? (
              <p className="mt-2 text-sm text-ctp-subtext1">No champion data yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-ctp-subtext0">
                      <th className="pb-1 pr-3 font-normal">Champion ID</th>
                      <th className="pb-1 pr-3 font-normal">Element</th>
                      <th className="pb-1 pr-3 font-normal">Games</th>
                      <th className="pb-1 font-normal">Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {champions.map((c) => (
                      <tr key={c.championId} className="border-t border-ctp-surface0">
                        <td className="py-1.5 pr-3 font-mono text-xs text-ctp-text">{c.championId}</td>
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
                    <span className="font-mono text-xs text-ctp-text">{m.champion1}</span>
                    <span className="text-ctp-subtext0">vs</span>
                    <span className="font-mono text-xs text-ctp-text">{m.champion2}</span>
                    <span className="text-ctp-subtext1">
                      — {m.champion1Wins}-{m.champion2Wins} across {m.games} game{m.games === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
