import type { Card } from "@gatcg/shared";
import { probabilityAtLeast } from "./synergyReadiness";
import { earliestReserveCostTurn } from "../../lib/turnToPlay";

/** Word/digit quantifiers as seen in real card text ("Draw a card", "Draw two cards", "Draw 7 cards").
 * No "X" support — variable-magnitude draws ("Draw 3+**X** cards") are player/state-chosen at
 * resolution time, so folding in a fixed guess (the way the Imbue calculator defaults X to 2)
 * would compound unpredictably across every draw-effect card in a deck rather than affecting one
 * reported number. Such clauses are simply skipped — undercounted, not wrong. */
const QUANTITY_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

const DRAW_RE = /\bdraw\s+(a|an|one|two|three|four|five|six|seven|\d+)\s+cards?\b/gi;

function parseQuantity(raw: string): number | null {
  if (/^\d+$/.test(raw)) return Number(raw);
  return QUANTITY_WORDS[raw.toLowerCase()] ?? null;
}

/**
 * Cards drawn per copy played, summed across every "Draw N card(s)" clause in the card's own effect
 * text — deliberately not distinguishing unconditional ("Draw a card.") from conditional ("If you
 * do, draw a card.") triggers, since reminder text has no consistent structural marker a regex can
 * reliably tell those apart by. This is an upper-bound estimate assuming every draw clause always
 * fires, not a guarantee — see the Hypergeometric calculator's "est." labeling of anything derived
 * from it.
 */
export function drawnCardsPerCopy(card: Card): number {
  const effect = card.effect ?? "";
  let total = 0;
  for (const m of effect.matchAll(DRAW_RE)) {
    const qty = parseQuantity(m[1]);
    if (qty !== null) total += qty;
  }
  return total;
}

/**
 * Expected extra cards seen by the time `seen` cards have been drawn, from draw-effect cards
 * elsewhere in the deck — `copies * seen/deckSize` is each draw-effect card's own expected count
 * among the cards seen so far (same without-replacement expectation the hypergeometric mean uses),
 * times how many cards each copy draws. Deliberately single-pass, not recursive: it doesn't account
 * for a drawn card itself increasing the chance of drawing further draw-effect cards, or for
 * sequencing (a copy only helps once actually played, not merely drawn). A fuller model would need
 * turn-by-turn simulation rather than a closed-form hypergeometric extension.
 */
export function expectedExtraDraws(drawEffectLines: { quantity: number; perCopy: number }[], deckSize: number, seen: number): number {
  if (deckSize <= 0) return 0;
  const draws = Math.min(seen, deckSize);
  return drawEffectLines.reduce((sum, line) => sum + (line.quantity * draws) / deckSize * line.perCopy, 0);
}

/**
 * Flat (not seen-scaled) extra cards seen from Material Deck draw effects. Unlike the Main Deck,
 * the Material Deck isn't shuffled or drawn from at random — every card in it is known and reachable
 * from the start of the game (paying its own reserve cost), so a Material card with a draw effect
 * isn't gated by "how many cards have I drawn so far" the way a Main Deck card is. Treated here as
 * available in full regardless of `seen`, with the same "every clause always fires" over-count bias
 * as `drawnCardsPerCopy` itself, and the same non-recursion caveat as `expectedExtraDraws`.
 */
export function materialDrawBonus(materialDrawEffectLines: { quantity: number; perCopy: number }[]): number {
  return materialDrawEffectLines.reduce((sum, line) => sum + line.quantity * line.perCopy, 0);
}

const CONDITIONAL_DRAW_RE = /\bif\b|\bwhenever\b|\bwhen\b|\bon attack\b|\bon hit\b|\bon kill\b|\buntil\b/i;

export interface DrawEngineSource {
  name: string;
  quantity: number;
  perCopy: number;
  reserveCost: number | null;
  section: "main" | "material";
  conditional: boolean;
}

export interface DrawEngineTimingSource extends DrawEngineSource {
  firstAffordableTurn: number;
  onlineByTurn: number;
  expectedActiveDraws: number;
}

export interface DrawEngineTiming {
  turn: number;
  printedPotential: number;
  onlineByTurn: number;
  expectedActiveDraws: number;
  sources: DrawEngineTimingSource[];
}

/** Printed draw sources, retaining section and cost so timing can be modeled instead of assuming
 * every clause fires as soon as its card enters the deck list. Conditional clauses remain included
 * as explicitly labeled upper bounds; rules text is not structured enough to prove their trigger. */
export function drawEngineSources(
  mainLines: { name: string; quantity: number }[],
  materialLines: { name: string; quantity: number }[],
  catalogByName: ReadonlyMap<string, Card>,
): DrawEngineSource[] {
  return ([...mainLines.map((line) => ({ ...line, section: "main" as const })), ...materialLines.map((line) => ({ ...line, section: "material" as const }))])
    .map((line) => {
      const card = catalogByName.get(line.name);
      return {
        ...line,
        perCopy: card ? drawnCardsPerCopy(card) : 0,
        reserveCost: card?.cost_reserve ?? null,
        conditional: CONDITIONAL_DRAW_RE.test(card?.effect ?? ""),
      };
    })
    .filter((line) => line.perCopy > 0);
}

/**
 * Timing-aware, single-pass draw estimate for one checkpoint. `seen` is natural cards seen before
 * extra draw effects. Main sources contribute only if their Reserve cost is affordable by the
 * inferred turn, weighted by their expected drawn copies (`copies × seen / deckSize`). Material
 * sources are known from game start but still wait for their cost-ready turn. The combined online
 * probability is exact for finding at least one currently affordable Main source; a currently
 * affordable Material source makes it 100%. Effects are not recursively allowed to find more draw
 * sources, and trigger/level requirements are not guessed.
 */
export function computeDrawEngineTiming(
  sources: DrawEngineSource[],
  deckSize: number,
  seen: number,
  startingHandSize: number,
): DrawEngineTiming {
  const naturalSeen = Math.min(Math.max(0, seen), Math.max(0, deckSize));
  const turn = Math.max(1, Math.ceil(naturalSeen - startingHandSize + 1));
  let affordableMainCopies = 0;
  let materialOnline = false;
  const timedSources = sources.map((source) => {
    const firstAffordableTurn = earliestReserveCostTurn(source.reserveCost, startingHandSize);
    const affordable = firstAffordableTurn <= turn;
    const onlineByTurn = !affordable ? 0 : source.section === "material" ? 1 : probabilityAtLeast(deckSize, source.quantity, naturalSeen, 1);
    const expectedCopies = !affordable ? 0 : source.section === "material" ? source.quantity : (source.quantity * naturalSeen) / Math.max(1, deckSize);
    if (affordable && source.section === "main") affordableMainCopies += source.quantity;
    if (affordable && source.section === "material") materialOnline = true;
    return { ...source, firstAffordableTurn, onlineByTurn, expectedActiveDraws: expectedCopies * source.perCopy };
  });
  return {
    turn,
    printedPotential: sources.reduce((sum, source) => sum + source.quantity * source.perCopy, 0),
    onlineByTurn: materialOnline ? 1 : probabilityAtLeast(deckSize, affordableMainCopies, naturalSeen, 1),
    expectedActiveDraws: timedSources.reduce((sum, source) => sum + source.expectedActiveDraws, 0),
    sources: timedSources,
  };
}
