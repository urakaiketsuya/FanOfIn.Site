import type { DeckImportCandidate, DeckImportPreview, DeckImportResult, OmnidexDecklist, OmnidexDecklistEntry, ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { assetJson } from "./assets";
import { saveDeck } from "./decks";
import { ApiError, badRequest } from "./errors";

const MAX_IMPORT_DECKS = 50;
const MAX_IDENTIFIER_LENGTH = 240;
const SAFE_ARCHIVE_ID = /^[A-Za-z0-9:_-]{1,240}$/;

interface ImportEntry { deckId: string; eventId: number; eventDate: string; player: number; championName: string | null; placement: number | null; }
interface ImportEvent { id: number; name: string; format: string; url: string; }

export async function previewImport(env: Env, provider: string, rawIdentifier: string): Promise<DeckImportPreview> {
  const identifier = rawIdentifier.trim();
  if (!identifier) throw badRequest("Enter an import identifier");
  if (identifier.length > MAX_IDENTIFIER_LENGTH) throw badRequest("Import identifier is too long");
  if (provider === "omnidex") {
    if (!/^\d+$/.test(identifier)) throw badRequest("Omnidex player ID must be numeric");
    const playerId = Number(identifier);
    const [players, popularity, events] = await Promise.all([
      assetJson<{ players: { id: number; username: string }[] }>(env, "/data/omnidex/players.json"),
      assetJson<{ entries: ImportEntry[] }>(env, "/data/analysis/deck-popularity-index.json"),
      assetJson<{ events: ImportEvent[] }>(env, "/data/omnidex/index.json"),
    ]);
    const player = players.players.find((item) => item.id === playerId);
    if (!player) throw badRequest("Omnidex player was not found in the published archive", "import_profile_not_found");
    const eventsById = new Map(events.events.map((event) => [event.id, event]));
    const candidates: DeckImportCandidate[] = popularity.entries.filter((item) => item.player === playerId).map((item): DeckImportCandidate => {
      const event = eventsById.get(item.eventId);
      return { provider: "omnidex", externalDeckId: item.deckId, title: `${item.championName ?? "Tournament deck"} — ${event?.name ?? `Event ${item.eventId}`}`,
        championName: item.championName, format: event?.format.toUpperCase().includes("PANTHEON") ? "PANTHEON" : "STANDARD",
        label: `${event?.name ?? `Event ${item.eventId}`} · ${item.eventDate}`, sourceUrl: event?.url ?? `/events/${item.eventId}`, available: true,
        eventName: event?.name ?? `Event ${item.eventId}`, eventDate: item.eventDate, placement: item.placement };
    }).sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));
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
  throw badRequest("Unknown import provider");
}

export function selectImportCandidates(preview: DeckImportPreview, externalDeckIds: unknown): DeckImportCandidate[] {
  if (!Array.isArray(externalDeckIds) || externalDeckIds.length === 0 || externalDeckIds.some((id) => typeof id !== "string")) throw badRequest("Select at least one deck to import");
  const selectedIds = [...new Set(externalDeckIds as string[])];
  if (selectedIds.length > MAX_IMPORT_DECKS) throw badRequest(`Import is limited to ${MAX_IMPORT_DECKS} decks at a time`, "import_limit_reached");
  const candidatesById = new Map(preview.candidates.map((candidate) => [candidate.externalDeckId, candidate]));
  const candidates = selectedIds.map((id) => candidatesById.get(id)).filter((candidate): candidate is DeckImportCandidate => Boolean(candidate));
  if (candidates.length !== selectedIds.length) throw badRequest("One or more selected decks are not part of this profile", "invalid_import_selection");
  return candidates;
}

export async function performImport(env: Env, user: AuthUser, provider: string, identifier: string, externalDeckIds: unknown): Promise<DeckImportResult> {
  const preview = await previewImport(env, provider, identifier);
  const candidates = selectImportCandidates(preview, externalDeckIds);
  let created = 0;
  let linked = 0;
  let skipped = 0;
  const failures: DeckImportResult["failures"] = [];
  if (provider === "omnidex") {
    const popularity = await assetJson<{ entries: ImportEntry[] }>(env, "/data/analysis/deck-popularity-index.json");
    const sightingsById = new Map(popularity.entries.map((item) => [item.deckId, item]));
    const bundles = new Map<number, { decklists: OmnidexDecklistEntry[] | { error: string } }>();
    for (const candidate of candidates) {
      if (!SAFE_ARCHIVE_ID.test(candidate.externalDeckId)) { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: "Invalid archive identifier" }); continue; }
      const sighting = sightingsById.get(candidate.externalDeckId);
      if (!sighting) { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: "Archive entry is unavailable" }); continue; }
      let bundle = bundles.get(sighting.eventId);
      if (!bundle) {
        try { bundle = await assetJson<{ decklists: OmnidexDecklistEntry[] | { error: string } }>(env, `/data/omnidex/events/${sighting.eventId}.json`); bundles.set(sighting.eventId, bundle); }
        catch { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: "Event archive is unavailable" }); continue; }
      }
      if (!Array.isArray(bundle.decklists)) { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: "Decklist was not published for this event" }); continue; }
      const entry = bundle.decklists.find((item) => item.player === sighting.player);
      if (!entry) { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: "Decklist is missing from the event archive" }); continue; }
      try {
        const result = await saveDeck(env, user, { decklist: entry.decklist, title: candidate.title, format: candidate.format,
          championName: candidate.championName, source: { provider: "omnidex", externalDeckId: candidate.externalDeckId,
            sourceUrl: candidate.sourceUrl, label: candidate.label, metadata: { eventId: sighting.eventId, eventDate: sighting.eventDate, placement: sighting.placement } } });
        result.created ? created++ : linked++;
      } catch (error) { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: error instanceof ApiError ? error.publicMessage : "Import failed" }); }
    }
  } else {
    for (const candidate of candidates) {
      if (!SAFE_ARCHIVE_ID.test(candidate.externalDeckId)) { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: "Invalid archive identifier" }); continue; }
      try {
        const deck = await assetJson<ShoutAtYourDecksDeck>(env, `/data/shoutatyourdecks/decks/${candidate.externalDeckId}.json`);
        const decklist: OmnidexDecklist = { main: deck.mainDeck.map((line) => ({ card: line.name, quantity: line.quantity })),
          material: [...(deck.pantheonDeck ?? []), ...deck.materialDeck].map((line) => ({ card: line.name, quantity: line.quantity })),
          sideboard: deck.sideDeck.map((line) => ({ card: line.name, quantity: line.quantity })) };
        const result = await saveDeck(env, user, { decklist, title: deck.title, format: deck.format ?? "UNKNOWN", championName: deck.champion,
          source: { provider: "shoutatyourdecks", externalDeckId: deck.id, sourceUrl: deck.url, label: deck.title, metadata: { author: deck.author } } });
        result.created ? created++ : linked++;
      } catch (error) { skipped++; failures.push({ externalDeckId: candidate.externalDeckId, title: candidate.title, reason: error instanceof ApiError ? error.publicMessage : "Archived decklist is unavailable" }); }
    }
  }
  const now = new Date().toISOString();
  const normalized = identifier.trim().toLocaleLowerCase("en-US");
  await env.ACCOUNT_DB.prepare(`INSERT INTO external_profiles (id, user_id, provider, external_identifier, normalized_identifier, display_name, last_imported_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider, normalized_identifier) DO UPDATE SET display_name = excluded.display_name, last_imported_at = excluded.last_imported_at`)
    .bind(crypto.randomUUID(), user.id, provider, identifier.trim(), normalized, preview.displayName, now, now).run();
  return { requested: candidates.length, created, linked, skipped, failures };
}
