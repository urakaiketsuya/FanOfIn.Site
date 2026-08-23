import type { Card } from "@gatcg/shared";

const SUMMON_TOKEN_RE = /\*\*Summon\*\*\s+(?:a|an|\d+|two|three)\s+([A-Z][A-Za-z ]*?)\s+tokens?\b/g;
const SACRIFICE_TOKEN_RE = /[Ss]acrifice\s+(?:a|an|\d+|any amount of)\s+([A-Z][A-Za-z ]*?)\b/g;

/**
 * Token names are discovered dynamically from free effect text with no canonical list to check
 * against (unlike subtypes, see `normalizeSubtype` below) — the same token can be mentioned
 * singular in one card's "Summon" text and plural in another's "sacrifice" text, so this strips a
 * trailing "s" to unify them into one matching key. Naive (doesn't know real irregular plurals),
 * but there's no better signal available for a name with no catalog entry of its own.
 */
function normalizeTokenName(raw: string): string {
  return raw.trim().replace(/s$/i, "").toLowerCase();
}

/**
 * Subtypes, unlike token names, already have a canonical spelling straight from the catalog's own
 * `card.subtypes` — no destructive "strip a trailing s" guess is needed or wanted here. Blindly
 * stripping (this function's previous behavior, shared with `normalizeTokenName`) mangled any
 * subtype whose real singular form happens to end in "s" (e.g. a hypothetical "Glass" → "Glas"),
 * corrupting both the stored matching key and the `via` text shown to the user. Case-insensitive
 * matching against effect text still allows the plural form via the trigger regexes' own trailing
 * `s?` (see `validatedSubtypeRegexes`/`experimentalSubtypeRegexes`) — pluralization is handled once,
 * at match time, not baked destructively into the stored value.
 */
function normalizeSubtype(raw: string): string {
  return raw.trim().toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Named token types this card's own effect summons (e.g. "Powercell", "Core Fractal") — the producer side of a shared token economy. Matched by name, not a curated list, so any future shared token economy is picked up automatically. */
export function extractProducedTokens(card: Card): Set<string> {
  const tokens = new Set<string>();
  const effect = card.effect ?? "";
  for (const m of effect.matchAll(SUMMON_TOKEN_RE)) tokens.add(normalizeTokenName(m[1]));
  return tokens;
}

/** Named token types this card's own effect sacrifices as a cost — the consumer side of a shared token economy. */
export function extractConsumedTokens(card: Card): Set<string> {
  const tokens = new Set<string>();
  const effect = card.effect ?? "";
  for (const m of effect.matchAll(SACRIFICE_TOKEN_RE)) tokens.add(normalizeTokenName(m[1]));
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
/**
 * How far past the subtype word "from <zone>" is allowed to trail for the banish trigger — up to 4
 * more words, comfortably covering real phrasing like "banish a Beast ally from your opponent's
 * discard pile" (gap of 1: "ally"). Originally unbounded (`[^.]*`, "anywhere later in the same
 * sentence"), which could cross into an unrelated clause sharing that sentence — e.g. "Banish a
 * Beast ally, then look at the top card from your deck" has no period between the banish and an
 * unrelated draw effect's own "from your deck", so the old pattern could credit the banish trigger
 * with a "from" clause that actually belongs to a different effect entirely.
 */
const BANISH_FROM_GAP = "(?:\\s+\\S+){0,4}";

function validatedSubtypeRegexes(s: string): RegExp[] {
  return [
    new RegExp(`\\bsacrifice\\s+(?:a|an|\\d+|any amount of)\\s+${FILLER}${s}s?\\b`, "i"),
    new RegExp(`\\bcontrols?\\s+(?:a|an|\\d+|at least \\d+)\\s+${FILLER}${s}s?\\b`, "i"),
    new RegExp(`\\bbanish\\s+(?:a|an|\\d+)\\s+${FILLER}${s}s?\\b${BANISH_FROM_GAP}\\s+from\\s+(?:your|the)\\s+\\w+`, "i"),
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

const EMPOWER_GRANT_RE = /\*\*Empower\b/;

/**
 * "Deal ... LV ... damage" within one sentence — LV is Grand Archive's own reminder-text shorthand
 * for "your champion's level" (e.g. "Deal **LV** damage to target unit", "Deal 1+**LV** damage").
 * Bounded gaps (not `[^.]*` unbounded), same reasoning as `BANISH_FROM_GAP` above: without a bound,
 * this could credit an unrelated damage clause elsewhere in the same sentence with an LV reference
 * that actually belongs to a different effect (e.g. a cost-reduction "costs LV less to activate"
 * earlier in the same sentence as an unrelated flat-damage clause).
 */
const DEAL_LV_DAMAGE_RE = /\bdeal(?:s|t)?\b[^.]{0,40}\bLV\b[^.]{0,20}\bdamage\b/i;

/** Does this card grant the Empower keyword (any magnitude — N, X, or N+X)? The producer side of the Empower/level-scaled-Spell relationship below. */
export function extractsEmpowerGrant(card: Card): boolean {
  return EMPOWER_GRANT_RE.test(card.effect ?? "");
}

/**
 * Is this a Spell whose own damage scales off LV (your champion's level)? Empower's grant only
 * applies to "the next Spell card you activate this turn" — verified against the real corpus that
 * a few non-Spell cards (two Potions, one Skill) also deal LV-scaled damage but are deliberately
 * excluded here, since Empower structurally can't apply to them.
 */
export function benefitsFromEmpower(card: Card): boolean {
  return card.subtypes.includes("SPELL") && DEAL_LV_DAMAGE_RE.test((card.effect ?? "").replace(/\*\*/g, ""));
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
 * (that's "Same Effect Shape") and not empirical co-play win-rate (that's the Synergy tab). Three
 * tracks: named token economies, tribal/subtype categories, and Empower/level-scaled-Spell-damage
 * (see `extractsEmpowerGrant`/`benefitsFromEmpower` above).
 * See docs/CALCULATIONS.md's "Intent cards" section for the real-corpus validation behind the
 * subtypes-not-types filtering choice, and for what distinguishes the "validated" and
 * "experimental" tiers each `IntentMatch` carries. Always computes both tiers (cheap — regex
 * checks, no extra data) and leaves it to the caller (`useIntentCards`/`CardDetail.tsx`) to decide
 * whether to show experimental-tier matches; this function itself never drops or hides one.
 * Empty results are the normal case — most cards aren't part of a named token or tribal economy.
 */
export function intentCards(card: Card, catalog: Card[]): IntentCards {
  const knownSubtypes = new Set<string>();
  for (const c of catalog) for (const s of c.subtypes) knownSubtypes.add(normalizeSubtype(s));

  const myProducedTokens = extractProducedTokens(card);
  const myOwnSubtypes = new Set(card.subtypes.map(normalizeSubtype));
  const myConsumedTokens = extractConsumedTokens(card);
  const myConsumedSubtypes = extractConsumedSubtypes(card, knownSubtypes);
  const myGrantsEmpower = extractsEmpowerGrant(card);
  const myBenefitsFromEmpower = benefitsFromEmpower(card);

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
    if (myGrantsEmpower && benefitsFromEmpower(other)) feeds.push({ card: other, via: "Empower", tier: "validated" });

    const otherProducedTokens = extractProducedTokens(other);
    for (const t of myConsumedTokens) {
      if (otherProducedTokens.has(t)) poweredBy.push({ card: other, via: t, tier: "validated" });
    }
    const otherSubtypes = new Set(other.subtypes.map(normalizeSubtype));
    for (const [s, tier] of myConsumedSubtypes) {
      if (otherSubtypes.has(s)) poweredBy.push({ card: other, via: s, tier });
    }
    if (myBenefitsFromEmpower && extractsEmpowerGrant(other)) poweredBy.push({ card: other, via: "Empower", tier: "validated" });
  }

  return { feeds, poweredBy };
}
