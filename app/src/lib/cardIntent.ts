import type { Card } from "@gatcg/shared";

const SUMMON_TOKEN_RE = /\*\*Summon\*\*\s+(?:a|an|\d+|two|three)\s+([A-Z][A-Za-z ]*?)\s+tokens?\b/g;
const SACRIFICE_TOKEN_RE = /[Ss]acrifice\s+(?:a|an|\d+|any amount of)\s+([A-Z][A-Za-z ]*?)\b/g;

function normalizeCategory(raw: string): string {
  return raw.trim().replace(/s$/i, "").toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Named token types this card's own effect summons (e.g. "Powercell", "Core Fractal") — the producer side of a shared token economy. Matched by name, not a curated list, so any future shared token economy is picked up automatically. */
export function extractProducedTokens(card: Card): Set<string> {
  const tokens = new Set<string>();
  const effect = card.effect ?? "";
  for (const m of effect.matchAll(SUMMON_TOKEN_RE)) tokens.add(normalizeCategory(m[1]));
  return tokens;
}

/** Named token types this card's own effect sacrifices as a cost — the consumer side of a shared token economy. */
export function extractConsumedTokens(card: Card): Set<string> {
  const tokens = new Set<string>();
  const effect = card.effect ?? "";
  for (const m of effect.matchAll(SACRIFICE_TOKEN_RE)) tokens.add(normalizeCategory(m[1]));
  return tokens;
}

/**
 * At most 2 filler words allowed between a trigger's quantifier ("a"/"an"/"3"/...) and the subtype
 * word itself — e.g. "sacrifice a Chessman Rook ally" has the subtype (Chessman) immediately after
 * the quantifier with 0 filler words; this just gives a little slack for phrasing variants without
 * opening up to matching across unrelated clauses.
 */
function subtypeTriggerRegexes(subtype: string): RegExp[] {
  const s = escapeRegExp(subtype);
  const filler = "(?:[A-Za-z]+\\s+){0,2}";
  return [
    new RegExp(`\\bsacrifice\\s+(?:a|an|\\d+|any amount of)\\s+${filler}${s}s?\\b`, "i"),
    new RegExp(`\\bcontrols?\\s+(?:a|an|\\d+|at least \\d+)\\s+${filler}${s}s?\\b`, "i"),
    new RegExp(`\\bbanish\\s+(?:a|an|\\d+)\\s+${filler}${s}s?\\b[^.]*\\bfrom\\s+(?:your|the)\\s+\\w+`, "i"),
  ];
}

/**
 * Which of the given real subtype strings this card's own effect text sacrifices, requires
 * controlling, or banishes from a zone — e.g. "sacrifice a Chessman ally" or "control a Beast
 * ally" — matched with the trigger word and the subtype anchored as one contiguous phrase (not
 * just "both words appear somewhere nearby"), which matters: a looser proximity check originally
 * used here mismatched real cards, e.g. "**Sacrifice CARDNAME**: As a Spell, destroy..." (a
 * self-sacrifice cost, unrelated to the "As a Spell" targeting-restriction phrase later in the same
 * clause) as if it meant "sacrifice a Spell [card]", just because both words fell within a fixed
 * character window. Anchoring the quantifier immediately before the subtype word removes that
 * class of false positive. Deliberately checked against `subtypes` (Chessman, Automaton, Specter,
 * Beast, Elysian, VelTech, ...) — real tribal/flavor categories — never against the 5 broad `types`
 * values (ALLY/ITEM/WEAPON/ACTION/...), which are exactly the generic sacrifice-cost words
 * ("sacrifice an ally") that would turn this into noise instead of a real designed relationship.
 */
export function extractConsumedSubtypes(card: Card, knownSubtypes: ReadonlySet<string>): Set<string> {
  const found = new Set<string>();
  const effect = card.effect ?? "";
  for (const subtype of knownSubtypes) {
    if (subtypeTriggerRegexes(subtype).some((re) => re.test(effect))) found.add(subtype);
  }
  return found;
}

export interface IntentMatch {
  card: Card;
  via: string;
}

export interface IntentCards {
  /** Other cards whose consumed set overlaps something THIS card produces — cards this card feeds. */
  feeds: IntentMatch[];
  /** Other cards whose produced set overlaps something THIS card consumes — cards that power this one. */
  poweredBy: IntentMatch[];
}

/**
 * Cards designed to work together, from explicit text patterns — not near-identical siblings
 * (that's "Same Effect Shape") and not empirical co-play win-rate (that's the Synergy tab).
 * See docs/CALCULATIONS.md's "Intent cards" section for the real-corpus validation behind the
 * subtypes-not-types filtering choice. Empty results are the normal case — most cards aren't part
 * of a named token or tribal economy.
 */
export function intentCards(card: Card, catalog: Card[]): IntentCards {
  const knownSubtypes = new Set<string>();
  for (const c of catalog) for (const s of c.subtypes) knownSubtypes.add(normalizeCategory(s));

  const myProducedTokens = extractProducedTokens(card);
  const myOwnSubtypes = new Set(card.subtypes.map(normalizeCategory));
  const myConsumedTokens = extractConsumedTokens(card);
  const myConsumedSubtypes = extractConsumedSubtypes(card, knownSubtypes);

  const feeds: IntentMatch[] = [];
  const poweredBy: IntentMatch[] = [];

  for (const other of catalog) {
    if (other.uuid === card.uuid) continue;

    const otherConsumedTokens = extractConsumedTokens(other);
    for (const t of myProducedTokens) {
      if (otherConsumedTokens.has(t)) feeds.push({ card: other, via: t });
    }
    const otherConsumedSubtypes = extractConsumedSubtypes(other, knownSubtypes);
    for (const s of myOwnSubtypes) {
      if (otherConsumedSubtypes.has(s)) feeds.push({ card: other, via: s });
    }

    const otherProducedTokens = extractProducedTokens(other);
    for (const t of myConsumedTokens) {
      if (otherProducedTokens.has(t)) poweredBy.push({ card: other, via: t });
    }
    const otherSubtypes = new Set(other.subtypes.map(normalizeCategory));
    for (const s of myConsumedSubtypes) {
      if (otherSubtypes.has(s)) poweredBy.push({ card: other, via: s });
    }
  }

  return { feeds, poweredBy };
}
