import { z } from "zod";
import { validUserFacingName } from "../../shared/src/contentPolicy";

const id = z.string().min(1).max(255).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const seat = z.union([z.literal(1), z.literal(2)]);
const outcome = z.enum(["win", "draw"]);
const count = z.number().int().min(0).max(10000);
const line = z.object({ cardId: id, quantity: z.number().int().min(1).max(100) }).strict();
const section = z.array(line).max(250).superRefine((cards, ctx) => {
  if (new Set(cards.map(c => c.cardId)).size !== cards.length)
    ctx.addIssue({ code: "custom", message: "Duplicate cardId within section" });
});
export const deckSnapshotSchema = z.object({
  sourceDeckId: id.optional(),
  url: z.url().max(2048).refine(value => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  }, "Use an HTTP(S) URL without credentials").optional(),
  name: z.string().trim().min(1).max(120).refine(validUserFacingName, "Deck name violates content policy").optional(),
  sections: z.object({ main: section.min(1), material: section.min(1), sideboard: section, song: section }).strict(),
}).strict();

export const matchSubmissionV1Schema = z.object({
  schemaVersion: z.literal(1),
  submissionId: id,
  source: z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/).optional(), matchId: id, version: id.optional() }).strict(),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  completedAt: z.iso.datetime({ offset: true }).optional(),
  format: z.enum(["standard", "pantheon"]),
  matchType: z.enum(["casual", "ranked", "tournament", "playtest"]),
  bestOf: z.union([z.literal(1), z.literal(3)]),
  result: z.object({ outcome, winnerSeat: seat.nullable(), wins: z.object({ "1": count, "2": count }).strict() }).strict(),
  players: z.array(z.object({ seat, participantType: z.enum(["human", "bot"]), deck: deckSnapshotSchema }).strict()).length(2),
  games: z.array(z.object({
    gameNumber: z.number().int().min(1).max(3),
    sourceGameId: id.optional(),
    outcome,
    winnerSeat: seat.nullable(),
    endReason: z.enum(["normal", "concede", "timeout", "disconnect", "agreement", "unknown"]),
    firstPlayerSeat: seat.optional(),
    turns: count.optional(),
  }).strict()).min(1).max(3),
}).strict().superRefine((m, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  if (new Set(m.players.map(p => p.seat)).size !== 2) issue(["players"], "Exactly one player per seat is required");
  if (m.startedAt && m.completedAt && Date.parse(m.completedAt) < Date.parse(m.startedAt)) issue(["completedAt"], "Cannot precede startedAt");
  const games = [...m.games].sort((a, b) => a.gameNumber - b.gameNumber);
  const wins = { "1": 0, "2": 0 };
  const target = Math.floor(m.bestOf / 2) + 1;
  if (games.length > m.bestOf) issue(["games"], "Game count exceeds bestOf");
  const externalIds = games.flatMap(g => g.sourceGameId ? [g.sourceGameId] : []);
  if (new Set(externalIds).size !== externalIds.length) issue(["games"], "Duplicate sourceGameId");
  games.forEach((g, i) => {
    if (g.gameNumber !== i + 1) issue(["games"], "Game numbers must be consecutive starting at 1");
    if (wins["1"] >= target || wins["2"] >= target) issue(["games"], "Games cannot follow a clinched series");
    if ((g.outcome === "draw") !== (g.winnerSeat === null)) issue(["games", i, "winnerSeat"], "Draw requires null winner; win requires a seat");
    if (g.outcome === "win" && g.winnerSeat !== null) wins[g.winnerSeat]++;
  });
  if (wins["1"] !== m.result.wins["1"] || wins["2"] !== m.result.wins["2"]) issue(["result", "wins"], "Score must equal submitted game wins");
  const winner = wins["1"] === wins["2"] ? null : wins["1"] > wins["2"] ? 1 : 2;
  if (m.result.winnerSeat !== winner || m.result.outcome !== (winner === null ? "draw" : "win")) issue(["result"], "Match outcome must agree with game score");
  if (games.length < m.bestOf && Math.max(wins["1"], wins["2"]) < target) issue(["games"], "Submit only a completed series (all games or a clinched majority)");
});

export type MatchSubmissionV1 = z.infer<typeof matchSubmissionV1Schema>;

// Order-insensitive collections are normalized before retry checks and fingerprinting.
export function canonicalMatch(m: MatchSubmissionV1): MatchSubmissionV1 {
  return { ...m, players: [...m.players].sort((a, b) => a.seat - b.seat).map(p => ({ ...p, deck: { ...p.deck,
    sections: Object.fromEntries(Object.entries(p.deck.sections).map(([name, cards]) => [name, [...cards].sort((a, b) => a.cardId.localeCompare(b.cardId))])) as typeof p.deck.sections,
  } })), games: [...m.games].sort((a, b) => a.gameNumber - b.gameNumber) };
}
