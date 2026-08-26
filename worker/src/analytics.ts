import type { Env } from "./storage";

interface CountRow { total: number }
interface FirstPlayerRow { games: number; first_player_wins: number }
interface ChampionRow { champion_id: string; element: string; games: number; wins: number }
interface MatchupRow { champion_1: string; champion_2: string; games: number; champion_1_wins: number; champion_2_wins: number }
interface CardStatsRow {
  card_id: string;
  games: number;
  avg_drawn: number;
  avg_drawn_to_memory: number;
  avg_materialized: number;
  avg_reserved: number;
  avg_discarded: number;
  avg_activated: number;
  wins: number;
}
interface CardCombatRow { source_card_id: string; attack_events: number; total_damage_dealt: number }
interface TurnStatsRow {
  turn: number;
  games: number;
  avg_cards_played: number;
  avg_memory_spent: number;
  avg_reserve_spent: number;
  avg_damage_dealt: number;
  avg_damage_taken: number;
  avg_healed: number;
  avg_level: number;
  avg_hp: number;
}

/**
 * Per-card/per-turn breakdowns are gated to entries with at least this many distinct games behind
 * them (same threshold as every other "is this sample big enough" check across the site — see
 * pipeline/src/config.ts's cardImpactMinSampleSize). Below this, an "aggregate" isn't actually
 * aggregating anything — it's just replaying one specific game's exact play sequence, which is a
 * meaningfully different exposure than the aggregates-only design this public endpoint commits to
 * (see the README's "deck links and raw event data are not returned publicly"). At today's real
 * volume this makes both arrays come back empty, by design — they fill in on their own as real
 * match volume accrues, with no code change needed.
 */
const MIN_SAMPLE_GAMES = 5;

export async function buildSimulatorSummary(env: Env): Promise<unknown> {
  const [countResult, firstPlayerResult, championsResult, matchupsResult, cardStatsResult, cardCombatResult, turnStatsResult] = await env.MATCH_DB.batch([
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
    // Games counted by distinct submission, not row count — a card can appear in both seats'
    // cardStats within the same submission (both players happened to run it), which shouldn't
    // double-count as two games of sample size.
    env.MATCH_DB.prepare(
      `SELECT cs.card_id,
              COUNT(DISTINCT cs.submission_id) AS games,
              AVG(cs.drawn) AS avg_drawn,
              AVG(cs.drawn_to_memory) AS avg_drawn_to_memory,
              AVG(cs.materialized) AS avg_materialized,
              AVG(cs.reserved) AS avg_reserved,
              AVG(cs.discarded) AS avg_discarded,
              AVG(cs.activated) AS avg_activated,
              SUM(CASE WHEN g.winner = cs.seat THEN 1 ELSE 0 END) AS wins
       FROM game_card_stats cs
       JOIN games g ON g.submission_id = cs.submission_id
       GROUP BY cs.card_id`,
    ),
    env.MATCH_DB.prepare(
      `SELECT source_card_id,
              COUNT(*) AS attack_events,
              COALESCE(SUM(CASE WHEN event_type = 'damage_resolved' THEN amount ELSE 0 END), 0) AS total_damage_dealt
       FROM game_combat_events
       GROUP BY source_card_id`,
    ),
    env.MATCH_DB.prepare(
      `SELECT turn,
              COUNT(DISTINCT submission_id) AS games,
              AVG(cards_played) AS avg_cards_played,
              AVG(memory_spent) AS avg_memory_spent,
              AVG(reserve_spent) AS avg_reserve_spent,
              AVG(damage_dealt) AS avg_damage_dealt,
              AVG(damage_taken) AS avg_damage_taken,
              AVG(healed) AS avg_healed,
              AVG(level) AS avg_level,
              AVG(hp) AS avg_hp
       FROM game_turn_stats
       GROUP BY turn
       ORDER BY turn ASC`,
    ),
  ]);

  const count = (countResult.results[0] as unknown as CountRow | undefined)?.total ?? 0;
  const firstPlayer = firstPlayerResult.results[0] as unknown as FirstPlayerRow | undefined;
  const champions = championsResult.results as unknown as ChampionRow[];
  const matchups = matchupsResult.results as unknown as MatchupRow[];
  const cardStatsRows = cardStatsResult.results as unknown as CardStatsRow[];
  const cardCombatByCardId = new Map(
    (cardCombatResult.results as unknown as CardCombatRow[]).map((row) => [row.source_card_id, row]),
  );
  const turnStatsRows = turnStatsResult.results as unknown as TurnStatsRow[];

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
    cardStats: cardStatsRows
      .filter((row) => Number(row.games) >= MIN_SAMPLE_GAMES)
      .map((row) => {
        const combat = cardCombatByCardId.get(row.card_id);
        return {
          cardId: row.card_id,
          games: Number(row.games),
          avgDrawn: Number(row.avg_drawn),
          avgDrawnToMemory: Number(row.avg_drawn_to_memory),
          avgMaterialized: Number(row.avg_materialized),
          avgReserved: Number(row.avg_reserved),
          avgDiscarded: Number(row.avg_discarded),
          avgActivated: Number(row.avg_activated),
          winRate: Number(row.games) > 0 ? Number(row.wins) / Number(row.games) : null,
          attackEvents: Number(combat?.attack_events ?? 0),
          avgDamageDealt: Number(row.games) > 0 ? Number(combat?.total_damage_dealt ?? 0) / Number(row.games) : 0,
        };
      })
      .sort((a, b) => b.games - a.games || a.cardId.localeCompare(b.cardId)),
    turnStats: turnStatsRows
      .filter((row) => Number(row.games) >= MIN_SAMPLE_GAMES)
      .map((row) => ({
        turn: Number(row.turn),
        games: Number(row.games),
        avgCardsPlayed: Number(row.avg_cards_played),
        avgMemorySpent: Number(row.avg_memory_spent),
        avgReserveSpent: Number(row.avg_reserve_spent),
        avgDamageDealt: Number(row.avg_damage_dealt),
        avgDamageTaken: Number(row.avg_damage_taken),
        avgHealed: Number(row.avg_healed),
        avgLevel: Number(row.avg_level),
        avgHp: Number(row.avg_hp),
      })),
  };
}
