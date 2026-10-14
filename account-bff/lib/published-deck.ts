import type { PublicDeck } from "../../shared/src/saved-deck-types.js";
import { readBytes } from "./http-response.js";
import { signWorkerRequest } from "./worker-signature.js";

type PublishedDeckResult = { status: 200; deck: PublicDeck } | { status: 404 | 502 | 503 };

/** Live publication reads shared by social previews and future canonical page delivery.
 * The worker owns publication/moderation checks. Never forward visitor credentials or cache a snapshot.
 */
export async function readPublishedDeck(
  slug: string,
  options: { workerUrl?: string; secret?: string; fetcher?: typeof fetch } = {},
): Promise<PublishedDeckResult> {
  if (!/^[a-f0-9]{32}$/.test(slug)) return { status: 404 };
  const workerUrl = (options.workerUrl ?? process.env.ACCOUNT_WORKER_URL)?.replace(/\/$/, "");
  const secret = options.secret ?? process.env.BFF_SHARED_SECRET;
  if (!workerUrl || !secret) return { status: 503 };
  try {
    const path = `/v1/decklists/${slug}`;
    const response = await (options.fetcher ?? fetch)(`${workerUrl}${path}`, {
      method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json", "X-Fanofin-BFF-Secret": secret, ...signWorkerRequest(secret, "GET", path) },
    });
    if (response.status === 404) return { status: 404 };
    const { deck } = JSON.parse((await readBytes(response, 1_000_000)).toString()) as { deck?: PublicDeck };
    if (!deck) return { status: 502 };
    if (deck.publicSlug !== slug || !["public", "unlisted"].includes(deck.visibility)) return { status: 404 };
    // Malformed successful responses are upstream errors, not missing pages.
    if (typeof deck.title !== "string" || typeof deck.description !== "string"
      || typeof deck.owner?.displayName !== "string" || typeof deck.publishedAt !== "string"
      || !deck.publishedAt || !deck.decklist
      || ![deck.decklist.main, deck.decklist.material, deck.decklist.sideboard].every(lines =>
        Array.isArray(lines) && lines.every(line => typeof line?.card === "string"
          && Number.isSafeInteger(line.quantity) && line.quantity > 0))) return { status: 502 };
    return { status: 200, deck };
  } catch {
    return { status: 502 };
  }
}
