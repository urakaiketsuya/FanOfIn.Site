// Adds the Merlin (ReC-BRV) and Mordred (ReC-AUR) Re:Collection decks to the official products file.
// Silvie's @GrandArchive profile does not list them, so quantities come from the matching
// locally stored shoutatyourdecks lists; set/collector numbers come from the card catalog.
import { readFile, writeFile } from "node:fs/promises";

const sources = [
  { id: "d7f8665f-f080-4721-af51-09926e260e2e", productCode: "ReC-BRV", name: "Merlin Re:Collection, Brilliant Vestige", champion: "Merlin",
    // The community list used Vorpal Sword (PTM) in place of this card; the product's material deck is ReC-BRV 001-012.
    swap: { "Vorpal Sword": "Life Essence Amulet" } },
  { id: "5b809702-5e69-4b62-85e4-f17cf2688134", productCode: "ReC-AUR", name: "Mordred Re:Collection, Aurelian Regent", champion: "Mordred", swap: {} },
];
const root = new URL("../../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("data/card-catalog.json", root), "utf8")).cards;
const outputUrl = new URL("app/src/features/official-products/decks.json", root);

function locate(name, productCode) {
  const card = catalog.find((c) => c.name === name);
  const edition = card?.editions.find((e) => e.set?.prefix === productCode);
  return { set: edition ? productCode : null, collectorNumber: edition?.collector_number ?? null };
}

const existing = JSON.parse(await readFile(outputUrl, "utf8"));
const byId = new Map(existing.decks.map((d) => [d.id, d]));
for (const { id, productCode, name, champion, swap } of sources) {
  const src = JSON.parse(await readFile(new URL(`data/shoutatyourdecks/decks/${id}.json`, root), "utf8"));
  const line = (l) => { const n = swap[l.name] ?? l.name; return { name: n, quantity: l.quantity, ...locate(n, productCode) }; };
  const byNumber = (a, b) => (a.collectorNumber ?? "").localeCompare(b.collectorNumber ?? "");
  const deck = {
    id: `recollection-${productCode.toLowerCase()}`, name, productCode, champions: [champion], sourceUrl: src.url,
    cards: { main: src.mainDeck.map(line).sort(byNumber), material: src.materialDeck.map(line).sort(byNumber),
      sideboard: [], mastery: [], token: [], pantheon: [], generated: [], status: [] },
  };
  byId.set(deck.id, deck);
}
existing.decks = Array.from(byId.values());
await writeFile(outputUrl, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
process.stdout.write("Added Merlin and Mordred Re:Collection decks.\n");
