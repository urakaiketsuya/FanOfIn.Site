import type { Card } from "@gatcg/shared";

export interface NamedLine { name: string; quantity: number }

export interface ScavengeForecast {
  cardName: string;
  copies: number;
  amount: number;
  targetLabel: string;
  matchingCopies: number;
  deckSize: number;
  hitChance: number;
}

export interface DelugeForecastPoint { seen: number; expected: number }
export interface DelugeForecast {
  cardName: string;
  copies: number;
  threshold: number;
  element: string;
  totalCopies: number;
  points: DelugeForecastPoint[];
}

// Fixed, small enums the game itself defines — verified against every real Card.types/Card.elements
// value in the catalog (pipeline/.cache/cards.json), not guessed from memory.
const CARD_TYPES = new Set([
  "ACTION", "ALLY", "ATTACK", "CHAMPION", "DOMAIN", "GREATER BOON", "ITEM", "LESSER BOON",
  "MASTERY", "PHANTASIA", "REGALIA", "STATUS", "TOKEN", "UNIQUE", "WEAPON",
]);
const CARD_ELEMENTS = new Set([
  "ARCANE", "ASTRA", "CRUX", "EXALTED", "EXIA", "FIRE", "LUXEM", "NEOS", "NORM", "TERA", "UMBRA", "WATER", "WIND",
]);

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const r = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= r; i++) result = (result * (n - r + i)) / i;
  return result;
}

/** Chance of at least one success in `draws` cards revealed without replacement — the same
 * hypergeometric math synergyReadiness.ts's Imbue forecast uses, just phrased for a single
 * one-shot reveal (Scavenge) instead of a swept "cards seen" checkpoint. */
function chanceOfAtLeastOne(deckSize: number, successes: number, draws: number): number {
  if (deckSize <= 0 || successes <= 0) return 0;
  const capped = Math.min(draws, deckSize);
  return 1 - choose(deckSize - successes, capped) / choose(deckSize, capped);
}

const SCAVENGE_RE = /\*\*[Ss]cavenge ([^*]+?)\*\*\s*for ([^.]*)\./g;
// Denies target phrases this parser can't reduce to a plain type/subtype match: a player-chosen
// name or subtype ("Business Card", "Musical Curator"), an extra numeric qualifier ("Forese,
// Fervid Cantor"'s reserve-cost clause), or a repeated-reveal modifier ("Gear Haul"'s "twice").
const UNPARSEABLE_TARGET = /chosen|twice|with reserve|non-advanced|named|instead/i;

interface ScavengeTarget { label: string; matches(card: Card): boolean }

function parseScavengeTarget(phrase: string, knownSubtypes: ReadonlySet<string>): ScavengeTarget | null {
  const trimmed = phrase.trim();
  if (UNPARSEABLE_TARGET.test(trimmed)) return null;

  const elementMatch = trimmed.match(/^an? ([a-z]+) element cards?$/i);
  if (elementMatch) {
    const element = elementMatch[1].toUpperCase();
    if (!CARD_ELEMENTS.has(element)) return null;
    return { label: trimmed, matches: (card) => card.elements.includes(element) };
  }

  const orMatch = trimmed.match(/^an? ([a-zA-Z]+) or ([a-zA-Z]+) cards?$/i);
  if (orMatch) {
    const a = resolveTypeOrSubtype(orMatch[1], knownSubtypes);
    const b = resolveTypeOrSubtype(orMatch[2], knownSubtypes);
    if (!a || !b) return null;
    return { label: trimmed, matches: (card) => matchesToken(card, a) || matchesToken(card, b) };
  }

  const genericMatch = trimmed.match(/^an? (.+?) cards?$/i);
  if (!genericMatch) return null;
  const words = genericMatch[1].trim().split(/\s+/);
  if (words.length > 2) return null;
  const tokens = words.map((word) => resolveTypeOrSubtype(word, knownSubtypes));
  if (tokens.some((token) => token === null)) return null;
  const resolved = tokens as { kind: "type" | "subtype"; value: string }[];
  return { label: trimmed, matches: (card) => resolved.every((token) => matchesToken(card, token)) };
}

function resolveTypeOrSubtype(word: string, knownSubtypes: ReadonlySet<string>): { kind: "type" | "subtype"; value: string } | null {
  const upper = word.toUpperCase();
  if (CARD_TYPES.has(upper)) return { kind: "type", value: upper };
  if (knownSubtypes.has(upper)) return { kind: "subtype", value: upper };
  return null;
}
function matchesToken(card: Card, token: { kind: "type" | "subtype"; value: string }): boolean {
  return token.kind === "type" ? card.types.includes(token.value) : card.subtypes.some((s) => s.toUpperCase() === token.value);
}

/** Every "Scavenge N for a [target]" this deck's Main deck runs, where N is a fixed printed number
 * (not a variable X) and the target reduces to a plain type/subtype/element match. Scavenge only
 * reveals from the Main deck — Material cards are always available, never shuffled in, so they
 * never enter `deckSize` or the matching-card count (same Main-only convention synergyReadiness.ts
 * uses for Imbue). Cards whose Scavenge amount is variable or whose target can't be reduced this
 * way (a player-chosen name, an extra cost/element qualifier, a repeated reveal) are silently
 * excluded rather than guessed at. */
export function computeScavengeForecasts(mainLines: NamedLine[], cardsByName: Map<string, Card>): ScavengeForecast[] {
  const deckSize = Math.max(60, mainLines.reduce((sum, line) => sum + line.quantity, 0));
  const knownSubtypes = new Set<string>();
  for (const card of cardsByName.values()) for (const s of card.subtypes) knownSubtypes.add(s.toUpperCase());

  const results: ScavengeForecast[] = [];
  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    if (!card?.effect) continue;
    const matches = [...card.effect.matchAll(SCAVENGE_RE)];
    for (const match of matches) {
      const rawAmount = match[1].trim();
      if (!/^\d+$/.test(rawAmount)) continue;
      const amount = Number(rawAmount);
      const target = parseScavengeTarget(match[2].replace(/\s+instead$/, ""), knownSubtypes);
      if (!target) continue;
      const matchingCopies = mainLines.reduce((sum, other) => other.name === line.name || !cardsByName.get(other.name)
        ? sum : target.matches(cardsByName.get(other.name)!) ? sum + other.quantity : sum, 0);
      results.push({
        cardName: line.name, copies: line.quantity, amount, targetLabel: target.label,
        matchingCopies, deckSize, hitChance: chanceOfAtLeastOne(deckSize, matchingCopies, amount),
      });
    }
  }
  return results;
}

const DELUGE_AMOUNT_RE = /\*\*[Dd]eluge (\d+)/;
const DELUGE_ELEMENT_RE = /or more ([a-zA-Z]+) element cards?/i;
const CHECKPOINTS = [7, 10, 15, 20] as const;

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};
// Self-mill only ("your deck" / "your graveyard") — a card that mills a *target player's* deck
// (e.g. Current Groover) may hit an opponent instead, so it isn't reliable fuel for your own
// graveyard and is left out. The amount is almost always spelled out as a word on real cards
// ("Put the top three cards..."), not a digit; a variable amount (**LV**/**X**) has no matching
// word and is silently excluded, same as Scavenge's variable-X cards above.
const SELF_MILL_RE = /put the top ([a-z]+|\*\*[a-z]+\*\*) cards? of your deck into your graveyard/i;
function parseMillAmount(card: Card): number | null {
  const match = card.effect?.match(SELF_MILL_RE);
  if (!match) return null;
  return WORD_NUMBERS[match[1].toLowerCase()] ?? null;
}

/** Every "Deluge N" card this deck runs, with an *expected* count of the required element in the
 * graveyard at a few "cards seen" checkpoints — not a static "how many exist in the deck" ceiling.
 * Two additive, disclosed-as-approximate sources feed it, both keyed off the same "expected copies
 * drawn by checkpoint" approximation aggressionForecast.ts's scaling-damage bonus already uses
 * (`copies * seen / deckSize`), not an exact joint distribution:
 *  1. Matching-element Action/Attack cards in Main — these resolve to the graveyard once played,
 *     so a drawn copy is assumed played. Ally/Item/etc. copies aren't counted: they enter play and
 *     don't reliably die, so counting them would overstate how much is actually in the graveyard.
 *  2. Any card (Main or Material) with a parsed fixed "put the top N cards of your deck into your
 *     graveyard" trigger — a Main copy contributes once it's (expected to be) drawn; a Material
 *     copy is in play from turn one, so its full trigger counts unconditionally. Each trigger mills
 *     N cards off the top of Main, of which `matchingMainCopies / mainDeckSize` are expected to
 *     match the required element.
 * Both sources draw from the same shuffled Main deck and are treated as independent for this
 * expected-value estimate, the same simplification `scalingBonus` documents for its own combo math.
 */
export function computeDelugeForecasts(mainLines: NamedLine[], materialLines: NamedLine[], cardsByName: Map<string, Card>): DelugeForecast[] {
  const mainDeckSize = Math.max(60, mainLines.reduce((sum, line) => sum + line.quantity, 0));
  const allLines = [...mainLines, ...materialLines];

  const millSources: { copies: number; amount: number; fromMain: boolean }[] = [];
  for (const line of mainLines) {
    const card = cardsByName.get(line.name);
    const amount = card ? parseMillAmount(card) : null;
    if (amount !== null) millSources.push({ copies: line.quantity, amount, fromMain: true });
  }
  for (const line of materialLines) {
    const card = cardsByName.get(line.name);
    const amount = card ? parseMillAmount(card) : null;
    if (amount !== null) millSources.push({ copies: line.quantity, amount, fromMain: false });
  }

  const results: DelugeForecast[] = [];
  const seen = new Set<string>();
  for (const line of allLines) {
    if (seen.has(line.name)) continue;
    const card = cardsByName.get(line.name);
    if (!card?.effect) continue;
    const amountMatch = card.effect.match(DELUGE_AMOUNT_RE);
    const elementMatch = card.effect.match(DELUGE_ELEMENT_RE);
    if (!amountMatch || !elementMatch) continue;
    const element = elementMatch[1].toUpperCase();
    if (!CARD_ELEMENTS.has(element)) continue;
    seen.add(line.name);
    const threshold = Number(amountMatch[1]);
    const copies = allLines.filter((l) => l.name === line.name).reduce((sum, l) => sum + l.quantity, 0);

    const naturalCopies = mainLines.reduce((sum, other) => {
      const otherCard = cardsByName.get(other.name);
      if (!otherCard || !otherCard.elements.includes(element)) return sum;
      return otherCard.types.includes("ACTION") || otherCard.types.includes("ATTACK") ? sum + other.quantity : sum;
    }, 0);
    const matchingMainCopies = mainLines.reduce((sum, other) => {
      const otherCard = cardsByName.get(other.name);
      return otherCard?.elements.includes(element) ? sum + other.quantity : sum;
    }, 0);
    const totalCopies = matchingMainCopies + materialLines.reduce((sum, other) => {
      const otherCard = cardsByName.get(other.name);
      return otherCard?.elements.includes(element) ? sum + other.quantity : sum;
    }, 0);
    const matchingDensity = matchingMainCopies / mainDeckSize;

    const points = CHECKPOINTS.map((cardsSeen) => {
      const fractionSeen = Math.min(cardsSeen, mainDeckSize) / mainDeckSize;
      const natural = naturalCopies * fractionSeen;
      const milled = millSources.reduce((sum, source) => {
        const triggers = source.fromMain ? source.copies * fractionSeen : source.copies;
        return sum + triggers * source.amount * matchingDensity;
      }, 0);
      return { seen: cardsSeen, expected: Math.min(totalCopies, natural + milled) };
    });
    results.push({ cardName: line.name, copies, threshold, element, totalCopies, points });
  }
  return results;
}
