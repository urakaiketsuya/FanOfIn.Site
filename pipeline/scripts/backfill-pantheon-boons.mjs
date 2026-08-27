import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const publishedDir = path.join(root, "data/shoutatyourdecks/decks");
const cacheDir = path.join(root, "pipeline/.cache/shoutatyourdecks/decks");
const delayMs = Number(process.env.SYD_CRAWL_REQUEST_DELAY_MS ?? 300);

function isPantheon(deck) {
  return deck.format === "PANTHEON" || /pantheon/i.test(deck.title ?? "") ||
    ((deck.mainDeck?.length ?? 0) >= 60 && deck.mainDeck.every((line) => line.quantity === 1));
}

function parsePantheonSection(text) {
  const lines = [];
  let active = false;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("#")) {
      active = line === "# Pantheon";
      continue;
    }
    if (!active || !line) continue;
    const match = /^(\d+)\s+(.+)$/.exec(line);
    if (match) lines.push({ quantity: Number(match[1]), name: match[2] });
  }
  return lines;
}

async function writeDeck(file, deck, pantheonDeck) {
  const updated = { ...deck, pantheonDeck };
  await writeFile(path.join(publishedDir, file), `${JSON.stringify(updated)}\n`);
  try {
    const cachePath = path.join(cacheDir, file);
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (cached.deck) cached.deck.pantheonDeck = pantheonDeck;
    await writeFile(cachePath, `${JSON.stringify(cached)}\n`);
  } catch {
    // Published data remains authoritative when a disposable local cache entry is absent.
  }
}

const files = (await readdir(publishedDir)).filter((file) => file.endsWith(".json"));
const targets = [];
for (const file of files) {
  const deck = JSON.parse(await readFile(path.join(publishedDir, file), "utf8"));
  if (isPantheon(deck) && !Array.isArray(deck.pantheonDeck)) targets.push({ file, deck });
}

console.log(`Backfilling Pantheon boons for ${targets.length} decks.`);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let completed = 0;
let failed = 0;
try {
  for (const { file, deck } of targets) {
    try {
      await page.goto(deck.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.locator(".mud-tab, button").filter({ hasText: /^Export$/ }).first().click();
      await page.locator("button").filter({ hasText: "Omnidex Export" }).first().click();
      const textarea = page.locator("#deckTextArea");
      await textarea.waitFor({ state: "attached", timeout: 10000 });
      await writeDeck(file, deck, parsePantheonSection(await textarea.inputValue()));
      completed++;
      if (completed % 25 === 0) console.log(`Backfilled ${completed}/${targets.length}.`);
    } catch (error) {
      failed++;
      console.warn(`Failed ${deck.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await page.waitForTimeout(delayMs);
  }
} finally {
  await browser.close();
}
console.log(`Pantheon boon backfill complete: ${completed} updated, ${failed} failed.`);
