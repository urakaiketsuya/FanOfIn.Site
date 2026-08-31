import {
  canonicalizeSavedDecklist,
  savedDeckIdentityInput,
  type DeckFormat,
  type DeckImportCandidate,
  type DeckImportPreview,
  type OmnidexDecklist,
  type OmnidexDecklistEntry,
  type SavedDeck,
  type ShoutAtYourDecksDeck,
  type ShoutAtYourDecksDeckSummary,
} from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";

interface SaveInput {
  decklist: OmnidexDecklist;
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

async function identityHash(decklist: OmnidexDecklist): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(savedDeckIdentityInput(decklist)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validDecklist(value: unknown): value is OmnidexDecklist {
  if (!value || typeof value !== "object") return false;
  const deck = value as Record<string, unknown>;
  return ["main", "material", "sideboard"].every((section) => Array.isArray(deck[section]) && (deck[section] as unknown[]).every((line) => {
    if (!line || typeof line !== "object") return false;
    const item = line as Record<string, unknown>;
    return typeof item.card === "string" && item.card.length <= 200 && Number.isInteger(item.quantity) && Number(item.quantity) > 0 && Number(item.quantity) <= 100;
  }));
}

export function parseSaveInput(value: unknown): SaveInput {
  if (!value || typeof value !== "object") throw new Error("Invalid saved deck");
  const input = value as Partial<SaveInput>;
  if (!validDecklist(input.decklist) || typeof input.title !== "string" || !input.title.trim() || input.title.length > 160) throw new Error("Invalid saved deck");
  if (!input.source || !["manual", "omnidex", "shoutatyourdecks"].includes(input.source.provider ?? "") || typeof input.source.externalDeckId !== "string" || typeof input.source.label !== "string") throw new Error("Invalid deck source");
  return input as SaveInput;
}

export async function saveDeck(env: Env, user: AuthUser, input: SaveInput): Promise<{ id: string; created: boolean }> {
  const canonical = canonicalizeSavedDecklist(input.decklist);
  if (canonical.main.length + canonical.material.length === 0) throw new Error("A deck needs main or material cards");
  const hash = await identityHash(canonical);
  const now = new Date().toISOString();
  const existing = await env.ACCOUNT_DB.prepare("SELECT id FROM saved_decks WHERE user_id = ? AND identity_hash = ?").bind(user.id, hash).first<{ id: string }>();
  const deckId = existing?.id ?? crypto.randomUUID();
  await env.ACCOUNT_DB.prepare(`INSERT INTO saved_decks (id, user_id, identity_hash, title, format, champion_name, decklist_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, identity_hash) DO UPDATE SET updated_at = excluded.updated_at`)
    .bind(deckId, user.id, hash, input.title.trim(), input.format ?? "UNKNOWN", input.championName ?? null, JSON.stringify({ ...canonical, sideboard: [] }), now, now).run();
  await env.ACCOUNT_DB.prepare(`INSERT INTO saved_deck_sources (id, saved_deck_id, provider, external_deck_id, source_url, label, metadata_json, sideboard_json, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(saved_deck_id, provider, external_deck_id) DO UPDATE SET source_url = excluded.source_url,
      label = excluded.label, metadata_json = excluded.metadata_json, sideboard_json = excluded.sideboard_json, imported_at = excluded.imported_at`)
    .bind(crypto.randomUUID(), deckId, input.source.provider, input.source.externalDeckId, input.source.sourceUrl ?? null,
      input.source.label.slice(0, 240), JSON.stringify(input.source.metadata ?? {}), JSON.stringify(canonical.sideboard), now).run();
  return { id: deckId, created: !existing };
}

export async function listDecks(env: Env, user: AuthUser): Promise<SavedDeck[]> {
  const decks = await env.ACCOUNT_DB.prepare("SELECT * FROM saved_decks WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all<Record<string, string | null>>();
  const output: SavedDeck[] = [];
  for (const row of decks.results) {
    const sources = await env.ACCOUNT_DB.prepare("SELECT * FROM saved_deck_sources WHERE saved_deck_id = ? ORDER BY imported_at DESC").bind(row.id).all<Record<string, string | null>>();
    const base = JSON.parse(row.decklist_json!) as OmnidexDecklist;
    const newestSideboard = sources.results[0]?.sideboard_json ? JSON.parse(sources.results[0].sideboard_json) : [];
    output.push({
      id: row.id!, identityHash: row.identity_hash!, title: row.title!, format: row.format as DeckFormat,
      championName: row.champion_name, decklist: { ...base, sideboard: newestSideboard }, createdAt: row.created_at!, updatedAt: row.updated_at!,
      sources: sources.results.map((source) => ({ id: source.id!, provider: source.provider as "manual" | "omnidex" | "shoutatyourdecks",
        externalDeckId: source.external_deck_id!, sourceUrl: source.source_url, label: source.label!, metadata: JSON.parse(source.metadata_json!),
        sideboard: JSON.parse(source.sideboard_json!), importedAt: source.imported_at! })),
    });
  }
  return output;
}

async function assetJson<T>(env: Env, path: string): Promise<T> {
  const response = await fetch(new URL(path, env.ASSET_BASE_URL));
  if (!response.ok) throw new Error(`Published data is unavailable (${response.status})`);
  return response.json<T>();
}

interface ImportEntry { deckId: string; eventId: number; eventDate: string; player: number; championName: string | null; placement: number | null; }
interface ImportEvent { id: number; name: string; format: string; url: string; }

export async function previewImport(env: Env, provider: string, rawIdentifier: string): Promise<DeckImportPreview> {
  const identifier = rawIdentifier.trim();
  if (!identifier) throw new Error("Enter an import identifier");
  if (provider === "omnidex") {
    if (!/^\d+$/.test(identifier)) throw new Error("Omnidex player ID must be numeric");
    const playerId = Number(identifier);
    const [players, popularity, events] = await Promise.all([
      assetJson<{ players: { id: number; username: string }[] }>(env, "/data/omnidex/players.json"),
      assetJson<{ entries: ImportEntry[] }>(env, "/data/analysis/deck-popularity-index.json"),
      assetJson<{ events: ImportEvent[] }>(env, "/data/omnidex/index.json"),
    ]);
    const player = players.players.find((item) => item.id === playerId);
    if (!player) throw new Error("Omnidex player was not found in the published archive");
    const eventsById = new Map(events.events.map((event) => [event.id, event]));
    const candidates: DeckImportCandidate[] = popularity.entries.filter((item) => item.player === playerId).map((item) => {
      const event = eventsById.get(item.eventId);
      return { provider: "omnidex", externalDeckId: item.deckId, title: `${item.championName ?? "Tournament deck"} — ${event?.name ?? `Event ${item.eventId}`}`,
        championName: item.championName, format: event?.format.toUpperCase().includes("PANTHEON") ? "PANTHEON" : "STANDARD",
        label: `${event?.name ?? `Event ${item.eventId}`} · ${item.eventDate}`, sourceUrl: event?.url ?? `/events/${item.eventId}`, available: true };
    });
    return { provider: "omnidex", identifier, displayName: player.username, candidates };
  }
  if (provider === "shoutatyourdecks") {
    const index = await assetJson<{ decks: ShoutAtYourDecksDeckSummary[] }>(env, "/data/shoutatyourdecks/index.json");
    const normalized = identifier.toLocaleLowerCase("en-US");
    const matches = index.decks.filter((deck) => deck.author.trim().toLocaleLowerCase("en-US") === normalized);
    return { provider: "shoutatyourdecks", identifier, displayName: matches[0]?.author ?? identifier, candidates: matches.map((deck) => ({
      provider: "shoutatyourdecks", externalDeckId: deck.id, title: deck.title, championName: deck.champion,
      format: deck.format ?? "UNKNOWN", label: deck.title, sourceUrl: deck.url, available: true,
    })) };
  }
  throw new Error("Unknown import provider");
}

export async function performImport(env: Env, user: AuthUser, provider: string, identifier: string): Promise<{ created: number; linked: number }> {
  const preview = await previewImport(env, provider, identifier);
  let created = 0;
  let linked = 0;
  if (provider === "omnidex") {
    const popularity = await assetJson<{ entries: ImportEntry[] }>(env, "/data/analysis/deck-popularity-index.json");
    for (const candidate of preview.candidates) {
      const sighting = popularity.entries.find((item) => item.deckId === candidate.externalDeckId);
      if (!sighting) continue;
      const bundle = await assetJson<{ decklists: OmnidexDecklistEntry[] | { error: string } }>(env, `/data/omnidex/events/${sighting.eventId}.json`);
      if (!Array.isArray(bundle.decklists)) continue;
      const entry = bundle.decklists.find((item) => item.player === sighting.player);
      if (!entry) continue;
      const result = await saveDeck(env, user, { decklist: entry.decklist, title: candidate.title, format: candidate.format,
        championName: candidate.championName, source: { provider: "omnidex", externalDeckId: candidate.externalDeckId,
          sourceUrl: candidate.sourceUrl, label: candidate.label, metadata: { eventId: sighting.eventId, eventDate: sighting.eventDate, placement: sighting.placement } } });
      result.created ? created++ : linked++;
    }
  } else {
    for (const candidate of preview.candidates) {
      try {
        const deck = await assetJson<ShoutAtYourDecksDeck>(env, `/data/shoutatyourdecks/decks/${candidate.externalDeckId}.json`);
        const decklist: OmnidexDecklist = { main: deck.mainDeck.map((line) => ({ card: line.name, quantity: line.quantity })),
          material: [...(deck.pantheonDeck ?? []), ...deck.materialDeck].map((line) => ({ card: line.name, quantity: line.quantity })),
          sideboard: deck.sideDeck.map((line) => ({ card: line.name, quantity: line.quantity })) };
        const result = await saveDeck(env, user, { decklist, title: deck.title, format: deck.format ?? "UNKNOWN", championName: deck.champion,
          source: { provider: "shoutatyourdecks", externalDeckId: deck.id, sourceUrl: deck.url, label: deck.title, metadata: { author: deck.author } } });
        result.created ? created++ : linked++;
      } catch { /* Archive summaries can exist before their browser-fetched full list. */ }
    }
  }
  const now = new Date().toISOString();
  const normalized = identifier.trim().toLocaleLowerCase("en-US");
  await env.ACCOUNT_DB.prepare(`INSERT INTO external_profiles (id, user_id, provider, external_identifier, normalized_identifier, display_name, last_imported_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider, normalized_identifier) DO UPDATE SET display_name = excluded.display_name, last_imported_at = excluded.last_imported_at`)
    .bind(crypto.randomUUID(), user.id, provider, identifier.trim(), normalized, preview.displayName, now, now).run();
  return { created, linked };
}
