import type { Env } from "./storage";

interface CountRow { total: number }
interface FirstPlayerRow { games: number; first_player_wins: number }
interface ChampionRow { champion_id: string; element: string; games: number; wins: number }
interface MatchupRow { champion_1: string; champion_2: string; games: number; champion_1_wins: number; champion_2_wins: number }

export async function buildSimulatorSummary(env: Env): Promise<unknown> {
  const [countResult, firstPlayerResult, championsResult, matchupsResult] = await env.MATCH_DB.batch([
    env.MATCH_DB.prepare("SELECT COUNT(*) AS total FROM games"),
    env.MATCH_DB.prepare(
      `SELECT COUNT(*) AS games,
              COALESCE(SUM(CASE WHEN winner = first_player THEN 1 ELSE 0 END), 0) AS first_player_wins
       FROM games`,
    ),
    env.MATCH_DB.prepare(
      `SELECT p.champion_id, p.element, COUNT(*) AS games,
              SUM(CASE WHEN g.winner = p.seat THEN 1 ELSE 0 END) AS wins
       FROM game_players p
       JOIN games g ON g.submission_id = p.submission_id
       GROUP BY p.champion_id, p.element
       ORDER BY games DESC, p.champion_id ASC`,
    ),
    env.MATCH_DB.prepare(
      `SELECT p1.champion_id AS champion_1, p2.champion_id AS champion_2, COUNT(*) AS games,
              SUM(CASE WHEN g.winner = 1 THEN 1 ELSE 0 END) AS champion_1_wins,
              SUM(CASE WHEN g.winner = 2 THEN 1 ELSE 0 END) AS champion_2_wins
       FROM games g
       JOIN game_players p1 ON p1.submission_id = g.submission_id AND p1.seat = 1
       JOIN game_players p2 ON p2.submission_id = g.submission_id AND p2.seat = 2
       GROUP BY p1.champion_id, p2.champion_id
       ORDER BY games DESC, champion_1 ASC, champion_2 ASC`,
    ),
  ]);

  const count = (countResult.results[0] as unknown as CountRow | undefined)?.total ?? 0;
  const firstPlayer = firstPlayerResult.results[0] as unknown as FirstPlayerRow | undefined;
  const champions = championsResult.results as unknown as ChampionRow[];
  const matchups = matchupsResult.results as unknown as MatchupRow[];

  return {
    schemaVersion: 1,
    source: "GrandArchiveSim",
    generatedAt: new Date().toISOString(),
    games: Number(count),
    firstPlayer: {
      games: Number(firstPlayer?.games ?? 0),
      wins: Number(firstPlayer?.first_player_wins ?? 0),
      winRate: Number(firstPlayer?.games ?? 0) > 0
        ? Number(firstPlayer?.first_player_wins ?? 0) / Number(firstPlayer?.games ?? 1)
        : null,
    },
    champions: champions.map((row) => ({
      championId: row.champion_id,
      element: row.element,
      games: Number(row.games),
      wins: Number(row.wins),
      winRate: Number(row.games) > 0 ? Number(row.wins) / Number(row.games) : null,
    })),
    matchups: matchups.map((row) => ({
      champion1: row.champion_1,
      champion2: row.champion_2,
      games: Number(row.games),
      champion1Wins: Number(row.champion_1_wins),
      champion2Wins: Number(row.champion_2_wins),
    })),
  };
}
