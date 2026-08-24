import type { Card } from "@gatcg/shared";
import { benefitsFromEmpower, extractConsumedSubtypes, extractConsumedTokens, extractProducedTokens, extractsEmpowerGrant } from "../../lib/cardIntent";

export interface SynergyLine { name: string; quantity: number }
export interface ReadinessCheckpoint { key: "opening" | "early" | "mid" | "late"; label: string; seen: number; probability: number }
export interface SynergyReadiness {
  key: string; label: string; required: number; payoffCards: SynergyLine[]; payoffCopies: number;
  enablerCopies: number; deckSize: number; checkpoints: ReadinessCheckpoint[]; probabilityByTen: number;
  targetEnablers: number; status: "Reliable" | "Playable" | "Fragile" | "Unlikely";
  confidence: "Verified template" | "Parsed template"; note: string; competingPayoffCopies: number;
  recommendations: string[];
}
export interface DependencyReadiness {
  key: string; label: string; kind: "Token" | "Subtype" | "Empower"; producerCopies: number; consumerCopies: number;
  producers: SynergyLine[]; consumers: SynergyLine[]; status: "Supported" | "Thin" | "Missing support";
  confidence: "Validated pattern" | "Experimental pattern"; note: string; recommendations: string[];
}

const BASIC_ELEMENTS = new Set(["NORM", "FIRE", "WATER", "WIND"]);
const ADVANCED_IMBUE_RE = /\*\*Advanced Imbue (\d+)\*\*/i;
const NAMED_IMBUE_RE = /\*\*([A-Za-z]+(?:\s*&\s*[A-Za-z]+)?) Imbue (\d+)\*\*/i;
const PLAIN_IMBUE_RE = /\*\*Imbue (\d+)\*\*/i;
const CHECKPOINTS = [
  { key: "opening", label: "Opening", seen: 7 }, { key: "early", label: "Early", seen: 10 },
  { key: "mid", label: "Mid", seen: 15 }, { key: "late", label: "Late", seen: 20 },
] as const;

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}
export function probabilityAtLeast(deckSize: number, enablers: number, seen: number, required: number): number {
  if (deckSize <= 0 || required <= 0) return 0;
  const draws = Math.min(seen, deckSize);
  let probability = 0;
  for (let hits = required; hits <= Math.min(enablers, draws); hits++) {
    probability += (choose(enablers, hits) * choose(deckSize - enablers, draws - hits)) / choose(deckSize, draws);
  }
  return Math.min(1, probability);
}
function readinessStatus(p: number): SynergyReadiness["status"] {
  return p >= 0.8 ? "Reliable" : p >= 0.65 ? "Playable" : p >= 0.45 ? "Fragile" : "Unlikely";
}
function targetFor(deckSize: number, seen: number, required: number): number {
  for (let n = required; n <= deckSize; n++) if (probabilityAtLeast(deckSize, n, seen, required) >= 0.8) return n;
  return deckSize;
}

type Requirement = { label: string; required: number; elements: Set<string> | "advanced"; confidence: SynergyReadiness["confidence"]; note: string };
function parseImbue(card: Card): Requirement | null {
  const effect = card.effect ?? "";
  const advanced = effect.match(ADVANCED_IMBUE_RE);
  if (advanced) return { label: `Advanced Imbue ${advanced[1]}`, required: Number(advanced[1]), elements: "advanced", confidence: "Verified template", note: "Requires advanced-element cards to be revealed while paying reserve costs." };
  const named = effect.match(NAMED_IMBUE_RE);
  if (named && named[1].toLowerCase() !== "advanced") {
    const elements = new Set(named[1].split(/\s*&\s*/).map((value) => value.toUpperCase()));
    return { label: `${Array.from(elements).map((value) => value[0] + value.slice(1).toLowerCase()).join(" & ")} Imbue ${named[2]}`, required: Number(named[2]), elements, confidence: "Verified template", note: `Requires ${Array.from(elements).join(" or ")} cards to be revealed while paying reserve costs.` };
  }
  const plain = effect.match(PLAIN_IMBUE_RE);
  const elements = new Set(card.elements.filter((value) => value !== "NORM"));
  return plain && elements.size ? { label: `Imbue ${plain[1]} (${Array.from(elements).join("/")})`, required: Number(plain[1]), elements, confidence: "Parsed template", note: "Uses the payoff card's printed element as the eligible Imbue element." } : null;
}
function isEnabler(card: Card | undefined, requirement: Requirement): boolean {
  if (!card) return false;
  return requirement.elements === "advanced"
    ? card.elements.some((value) => !BASIC_ELEMENTS.has(value))
    : card.elements.some((value) => requirement.elements !== "advanced" && requirement.elements.has(value));
}
function legalCandidate(card: Card, identity: ReadonlySet<string>): boolean {
  if (card.types.includes("CHAMPION") || card.legality?.STANDARD?.limit === 0) return false;
  const colored = card.elements.filter((value) => value !== "NORM");
  return colored.length === 0 || colored.every((value) => identity.has(value));
}
function candidates(catalog: Iterable<Card>, lines: SynergyLine[], identity: ReadonlySet<string>, predicate: (card: Card) => boolean, preferred: readonly string[]): string[] {
  const placed = new Set(lines.map((line) => line.name));
  const rank = new Map(preferred.map((name, index) => [name, index]));
  return Array.from(catalog).filter((card) => !placed.has(card.name) && legalCandidate(card, identity) && predicate(card))
    .sort((a, b) => (rank.get(a.name) ?? 1e9) - (rank.get(b.name) ?? 1e9) || a.name.localeCompare(b.name))
    .slice(0, 3).map((card) => card.name);
}

export function computeSynergyReadiness(lines: SynergyLine[], cards: Map<string, Card>, catalog: Iterable<Card> = cards.values(), identity: ReadonlySet<string> = new Set(), preferred: readonly string[] = []): SynergyReadiness[] {
  const groups = new Map<string, { requirement: Requirement; payoffs: SynergyLine[] }>();
  for (const line of lines) {
    const card = cards.get(line.name);
    if (!card) continue;
    const requirement = parseImbue(card);
    if (!requirement) continue;
    const elementKey = requirement.elements === "advanced" ? "advanced" : Array.from(requirement.elements).sort().join("+");
    const key = `${elementKey}:${requirement.required}`;
    const group = groups.get(key) ?? { requirement, payoffs: [] };
    group.payoffs.push(line); groups.set(key, group);
  }
  const entries = Array.from(groups.entries());
  const deckSize = Math.max(60, lines.reduce((sum, line) => sum + line.quantity, 0));
  return entries.map(([key, group]) => {
    const enablerCopies = lines.reduce((sum, line) => sum + (isEnabler(cards.get(line.name), group.requirement) ? line.quantity : 0), 0);
    const checkpoints = CHECKPOINTS.map((point) => ({ ...point, probability: probabilityAtLeast(deckSize, enablerCopies, point.seen, group.requirement.required) }));
    const probabilityByTen = checkpoints[1].probability;
    const competingPayoffCopies = entries.reduce((sum, [otherKey, other]) => otherKey === key ? sum : sum + (lines.some((line) => isEnabler(cards.get(line.name), group.requirement) && isEnabler(cards.get(line.name), other.requirement)) ? other.payoffs.reduce((n, payoff) => n + payoff.quantity, 0) : 0), 0);
    return { key, label: group.requirement.label, required: group.requirement.required, payoffCards: group.payoffs,
      payoffCopies: group.payoffs.reduce((sum, payoff) => sum + payoff.quantity, 0), enablerCopies, deckSize, checkpoints,
      probabilityByTen, targetEnablers: targetFor(deckSize, 10, group.requirement.required), status: readinessStatus(probabilityByTen),
      confidence: group.requirement.confidence, note: group.requirement.note, competingPayoffCopies,
      recommendations: probabilityByTen < 0.8 ? candidates(catalog, lines, identity, (card) => isEnabler(card, group.requirement), preferred) : [] };
  }).sort((a, b) => a.probabilityByTen - b.probabilityByTen);
}

type Group = Omit<DependencyReadiness, "producerCopies" | "consumerCopies" | "status" | "recommendations">;
export function computeDependencyReadiness(lines: SynergyLine[], cards: Map<string, Card>, catalog: Iterable<Card> = cards.values(), identity: ReadonlySet<string> = new Set(), preferred: readonly string[] = []): DependencyReadiness[] {
  const allCards = Array.from(catalog);
  const knownSubtypes = new Set(allCards.flatMap((card) => card.subtypes.map((value) => value.toLowerCase())));
  const groups = new Map<string, Group>();
  const ensure = (key: string, make: () => Group) => { const group = groups.get(key) ?? make(); groups.set(key, group); return group; };
  for (const line of lines) {
    const card = cards.get(line.name); if (!card) continue;
    for (const token of extractConsumedTokens(card)) ensure(`token:${token}`, () => ({ key: `token:${token}`, label: `${token} token economy`, kind: "Token", producers: [], consumers: [], confidence: "Validated pattern", note: "Compares copies that summon this token with copies that sacrifice it." })).consumers.push(line);
    for (const token of extractProducedTokens(card)) ensure(`token:${token}`, () => ({ key: `token:${token}`, label: `${token} token economy`, kind: "Token", producers: [], consumers: [], confidence: "Validated pattern", note: "Compares copies that summon this token with copies that sacrifice it." })).producers.push(line);
    for (const [subtype, tier] of extractConsumedSubtypes(card, knownSubtypes)) ensure(`subtype:${subtype}`, () => ({ key: `subtype:${subtype}`, label: `${subtype} support`, kind: "Subtype", producers: [], consumers: [], confidence: tier === "validated" ? "Validated pattern" : "Experimental pattern", note: "Compares cards carrying this subtype with effects that explicitly require it." })).consumers.push(line);
    if (extractsEmpowerGrant(card)) ensure("empower", () => ({ key: "empower", label: "Empower package", kind: "Empower", producers: [], consumers: [], confidence: "Validated pattern", note: "Compares Empower grants with Spells whose damage scales with champion level." })).producers.push(line);
    if (benefitsFromEmpower(card)) ensure("empower", () => ({ key: "empower", label: "Empower package", kind: "Empower", producers: [], consumers: [], confidence: "Validated pattern", note: "Compares Empower grants with Spells whose damage scales with champion level." })).consumers.push(line);
  }
  for (const group of groups.values()) if (group.kind === "Subtype") {
    const subtype = group.key.slice(8);
    for (const line of lines) if (cards.get(line.name)?.subtypes.some((value) => value.toLowerCase() === subtype)) group.producers.push(line);
  }
  const consumedTokenNames = new Set(Array.from(groups.keys()).filter((key) => key.startsWith("token:")).map((key) => key.slice(6)));
  return Array.from(groups.values()).filter((group) =>
    group.consumers.length > 0 && !(group.kind === "Subtype" && consumedTokenNames.has(group.key.slice(8))),
  ).map((group) => {
    const producerCopies = group.producers.reduce((sum, line) => sum + line.quantity, 0);
    const consumerCopies = group.consumers.reduce((sum, line) => sum + line.quantity, 0);
    const predicate = (card: Card) => group.kind === "Token" ? extractProducedTokens(card).has(group.key.slice(6)) : group.kind === "Subtype" ? card.subtypes.some((value) => value.toLowerCase() === group.key.slice(8)) : extractsEmpowerGrant(card);
    return { ...group, producerCopies, consumerCopies, status: producerCopies === 0 ? "Missing support" as const : producerCopies < consumerCopies ? "Thin" as const : "Supported" as const,
      recommendations: producerCopies < consumerCopies ? candidates(catalog, lines, identity, predicate, preferred) : [] };
  }).sort((a, b) => ({ "Missing support": 0, Thin: 1, Supported: 2 })[a.status] - ({ "Missing support": 0, Thin: 1, Supported: 2 })[b.status] || a.label.localeCompare(b.label));
}
