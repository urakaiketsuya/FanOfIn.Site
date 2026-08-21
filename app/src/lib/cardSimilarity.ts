import type { Card, CardCost } from "@gatcg/shared";

/** Below this length, a normalized template is too close to blank (a vanilla stat-stick with
 * little/no effect text) to mean anything as a "same effect shape" match — without this floor,
 * every blank-effect card in the catalog would collapse into one meaningless giant group. */
const MIN_TEMPLATE_LENGTH = 15;

function normalizeEffectTemplate(effectRaw: string | null): string {
  if (!effectRaw) return "";
  return effectRaw
    .replace(/\*\*/g, "")
    .replace(/\d+/g, "#")
    .trim();
}

function templateKey(card: Card): string | null {
  const template = normalizeEffectTemplate(card.effect_raw ?? card.effect);
  if (template.length < MIN_TEMPLATE_LENGTH) return null;
  return `${[...card.types].sort().join(",")}|${[...card.subtypes].sort().join(",")}|${template}`;
}

/**
 * Cards sharing the same type/subtype set and the same effect text once numbers are normalized
 * away — e.g. "Floating Memory (...banish this card...to pay for #...)" matches regardless of
 * whether the real card says "1" or "2". Deliberately doesn't try to rank or declare a winner:
 * spot-checked against real data before building this (see the plan doc / commit message) and
 * found genuine cost/stat tradeoffs released the same day, plus large families of intentional
 * per-element design parallels (16 different Spirit cards sharing one template) — an automated
 * "X is strictly better" verdict would be wrong often enough that this stays a comparison, not a
 * judgment.
 */
export function similarCards(card: Card, catalog: Card[]): Card[] {
  const key = templateKey(card);
  if (!key) return [];
  return catalog.filter((c) => c.uuid !== card.uuid && templateKey(c) === key);
}

/** Earliest print date across every edition — used to sort siblings oldest-to-newest. */
export function earliestReleaseDate(card: Card): string | null {
  if (card.editions.length === 0) return null;
  return [...card.editions].map((e) => e.set.release_date).sort()[0];
}

function numericCost(cost: CardCost): number | null {
  if (cost.type === "none" || cost.value === null) return null;
  const n = Number(cost.value);
  return Number.isFinite(n) ? n : null;
}

export interface StatDiff {
  cost: number | null;
  power: number | null;
  life: number | null;
  durability: number | null;
}

/**
 * `other`'s stat minus `card`'s, for each stat both cards have as a plain number — null where
 * either side isn't numeric (e.g. a symbolic "X" cost) rather than pretending 0. Deliberately just
 * the raw deltas, no aggregate "better/worse" verdict — same reasoning `similarCards`'s doc comment
 * gives for not ranking siblings at all.
 */
export function statDiff(card: Card, other: Card): StatDiff {
  const cardCost = numericCost(card.cost);
  const otherCost = numericCost(other.cost);
  return {
    cost: cardCost !== null && otherCost !== null ? otherCost - cardCost : null,
    power: card.power !== null && other.power !== null ? other.power - card.power : null,
    life: card.life !== null && other.life !== null ? other.life - card.life : null,
    durability: card.durability !== null && other.durability !== null ? other.durability - card.durability : null,
  };
}
