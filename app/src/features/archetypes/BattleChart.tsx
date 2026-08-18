import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useArchetypeData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

function winRateColor(rate: number | null): string {
  if (rate === null) return "text-ctp-subtext0";
  if (rate >= 0.6) return "text-ctp-green";
  if (rate <= 0.4) return "text-ctp-red";
  return "text-ctp-text";
}

export default function BattleChart() {
  useDocumentTitle("Battle Chart", "Archetype-vs-archetype win rate matrix for Grand Archive TCG.");
  const data = useArchetypeData();

  const signatures = useMemo(() => {
    if (!data) return [];
    const inChart = new Set(data.battleChart.flatMap((b) => [b.a, b.b]));
    return data.archetypes.filter((a) => inChart.has(a.signature)).map((a) => a.signature);
  }, [data]);

  const lookup = useMemo(() => {
    const map = new Map<string, { aWins: number; bWins: number; ties: number; games: number }>();
    for (const b of data?.battleChart ?? []) map.set(`${b.a}__${b.b}`, b);
    return map;
  }, [data]);

  function cell(row: string, col: string): { label: string; rate: number | null } {
    const key = row <= col ? `${row}__${col}` : `${col}__${row}`;
    const entry = lookup.get(key);
    if (!entry) return { label: "—", rate: null };
    const wins = row <= col ? entry.aWins : entry.bWins;
    const losses = row <= col ? entry.bWins : entry.aWins;
    return { label: `${wins}-${losses}-${entry.ties}`, rate: entry.games > 0 ? wins / entry.games : null };
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ctp-blue">Battle Chart</h1>
        <Link to="/archetypes" className="text-sm text-ctp-blue hover:underline">
          &larr; Archetypes
        </Link>
      </div>
      <p className="mt-1 text-sm text-ctp-subtext1">Row's record against column, read as win-loss-tie.</p>

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {data && signatures.length === 0 && <p className="mt-6 text-ctp-subtext1">No matchups have cleared the sample-size threshold yet.</p>}

      {signatures.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="p-1"></th>
                {signatures.map((s) => (
                  <th key={s} className="p-1 text-ctp-subtext0" title={s}>
                    {s.slice(0, 4)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signatures.map((row) => (
                <tr key={row}>
                  <th className="whitespace-nowrap p-1 text-right text-ctp-subtext0" title={row}>
                    {row}
                  </th>
                  {signatures.map((col) => {
                    const { label, rate } = cell(row, col);
                    return (
                      <td key={col} className={`p-1 text-center ${winRateColor(rate)}`}>
                        {row === col ? "—" : label}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
