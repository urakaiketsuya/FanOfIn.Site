import type { Card } from "@gatcg/shared";
import type { DeckBuilderRow } from "../features/deckbuilder/useDeckBuilderPopulation";
import { similarCards } from "./cardSimilarity";

export interface CardDecayReplacement {
  cardName: string;
  priorRate: number;
  recentRate: number;
  rise: number;
}

export interface CardDecaySignal {
  cardName: string;
  priorRate: number;
  recentRate: number;
  decay: number;
  deckCount: number;
  adjustedWinRate: number;
  /** A same-effect-shape sibling (see cardSimilarity.ts's similarCards) whose own inclusion rate
   * rose over the same two windows — a candidate for "this is probably what replaced it," not a
   * claim (two cards' adoption can move together for unrelated reasons, e.g. a whole archetype
   * rotating out). Null when no sibling exists or none of them rose. */
  replacement: CardDecayReplacement | null;
}

export interface CardDecayReport {
  signals: CardDecaySignal[];
  recentDeckCount: number;
  priorDeckCount: number;
  recentStart: string;
  latestDate: string;
}

/**
 * Finds cards whose adoption fell in the latest 90-day window versus the preceding 90 days, for a
 * population of `DeckBuilderRow`s (a Champion's decks, optionally already narrowed to one Spirit
 * or archetype cluster by the caller). Inclusion rate (not raw appearances) removes tournament-
 * volume bias; the win rate is shrunk toward 50% so a tiny undefeated sample cannot outrank a
 * broadly successful card. Shared by the Guided Deck Builder's own Stats tab (population-wide) and
 * `DeckDecaySignals.tsx` (a decklist page, filtered down to that deck's own cards).
 */
export function computeCardDecay(rows: DeckBuilderRow[], spiritName: string | null, catalogByName: Map<string, Card>): CardDecayReport | null {
  const population = spiritName ? rows.filter((row) => row.spiritName === spiritName) : rows;
  if (population.length === 0) return null;
  const latestMs = Math.max(...population.map((row) => (row.eventDate ? Date.parse(row.eventDate) : NaN)).filter(Number.isFinite));
  if (!Number.isFinite(latestMs)) return null;
  const dayMs = 86_400_000;
  const recentStartMs = latestMs - 89 * dayMs;
  const priorStartMs = latestMs - 179 * dayMs;
  const priorEndMs = recentStartMs - dayMs;
  const recentRows = population.filter((row) => row.eventDate && Date.parse(row.eventDate) >= recentStartMs);
  const priorRows = population.filter((row) => {
    const date = row.eventDate ? Date.parse(row.eventDate) : NaN;
    return date >= priorStartMs && date <= priorEndMs;
  });
  if (recentRows.length < 10 || priorRows.length < 10) return null;

  const cardNames = (row: DeckBuilderRow) => {
    const names = new Set([...row.main.keys(), ...row.material.keys()]);
    for (const name of names) {
      const card = catalogByName.get(name);
      if (card?.types.includes("CHAMPION")) names.delete(name);
    }
    return names;
  };
  const priorCounts = new Map<string, number>();
  const recentCounts = new Map<string, number>();
  const wins = new Map<string, { sum: number; count: number }>();
  for (const row of priorRows) {
    for (const name of cardNames(row)) priorCounts.set(name, (priorCounts.get(name) ?? 0) + 1);
  }
  for (const row of recentRows) {
    for (const name of cardNames(row)) recentCounts.set(name, (recentCounts.get(name) ?? 0) + 1);
  }
  for (const row of population) {
    for (const name of cardNames(row)) {
      const current = wins.get(name) ?? { sum: 0, count: 0 };
      current.sum += row.winRate;
      current.count += 1;
      wins.set(name, current);
    }
  }

  type Signal = Omit<CardDecaySignal, "replacement">;
  const signals: Signal[] = [];
  for (const [cardName, priorCount] of priorCounts) {
    const recentCount = recentCounts.get(cardName) ?? 0;
    const performance = wins.get(cardName);
    if (!performance || priorCount < 5 || performance.count < 10) continue;
    const priorRate = priorCount / priorRows.length;
    const recentRate = recentCount / recentRows.length;
    const decay = priorRate - recentRate;
    const adjustedWinRate = (performance.sum + 10 * 0.5) / (performance.count + 10);
    if (decay < 0.08 || adjustedWinRate < 0.53) continue;
    signals.push({ cardName, priorRate, recentRate, decay, deckCount: performance.count, adjustedWinRate });
  }
  signals.sort((a, b) => {
    const score = (signal: Signal) => signal.decay * Math.sqrt(signal.deckCount) * Math.max(0.01, signal.adjustedWinRate - 0.5);
    return score(b) - score(a);
  });

  // For each shown decay signal, look for a same-effect-shape sibling (cardSimilarity.ts) whose
  // own inclusion rate rose over the same two windows — the best-rising sibling becomes the
  // "possibly replaced by" suggestion. Only run against the top 6 (not every candidate signal)
  // since similarCards scans the whole catalog per call.
  const RISE_THRESHOLD = 0.05;
  const MIN_RISE_DECK_COUNT = 5;
  const catalogArray = Array.from(catalogByName.values());
  function findReplacement(cardName: string): CardDecayReplacement | null {
    const card = catalogByName.get(cardName);
    if (!card) return null;
    let best: CardDecayReplacement | null = null;
    for (const sibling of similarCards(card, catalogArray)) {
      const recentCount = recentCounts.get(sibling.name) ?? 0;
      if (recentCount < MIN_RISE_DECK_COUNT) continue;
      const priorRate = (priorCounts.get(sibling.name) ?? 0) / priorRows.length;
      const recentRate = recentCount / recentRows.length;
      const rise = recentRate - priorRate;
      if (rise < RISE_THRESHOLD) continue;
      if (!best || rise > best.rise) best = { cardName: sibling.name, priorRate, recentRate, rise };
    }
    return best;
  }

  return {
    signals: signals.slice(0, 6).map((signal) => ({ ...signal, replacement: findReplacement(signal.cardName) })),
    recentDeckCount: recentRows.length,
    priorDeckCount: priorRows.length,
    recentStart: new Date(recentStartMs).toISOString().slice(0, 10),
    latestDate: new Date(latestMs).toISOString().slice(0, 10),
  };
}
