import type { IncomingMessage, ServerResponse } from "node:http";
import type { PublicDeck } from "../../shared/src/saved-deck-types.js";
import { signWorkerRequest } from "../lib/worker-signature.js";
import { championArtwork, readBytes, renderSpotlight, spotlightHtml } from "../lib/deck-spotlight.js";

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
  const workerUrl = process.env.ACCOUNT_WORKER_URL?.replace(/\/$/, "");
  const secret = process.env.BFF_SHARED_SECRET;
  if (!workerUrl || !secret) { finish(503, "Deck sharing is temporarily unavailable. Please try again."); return; }
  try {
    const workerPath = `/v1/decklists/${slug}`;
    const upstream = await fetch(`${workerUrl}${workerPath}`, {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json", "X-Fanofin-BFF-Secret": secret, ...signWorkerRequest(secret, "GET", workerPath) },
    });
    if (upstream.status === 404) { finish(404, "Deck unavailable"); return; }
    const { deck } = JSON.parse((await readBytes(upstream, 1_000_000)).toString()) as { deck: PublicDeck };
    if (!deck || deck.publicSlug !== slug || !["public", "unlisted"].includes(deck.visibility)) { finish(404, "Deck unavailable"); return; }
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
