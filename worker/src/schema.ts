import { z } from "zod";

const MAX_STRING = 255;
const MAX_DECK_INPUT = 32_768;
const seat = z.union([z.literal(1), z.literal(2)]);
const boundedString = z.string().min(1).max(MAX_STRING);
const count = z.number().int().nonnegative();

const cardStatsSchema = z.object({
  drawn: count,
  drawnToMemory: count,
  materialized: count,
  reserved: count,
  discarded: count,
  activated: count,
}).strict();

const turnStatsSchema = z.object({
  turn: count,
  cardsPlayed: count,
  memorySpent: count,
  reserveSpent: count,
  damageDealt: count,
  damageTaken: count,
  healed: count,
  level: count,
  hp: count,
}).strict();

const attackInitiatedSchema = z.object({
  type: z.literal("attack_initiated"),
  turn: count,
  attackerSeat: seat,
  attackerCardId: boundedString,
  targetSeat: seat,
  targetCardId: boundedString,
  weaponCardId: boundedString.nullable(),
  cleave: z.boolean(),
}).strict();

const damageResolvedSchema = z.object({
  type: z.literal("damage_resolved"),
  turn: count,
  sourceSeat: seat,
  sourceCardId: boundedString,
  targetSeat: seat,
  targetCardId: boundedString,
  amount: count,
  isCombat: z.boolean(),
  lethal: z.boolean(),
  domain: z.literal(true).optional(),
}).strict();

const playerSchema = z.object({
  // Clarent uses this legacy field for either a supported HTTP(S) deck URL or the pasted
  // free-text decklist accepted by its lobby. Keep it bounded, but do not reject valid text input.
  deckLink: z.string().max(MAX_DECK_INPUT),
  championId: boundedString,
  element: boundedString,
  classes: z.array(boundedString).max(16),
  endLevel: count,
  endHp: count,
  cardStats: z.record(boundedString, cardStatsSchema).refine(
    (stats) => Object.keys(stats).length <= 500,
    "cardStats cannot contain more than 500 cards",
  ),
  turnStats: z.array(turnStatsSchema).max(500),
}).strict();

export const gameSubmissionV1Schema = z.object({
  schemaVersion: z.literal(1),
  submissionId: boundedString,
  submittedAt: z.iso.datetime({ offset: true }),
  source: z.object({
    application: z.literal("TCGEngine"),
    game: z.literal("GrandArchiveSim"),
    version: boundedString,
  }).strict(),
  matchId: boundedString,
  format: boundedString,
  bestOf: z.union([z.literal(1), z.literal(3)]),
  gameName: boundedString,
  gameNumber: z.number().int().min(1).max(3),
  winner: seat,
  firstPlayer: seat,
  turns: count,
  matchWinner: seat,
  matchWins: z.object({ "1": count, "2": count }).strict(),
  players: z.object({ "1": playerSchema, "2": playerSchema }).strict(),
  combatEvents: z.array(z.discriminatedUnion("type", [attackInitiatedSchema, damageResolvedSchema])).max(5_000),
}).strict().superRefine((submission, context) => {
  if (submission.gameNumber > submission.bestOf) {
    context.addIssue({ code: "custom", path: ["gameNumber"], message: "gameNumber cannot exceed bestOf" });
  }
  if (submission.submissionId !== `${submission.matchId}:${submission.gameNumber}`) {
    context.addIssue({ code: "custom", path: ["submissionId"], message: "submissionId must equal matchId:gameNumber" });
  }
});

export type GameSubmissionV1 = z.infer<typeof gameSubmissionV1Schema>;
export type PlayerGameStatsV1 = GameSubmissionV1["players"]["1"];
export type CombatEventV1 = GameSubmissionV1["combatEvents"][number];
