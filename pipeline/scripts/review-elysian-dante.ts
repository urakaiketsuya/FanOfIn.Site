import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decodeCardLines, type DeckCardIndexData } from '../../shared/src/analysis-types.js';
import { detectDraftThemes } from '../../shared/src/draftThemes.js';

// Recompute membership from source inputs so this review cannot silently use a stale draft snapshot.
const root = new URL('../../', import.meta.url);
const inputs = {
    index: 'data/analysis/deck-card-index.json',
    catalog: 'pipeline/.cache/cards.json',
    reference: 'data/analysis/reference-archetypes.json',
    taxonomy: 'data/analysis/archetype-taxonomy.json',
};
const raw = Object.fromEntries(await Promise.all(Object.entries(inputs).map(async ([key, path]) => [key, await readFile(new URL(path, root), 'utf8')])));
const index: DeckCardIndexData = JSON.parse(raw.index);
const catalog = JSON.parse(raw.catalog).cards;
const reference = JSON.parse(raw.reference);
const taxonomy = JSON.parse(raw.taxonomy);
const candidate = detectDraftThemes(index, catalog).evidence.find(e => e.id === 'draft-elysian-dante')!;
const decks = new Map(index.decks.map(deck => [deck.deckId, deck]));
const matched = new Set(candidate.matches.map(match => match.deckId));
const overlap = (entries: { id: string; name: string; deckIds: string[] }[]) => entries.flatMap(entry => {
    const deckIds = [...new Set(entry.deckIds)].filter(id => matched.has(id)).sort();
    return deckIds.length ? [{ id: entry.id, name: entry.name, deckIds }] : [];
});
const lists = candidate.matches.map(match => {
    const deck = decks.get(match.deckId)!;
    const positive = (lines: typeof deck.main) => decodeCardLines(lines, index.cardNames).filter(card => card.quantity > 0).sort((a, b) => a.name.localeCompare(b.name));
    const main = positive(deck.main);
    const material = positive(deck.material);
    // Preserve quantities and section boundaries; sideboard never defines identity.
    const signature = createHash('sha256').update(JSON.stringify({ main, material })).digest('hex');
    return { ...match, signature, main, material };
});
const pathGroups = [
    { id: 'direct-only', matches: lists.filter(list => list.paths.length === 1 && list.paths[0].path === 0) },
    { id: 'token-only', matches: lists.filter(list => list.paths.length === 1 && list.paths[0].path === 1) },
    { id: 'both', matches: lists.filter(list => list.paths.length === 2) },
].map(group => ({ id: group.id, deckIds: group.matches.map(list => list.deckId), distinctLists: new Set(group.matches.map(list => list.signature)).size }));
const relevantNames = new Set(candidate.matches.flatMap(match => match.paths.flatMap(path => path.cards)));
for (const path of candidate.paths) for (const requirement of path) for (const name of requirement.names ?? []) relevantNames.add(name);
relevantNames.add('Elysian Test Subject');
const output = {
    version: 1, status: 'draft', candidate,
    sources: Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, { path: inputs[key as keyof typeof inputs], sha256: createHash('sha256').update(value).digest('hex') }])),
    distinctLists: new Set(lists.map(list => list.signature)).size,
    pathGroups,
    referenceOverlaps: overlap(reference.evidence.map((entry: { id: string; deckIds: string[] }) => ({ ...entry, name: reference.definitions.find((d: { id: string }) => d.id === entry.id)?.name ?? entry.id }))),
    materialOverlaps: overlap(taxonomy.materialArchetypes),
    unmatchedMaterialDeckIds: taxonomy.materialArchetypes.filter((entry: { deckIds: string[] }) => entry.deckIds.some(id => matched.has(id))).flatMap((entry: { deckIds: string[] }) => entry.deckIds.filter(id => !matched.has(id))).sort(),
    clusterOverlaps: overlap(taxonomy.clusters),
    catalogEvidence: catalog.filter((card: { name: string }) => relevantNames.has(card.name)),
    lists,
};
await writeFile(new URL('data/reference/elysian-dante-review.json', root), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ distinctLists: output.distinctLists, pathGroups, referenceOverlaps: output.referenceOverlaps, materialOverlaps: output.materialOverlaps, clusterOverlaps: output.clusterOverlaps }, null, 2));
