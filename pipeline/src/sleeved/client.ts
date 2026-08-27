import { config } from "../config.js";
import { sleep } from "../lib/http.js";

const BASE_URL = "https://api.sleeved.gg/v1";
const GAME_ID = "grand-archive";
/** Confirmed live: bulk /decks/details accepts 1-50 ids per call. */
const DETAILS_BATCH_SIZE = 50;
/** Confirmed live: listing accepts up to 50/page. */
const LISTING_PAGE_SIZE = 50;

/** Raw wire shape from `POST /decks/details` — confirmed live against real Grand Archive decks
 * (2026-08-27): no `ownerDisplayName`/`createdAt`/`updatedAt`/format field actually comes back
 * despite the docs' example showing them; only `id`/`gameId`/`name`/`cards` are real. `cardId` is
 * the card's Sleeved *slug* (e.g. "spirit-of-fire"), not its `cardNumber` — see transform.ts. */
export interface SleevedApiDeck {
  id: string;
  gameId: string;
  name: string;
  cards: { cardId: string; quantity: number; zoneId: string }[];
}

interface SleevedApiEnvelope<T> {
  data: T;
  error?: string;
}

class SleevedHttpError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly retryDelayMs: number) {
    super(message);
  }
}

export function isRetryableSleevedStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function requireApiKey(): string {
  if (!config.sleevedApiKey) throw new Error("SLEEVED_API_KEY is required for the Sleeved integration (set it in .env.local for local runs, or as a repo secret in CI)");
  return config.sleevedApiKey;
}

/** Polite fetch with the same retry-on-5xx backoff as `lib/http.ts`'s `fetchJson`, plus the
 * `X-API-Key` header and JSON POST support that helper doesn't have. Surfaces the API's own
 * `{"error": "..."}` body on a 4xx (e.g. "Insufficient scope") rather than a bare status code. */
async function sleevedFetch<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }, attempts = 3): Promise<T> {
  const apiKey = requireApiKey();
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          "X-API-Key": apiKey,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      const body = (await res.json()) as SleevedApiEnvelope<T>;
      if (!res.ok) throw new SleevedHttpError(
        `sleeved: ${res.status} for ${path} — ${body.error ?? res.statusText}`,
        isRetryableSleevedStatus(res.status),
        res.status === 429 ? 2000 * attempt : 500 * attempt,
      );
      return body.data;
    } catch (err) {
      if (err instanceof SleevedHttpError && !err.retryable) throw err;
      lastErr = err;
      if (attempt < attempts) await sleep(err instanceof SleevedHttpError ? err.retryDelayMs : 500 * attempt);
    }
  }
  throw lastErr;
}

/**
 * Walks the cursor-paginated public listing to collect every Grand Archive deck id. The listing
 * itself carries no useful metadata beyond the id (see SleevedApiDeck's doc comment) — every id
 * still needs its own bulk-details call to become useful, so this is purely an id-discovery pass.
 */
export async function fetchPublicDeckIds(limit = Infinity): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await sleevedFetch<{ decks: { id: string }[]; nextCursor: string | null; hasMore: boolean; totalCount: number }>(
      `/decks/public?gameId=${GAME_ID}&limit=${LISTING_PAGE_SIZE}&sort=updatedAt${cursor ? `&startAfter=${encodeURIComponent(cursor)}` : ""}`,
    );
    for (const deck of page.decks) {
      ids.push(deck.id);
      if (ids.length >= limit) return ids;
    }
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
    await sleep(config.sleevedCrawlRequestDelayMs);
  }
  return ids;
}

export interface DeckDetailsBatchResult {
  decks: SleevedApiDeck[];
  unresolved: string[];
}

/** Fetches full card data for up to 50 ids per call (see DETAILS_BATCH_SIZE), batching automatically for larger inputs. */
export async function fetchDeckDetails(ids: string[]): Promise<DeckDetailsBatchResult> {
  const decks: SleevedApiDeck[] = [];
  const unresolved: string[] = [];
  for (let i = 0; i < ids.length; i += DETAILS_BATCH_SIZE) {
    const batch = ids.slice(i, i + DETAILS_BATCH_SIZE);
    const result = await sleevedFetch<DeckDetailsBatchResult>("/decks/details", { method: "POST", body: { ids: batch } });
    decks.push(...result.decks);
    unresolved.push(...result.unresolved);
    if (i + DETAILS_BATCH_SIZE < ids.length) await sleep(config.sleevedCrawlRequestDelayMs);
  }
  return { decks, unresolved };
}
