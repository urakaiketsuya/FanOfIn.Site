import type { Card } from "@gatcg/shared";

const CHAMPION_BONUS_RE = /\[([^\]]+) Bonus\]/g;

/** Names this card grants a bonus effect for, from every `[<Name> Bonus]` tag in its effect text —
 * a broader scan than deckIdentity.ts's Floating Memory parser, which only looks at the one tag
 * immediately preceding "**Floating Memory**"; a card can carry both that and a separate
 * champion-bonus effect elsewhere. Includes Class/Element bonus tags too (e.g. "[Class Bonus]"),
 * which simply won't match any real Champion name when filtered against one. */
export function championBonusesFor(card: Card): string[] {
  const text = card.effect_raw ?? card.effect ?? "";
  const names: string[] = [];
  for (const match of text.matchAll(CHAMPION_BONUS_RE)) {
    names.push(match[1]);
  }
  return names;
}
