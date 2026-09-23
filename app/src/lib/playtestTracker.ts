export type PlaytestResult = "win" | "loss" | "draw";
export type PlaytestOrder = "first" | "second";
export interface PlaytestRecord {
  id: string; playedAt: string; opponent: string; result: PlaytestResult; order: PlaytestOrder;
  onlineTurn: number | null; reachedWinCondition: boolean; bottleneck: string; notes: string;
}
export interface PlaytestSummary {
  games: number; wins: number; losses: number; draws: number; winRate: number | null;
  firstWinRate: number | null; secondWinRate: number | null; averageOnlineTurn: number | null;
  winConditionRate: number | null; conversionRate: number | null; topBottlenecks: { label: string; games: number }[];
}

function rate(records: PlaytestRecord[]): number | null {
  if (!records.length) return null;
  return records.reduce((sum, record) => sum + (record.result === "win" ? 1 : record.result === "draw" ? 0.5 : 0), 0) / records.length;
}

export function summarizePlaytests(records: PlaytestRecord[]): PlaytestSummary {
  const reached = records.filter((record) => record.reachedWinCondition);
  const turns = records.flatMap((record) => record.onlineTurn == null ? [] : [record.onlineTurn]);
  const bottlenecks = new Map<string, number>();
  for (const record of records) if (record.bottleneck.trim()) bottlenecks.set(record.bottleneck.trim(), (bottlenecks.get(record.bottleneck.trim()) ?? 0) + 1);
  return {
    games: records.length, wins: records.filter((record) => record.result === "win").length,
    losses: records.filter((record) => record.result === "loss").length, draws: records.filter((record) => record.result === "draw").length,
    winRate: rate(records), firstWinRate: rate(records.filter((record) => record.order === "first")), secondWinRate: rate(records.filter((record) => record.order === "second")),
    averageOnlineTurn: turns.length ? turns.reduce((sum, turn) => sum + turn, 0) / turns.length : null,
    winConditionRate: records.length ? reached.length / records.length : null,
    conversionRate: reached.length ? rate(reached) : null,
    topBottlenecks: [...bottlenecks].map(([label, games]) => ({ label, games })).sort((a, b) => b.games - a.games || a.label.localeCompare(b.label)).slice(0, 5),
  };
}

export function playtestDeckFingerprint(championName: string | null, mainLines: { name: string; quantity: number }[]): string {
  const canonical = `${championName ?? "unknown"}|${[...mainLines].sort((a, b) => a.name.localeCompare(b.name)).map((line) => `${line.quantity}x${line.name}`).join("|")}`;
  let hash = 2166136261;
  for (let index = 0; index < canonical.length; index++) { hash ^= canonical.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}
