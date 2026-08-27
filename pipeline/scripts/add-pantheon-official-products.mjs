import { readFile, writeFile } from "node:fs/promises";

const deckSources = [
  { id: "3c00397c-bb7c-41e9-9ec3-f1563590f98b", productCode: "RDOPD" },
  { id: "9ee66f85-796a-424f-b628-717b8c094ab5", productCode: "RDOPD" },
  { id: "7d578c15-c55a-4933-ac91-bbbb07ea6faa", productCode: "RDOPD" },
  { id: "5c99c6cc-9baa-4275-85a1-8c13c0bc75f7", productCode: "RDOPD" },
  { id: "3e871d8b-4da1-439b-b93f-ad2336eff574", productCode: "PRDSD" },
  { id: "0e5ff086-ca0b-4c7c-bbda-04ce6893919d", productCode: "PRDSD" },
];
const dataRoot = new URL("../../data/shoutatyourdecks/decks/", import.meta.url);
const outputUrl = new URL("../../app/src/features/official-products/decks.json", import.meta.url);

const compact = (line) => ({ name: line.name, quantity: line.quantity, set: null, collectorNumber: null });
const decks = [];
for (const { id, productCode } of deckSources) {
  const source = JSON.parse(await readFile(new URL(`${id}.json`, dataRoot), "utf8"));
  const championName = source.champion?.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  decks.push({
    id: `syd-${source.id}`,
    name: source.title.replace(/^\[RDOPD\]\s*/i, "").replace(/\s+/g, " ").trim(),
    productCode,
    champions: championName ? [championName] : [],
    sourceUrl: source.url,
    cards: {
      main: source.mainDeck.map(compact),
      material: source.materialDeck.map(compact),
      sideboard: source.sideDeck.map(compact),
      mastery: [], token: [], pantheon: [], generated: [], status: [],
    },
  });
}

const existing = JSON.parse(await readFile(outputUrl, "utf8"));
const byId = new Map(existing.decks.map((deck) => [deck.id, deck]));
for (const deck of decks) byId.set(deck.id, deck);
existing.decks = Array.from(byId.values());
await writeFile(outputUrl, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
process.stdout.write(`Added ${decks.length} locally stored official product decks.\n`);
