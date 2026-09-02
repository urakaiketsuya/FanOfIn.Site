import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { BattleChartEntry } from "@gatcg/shared";
import { useArchetypeData } from "./data";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useTabParam } from "../../lib/useTabParam";
import PageHeader from "../../components/ui/PageHeader";
import Tabs from "../../components/ui/Tabs";
import PageLayout from "../../components/layout/PageLayout";

type ViewTab = "matrix" | "champion" | "highlights";

const TABS: { key: ViewTab; label: string }[] = [
  { key: "matrix", label: "Matrix" },
  { key: "champion", label: "By Champion" },
  { key: "highlights", label: "Highlights" },
];
const TAB_KEYS = TABS.map((t) => t.key);

function winRateColor(rate: number | null): string {
  if (rate === null) return "text-ctp-subtext0";
  if (rate >= 0.6) return "text-ctp-green";
  if (rate <= 0.4) return "text-ctp-red";
  return "text-ctp-text";
}

function heatmapStyle(rate: number | null, games: number): CSSProperties | undefined {
  if (rate === null || games === 0) return undefined;
  const distance = Math.abs(rate - 0.5) * 2;
  const sampleConfidence = Math.min(1, games / 500);
  const strength = Math.round(8 + distance * sampleConfidence * 42);
  const color = rate >= 0.5 ? "var(--color-ctp-green)" : "var(--color-ctp-red)";
  return { backgroundColor: `color-mix(in srgb, ${color} ${strength}%, transparent)` };
}

function heatmapTextColor(rate: number | null, games: number): string {
  if (games < 100) return "text-ctp-subtext1";
  return winRateColor(rate);
}

interface Matchup {
  opponent: string;
  wins: number;
  losses: number;
  ties: number;
  games: number;
  winRate: number | null;
}

/** Every matchup involving `champion`, reoriented so wins/losses read from their own side. */
function matchupsFor(champion: string, battleChart: BattleChartEntry[]): Matchup[] {
  const list: Matchup[] = [];
  for (const b of battleChart) {
    if (b.a === champion) {
      list.push({ opponent: b.b, wins: b.aWins, losses: b.bWins, ties: b.ties, games: b.games, winRate: b.games > 0 ? b.aWins / b.games : null });
    } else if (b.b === champion) {
      list.push({ opponent: b.a, wins: b.bWins, losses: b.aWins, ties: b.ties, games: b.games, winRate: b.games > 0 ? b.bWins / b.games : null });
    }
  }
  return list.sort((x, y) => (y.winRate ?? 0) - (x.winRate ?? 0));
}

export default function BattleChart() {
  useDocumentTitle("Battle Chart", "Archetype-vs-archetype win rate matrix for Grand Archive TCG.");
  const data = useArchetypeData();
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "matrix");
  const [champion, setChampion] = useState<string | null>(null);

  const signatures = useMemo(() => {
    if (!data) return [];
    const inChart = new Set(data.battleChart.flatMap((b) => [b.a, b.b]));
    // Several distinct draft-only identities all share the literal name "Nameless Champion" --
    // computeArchetypeAnalysis already merges them into one battleChart bucket per signature
    // string, but `archetypes` itself can still have more than one summary row with that same
    // signature (different classes/elements), so dedupe here or React sees duplicate keys.
    const signaturesInChart = data.archetypes.filter((a) => inChart.has(a.signature)).map((a) => a.signature);
    return Array.from(new Set(signaturesInChart));
  }, [data]);

  const lookup = useMemo(() => {
    const map = new Map<string, { aWins: number; bWins: number; ties: number; games: number }>();
    for (const b of data?.battleChart ?? []) map.set(`${b.a}__${b.b}`, b);
    return map;
  }, [data]);

  function cell(row: string, col: string): { label: string; rate: number | null; games: number } {
    const key = row <= col ? `${row}__${col}` : `${col}__${row}`;
    const entry = lookup.get(key);
    if (!entry) return { label: "—", rate: null, games: 0 };
    const wins = row <= col ? entry.aWins : entry.bWins;
    const losses = row <= col ? entry.bWins : entry.aWins;
    return { label: `${wins}-${losses}-${entry.ties}`, rate: entry.games > 0 ? wins / entry.games : null, games: entry.games };
  }

  const activeChampion = champion && signatures.includes(champion) ? champion : signatures[0] ?? null;
  const championMatchups = useMemo(
    () => (activeChampion && data ? matchupsFor(activeChampion, data.battleChart) : []),
    [activeChampion, data],
  );

  const highlights = useMemo(() => {
    if (!data) return { lopsided: [], closest: [] };
    const withRate = data.battleChart
      .filter((b) => b.games > 0)
      .map((b) => ({ ...b, aWinRate: b.aWins / b.games, distFromEven: Math.abs(b.aWins / b.games - 0.5) }));
    const lopsided = [...withRate].sort((x, y) => y.distFromEven - x.distFromEven).slice(0, 15);
    const closest = [...withRate].sort((x, y) => x.distFromEven - y.distFromEven).slice(0, 15);
    return { lopsided, closest };
  }, [data]);

  function goToChampion(name: string) {
    setChampion(name);
    setTab("champion");
  }

  return (
    <PageLayout width="wide">
      <PageHeader title="Battle Chart" eyebrow={<Link to="/archetypes" className="hover:underline">&larr; Archetypes</Link>} description="Explore head-to-head Champion win rates from real tournament pairings, with sample-aware color intensity." />

      {!data && <p className="mt-6 text-ctp-subtext1">Loading…</p>}
      {data && signatures.length === 0 && <p className="mt-6 text-ctp-subtext1">No matchups have cleared the sample-size threshold yet.</p>}

      {signatures.length > 0 && (
        <>
          <Tabs tabs={TABS} active={tab} onChange={setTab} label="Battle Chart view" />

          {tab === "matrix" && (
            <div className="mt-6 overflow-x-auto">
              <p className="mb-2 text-xs text-ctp-subtext0">Cell color and percentage show the row Champion's win rate against the column. Stronger color means a larger, better-supported advantage; hover for the full record.</p>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-ctp-subtext0" aria-label="Win-rate heatmap legend">
                <span>Unfavored</span>
                {["bg-ctp-red/40", "bg-ctp-red/20", "bg-ctp-surface0", "bg-ctp-green/20", "bg-ctp-green/40"].map((className) => (
                  <span key={className} className={`h-3 w-7 rounded-sm ${className}`} />
                ))}
                <span>Favored</span>
              </div>
              <table className="border-separate border-spacing-0.5 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-ctp-base p-2"></th>
                    {signatures.map((s) => (
                      <th key={s} className="sticky top-0 z-10 bg-ctp-base p-2 text-ctp-subtext0">
                        <button type="button" onClick={() => goToChampion(s)} title={s} className="hover:text-ctp-blue hover:underline">
                          {s.slice(0, 4)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((row) => (
                    <tr key={row}>
                      <th className="sticky left-0 z-10 whitespace-nowrap bg-ctp-base p-2 text-right text-ctp-subtext0">
                        <button type="button" onClick={() => goToChampion(row)} className="hover:text-ctp-blue hover:underline">
                          {row}
                        </button>
                      </th>
                      {signatures.map((col) => {
                        const { label, rate, games } = cell(row, col);
                        const isMirror = row === col;
                        return (
                          <td
                            key={col}
                            className={`min-w-14 rounded-sm p-1.5 text-center ${isMirror ? "bg-ctp-surface0 text-ctp-subtext0" : heatmapTextColor(rate, games)}`}
                            style={isMirror ? undefined : heatmapStyle(rate, games)}
                            title={isMirror ? `${row} mirror match` : rate === null ? `${row} vs ${col}: no qualifying games` : `${row} vs ${col}: ${label} over ${games.toLocaleString()} games`}
                          >
                            {isMirror || rate === null ? (
                              "—"
                            ) : (
                              <>
                                <span className="block font-semibold tabular-nums">{(rate * 100).toFixed(0)}%</span>
                                <span className="block text-[9px] text-ctp-subtext0 tabular-nums">n={games.toLocaleString()}</span>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "champion" && activeChampion && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ctp-subtext0">Champion:</span>
                <select
                  value={activeChampion}
                  aria-label="Champion"
                  onChange={(e) => setChampion(e.target.value)}
                  className="rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 py-1 text-xs text-ctp-text"
                >
                  {signatures.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {championMatchups.length === 0 ? (
                <p className="mt-4 text-sm text-ctp-subtext1">No matchups have cleared the sample-size threshold for {activeChampion} yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-max min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-ctp-surface1 text-left text-xs text-ctp-subtext0 uppercase">
                        <th className="py-1 pr-6">Opponent</th>
                        <th className="py-1 pr-6">Record</th>
                        <th className="py-1 pr-6">Win rate</th>
                        <th className="py-1 pr-6">Games</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ctp-surface0 [&>tr:nth-child(even)]:bg-ctp-mantle">
                      {championMatchups.map((m) => (
                        <tr key={m.opponent}>
                          <td className="py-1.5 pr-6 whitespace-nowrap">
                            <button type="button" onClick={() => goToChampion(m.opponent)} className="text-ctp-text hover:text-ctp-blue">
                              {m.opponent}
                            </button>
                          </td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">
                            {m.wins}-{m.losses}-{m.ties}
                          </td>
                          <td className={`py-1.5 pr-6 font-semibold ${winRateColor(m.winRate)}`}>
                            {m.winRate !== null ? `${(m.winRate * 100).toFixed(0)}%` : "—"}
                          </td>
                          <td className="py-1.5 pr-6 text-ctp-subtext1">{m.games}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "highlights" && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Most lopsided</h2>
                <p className="mt-1 text-xs text-ctp-subtext0">The matchups furthest from an even 50/50.</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {highlights.lopsided.map((h, i) => {
                    const favored = h.aWinRate >= 0.5 ? h.a : h.b;
                    const underdog = h.aWinRate >= 0.5 ? h.b : h.a;
                    const rate = h.aWinRate >= 0.5 ? h.aWinRate : 1 - h.aWinRate;
                    return (
                      <div key={i} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5">
                        <button type="button" onClick={() => goToChampion(favored)} className="font-medium text-ctp-text hover:text-ctp-blue">
                          {favored}
                        </button>{" "}
                        <span className="text-ctp-subtext0">vs</span>{" "}
                        <button type="button" onClick={() => goToChampion(underdog)} className="font-medium text-ctp-text hover:text-ctp-blue">
                          {underdog}
                        </button>
                        <div className={`text-xs ${winRateColor(rate)}`}>
                          {(rate * 100).toFixed(0)}% win rate over {h.games} games
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-ctp-subtext0 uppercase tracking-wide">Closest</h2>
                <p className="mt-1 text-xs text-ctp-subtext0">The matchups nearest to a true coin flip.</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {highlights.closest.map((h, i) => (
                    <div key={i} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5">
                      <button type="button" onClick={() => goToChampion(h.a)} className="font-medium text-ctp-text hover:text-ctp-blue">
                        {h.a}
                      </button>{" "}
                      <span className="text-ctp-subtext0">vs</span>{" "}
                      <button type="button" onClick={() => goToChampion(h.b)} className="font-medium text-ctp-text hover:text-ctp-blue">
                        {h.b}
                      </button>
                      <div className="text-xs text-ctp-text">
                        {(h.aWinRate * 100).toFixed(0)}% / {((1 - h.aWinRate) * 100).toFixed(0)}% over {h.games} games
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
