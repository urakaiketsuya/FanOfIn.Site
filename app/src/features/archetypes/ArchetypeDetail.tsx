import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useOmnidexPlayers } from "../tournaments/data";
import { useArchetypeData } from "./data";

export default function ArchetypeDetail() {
  const { signature: encoded = "" } = useParams<{ signature: string }>();
  const signature = decodeURIComponent(encoded);

  const data = useArchetypeData();
  const playersData = useOmnidexPlayers();

  const archetype = data?.archetypes.find((a) => a.signature === signature);
  const matchups = useMemo(
    () => data?.battleChart.filter((b) => b.a === signature || b.b === signature) ?? [],
    [data, signature],
  );

  if (data && !archetype) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-ctp-red">Archetype "{signature}" hasn't cleared the sample-size threshold (or doesn't exist).</p>
        <Link to="/archetypes" className="mt-2 inline-block text-ctp-blue hover:underline">
          &larr; All archetypes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/archetypes" className="text-sm text-ctp-blue hover:underline">
        &larr; All archetypes
      </Link>

      {archetype && (
        <>
          <h1 className="mt-2 text-2xl font-bold text-ctp-blue">{archetype.signature}</h1>
          <p className="mt-1 text-sm text-ctp-subtext1">
            {archetype.classes.join("/")} · {archetype.elements.join("/")} · {archetype.deckCount} decks across{" "}
            {archetype.eventCount} events · {(archetype.avgWinRate * 100).toFixed(0)}% avg win rate
          </p>

          {matchups.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Matchups</h2>
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y divide-ctp-surface0">
                  {matchups.map((m, i) => {
                    const opponent = m.a === signature ? m.b : m.a;
                    const wins = m.a === signature ? m.aWins : m.bWins;
                    const losses = m.a === signature ? m.bWins : m.aWins;
                    return (
                      <tr key={i}>
                        <td className="py-1.5">
                          <Link to={`/archetypes/${encodeURIComponent(opponent)}`} className="text-ctp-text hover:text-ctp-blue">
                            {opponent}
                          </Link>
                        </td>
                        <td className="py-1.5 text-ctp-subtext1">
                          {wins}-{losses}-{m.ties} ({m.games} games)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {archetype.sampleDecks.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Sample decks</h2>
              <div className="mt-2 space-y-1 text-sm">
                {archetype.sampleDecks.map((d, i) => {
                  const playerName = playersData?.players.find((p) => p.id === d.player)?.username ?? `Player #${d.player}`;
                  return (
                    <div key={i}>
                      <Link to={`/events/${d.eventId}`} className="text-ctp-blue hover:underline">
                        {playerName}'s deck
                      </Link>{" "}
                      <span className="text-ctp-subtext0">at event {d.eventId}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
