import type { IncomingMessage, ServerResponse } from "node:http";
import { readPublishedDeck } from "../lib/published-deck.js";
import { buildTtsDeck } from "../lib/tts-deck.js";

/** Public read-only route for Tabletop Simulator. It never reads cookies or private decks.
 * Publication and moderation checks stay in the worker through readPublishedDeck.
 */
export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const finish = (status: number, body: unknown) => {
    response.statusCode = status;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.end(request.method === "HEAD" ? undefined : JSON.stringify(body));
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    finish(405, { error: "Method not allowed" }); return;
  }
  const url = new URL(request.url ?? "/", "https://accounts.fanofin.site");
  const path = url.pathname.match(/^\/v1\/tts\/decks\/([a-f0-9]{32})$/);
  const slug = path?.[1] ?? url.searchParams.get("slug") ?? "";
  if (!/^[a-f0-9]{32}$/.test(slug)) { finish(404, { error: "Deck unavailable" }); return; }
  try {
    const result = await readPublishedDeck(slug);
    if (result.status !== 200) {
      finish(result.status, { error: result.status === 404 ? "Deck unavailable" : "Deck is temporarily unavailable. Please try again." }); return;
    }
    finish(200, { deck: await buildTtsDeck(result.deck) });
  } catch {
    finish(502, { error: "Deck is temporarily unavailable. Please try again." });
  }
}
