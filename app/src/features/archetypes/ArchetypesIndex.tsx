import { Link } from "react-router-dom";
import { useArchetypeData } from "./data";

export default function ArchetypesIndex() {
  const data = useArchetypeData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">Archetypes</h1>
        <Link to="/battle-chart" className="text-sm text-ctp-blue hover:underline">
          Battle chart &rarr;
        </Link>
      </div>
      <p className="mt-1 text-sm text-ctp-subtext1">
        Grouped by Champion — read from the alternate-form cards in each deck's Material Deck.
        Groups below a minimum sample size are hidden as noise.
      </p>

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {data && data.archetypes.length === 0 && (
        <p className="mt-6 text-ctp-subtext1">No archetypes have cleared the sample-size threshold yet.</p>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
            <th className="py-1">Champion</th>
            <th className="py-1">Decks</th>
            <th className="py-1">Events</th>
            <th className="py-1">Win rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ctp-surface0">
          {data?.archetypes.map((a) => (
            <tr key={a.signature}>
              <td className="py-1.5">
                <Link to={`/archetypes/${encodeURIComponent(a.signature)}`} className="text-ctp-text hover:text-ctp-blue">
                  {a.signature}
                </Link>
                <span className="ml-2 text-xs text-ctp-subtext0">
                  {a.classes.join("/")} · {a.elements.join("/")}
                </span>
              </td>
              <td className="py-1.5 text-ctp-subtext1">{a.deckCount}</td>
              <td className="py-1.5 text-ctp-subtext1">{a.eventCount}</td>
              <td className="py-1.5 text-ctp-subtext1">{(a.avgWinRate * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
