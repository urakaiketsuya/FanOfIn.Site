/** Targeted local rebuild; never crawls or refreshes external sources. */
import { readdir, readFile } from "node:fs/promises";
import { buildCardIndex, type CardSignature } from "../src/cards/catalog.js";
import type { OmnidexEventBundle } from "../src/omnidex/cache.js";
import { computeCardStaples } from "../src/analysis/cardStaples.js";
import { writeJsonAtomic } from "../src/lib/atomicWrite.js";
const root = new URL("../../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("pipeline/.cache/cards.json", root), "utf8")) as { cards: CardSignature[] };
const directory = new URL("data/omnidex/events/", root);
const bundles: OmnidexEventBundle[] = [];
for (const file of (await readdir(directory)).filter(file => file.endsWith(".json")).sort()) bundles.push(JSON.parse(await readFile(new URL(file, directory), "utf8")));
const data = computeCardStaples(bundles, buildCardIndex(catalog.cards));
await writeJsonAtomic(new URL("data/analysis/card-staples.json", root).pathname, data, 0);
console.log(`Published ${data.cards.length} cards in ${data.cohorts.length} cohorts through ${data.throughDate}.`);
