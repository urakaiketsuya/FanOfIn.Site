import { readFile, readdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const publishedDir = path.join(root, "data/shoutatyourdecks/decks");
const cacheDir = path.join(root, "pipeline/.cache/shoutatyourdecks/decks");
const concurrency = Math.max(1, Math.min(4, Number(process.env.GATCG_SYD_BROWSER_CONCURRENCY ?? 2)));
const previewIndexPath = path.join(root, "data/shoutatyourdecks/analytics/pantheon/decks.json");
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

async function writeJson(file, value) {
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`);
  await rename(temporary, file);
}

async function refreshPreviewIndex() {
  const index = JSON.parse(await readFile(previewIndexPath, "utf8"));
  for (const summary of index.decks) {
    const deck = JSON.parse(await readFile(path.join(publishedDir, `${summary.id}.json`), "utf8"));
    if (Array.isArray(deck.pantheonDeck)) summary.boonNames = deck.pantheonDeck.map(line => line.name);
  }
  index.generatedAt = new Date().toISOString();
  await writeJson(previewIndexPath, index);
  // Returning browsers use the manifest to decide whether their IndexedDB copy is stale.
  const manifestPath = path.join(root, "data/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest["shoutatyourdecks-pantheon-decks"] = index.generatedAt;
  await writeJson(manifestPath, manifest);
}

async function writeDeck(file, deck, pantheonDeck) {
  const updated = { ...deck, pantheonDeck };
  await writeJson(path.join(publishedDir, file), updated);
  try {
    const cachePath = path.join(cacheDir, file);
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (cached.deck) cached.deck.pantheonDeck = pantheonDeck;
    await writeJson(cachePath, cached);
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
let completed = 0;
let failed = 0;
let nextTarget = 0;
async function crawl() {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  try {
    while (nextTarget < targets.length) {
      const { file, deck } = targets[nextTarget++];
      try {
        await page.goto(deck.url, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.locator(".mud-tab, button").filter({ hasText: /^Export$/ }).first().click();
        await page.locator("button").filter({ hasText: "Omnidex Export" }).first().click();
        const textarea = page.locator("#deckTextArea");
        await textarea.waitFor({ state: "attached", timeout: 10000 });
        const exported = await textarea.inputValue();
        if (!exported.includes("# Main Deck") || !exported.includes("# Material Deck")) throw new Error("Incomplete deck export; preserving existing data");
        await writeDeck(file, deck, parsePantheonSection(exported));
        completed++;
        if (completed % 10 === 0) console.log(`Backfilled ${completed}/${targets.length}.`);
      } catch (error) {
        failed++;
        console.warn(`Failed ${deck.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await page.waitForTimeout(delayMs);
    }
  } finally {
    await page.close();
  }
}
try {
  await Promise.all(Array.from({ length: concurrency }, () => crawl()));
} finally {
  await browser.close();
  await refreshPreviewIndex();
}
console.log(`Pantheon boon backfill complete: ${completed} updated, ${failed} failed.`);

if (failed > 0) process.exitCode = 1;
