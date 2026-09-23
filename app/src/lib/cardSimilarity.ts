import type { Card, CardCost } from "@gatcg/shared";

/** Below this length, a normalized template is too close to blank (a vanilla stat-stick with
 * little/no effect text) to mean anything as a "same effect shape" match — without this floor,
 * every blank-effect card in the catalog would collapse into one meaningless giant group. */
const MIN_TEMPLATE_LENGTH = 15;
const NUMBER_WORD_RE = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen)\b/gi;

function normalizeEffectTemplate(effectRaw: string | null): string {
  if (!effectRaw) return "";
  return effectRaw
    .replace(/\*\*/g, "")
    .replace(/\d+/g, "#")
    .replace(NUMBER_WORD_RE, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

/** Where a conditional bonus clause begins — "**Class Bonus:**", "**Merlin Bonus**", "[Element
 * Bonus]", etc. (a per-class/champion/element clause tacked onto the base effect) — everything
 * before this point is the effect's unconditional "core." */
const BONUS_CLAUSE_RE = /(\*\*[A-Za-z][\w' ]* Bonus:?\*\*|\[[A-Za-z][\w' ]* Bonus\])/i;

/** Italicized reminder text clarifying a bonus clause's condition, e.g. "*(Apply this effect only
 * if your champion's class matches this card's class.)*" — flavor text, not part of the effect. */
const REMINDER_TEXT_RE = /\*\([^)]*\)\*/g;

function normalizeCoreEffect(effectRaw: string | null): string {
  if (!effectRaw) return "";
  const marker = BONUS_CLAUSE_RE.exec(effectRaw);
  const core = marker ? effectRaw.slice(0, marker.index) : effectRaw;
  return core
    .replace(REMINDER_TEXT_RE, "")
    .replace(/\*\*/g, "")
    .replace(/\d+/g, "#")
    .replace(NUMBER_WORD_RE, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Cards whose core effect — everything before any conditional class/champion/element "Bonus"
 * clause, with reminder text and numbers normalized away — is textually identical, regardless of
 * type, subtype, or cost. Looser than `similarCards` above (which requires the *entire* template,
 * bonus clause included, plus a matching type/subtype set): this catches cards that do the same
 * base thing but differ in a class-specific bonus or a type/subtype detail — e.g. Creative Tinder
 * ("Draw two cards, then discard a card.") and Creative Shock (the same core line plus a Fire Class
 * Bonus) share a core-effect key despite Shock also carrying a MAGE subtype Tinder lacks. Verified
 * against the real 2,495-card corpus: 51 groups / 181 cards share a core-effect key this way — a
 * comparable size to `similarCards`'s own groups, so this reads as a real signal, not noise.
 *
 * Deliberately reads `card.effect` here, never `effect_raw` (unlike `similarCards`'s full-template
 * match, which doesn't care which one it reads as long as it's consistent): `effect_raw` is plain
 * text with no `**Bonus:**`/`*(...)*` markup at all on the live catalog (only the bold `effect`
 * field carries it, confirmed against real synced card records), so `BONUS_CLAUSE_RE` would never
 * find the split point on `effect_raw` and every bonus clause would stay glued to the core text.
 */
export function sameCoreEffectCards(card: Card, catalog: Card[]): Card[] {
  const key = normalizeCoreEffect(card.effect);
  if (key.length < MIN_TEMPLATE_LENGTH) return [];
  return catalog.filter((c) => c.uuid !== card.uuid && normalizeCoreEffect(c.effect) === key);
}

export interface SimilarEffectCards {
  exact: Card[];
  core: Card[];
  concept: SimilarConceptCard[];
}

export interface SimilarConceptCard {
  card: Card;
  sharedConcepts: EffectConcept[];
}

export interface EffectConcept {
  id: string;
  label: string;
}

const EFFECT_CONCEPTS: readonly (EffectConcept & { pattern: RegExp })[] = [
  { id: "draw", label: "Draw cards", pattern: /\bdraw(?:s|n)?\b/i },
  { id: "damage", label: "Deal damage", pattern: /\bdeal(?:s|t)?\b[^.\n]{0,45}\bdamage\b/i },
  { id: "recover", label: "Recover", pattern: /\brecover\b/i },
  { id: "banish", label: "Banish", pattern: /\bbanish(?:ed|es|ing)?\b/i },
  { id: "negate", label: "Negate", pattern: /\bnegat(?:e|ed|es|ing)\b/i },
  { id: "glimpse", label: "Glimpse", pattern: /\bglimpse\b/i },
  { id: "memory", label: "Memory", pattern: /\bmemory\b/i },
  { id: "graveyard", label: "Graveyard", pattern: /\bgraveyard\b/i },
  { id: "token", label: "Create tokens", pattern: /\b(?:summon|create|put onto the field)\b[^.\n]{0,55}\btoken(?:s)?\b/i },
  { id: "counter", label: "Add counters", pattern: /\bput\b[^.\n]{0,55}\bcounter(?:s)?\b/i },
  { id: "cost", label: "Reduce costs", pattern: /\bcosts?\b[^.\n]{0,35}\bless\b/i },
  { id: "materialize", label: "Materialize", pattern: /\bmaterialize\b/i },
  { id: "power", label: "Increase power", pattern: /(?:\bgets?\b|\bgain(?:s)?\b)[^.\n]{0,35}\+\s*\d+\s*(?:\[power\]|power)/i },
  { id: "protection", label: "Protection", pattern: /\b(?:spellshroud|immortality|prevent|can't be targeted)\b/i },
];

export function effectConcepts(card: Card): EffectConcept[] {
  const effect = card.effect ?? card.effect_raw ?? "";
  return EFFECT_CONCEPTS.filter((concept) => concept.pattern.test(effect)).map(({ id, label }) => ({ id, label }));
}

/** Exact template siblings plus looser core-effect siblings, without repeating exact matches. */
export function effectRelatedCards(card: Card, catalog: Card[]): SimilarEffectCards {
  const exact = similarCards(card, catalog);
  const exactIds = new Set(exact.map((candidate) => candidate.uuid));
  const core = sameCoreEffectCards(card, catalog).filter((candidate) => !exactIds.has(candidate.uuid));
  const excludedIds = new Set([card.uuid, ...exactIds, ...core.map((candidate) => candidate.uuid)]);
  const viewedConcepts = effectConcepts(card);
  const viewedIds = new Set(viewedConcepts.map((concept) => concept.id));
  const concept = viewedConcepts.length === 0 ? [] : catalog.flatMap((candidate): SimilarConceptCard[] => {
    if (excludedIds.has(candidate.uuid)) return [];
    const sharedConcepts = effectConcepts(candidate).filter((item) => viewedIds.has(item.id));
    const samePrimaryType = candidate.types.some((type) => card.types.includes(type));
    if (sharedConcepts.length < 2 && !(viewedConcepts.length === 1 && sharedConcepts.length === 1 && samePrimaryType)) return [];
    return [{ card: candidate, sharedConcepts }];
  }).sort((a, b) => b.sharedConcepts.length - a.sharedConcepts.length || a.card.name.localeCompare(b.card.name));
  return { exact, core, concept };
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
