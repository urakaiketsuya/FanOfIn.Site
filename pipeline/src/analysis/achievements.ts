import type {
  AchievementDefinition,
  AchievementsData,
  AchievementUnlock,
  DeckHipsterScore,
  DeckSighting,
  PlayerRating,
  UpsetMatch,
} from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures } from "./decklists.js";
import { canonicalSignature } from "./deckSightings.js";

const RATING_MILESTONES = [
  { id: "rating-1900", threshold: 1900 },
  { id: "rating-1800", threshold: 1800 },
  { id: "rating-1700", threshold: 1700 },
];

/** ~top 1% of deck novelty scores in a real run (median 0.63, 99th percentile 0.91) — see docs/CALCULATIONS.md. */
const HIPSTER_THRESHOLD = 0.9;
/** 142 of ~13,700 rated players clear this in a real run (max ever seen: 7). */
const OVERPERFORMER_MIN_TOUGH_FINISHES = 3;
/** i.e. at least 5 distinct players total ran the exact list — 201 of ~48,900 signatures in a real run. */
const TRENDSETTER_MIN_COPIERS = 4;
/** 150 of ~19,400 (season, player) pairs clear this in a real run (max ever seen: 28). */
const GRINDER_MIN_EVENTS_PER_SEASON = 15;
/** 114 of 929 judges clear this in a real run (max level seen: 52). */
const VETERAN_JUDGE_MIN_LEVEL = 25;
/** 137 of 929 judges clear this in a real run (max seen: 196 events). */
const DEDICATED_JUDGE_MIN_EVENTS = 50;

const DEFINITIONS: AchievementDefinition[] = [
  { id: "won-worlds", name: "World Champion", description: "Won a Worlds event.", category: "tournament" },
  { id: "won-nationals", name: "National Champion", description: "Won a Nationals event.", category: "tournament" },
  { id: "won-ascent", name: "Ascent Champion", description: "Won an Ascent event.", category: "tournament" },
  { id: "won-regionals", name: "Regional Champion", description: "Won a Regionals event.", category: "tournament" },
  {
    id: "won-store-championships",
    name: "Store Champion",
    description: "Won a Store Championship.",
    category: "tournament",
  },
  { id: "won-regular", name: "First Blood", description: "Won a Regular event.", category: "tournament" },
  {
    id: "giant-slayer",
    name: "Giant Slayer",
    description: "Won a match with a huge Elo rating swing.",
    category: "rating",
  },
  { id: "rating-1700", name: "Rising Star", description: "Reached an Elo rating of 1700.", category: "rating" },
  { id: "rating-1800", name: "Elite", description: "Reached an Elo rating of 1800.", category: "rating" },
  { id: "rating-1900", name: "Legendary", description: "Reached an Elo rating of 1900.", category: "rating" },
  {
    id: "trailblazer",
    name: "Trailblazer",
    description: "Ran one of the most unconventional decklists seen for that Champion.",
    category: "playstyle",
  },
  {
    id: "overperformer",
    name: "Overperformer",
    description: "Posted a strong match record but still finished outside the top third at least 3 times.",
    category: "playstyle",
  },
  {
    id: "trendsetter",
    name: "Trendsetter",
    description: "Was the earliest known player of a decklist that at least 4 other players went on to copy.",
    category: "playstyle",
  },
  {
    id: "grinder",
    name: "Grinder",
    description: "Submitted a public decklist at 15 or more events in a single season.",
    category: "dedication",
  },
  {
    id: "veteran-judge",
    name: "Veteran Judge",
    description: "Reached a high judge certification level.",
    category: "judging",
  },
  { id: "dedicated-judge", name: "Dedicated Judge", description: "Judged 50 or more events.", category: "judging" },
];

/**
 * Every achievement here is derived purely from data already computed elsewhere in the pipeline —
 * no new crawling. Thresholds were picked by checking real distributions first (via `pipeline/src/
 * repl.ts`), not guessed; see the comment above each constant and docs/CALCULATIONS.md for the
 * numbers behind each one. A separate hand-curated tier (for achievements that can't be computed —
 * a community spotlight, a hand-picked "best deck name") is intentionally not part of this: it
 * would follow the same pattern as `pipeline/curated/vods.json` when someone wants to add it.
 */
export function computeAchievements(
  bundles: OmnidexEventBundle[],
  cardIndex: Map<string, CardSignature>,
  eloRatings: Map<number, PlayerRating>,
  eloUpsets: UpsetMatch[],
  hipsterDeckScores: DeckHipsterScore[],
  deckSightings: DeckSighting[],
): AchievementsData {
  const unlocks: AchievementUnlock[] = [];
  const definedIds = new Set(DEFINITIONS.map((d) => d.id));

  function unlock(
    achievementId: string,
    playerId: number,
    earnedAt: string,
    context: string,
    links?: { eventId?: number; deckId?: string; opponentPlayerId?: number },
  ) {
    if (!definedIds.has(achievementId)) return; // e.g. an Omnidex event category we don't have a badge for
    if (typeof playerId !== "number" || Number.isNaN(playerId)) return; // team-event pairings occasionally carry a team name instead of a numeric player id
    unlocks.push({ achievementId, playerId, earnedAt, context, ...links });
  }

  // --- Tournament wins by tier: first win per player+category ---
  const firstWinByPlayerCategory = new Map<string, DeckSighting>();
  for (const s of deckSightings) {
    if (!s.winner) continue;
    const key = `${s.player}:${s.eventCategory}`;
    const existing = firstWinByPlayerCategory.get(key);
    if (!existing || s.eventDate < existing.eventDate) firstWinByPlayerCategory.set(key, s);
  }
  for (const s of firstWinByPlayerCategory.values()) {
    unlock(`won-${s.eventCategory}`, s.player, s.eventDate, s.eventName, { eventId: s.eventId, deckId: s.deckId });
  }

  // --- Giant Slayer: first upset win per player ---
  const giantSlayerSeen = new Set<number>();
  for (const u of [...eloUpsets].sort((a, b) => a.eventDate.localeCompare(b.eventDate))) {
    if (giantSlayerSeen.has(u.winnerId)) continue;
    giantSlayerSeen.add(u.winnerId);
    unlock("giant-slayer", u.winnerId, u.eventDate, `${Math.abs(u.eloSwing).toFixed(0)}-point swing at ${u.eventName}`, {
      eventId: u.eventId,
      opponentPlayerId: u.loserId,
    });
  }

  // --- Rating milestones: every threshold a player's current rating clears ---
  for (const { id, threshold } of RATING_MILESTONES) {
    for (const rating of eloRatings.values()) {
      if (Number.isNaN(rating.rating) || rating.rating < threshold) continue;
      unlock(id, rating.playerId, rating.lastEventDate, `Reached ${Math.round(rating.rating)} rating`, {
        eventId: rating.lastEventId,
      });
    }
  }

  // --- Trailblazer: first deck a player ran at/above the novelty threshold ---
  const trailblazerSeen = new Set<number>();
  for (const d of [...hipsterDeckScores].sort((a, b) => a.eventDate.localeCompare(b.eventDate))) {
    if (d.score < HIPSTER_THRESHOLD || trailblazerSeen.has(d.player)) continue;
    trailblazerSeen.add(d.player);
    unlock("trailblazer", d.player, d.eventDate, `${(d.score * 100).toFixed(0)}% novelty on ${d.championName} at ${d.eventName}`, {
      eventId: d.eventId,
      deckId: `${d.eventId}:${d.player}`,
    });
  }

  // --- Overperformer: Nth "tough finish" (see DeckSighting.underplaced) per player ---
  const toughByPlayer = new Map<number, DeckSighting[]>();
  for (const s of deckSightings) {
    if (!s.underplaced) continue;
    const list = toughByPlayer.get(s.player) ?? [];
    list.push(s);
    toughByPlayer.set(s.player, list);
  }
  for (const [player, list] of toughByPlayer) {
    if (list.length < OVERPERFORMER_MIN_TOUGH_FINISHES) continue;
    const sorted = [...list].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const qualifying = sorted[OVERPERFORMER_MIN_TOUGH_FINISHES - 1];
    unlock("overperformer", player, qualifying.eventDate, `${list.length} strong-record-but-rough-finish events`, {
      eventId: qualifying.eventId,
      deckId: qualifying.deckId,
    });
  }

  // --- Trendsetter: earliest player of a decklist signature that others went on to copy ---
  interface SigSighting {
    player: number;
    eventId: number;
    eventDate: string;
    eventName: string;
  }
  const bySignature = new Map<string, SigSighting[]>();
  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);
    for (const entry of bundle.decklists) {
      const sig = signatures.get(entry.player);
      const cs = canonicalSignature(sig?.mainCards ?? [], sig?.materialCards ?? []);
      if (!cs) continue;
      const list = bySignature.get(cs) ?? [];
      list.push({ player: entry.player, eventId: bundle.id, eventDate: bundle.event.date, eventName: bundle.event.name });
      bySignature.set(cs, list);
    }
  }
  const trendsetterQualifying = new Map<number, { eventId: number; eventDate: string; copiers: number }>(); // player -> earliest qualifying signature
  for (const list of bySignature.values()) {
    const distinctPlayers = new Set(list.map((x) => x.player));
    const copiers = distinctPlayers.size - 1;
    if (copiers < TRENDSETTER_MIN_COPIERS) continue;
    const earliest = [...list].sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];
    const existing = trendsetterQualifying.get(earliest.player);
    if (!existing || earliest.eventDate < existing.eventDate) {
      trendsetterQualifying.set(earliest.player, { eventId: earliest.eventId, eventDate: earliest.eventDate, copiers });
    }
  }
  for (const [player, { eventId, eventDate, copiers }] of trendsetterQualifying) {
    unlock("trendsetter", player, eventDate, `Later run by ${copiers} other players`, {
      eventId,
      deckId: `${eventId}:${player}`,
    });
  }

  // --- Grinder: Nth public decklist within one season, per player ---
  const bySeasonPlayer = new Map<string, DeckSighting[]>();
  for (const s of deckSightings) {
    if (s.seasonId === null) continue;
    const key = `${s.seasonId}:${s.player}`;
    const list = bySeasonPlayer.get(key) ?? [];
    list.push(s);
    bySeasonPlayer.set(key, list);
  }
  const grinderQualifying = new Map<number, DeckSighting & { seasonEventCount: number }>(); // player -> earliest qualifying season
  for (const list of bySeasonPlayer.values()) {
    if (list.length < GRINDER_MIN_EVENTS_PER_SEASON) continue;
    const sorted = [...list].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const qualifying = sorted[GRINDER_MIN_EVENTS_PER_SEASON - 1];
    const existing = grinderQualifying.get(qualifying.player);
    if (!existing || qualifying.eventDate < existing.eventDate) {
      grinderQualifying.set(qualifying.player, { ...qualifying, seasonEventCount: list.length });
    }
  }
  for (const q of grinderQualifying.values()) {
    unlock("grinder", q.player, q.eventDate, `${q.seasonEventCount} events in ${q.seasonName}`, {
      eventId: q.eventId,
      deckId: q.deckId,
    });
  }

  // --- Judges: level + volume, tracked across every event a judge appears in ---
  const judgeStats = new Map<number, { level: number; events: Set<number>; lastEventId: number; lastEventDate: string }>();
  for (const bundle of bundles) {
    if ("error" in bundle.judges) continue;
    for (const j of bundle.judges) {
      const existing =
        judgeStats.get(j.id) ?? { level: 0, events: new Set<number>(), lastEventId: bundle.id, lastEventDate: bundle.event.date };
      existing.level = Math.max(existing.level, j.judgeLevel);
      existing.events.add(bundle.id);
      if (bundle.event.date > existing.lastEventDate) {
        existing.lastEventDate = bundle.event.date;
        existing.lastEventId = bundle.id;
      }
      judgeStats.set(j.id, existing);
    }
  }
  for (const [judgeId, stats] of judgeStats) {
    if (stats.level >= VETERAN_JUDGE_MIN_LEVEL) {
      unlock("veteran-judge", judgeId, stats.lastEventDate, `Judge level ${stats.level}`, { eventId: stats.lastEventId });
    }
    if (stats.events.size >= DEDICATED_JUDGE_MIN_EVENTS) {
      unlock("dedicated-judge", judgeId, stats.lastEventDate, `Judged ${stats.events.size} events`, {
        eventId: stats.lastEventId,
      });
    }
  }

  unlocks.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
  return { generatedAt: new Date().toISOString(), definitions: DEFINITIONS, unlocks };
}
