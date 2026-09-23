import { naturalCardsSeenByTurn, type PlayOrder } from "./turnToPlay";

export interface CadenceCheckpoint { turn: number; seen: number; required: number; probability: number }
export interface ThreatCadenceResult { checkpoints: CadenceCheckpoint[]; cadenceProbability: number; gapProbability: number; additionalCopyGain: number }

/** Exact chance of accumulating one additional card from a shared threat pool by each deadline. */
export function probabilityOfCumulativeDeadlines(deckSize: number, copies: number, deadlines: { seen: number; required: number }[]): number {
  const n = Math.max(0, Math.floor(deckSize));
  const k = Math.max(0, Math.min(n, Math.floor(copies)));
  if (n === 0 || deadlines.length === 0) return 0;
  const ordered = [...deadlines].map((item) => ({ seen: Math.max(0, Math.min(n, Math.floor(item.seen))), required: Math.max(0, Math.floor(item.required)) })).sort((a, b) => a.seen - b.seen || a.required - b.required);
  const last = ordered.at(-1)!.seen;
  let states = new Map<number, number>([[0, 1]]);
  for (let draw = 1; draw <= last; draw++) {
    const next = new Map<number, number>();
    for (const [hits, probability] of states) {
      const remaining = n - draw + 1;
      const hitsRemaining = k - hits;
      if (hitsRemaining > 0) next.set(hits + 1, (next.get(hits + 1) ?? 0) + probability * hitsRemaining / remaining);
      const missesRemaining = remaining - hitsRemaining;
      if (missesRemaining > 0) next.set(hits, (next.get(hits) ?? 0) + probability * missesRemaining / remaining);
    }
    states = next;
    const minimum = ordered.filter((item) => item.seen === draw).reduce((value, item) => Math.max(value, item.required), 0);
    if (minimum > 0) states = new Map([...states].filter(([hits]) => hits >= minimum));
  }
  return Math.max(0, Math.min(1, [...states.values()].reduce((sum, value) => sum + value, 0)));
}

export function computeThreatCadence(deckSize: number, threatCopies: number, startingHandSize: number, startTurn: number, endTurn: number, playOrder: PlayOrder): ThreatCadenceResult {
  const start = Math.max(1, Math.floor(startTurn));
  const end = Math.max(start, Math.floor(endTurn));
  const definitions = Array.from({ length: end - start + 1 }, (_, index) => ({ turn: start + index, seen: Math.min(deckSize, naturalCardsSeenByTurn(start + index, startingHandSize, playOrder)), required: index + 1 }));
  const checkpoints = definitions.map((point, index) => ({ ...point, probability: probabilityOfCumulativeDeadlines(deckSize, threatCopies, definitions.slice(0, index + 1)) }));
  const cadenceProbability = checkpoints.at(-1)?.probability ?? 0;
  const improved = probabilityOfCumulativeDeadlines(deckSize, Math.min(deckSize, threatCopies + 1), definitions);
  return { checkpoints, cadenceProbability, gapProbability: 1 - cadenceProbability, additionalCopyGain: Math.max(0, improved - cadenceProbability) };
}
