import type { Browser, Page } from "playwright";
import { chromium } from "playwright";
import type { DeckLine, ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { config } from "../config.js";
import { sleep } from "../lib/http.js";
import { isShuttingDown, PLAYWRIGHT_LAUNCH_OPTIONS } from "./shutdown.js";

type ExportZone = "materialDeck" | "pantheonDeck" | "mainDeck" | "sideDeck";

const SECTION_HEADERS: Record<string, ExportZone> = {
  "# Material Deck": "materialDeck",
  "# Pantheon": "pantheonDeck",
  "# Main Deck": "mainDeck",
  "# Side Deck": "sideDeck",
};

const LINE_RE = /^(\d+)\s+(.+)$/;

/**
 * Parses the site's own "Omnidex Export" plain-text format — the only place a complete,
 * quantity-accurate decklist was found (the visual card grid only partially server-renders the
 * Main deck, and doesn't render quantities at all; see metadataFetch.ts and the README).
 */
export function parseOmnidexExportText(text: string): Pick<ShoutAtYourDecksDeck, "materialDeck" | "pantheonDeck" | "mainDeck" | "sideDeck"> {
  const result = { materialDeck: [] as DeckLine[], pantheonDeck: [] as DeckLine[], mainDeck: [] as DeckLine[], sideDeck: [] as DeckLine[] };
  let current: (typeof result)[keyof typeof result] | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line in SECTION_HEADERS) {
      current = result[SECTION_HEADERS[line]];
      continue;
    }
    if (line.startsWith("#")) {
      current = null; // an unrecognized "# ..." section (e.g. "# Tokens") — not a deck-identity zone, skip its lines
      continue;
    }
    if (!current) continue;
    const match = LINE_RE.exec(line);
    if (match) current.push({ quantity: Number(match[1]), name: match[2] });
  }

  return result;
}

async function fetchOneDecklist(page: Page, url: string): Promise<Pick<ShoutAtYourDecksDeck, "materialDeck" | "pantheonDeck" | "mainDeck" | "sideDeck">> {
  await page.goto(url, { waitUntil: "networkidle" });
  // Clicking immediately after networkidle races Blazor's own post-connect initialization — same
  // empirically-confirmed settle requirement as harvest.ts's applyFormatFilter.
  await page.waitForTimeout(2000);
  // getByRole's accessible-name computation doesn't cleanly match this button (it wraps a title +
  // subtitle in separate child elements) — a plain text filter is what actually matches it.
  const exportTab = page.locator(".mud-tab, button").filter({ hasText: /^Export$/ }).first();
  await exportTab.click();
  const exportButton = page.locator("button").filter({ hasText: "Omnidex Export" }).first();
  await exportButton.click();
  const textarea = page.locator("#deckTextArea");
  await textarea.waitFor({ state: "attached", timeout: 10000 });
  const text = (await textarea.inputValue()) ?? "";
  return parseOmnidexExportText(text);
}

export interface DecklistFetchResult {
  deck: ShoutAtYourDecksDeck;
  mainCountMismatch: boolean;
}

/**
 * Fetches the full, quantity-accurate decklist for one already-filtered deck (see filter.ts —
 * this is only ever called for decks that passed the 60-card/no-"Copy" checks, keeping the
 * expensive browser step off the ~99% of the site that isn't worth it).
 */
export async function fetchDecklist(browser: Browser, summary: ShoutAtYourDecksDeckSummary): Promise<DecklistFetchResult> {
  const page = await browser.newPage();
  try {
    const zones = await fetchOneDecklist(page, summary.url);
    const deck: ShoutAtYourDecksDeck = { ...summary, ...zones };
    const parsedMainCount = zones.mainDeck.reduce((sum, line) => sum + line.quantity, 0);
    return { deck, mainCountMismatch: summary.mainCount !== null && parsedMainCount !== summary.mainCount };
  } finally {
    await page.close();
  }
}

export async function fetchDecklists(
  summaries: ShoutAtYourDecksDeckSummary[],
  onResult: (result: DecklistFetchResult) => Promise<void>,
): Promise<{ fetched: number; mismatches: number }> {
  let browser = await chromium.launch(PLAYWRIGHT_LAUNCH_OPTIONS);
  let fetched = 0;
  let failed = 0;
  let mismatches = 0;
  try {
    for (const summary of summaries) {
      if (isShuttingDown()) {
        console.log(`shoutatyourdecks: stopping (shutdown requested) after ${fetched}/${summaries.length} — each decklist is already saved as it's fetched, just re-run to continue`);
        break;
      }
      // A single deck's fetch failing (site 502, a page crash, a selector timeout) must not take
      // down an hours-long run over thousands of decks — same lesson as metadataFetch's retry loop,
      // learned the hard way when a bare 502 killed a 21k-deck metadata run at 79% done. Skip and
      // move on; the deck stays without a `deck` field so a future run retries it naturally.
      let result;
      try {
        result = await fetchDecklist(browser, summary);
      } catch (err) {
        failed++;
        console.warn(`shoutatyourdecks: decklist fetch failed for ${summary.url}, skipping (will retry on next run)`, err instanceof Error ? err.message : err);
        // A crashed page can leave the browser itself in a bad state (e.g. a renderer crash) —
        // relaunch it so one bad deck doesn't degrade every fetch after it for the rest of the run.
        if (!browser.isConnected()) {
          console.warn("shoutatyourdecks: browser disconnected after a failure, relaunching");
          browser = await chromium.launch(PLAYWRIGHT_LAUNCH_OPTIONS);
        }
        continue;
      }
      if (result.mainCountMismatch) {
        mismatches++;
        console.warn(`shoutatyourdecks: main-deck count mismatch for ${summary.url} (summary said ${summary.mainCount})`);
      }
      await onResult(result);
      fetched++;
      if (fetched % 25 === 0) console.log(`shoutatyourdecks: fetched ${fetched}/${summaries.length} decklists`);
      await sleep(config.sydCrawlRequestDelayMs);
    }
  } finally {
    await browser.close();
  }
  console.log(`shoutatyourdecks: decklist fetch failures: ${failed}`);
  return { fetched, mismatches };
}
