import { chromium } from "playwright";
import { config } from "../config.js";
import { sleep } from "../lib/http.js";
import { readCachedDeck, writeCachedDeck, readHarvestMeta, writeHarvestMeta, writeProgress } from "./cache.js";
import { isShuttingDown, PLAYWRIGHT_LAUNCH_OPTIONS } from "./shutdown.js";

/** How often to print a human-readable "N pages done" progress line — separate from the
 * per-page checkpoint write below, which is cheap enough to do unconditionally. */
const PROGRESS_LOG_INTERVAL_PAGES = 10;

const BASE_URL = "https://shoutatyourdecks.com";
const DECKS_PER_PAGE = 24; // confirmed against the live site's MudPagination — see README

const DECK_LINK_SELECTOR = 'a[href^="/decks/"]';

function extractDeckIds(hrefs: string[]): string[] {
  return hrefs
    .map((href) => /^\/decks\/([0-9a-f-]{36})$/.exec(href)?.[1])
    .filter((id): id is string => Boolean(id));
}

/**
 * Opens the Advanced Search panel and restricts to Standard + Pantheon (~99% of decks on the
 * site — Custom/Draft are the site's own "not really constructed" buckets) before harvesting.
 * Locators are structural (MudBlazor's fieldset/legend + accessible button text) rather than
 * auto-generated element ids, which aren't stable across page loads.
 */
async function applyFormatFilter(page: import("playwright").Page): Promise<void> {
  // Clicking immediately after networkidle races Blazor's own post-connect initialization (its
  // click handlers aren't reliably wired yet) — confirmed empirically: a bare click right after
  // goto silently no-ops here. A short settle wait fixes it; there's no cheaper readiness signal
  // exposed by the page itself.
  await page.waitForTimeout(2000);
  await page.locator(".mud-input-adornment-end button").first().click();
  await page.waitForTimeout(500);
  await page.getByRole("combobox", { name: "Format" }).click();
  await page.getByText("Standard", { exact: true }).click();
  await page.getByText("Pantheon", { exact: true }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /^SEARCH$/i }).click();
  await page.waitForSelector(DECK_LINK_SELECTOR, { timeout: 15000 });
  await waitForStablePageContent(page);
}

async function collectPageDeckIds(page: import("playwright").Page): Promise<string[]> {
  const hrefs = await page.locator(DECK_LINK_SELECTOR).evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  return extractDeckIds(hrefs);
}

/**
 * The href-change check in goToNextPage only confirms the *first* card updated — the rest of a
 * 24-item virtualized grid can still be mid-patch at that instant (confirmed empirically: without
 * this, a 3-page fast-mode harvest returned 48 unique decks instead of the expected 72, i.e. some
 * pages were read mid-transition and returned a mix of stale and new cards, all while the count
 * stayed a constant 24 throughout — so counting alone can't catch it). Poll until the *full set*
 * of hrefs reads identically twice in a row before trusting it.
 */
async function waitForStablePageContent(page: import("playwright").Page): Promise<void> {
  let previous = "";
  for (let i = 0; i < 20; i++) {
    const hrefs = await page.locator(DECK_LINK_SELECTOR).evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
    const current = hrefs.join(",");
    if (current && current === previous) return;
    previous = current;
    await sleep(200);
  }
}

/**
 * The live site's own pagination round-trip is genuinely unreliable to automate deterministically
 * — local testing saw both a stuck-on-previous-page render (see the overlap-retry in the caller)
 * and, separately, the click occasionally producing no detectable change at all within 15s. This
 * isn't a bug in one specific wait recipe to keep tuning; it's real flakiness in a live third-party
 * SPA under repeated automation, so the click itself gets retried rather than trusting one attempt.
 */
async function goToNextPage(page: import("playwright").Page): Promise<boolean> {
  const nextButton = page.getByRole("button", { name: "Next page" });
  if ((await nextButton.getAttribute("disabled")) !== null) return false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    // A single attempt's waitForFunction can take up to its own timeout below — check for a
    // shutdown request between attempts too, not just once per page, so Ctrl+C stays responsive
    // even if a page transition is deep into its retry loop (worst case ~3x the per-attempt wait).
    if (isShuttingDown()) throw new Error("shoutatyourdecks: shutdown requested mid-page-transition");

    const firstLinkBefore = (await page.locator(DECK_LINK_SELECTOR).first().getAttribute("href")) ?? "";
    await nextButton.click();
    await sleep(1000);
    try {
      // Passed as a string (not a closure) so tsc doesn't need to typecheck DOM globals against
      // the pipeline's Node-only lib config — this runs in the browser context, not Node.
      await page.waitForFunction(
        `document.querySelector('a[href^="/decks/"]')?.getAttribute("href") !== ${JSON.stringify(firstLinkBefore)}`,
        null,
        { timeout: 8000 },
      );
      await waitForStablePageContent(page);
      return true;
    } catch (err) {
      console.warn(`shoutatyourdecks: "Next page" click attempt ${attempt} produced no detectable change, retrying`, err instanceof Error ? err.message : err);
    }
  }
  throw new Error("shoutatyourdecks: \"Next page\" click failed to advance after 3 attempts");
}

export interface HarvestResult {
  newDecks: number;
  totalKnownDecks: number;
  pagesHarvested: number;
}

/**
 * Walks the /decks listing page by page (24 decks/page, ~891 pages total) collecting every deck's
 * GUID. Resumable: starts from the last completed page recorded in harvest-meta.json rather than
 * page 1, so an interrupted run doesn't redo work. Deliberately the only phase that scrolls/clicks
 * through the *entire* listing — Phases 2/3 only ever touch decks already in the cache.
 */
export async function harvestDeckUrls(): Promise<HarvestResult> {
  const priorMeta = await readHarvestMeta();
  const startPage = (priorMeta?.lastPageHarvested ?? 0) + 1;
  const pageLimit = config.fastMode ? config.sydFastModePageLimit : Infinity;

  const browser = await chromium.launch(PLAYWRIGHT_LAUNCH_OPTIONS);
  const page = await browser.newPage();
  let newDecks = 0;
  let pagesHarvested = 0;
  let deckCount = priorMeta?.deckCount ?? 0;

  try {
    await page.goto(`${BASE_URL}/decks`, { waitUntil: "networkidle" });
    await applyFormatFilter(page);

    // Fast-forward to startPage by repeated "Next page" clicks — Blazor Server has no URL-encoded
    // page number (confirmed: pagination is pure SignalR client state, not a query param).
    try {
      for (let p = 1; p < startPage; p++) {
        const advanced = await goToNextPage(page);
        if (!advanced) break;
      }
    } catch (err) {
      throw new Error(`shoutatyourdecks: failed to fast-forward to resume page ${startPage} — try again later`, { cause: err });
    }

    let previousPageIds = new Set<string>();
    let pagesSinceLastLog = 0;
    for (let p = startPage; p - startPage < pageLimit; p++) {
      if (isShuttingDown()) {
        console.log(`shoutatyourdecks: stopping before page ${p} (shutdown requested) — already-harvested pages are checkpointed`);
        break;
      }

      let ids = await collectPageDeckIds(page);
      // Defense against a stale/spurious-stable read (observed in local testing: the site
      // occasionally settles on a re-render that duplicates an earlier page's content even after
      // waitForStablePageContent reports it stable twice in a row) — if this page's set overlaps
      // meaningfully with the page we just came from, it's the same content repeated, not a new
      // page. Re-poll a few times before giving up and accepting it (better than silently
      // recording duplicate/missing pages).
      for (let retry = 0; retry < 5 && ids.filter((id) => previousPageIds.has(id)).length > DECKS_PER_PAGE / 2; retry++) {
        console.warn(`shoutatyourdecks: page ${p} looks like a repeat of the previous page — retrying read (attempt ${retry + 1})`);
        await sleep(500);
        ids = await collectPageDeckIds(page);
      }
      if (ids.length === 0) break;
      if (ids.length < DECKS_PER_PAGE) {
        console.warn(`shoutatyourdecks: page ${p} returned only ${ids.length}/${DECKS_PER_PAGE} decks — may be the last page, or a rendering race; not fatal, just noted`);
      }
      previousPageIds = new Set(ids);

      for (const id of ids) {
        const existing = await readCachedDeck(id);
        if (!existing) {
          await writeCachedDeck({ id, url: `${BASE_URL}/decks/${id}`, summary: null, deck: null });
          newDecks++;
          deckCount++;
        }
      }

      pagesHarvested++;
      pagesSinceLastLog++;

      // Checkpointed every page (not just periodically) — atomic writes (see lib/atomicWrite.ts)
      // make this cheap and crash-safe, so there's no reason to risk losing more than one page's
      // worth of progress to an interruption.
      await writeHarvestMeta({ lastPageHarvested: p, totalPages: null, deckCount, updatedAt: new Date().toISOString() });
      await writeProgress({ phase: "harvest", completed: p, total: 891, updatedAt: new Date().toISOString() });

      if (pagesSinceLastLog >= PROGRESS_LOG_INTERVAL_PAGES) {
        console.log(`shoutatyourdecks: pages ${p - pagesSinceLastLog + 1}-${p} done (${deckCount} decks known so far)`);
        pagesSinceLastLog = 0;
      }

      let advanced: boolean;
      try {
        advanced = await goToNextPage(page);
      } catch (err) {
        // The live site's pagination is genuinely flaky under sustained automation (see
        // goToNextPage's doc comment) — rather than crash a multi-hour run over one stuck page,
        // checkpoint what's done and stop cleanly. Re-running resumes from lastPageHarvested + 1.
        console.error(`shoutatyourdecks: giving up advancing past page ${p}, stopping this run — resume later to continue`, err);
        await writeHarvestMeta({ lastPageHarvested: p, totalPages: null, deckCount, updatedAt: new Date().toISOString() });
        break;
      }
      if (!advanced) {
        await writeHarvestMeta({ lastPageHarvested: p, totalPages: p, deckCount, updatedAt: new Date().toISOString() });
        break;
      }
      await sleep(config.sydCrawlRequestDelayMs);
    }

    await writeHarvestMeta({
      lastPageHarvested: startPage + pagesHarvested - 1,
      totalPages: priorMeta?.totalPages ?? null,
      deckCount,
      updatedAt: new Date().toISOString(),
    });
  } finally {
    await browser.close();
  }

  return { newDecks, totalKnownDecks: deckCount, pagesHarvested };
}
