import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deckBuildSignature, shortHash, type SleevedDeck, type TcgArchitectDeck, type Card, type CollectedDeckData, type CollectedLines, type DeckLine, type ShoutAtYourDecksDeck } from '@gatcg/shared';
import { shouldKeepDeck } from '../shoutatyourdecks/filter.js';
import { shouldKeepSleevedDeck } from '../sleeved/filter.js';
import { shouldKeepTcgArchitectDeck } from '../tcgarchitect/filter.js';
import { writeJsonAtomic } from '../lib/atomicWrite.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const digest = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 24);
const normalized = (lines: DeckLine[]) => {
  const counts = new Map<string, number>();
  for (const { name, quantity } of lines) counts.set(name, (counts.get(name) ?? 0) + quantity);
  return [...counts].sort((a, b) => a[0].localeCompare(b[0])).map(([name, quantity]) => ({ name, quantity }));
};
export function buildCollectedDecks(records: ShoutAtYourDecksDeck[], catalog: Pick<Card, "name" | "types" | "subtypes">[] = []): CollectedDeckData {
  const champions = new Set(catalog.filter(c => c.types.includes("CHAMPION") && !c.subtypes.includes("SPIRIT")).map(c => c.name));
  const valid = records.filter(d => d.mainDeck?.length && d.materialDeck?.length && [d.mainDeck, d.materialDeck, d.sideDeck ?? [], d.pantheonDeck ?? []].every(lines => lines.every(l => typeof l.name === 'string' && l.name.trim() && Number.isSafeInteger(l.quantity) && l.quantity > 0)));
  const cardNames = [...new Set(valid.flatMap(d => [...d.mainDeck, ...d.materialDeck, ...(d.pantheonDeck ?? []), ...(d.sideDeck ?? [])].map(l => l.name)))].sort();
  const indexes = new Map(cardNames.map((name, index) => [name, index]));
  const encode = (lines: DeckLine[]): CollectedLines => normalized(lines).map(l => [indexes.get(l.name)!, l.quantity]);
  const builds = new Map<string, CollectedDeckData['decks'][number]>();
  for (const deck of valid) {
    const material = [...deck.materialDeck, ...(deck.pantheonDeck ?? [])];
    const signature = deckBuildSignature(deck.mainDeck, material);
    const format = deck.format ?? 'UNKNOWN';
    const id = digest(`${format}\n${signature}`);
    const championName = normalized(material).find(line => champions.has(line.name))?.name.split(',')[0].trim() ?? null;
    const variant = { id: digest(JSON.stringify([normalized(deck.mainDeck), normalized(material), normalized(deck.sideDeck ?? [])])), main: encode(deck.mainDeck), material: encode(material), sideboard: encode(deck.sideDeck ?? []) };
    const existing = builds.get(id);
    const date = /^\d{4}-\d{2}-\d{2}/.test(deck.fetchedAt) ? deck.fetchedAt.slice(0, 10) : '';
    if (existing) {
      if (!existing.variants.some(v => v.id === variant.id)) existing.variants.push(variant);
      // Refreshing a source must not promote old builds as newly collected.
      if (date && (!existing.collectedAt || date < existing.collectedAt)) existing.collectedAt = date;
    } else builds.set(id, { id, tournamentHash: shortHash(signature), title: `${championName ?? 'Unknown champion'} · ${format === 'PANTHEON' ? 'Pantheon' : format === 'STANDARD' ? 'Standard' : 'Unknown format'}`, championName, format, collectedAt: date, variants: [variant] });
  }
  const decks = [...builds.values()].sort((a, b) => a.id.localeCompare(b.id));
  for (const deck of decks) deck.variants.sort((a, b) => a.id.localeCompare(b.id));
  return { generatedAt: new Date().toISOString(), cardNames, decks };
}

/** Anonymous allowlist projection; raw source metadata never enters the public browse artifact. */
export async function writeCollectedDecks(): Promise<void> {
  const records: ShoutAtYourDecksDeck[] = [];
  const provenance: { source: string; id: string; build: string }[] = [];
  for (const source of ['shoutatyourdecks', 'sleeved', 'tcgarchitect']) {
    const directory = path.join(root, '../data', source, 'decks');
    for (const file of (await readdir(directory)).filter(f => f.endsWith('.json')).sort()) {
      const deck = JSON.parse(await readFile(path.join(directory, file), 'utf8')) as ShoutAtYourDecksDeck;
      if (!(source === "shoutatyourdecks" ? shouldKeepDeck(deck) : source === "sleeved" ? shouldKeepSleevedDeck(deck as SleevedDeck) : shouldKeepTcgArchitectDeck(deck as TcgArchitectDeck))) continue;
      records.push(deck);
      if (deck.mainDeck && deck.materialDeck) provenance.push({ source, id: deck.id, build: digest(`${deck.format ?? 'UNKNOWN'}\n${deckBuildSignature(deck.mainDeck, [...deck.materialDeck, ...(deck.pantheonDeck ?? [])])}`) });
    }
  }
  const catalog = JSON.parse(await readFile(path.join(root, "../data/card-catalog.json"), "utf8")) as { cards: Card[] };
  const output = buildCollectedDecks(records, catalog.cards);
  const destination = path.join(root, '../data/community/collected.json');
  try {
    const previous = JSON.parse(await readFile(destination, 'utf8')) as CollectedDeckData;
    const dates = new Map(previous.decks.map(d => [d.id, d.collectedAt]));
    for (const deck of output.decks) if (dates.has(deck.id)) deck.collectedAt = dates.get(deck.id)!;
    output.generatedAt = previous.generatedAt;
    if (JSON.stringify(previous) !== JSON.stringify(output)) output.generatedAt = new Date().toISOString();
  } catch { /* First publication. */ }
  await writeJsonAtomic(destination, output, 0);
  await mkdir(path.join(root, '.cache'), { recursive: true });
  await writeFile(path.join(root, '.cache/collected-provenance.json'), JSON.stringify(provenance));
  console.log(`Collected: ${records.length} lists → ${output.decks.length} anonymous builds`);
}
