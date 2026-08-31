import { chromium, type Browser, type Page } from "playwright";
import { config } from "../config.js";
import { sleep } from "../lib/http.js";
import { isShuttingDown, PLAYWRIGHT_LAUNCH_OPTIONS } from "./shutdown.js";

export const BASE_URL = "https://tcgarchitect.com";
const DISCOVER_API_PATH = "api.tcgarchitect.com/api/decks/discover/public";
/** Confirmed live: 48 is the largest option the site's own "Per page" selector offers (12/24/48) —
 * matching that rather than guessing a larger value keeps this crawl looking like a normal user
 * paging through the UI, which is the whole reason a real browser drives this instead of calling
 * the (robots.txt-disallowed, see README) API directly. */
const PER_PAGE = 48;
const SORT_BY = "newest";

export interface TcgArchitectApiCardPivot {
  deck_id: string;
  card_id: string;
  quantity: number;
  /** Observed values: "main", "material", "sideboard", "boons" (Pantheon's Boon zone), "maybeboard"
   * (a wishlist zone, not committed deck content — see transform.ts). */
  deck_type: string;
}

/** The listing's card objects carry the full card catalog entry (rules text, images, editions...)
 * — far more than deck identity needs. Only declaring the fields transform.ts actually reads;
 * everything else is passed through untyped rather than discarded at the network layer, so a
 * shape change elsewhere in the payload can't silently break parsing here. */
export interface TcgArchitectApiCard {
  id: string;
  name: string;
  types: string[];
  level: number | null;
  pivot: TcgArchitectApiCardPivot;
}

export interface TcgArchitectApiDeck {
  id: string;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  visibility: string;
  format: string;
  like_count: number;
  cards: TcgArchitectApiCard[];
  user: { id: number; username: string };
}

interface TcgArchitectApiDiscoverResponse {
  data: TcgArchitectApiDeck[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

function discoverUrl(page: number): string {
  return `${BASE_URL}/grand-archive/discover?page=${page}&per_page=${PER_PAGE}&sort_by=${SORT_BY}`;
}

/**
 * Navigates a real browser tab to the (robots.txt-Allowed) `/grand-archive/discover` listing page
 * and reads the JSON the page's own client-side code fetches from `api.tcgarchitect.com` to render
 * it — the discover listing has no server-rendered data at all (confirmed: a plain HTTP GET returns
 * a static shell with zero decks), and that API requires a client-bundled `X-API-Key` header
 * (robots.txt disallows `/api/` on the main domain) — see README for why this crawls through a real
 * browser rendering an Allowed page rather than calling the API directly with that key ourselves.
 *
 * Conveniently, this one response already carries every deck's *complete* decklist (every card,
 * its quantity, and its zone via `pivot.deck_type`) — unlike ShoutAtYourDecks/Sleeved, there's no
 * separate cheap-metadata-then-full-decklist split needed; one page load is the whole story for
 * every deck on it.
 */
async function fetchDiscoverPage(browserPage: Page, page: number): Promise<TcgArchitectApiDiscoverResponse> {
  const responsePromise = browserPage.waitForResponse(
    (res) => res.url().includes(DISCOVER_API_PATH) && res.url().includes(`page=${page}&`),
    { timeout: 20000 },
  );
  await browserPage.goto(discoverUrl(page), { waitUntil: "domcontentloaded" });
  const res = await responsePromise;
  return (await res.json()) as TcgArchitectApiDiscoverResponse;
}

export interface DiscoverCrawlResult {
  pagesFetched: number;
  totalKnownDecks: number;
}

/**
 * Walks the discover listing page by page (newest-first, see client.ts's doc comment on why),
 * calling `onPage` with every deck on each page as it's fetched. Stops once `last_page` (read from
 * the API's own pagination `meta`, refreshed every page since new decks shift it) is reached, or
 * once `onPage` reports enough consecutive pages contained nothing new (see run.ts).
 */
export async function crawlDiscoverListing(
  onPage: (decks: TcgArchitectApiDeck[], page: number, lastPage: number) => Promise<{ stop: boolean }>,
  startPage = 1,
): Promise<DiscoverCrawlResult> {
  const browser: Browser = await chromium.launch(PLAYWRIGHT_LAUNCH_OPTIONS);
  const browserPage = await browser.newPage();
  let pagesFetched = 0;
  let totalKnownDecks = 0;

  try {
    let page = startPage;
    let lastPage = startPage;
    while (page <= lastPage) {
      if (isShuttingDown()) {
        console.log(`tcgarchitect: stopping before page ${page} (shutdown requested)`);
        break;
      }

      const pageLimit = config.fastMode ? Math.min(config.tcgaFastModePageLimit, lastPage) : Infinity;
      if (config.fastMode && page > pageLimit) break;

      const result = await fetchDiscoverPage(browserPage, page);
      lastPage = config.fastMode ? Math.min(result.meta.last_page, config.tcgaFastModePageLimit) : result.meta.last_page;
      totalKnownDecks = result.meta.total;
      pagesFetched++;

      const { stop } = await onPage(result.data, page, lastPage);
      if (stop) break;

      page++;
      if (page <= lastPage) await sleep(config.tcgaCrawlRequestDelayMs);
    }
  } finally {
    await browser.close();
  }

  return { pagesFetched, totalKnownDecks };
}
