import type { OmnidexDecklist, OmnidexDecklistCardLine, TournamentDeckFavorite } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { ApiError, badRequest } from "./errors";

const MAX_FAVORITES = 500;
const MAX_LINES = 250;

function text(value: unknown, label: string, max: number, required = false): string | null {
  if (value == null && !required) return null;
  if (typeof value !== "string" || (required && !value.trim()) || value.length > max) throw badRequest(`Invalid ${label}`);
  return value.trim();
}

function optionalId(value: unknown, label: string): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || Number(value) < 0) throw badRequest(`Invalid ${label}`);
  return Number(value);
}

function lines(value: unknown): OmnidexDecklistCardLine[] {
  if (!Array.isArray(value) || value.length > MAX_LINES) throw badRequest("Invalid tournament decklist");
  return value.map((line) => {
    if (!line || typeof line !== "object") throw badRequest("Invalid tournament decklist");
    const card = text((line as { card?: unknown }).card, "card name", 200, true);
    const quantity = (line as { quantity?: unknown }).quantity;
    if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 100) throw badRequest("Invalid card quantity");
    return { card: card!, quantity: Number(quantity) };
  });
}

export interface TournamentFavoriteInput {
  title: string;
  championName: string | null;
  decklist: OmnidexDecklist;
  sourceEventId: number | null;
  sourceEventName: string | null;
  sourcePlayerId: number | null;
  sourcePlayerName: string | null;
}

export function parseTournamentFavoriteInput(value: unknown): TournamentFavoriteInput {
  if (!value || typeof value !== "object") throw badRequest("Invalid tournament favorite");
  const input = value as Record<string, unknown>;
  const rawDecklist = input.decklist as Record<string, unknown> | null;
  if (!rawDecklist || typeof rawDecklist !== "object") throw badRequest("Invalid tournament decklist");
  const decklist = { main: lines(rawDecklist.main), material: lines(rawDecklist.material), sideboard: lines(rawDecklist.sideboard) };
  if (decklist.main.length + decklist.material.length === 0) throw badRequest("Tournament decklist is empty");
  return {
    title: text(input.title, "title", 120, true)!,
    championName: text(input.championName, "Champion name", 160),
    decklist,
    sourceEventId: optionalId(input.sourceEventId, "source event"),
    sourceEventName: text(input.sourceEventName, "source event name", 200),
    sourcePlayerId: optionalId(input.sourcePlayerId, "source player"),
    sourcePlayerName: text(input.sourcePlayerName, "source player name", 160),
  };
}

function validHash(deckHash: string): void {
  if (!/^[a-z0-9]{1,7}$/.test(deckHash)) throw badRequest("Invalid tournament deck hash");
}

export async function tournamentFavoriteState(env: Env, user: AuthUser, deckHash: string): Promise<{ favorited: boolean }> {
  validHash(deckHash);
  const row = await env.ACCOUNT_DB.prepare("SELECT 1 AS found FROM tournament_deck_favorites WHERE user_id = ? AND deck_hash = ?").bind(user.id, deckHash).first();
  return { favorited: Boolean(row) };
}

export async function setTournamentFavorite(env: Env, user: AuthUser, deckHash: string, favorited: boolean, input?: TournamentFavoriteInput): Promise<{ favorited: boolean }> {
  validHash(deckHash);
  if (!favorited) {
    await env.ACCOUNT_DB.prepare("DELETE FROM tournament_deck_favorites WHERE user_id = ? AND deck_hash = ?").bind(user.id, deckHash).run();
    return { favorited: false };
  }
  if (!input) throw badRequest("Tournament deck snapshot is required");
  const existing = await env.ACCOUNT_DB.prepare("SELECT 1 AS found FROM tournament_deck_favorites WHERE user_id = ? AND deck_hash = ?").bind(user.id, deckHash).first();
  if (!existing) {
    const count = await env.ACCOUNT_DB.prepare("SELECT COUNT(*) AS count FROM tournament_deck_favorites WHERE user_id = ?").bind(user.id).first<{ count: number }>();
    if ((count?.count ?? 0) >= MAX_FAVORITES) throw new ApiError(`Tournament favorite limit of ${MAX_FAVORITES} reached`, 400, "favorite_limit_reached");
  }
  await env.ACCOUNT_DB.prepare(`INSERT INTO tournament_deck_favorites
    (user_id, deck_hash, title, champion_name, decklist_json, source_event_id, source_event_name, source_player_id, source_player_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, deck_hash) DO UPDATE SET title = excluded.title, champion_name = excluded.champion_name,
      decklist_json = excluded.decklist_json, source_event_id = excluded.source_event_id, source_event_name = excluded.source_event_name,
      source_player_id = excluded.source_player_id, source_player_name = excluded.source_player_name`)
    .bind(user.id, deckHash, input.title, input.championName, JSON.stringify(input.decklist), input.sourceEventId, input.sourceEventName, input.sourcePlayerId, input.sourcePlayerName, new Date().toISOString()).run();
  return { favorited: true };
}

export async function listTournamentFavorites(env: Env, user: AuthUser): Promise<TournamentDeckFavorite[]> {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT deck_hash, title, champion_name, decklist_json, source_event_id, source_event_name,
    source_player_id, source_player_name, created_at FROM tournament_deck_favorites WHERE user_id = ? ORDER BY created_at DESC`)
    .bind(user.id).all<Record<string, string | number | null>>();
  return rows.results.map((row) => ({
    deckHash: String(row.deck_hash), title: String(row.title), championName: row.champion_name as string | null,
    decklist: JSON.parse(String(row.decklist_json)) as OmnidexDecklist, sourceEventId: row.source_event_id == null ? null : Number(row.source_event_id),
    sourceEventName: row.source_event_name as string | null, sourcePlayerId: row.source_player_id == null ? null : Number(row.source_player_id),
    sourcePlayerName: row.source_player_name as string | null, favoritedAt: String(row.created_at),
  }));
}
