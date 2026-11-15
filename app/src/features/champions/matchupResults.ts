import type { BattleChartEntry } from "@gatcg/shared";

export function championMatchups(champion: string, rows: BattleChartEntry[]) {
  return rows.filter(row => row.a !== row.b && (row.a === champion || row.b === champion) && row.games > 0)
    .map(row => {
      const wins = row.a === champion ? row.aWins : row.bWins;
      const losses = row.a === champion ? row.bWins : row.aWins;
      return { opponent: row.a === champion ? row.b : row.a, wins, losses, ties: row.ties, games: row.games,
        winRate: wins / row.games,
        outlook: wins > losses ? "Favorable" : wins < losses ? "Unfavorable" : "Even" };
    }).sort((a, b) => b.games - a.games || a.opponent.localeCompare(b.opponent));
}
