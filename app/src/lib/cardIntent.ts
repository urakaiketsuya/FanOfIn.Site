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

export type IntentTier = "validated" | "experimental";

/**
 * At most 2 filler words allowed between a trigger's quantifier ("a"/"an"/"3"/...) and the subtype
 * word itself — e.g. "sacrifice a Chessman Rook ally" has the subtype (Chessman) immediately after
 * the quantifier with 0 filler words; this just gives a little slack for phrasing variants without
 * opening up to matching across unrelated clauses.
 */
const FILLER = "(?:[A-Za-z]+\\s+){0,2}";

/**
 * The original three trigger verbs — checked against the real 2,494-card corpus before shipping
 * (see docs/CALCULATIONS.md's "Intent cards" section: "sacrifice/control a Chessman" alone on 10+
 * real cards). Matched with the trigger word and subtype anchored as one contiguous phrase (not
 * just "both words appear somewhere nearby"), which matters: a looser proximity check originally
 * used here mismatched real cards, e.g. "**Sacrifice CARDNAME**: As a Spell, destroy..." as if it
 * meant "sacrifice a Spell [card]", just because both words fell within a fixed character window.
 */
function validatedSubtypeRegexes(s: string): RegExp[] {
  return [
    new RegExp(`\\bsacrifice\\s+(?:a|an|\\d+|any amount of)\\s+${FILLER}${s}s?\\b`, "i"),
    new RegExp(`\\bcontrols?\\s+(?:a|an|\\d+|at least \\d+)\\s+${FILLER}${s}s?\\b`, "i"),
    new RegExp(`\\bbanish\\s+(?:a|an|\\d+)\\s+${FILLER}${s}s?\\b[^.]*\\bfrom\\s+(?:your|the)\\s+\\w+`, "i"),
  ];
}

/**
 * Broader trigger verbs — real GA TCG patterns worth checking for, but NOT yet run against the
 * full card corpus the way the validated set above was, so they carry a real false-positive risk
 * (see docs/CALCULATIONS.md's "Intent cards" section for why that corpus check matters: a generic-
 * enough trigger turns this from a designed-relationship signal into noise). Opt-in only — never
 * silently blended into the trusted default, see `intentCards`'s `tier` field.
 */
function experimentalSubtypeRegexes(s: string): RegExp[] {
  return [
    new RegExp(`\\breveal\\s+(?:a|an|\\d+)\\s+${FILLER}${s}s?\\b`, "i"),
    new RegExp(`\\bdiscard\\s+(?:a|an|\\d+)\\s+${FILLER}${s}s?\\b`, "i"),
    new RegExp(`\\breturn\\s+(?:a|an|\\d+)\\s+${FILLER}${s}s?\\b[^.]*\\bfrom\\s+your\\s+discard\\s+pile\\b`, "i"),
  ];
}

/**
 * Which of the given real subtype strings this card's own effect text sacrifices, requires
 * controlling, banishes from a zone, or (experimental tier) reveals/discards/returns from the
 * discard pile — e.g. "sacrifice a Chessman ally" or "control a Beast ally". Deliberately checked
 * against `subtypes` (Chessman, Automaton, Specter, Beast, Elysian, VelTech, ...) — real
 * tribal/flavor categories — never against the 5 broad `types` values (ALLY/ITEM/WEAPON/ACTION/...),
 * which are exactly the generic sacrifice-cost words ("sacrifice an ally") that would turn this
 * into noise instead of a real designed relationship. Validated wins when both tiers would match
 * the same subtype (expected overlap, not a conflict) — the map's value is the *most trusted* tier
 * that fired.
 */
export function extractConsumedSubtypes(card: Card, knownSubtypes: ReadonlySet<string>): Map<string, IntentTier> {
  const found = new Map<string, IntentTier>();
  const effect = card.effect ?? "";
  for (const subtype of knownSubtypes) {
    const s = escapeRegExp(subtype);
    if (validatedSubtypeRegexes(s).some((re) => re.test(effect))) {
      found.set(subtype, "validated");
    } else if (experimentalSubtypeRegexes(s).some((re) => re.test(effect))) {
      found.set(subtype, "experimental");
    }
  }
  return found;
}

export interface IntentMatch {
  card: Card;
  via: string;
  /** "validated" = one of the original sacrifice/control/banish-from (subtypes) or Summon/sacrifice
   * (tokens) triggers, checked against the real card corpus before shipping. "experimental" = a
   * broader reveal/discard/return-from-discard-pile trigger that hasn't had that same corpus check
   * and carries a higher false-positive risk — shown separately, opt-in, never blended silently
   * into the trusted default. */
  tier: IntentTier;
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
 * subtypes-not-types filtering choice, and for what distinguishes the "validated" and
 * "experimental" tiers each `IntentMatch` carries. Always computes both tiers (cheap — regex
 * checks, no extra data) and leaves it to the caller (`useIntentCards`/`CardDetail.tsx`) to decide
 * whether to show experimental-tier matches; this function itself never drops or hides one.
 * Empty results are the normal case — most cards aren't part of a named token or tribal economy.
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
      if (otherConsumedTokens.has(t)) feeds.push({ card: other, via: t, tier: "validated" });
    }
    const otherConsumedSubtypes = extractConsumedSubtypes(other, knownSubtypes);
    for (const s of myOwnSubtypes) {
      const tier = otherConsumedSubtypes.get(s);
      if (tier) feeds.push({ card: other, via: s, tier });
    }

    const otherProducedTokens = extractProducedTokens(other);
    for (const t of myConsumedTokens) {
      if (otherProducedTokens.has(t)) poweredBy.push({ card: other, via: t, tier: "validated" });
    }
    const otherSubtypes = new Set(other.subtypes.map(normalizeCategory));
    for (const [s, tier] of myConsumedSubtypes) {
      if (otherSubtypes.has(s)) poweredBy.push({ card: other, via: s, tier });
    }
  }

  return { feeds, poweredBy };
}
