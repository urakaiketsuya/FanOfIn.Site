import { writeFile } from "node:fs/promises";

const PROFILE = "https://build-v2.silvie.org/@GrandArchive";
const DECK_IDS = [
  "1c9SMsvMsihhi1c1XvfH",
  "gbTwGoxXcMX1J2MES1nJ",
  "jFAAmMe4o8MCW8aklce2",
  "jG74V21Ab6p3w1yTtpFV",
  "2lVqk6MGrk8xHy58lUd4",
  "5Ng50uYTatKv4zRcWMZI",
  "F3W6n38rYYLtCyn7wYCu",
  "bYiwaT0gjLb8ja7V6Lt0",
  "bxIbsmbzq7PtY2bIpx7H",
  "7EHyaySNhzODdmzukoCQ",
  "yqVK5i6eQxDJhZJdTph1",
  "lorraine-starter-deck-preview",
  "rai-starter-deck-preview",
  "silvie-starter-deck-preview",
  "56KHHOrH55T73zhgspun",
  "GPHjg6vPntxcJdHNvtil",
];

const SECTIONS = ["main", "material", "sideboard", "mastery", "token", "pantheon", "generated", "status"];

function compactCard(card) {
  return {
    name: card.name,
    quantity: card.quantity,
    set: card.edition?.set?.prefix ?? null,
    collectorNumber: card.edition?.collector_number ?? null,
  };
}

async function fetchDeck(id) {
  const sourceUrl = `${PROFILE}/${id}`;
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${sourceUrl}: HTTP ${response.status}`);
  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${sourceUrl}: missing __NEXT_DATA__`);
  const source = JSON.parse(match[1]).props.pageProps.serverSideDeckData;
  const cards = Object.fromEntries(SECTIONS.map((section) => [section, (source.cards[section] ?? []).map(compactCard)]));
  return {
    id: source.id,
    name: source.name,
    productCode: source.sets?.[0] ?? "",
    champions: source.champions ?? [],
    sourceUrl,
    cards,
  };
}

const decks = [];
for (const id of DECK_IDS) {
  process.stdout.write(`Importing ${id}…\n`);
  decks.push(await fetchDeck(id));
}

const output = {
  schemaVersion: 1,
  source: PROFILE,
  decks,
};

await writeFile(new URL("../../app/src/features/official-products/decks.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`Imported ${decks.length} official product decklists.\n`);
