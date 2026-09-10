import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { drawnCardsPerCopy } from "../features/deckbuilder/drawEffects";

export interface GoldfishCardInstance {
  id: string;
  name: string;
}

export interface GoldfishState {
  library: GoldfishCardInstance[];
  hand: GoldfishCardInstance[];
  played: GoldfishCardInstance[];
}

/**
 * Expands a decklist's `{card, quantity}` Main Deck lines into individually-drawable instances —
 * Material Deck cards are materialized, not drawn, so they're excluded here, same Main-vs-Material
 * "deck identity" distinction `lib/deckIdentity.ts` already establishes for every other feature in
 * this codebase.
 */
export function expandMainDeck(decklist: OmnidexDecklist): GoldfishCardInstance[] {
  const instances: GoldfishCardInstance[] = [];
  let counter = 0;
  for (const line of decklist.main) {
    for (let i = 0; i < line.quantity; i++) instances.push({ id: `${line.card}#${counter++}`, name: line.card });
  }
  return instances;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function newGame(decklist: OmnidexDecklist, handSize: number): GoldfishState {
  const shuffled = shuffle(expandMainDeck(decklist));
  return { library: shuffled.slice(handSize), hand: shuffled.slice(0, handSize), played: [] };
}

export function drawCard(state: GoldfishState): GoldfishState {
  if (state.library.length === 0) return state;
  const [drawn, ...rest] = state.library;
  return { ...state, library: rest, hand: [...state.hand, drawn] };
}

export function drawCards(state: GoldfishState, count: number): GoldfishState {
  let next = state;
  for (let i = 0; i < count && next.library.length > 0; i++) next = drawCard(next);
  return next;
}

/** Resolves a manual Glimpse choice. Selected cards stay on top in their revealed order; every
 * unselected revealed card is randomized and moved to the bottom of the library. This keeps the
 * simulator honest without asking the player to micromanage the order of cards they rejected. */
export function resolveGlimpse(state: GoldfishState, count: number, keptIds: ReadonlySet<string>): GoldfishState {
  const glimpseCount = Math.max(0, Math.min(Math.floor(count), state.library.length));
  const revealed = state.library.slice(0, glimpseCount);
  const unseen = state.library.slice(glimpseCount);
  const kept = revealed.filter((card) => keptIds.has(card.id));
  const bottomed = shuffle(revealed.filter((card) => !keptIds.has(card.id)));
  return { ...state, library: [...kept, ...unseen, ...bottomed] };
}

/**
 * Moves one hand card into the played pile. Never draws on its own — a matched draw effect
 * (`suggestedExtraDraws`) is a suggestion for the viewer to confirm with their own separate
 * `drawCards` calls (see `GoldfishIndex.tsx`'s "+1 card?" stepper), never applied automatically,
 * since conditional wording ("If you do," "you may") can't be verified from text alone — same
 * reasoning `drawEffects.ts` already documents for its own probability-estimate context.
 */
export function playCard(state: GoldfishState, instanceId: string): GoldfishState {
  const card = state.hand.find((c) => c.id === instanceId);
  if (!card) return state;
  return { ...state, hand: state.hand.filter((c) => c.id !== instanceId), played: [...state.played, card] };
}

/** How many extra draws this card's own printed text suggests, reusing `drawEffects.ts`'s own
 * "draw N card(s)" detector rather than a second implementation of the same pattern. */
export function suggestedExtraDraws(card: Card | undefined): number {
  return card ? drawnCardsPerCopy(card) : 0;
}

/** Fixed numeric Glimpse clauses in a card's text. Variable amounts such as Glimpse X/LV and
 * Glimpse 1+X are left to the manual Glimpse control rather than guessed. */
export function suggestedGlimpse(card: Card | undefined): number {
  if (!card?.effect) return 0;
  let total = 0;
  for (const match of card.effect.matchAll(/\bglimpse\s+(\d+)\b(?!\s*\+)/gi)) total += Number(match[1]);
  return total;
}
