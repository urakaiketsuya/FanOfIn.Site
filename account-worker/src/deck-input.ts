import { validPrintingAllocations, extractDeckPrintings, withDeckPrintings, canonicalizeSavedDecklist, savedDeckIdentityInput, type DeckFormat, type OmnidexDecklist, type OmnidexDecklistCardLine } from "@gatcg/shared";
import { validUserFacingName } from "./content-policy";
import { badRequest } from "./errors";

export interface SaveInput {
  decklist: OmnidexDecklist;
  maybeboard?: OmnidexDecklistCardLine[];
  title: string;
  format?: DeckFormat;
  championName?: string | null;
  source: {
    provider: "manual" | "omnidex" | "shoutatyourdecks";
    externalDeckId: string;
    sourceUrl?: string | null;
    label: string;
    metadata?: Record<string, unknown>;
  };
}

const MAX_LINES_PER_DECK = 250;
const MAX_IDENTIFIER_LENGTH = 240;
const MAX_SOURCE_URL_LENGTH = 1_000;
const MAX_METADATA_BYTES = 16_384;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;

export function normalizeDeckTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_TAGS) throw badRequest(`Decks can have up to ${MAX_TAGS} tags`);
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") throw badRequest("Invalid deck tag");
    const tag = raw.trim().replace(/\s+/g, " ");
    if (tag.length < 2 || tag.length > MAX_TAG_LENGTH || /[\p{Cc}\p{Cf}]/u.test(tag)) throw badRequest(`Tags must be 2–${MAX_TAG_LENGTH} characters`);
    if (!validUserFacingName(tag)) throw badRequest("Deck tag contains blocked language", "blocked_language");
    const key = tag.toLocaleLowerCase("en-US");
    if (!seen.has(key)) { seen.add(key); tags.push(tag); }
  }
  return tags;
}

export async function identityHash(decklist: OmnidexDecklist): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(savedDeckIdentityInput(decklist)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function fullIdentityHash(decklist: OmnidexDecklist, format: DeckFormat, championName: string | null): Promise<string> {
  const canonical = canonicalizeSavedDecklist(decklist);
  return sha256(JSON.stringify({
    format,
    championName: championName?.trim().toLocaleLowerCase("en-US") ?? null,
    decklist: canonical,
  }));
}

export function validDecklist(value: unknown): value is OmnidexDecklist {
  if (!value || typeof value !== "object") return false;
  const deck = value as Record<string, unknown>;
  const sections = ["main", "material", "sideboard"];
  if (!sections.every((section) => Array.isArray(deck[section]))) return false;
  if (sections.reduce((total, section) => total + (deck[section] as unknown[]).length, 0) > MAX_LINES_PER_DECK) return false;
  return sections.every((section) => (deck[section] as unknown[]).every((line) => {
    if (!line || typeof line !== "object") return false;
    const item = line as Record<string, unknown>;
    return typeof item.card === "string" && item.card.length <= 200 && Number.isInteger(item.quantity) && Number(item.quantity) > 0 && Number(item.quantity) <= 100 && (item.printings === undefined || validPrintingAllocations(item.printings, Number(item.quantity)));
  }));
}

export function validMaybeboard(value: unknown): value is OmnidexDecklistCardLine[] {
  if (!Array.isArray(value) || value.length > MAX_LINES_PER_DECK) return false;
  return value.every((line) => {
    if (!line || typeof line !== "object") return false;
    const item = line as Record<string, unknown>;
    return typeof item.card === "string" && item.card.length <= 200 && Number.isInteger(item.quantity) && Number(item.quantity) > 0 && Number(item.quantity) <= 100 && (item.printings === undefined || validPrintingAllocations(item.printings, Number(item.quantity)));
  });
}

export function canonicalMaybeboard(lines: OmnidexDecklistCardLine[] | undefined): OmnidexDecklistCardLine[] {
  const deck = { main: lines ?? [], material: [], sideboard: [] };
  return withDeckPrintings(canonicalizeSavedDecklist(deck), extractDeckPrintings(deck)).main;
}

export function parseSaveInput(value: unknown): SaveInput {
  if (!value || typeof value !== "object") throw badRequest("Invalid saved deck");
  const input = value as Partial<SaveInput>;
  if (!validDecklist(input.decklist) || typeof input.title !== "string" || !input.title.trim() || input.title.length > 160) throw badRequest("Invalid saved deck");
  if (!validUserFacingName(input.title)) throw badRequest("Deck name contains blocked language", "blocked_language");
  if (!input.source || input.source.provider !== "manual" || typeof input.source.externalDeckId !== "string" || !input.source.externalDeckId || input.source.externalDeckId.length > MAX_IDENTIFIER_LENGTH || typeof input.source.label !== "string" || !input.source.label || input.source.label.length > 240) throw badRequest("Invalid deck source");
  if (input.championName != null && (typeof input.championName !== "string" || input.championName.length > 200)) throw badRequest("Invalid champion name");
  if (input.maybeboard !== undefined && !validMaybeboard(input.maybeboard)) throw badRequest("Invalid maybeboard");
  if (input.source.sourceUrl != null && (typeof input.source.sourceUrl !== "string" || input.source.sourceUrl.length > MAX_SOURCE_URL_LENGTH)) throw badRequest("Invalid source URL");
  if (JSON.stringify(input.source.metadata ?? {}).length > MAX_METADATA_BYTES) throw badRequest("Deck source metadata is too large");
  return input as SaveInput;
}


export function parseDeckContent(value: unknown, invalidMessage: string): { decklist: OmnidexDecklist; format: DeckFormat; championName?: string | null; changeNote?: unknown } {
  if (!value || typeof value !== "object") throw badRequest(invalidMessage);
  const input = value as { decklist?: unknown; format?: unknown; championName?: unknown; changeNote?: unknown };
  if (!validDecklist(input.decklist)) throw badRequest("Invalid decklist");
  if (input.format !== "STANDARD" && input.format !== "PANTHEON" && input.format !== "UNKNOWN") throw badRequest("Invalid deck format");
  if (input.championName != null && (typeof input.championName !== "string" || input.championName.length > 200)) throw badRequest("Invalid champion name");
  return input as { decklist: OmnidexDecklist; format: DeckFormat; championName?: string | null; changeNote?: unknown };
}

export async function prepareDeckBuild(input: { decklist: OmnidexDecklist; format: DeckFormat; championName?: string | null }) {
  const canonical = canonicalizeSavedDecklist(input.decklist);
  if (canonical.main.length + canonical.material.length === 0) throw badRequest("A deck needs main or material cards");
  const coreHash = await identityHash(canonical);
  const championName = input.championName ?? null;
  const fullHash = await fullIdentityHash(canonical, input.format, championName);
  return { canonical, coreHash, fullHash, championName };
}
