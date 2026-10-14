import type { IncomingMessage, ServerResponse } from "node:http";
import { readPublishedDeck } from "../lib/published-deck.js";
import { championArtwork, renderSpotlight, spotlightHtml } from "../lib/deck-spotlight.js";

/** Public read-only route, separate from the credentialed account proxy. Never forwards cookies. */
export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Robots-Tag", "noindex");
  response.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
  const finish = (status: number, body: string | Buffer, contentType = "text/plain; charset=utf-8") => {
    response.statusCode = status;
    response.setHeader("Content-Type", contentType);
    response.end(request.method === "HEAD" ? undefined : body);
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    finish(405, "Method not allowed"); return;
  }
  const url = new URL(request.url ?? "/", "https://accounts.fanofin.site");
  // Vercel rewrites supply slug/image; the native path keeps local smoke testing faithful.
  const path = url.pathname.match(/^\/share\/decks\/([a-f0-9]{32})(\/image\.png)?$/);
  const slug = path?.[1] ?? url.searchParams.get("slug") ?? "";
  const image = Boolean(path?.[2]) || url.searchParams.get("image") === "1";
  if (!/^[a-f0-9]{32}$/.test(slug)) { finish(404, "Deck unavailable"); return; }
  try {
    const result = await readPublishedDeck(slug);
    if (result.status !== 200) {
      finish(result.status, result.status === 404 ? "Deck unavailable" : "Deck sharing is temporarily unavailable. Please try again.");
      return;
    }
    const deck = result.deck;
    // Recheck publication on every request, including image URLs from older posts.
    if (image) {
      const artwork = await championArtwork(deck);
      finish(200, await renderSpotlight(deck, artwork), "image/png");
    } else {
      const appOrigin = new URL(process.env.ALLOWED_ORIGIN ?? "https://fanofin.site").origin;
      const shareOrigin = new URL(process.env.SHARE_ORIGIN ?? "https://accounts.fanofin.site").origin;
      finish(200, spotlightHtml(deck, appOrigin, shareOrigin), "text/html; charset=utf-8");
    }
  } catch {
    finish(502, "Deck sharing is temporarily unavailable. Please try again.");
  }
}
