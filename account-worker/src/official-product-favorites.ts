import type { DeckFormat, OfficialProductDeckFavorite, OmnidexDecklist } from "@gatcg/shared";
import type { AuthUser, Env } from "./auth";
import { badRequest } from "./errors";
import { parseTournamentFavoriteInput } from "./tournament-favorites";

const prefix = "official-product:";
const productId = (value: string) => {
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(value)) throw badRequest("Invalid official product deck");
  return value;
};

export function parseOfficialProductFavorite(value: unknown) {
  if (!value || typeof value !== "object") throw badRequest("Invalid official product deck");
  const input = value as Record<string, unknown>;
  const parsed = parseTournamentFavoriteInput({ ...input, sourceEventId: null, sourceEventName: null, sourcePlayerId: null, sourcePlayerName: null });
  const format = input.format;
  if (format !== "STANDARD" && format !== "PANTHEON" && format !== "UNKNOWN") throw badRequest("Invalid deck format");
  return { ...parsed, format: format as DeckFormat };
}

export async function listOfficialProductFavorites(env: Env, user: AuthUser): Promise<OfficialProductDeckFavorite[]> {
  const rows = await env.ACCOUNT_DB.prepare("SELECT product_deck_id,title,champion_name,format,decklist_json,created_at FROM official_product_deck_favorites WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all<Record<string, string | null>>();
  return rows.results.map((row) => ({ productDeckId: String(row.product_deck_id), locationId: `${prefix}${row.product_deck_id}`, title: String(row.title), championName: row.champion_name, format: row.format as DeckFormat, decklist: JSON.parse(String(row.decklist_json)) as OmnidexDecklist, favoritedAt: String(row.created_at) }));
}

export async function setOfficialProductFavorite(env: Env, user: AuthUser, rawProductId: string, favorited: boolean, input?: ReturnType<typeof parseOfficialProductFavorite>) {
  const id = productId(rawProductId);
  if (!favorited) { await env.ACCOUNT_DB.prepare("DELETE FROM official_product_deck_favorites WHERE user_id=? AND product_deck_id=?").bind(user.id,id).run(); return { favorited: false, locationId: `${prefix}${id}` }; }
  if (!input) throw badRequest("Official product deck snapshot is required");
  await env.ACCOUNT_DB.prepare("INSERT INTO official_product_deck_favorites (user_id,product_deck_id,title,champion_name,format,decklist_json,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id,product_deck_id) DO UPDATE SET title=excluded.title,champion_name=excluded.champion_name,format=excluded.format,decklist_json=excluded.decklist_json").bind(user.id,id,input.title,input.championName,input.format,JSON.stringify(input.decklist),new Date().toISOString()).run();
  return { favorited: true, locationId: `${prefix}${id}` };
}
