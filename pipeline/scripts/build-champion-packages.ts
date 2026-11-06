/** Targeted local rebuild; never crawls or refreshes external sources. */
import { readdir, readFile } from "node:fs/promises";
import { buildCardIndex, type CardSignature } from "../src/cards/catalog.js";
import type { OmnidexEventBundle } from "../src/omnidex/cache.js";
import { collectStapleObservations } from "../src/analysis/cardStaples.js";
import { computeChampionPackages } from "../src/analysis/championPackages.js";
import { writeJsonAtomic } from "../src/lib/atomicWrite.js";
const root = new URL("../../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("data/card-catalog.json", root), "utf8")) as { cards: CardSignature[] };
const directory = new URL("data/omnidex/events/", root);
const bundles: OmnidexEventBundle[] = [];
for (const file of (await readdir(directory)).filter(file => file.endsWith(".json")).sort()) bundles.push(JSON.parse(await readFile(new URL(file, directory), "utf8")));
const { observations, reference } = collectStapleObservations(bundles);
const data = computeChampionPackages(observations, buildCardIndex(catalog.cards), new Date().toISOString(), reference === null ? null : new Date(reference).toISOString().slice(0, 10));
await writeJsonAtomic(new URL("data/analysis/champion-packages.json", root).pathname, data, 0);
console.log(`Published ${data.packages.length} champion packages.`);
