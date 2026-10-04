import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { themeRefinements } from '../../shared/src/themeRefinements.js';
import { decodeCardLines, type DeckCardIndexData } from '../../shared/src/analysis-types.js';
import { detectThemeDefinitions, summarizeDraftThemes, type ThemeDefinition, type ThemeCard } from '../../shared/src/draftThemes.js';

const root = new URL('../../', import.meta.url);
const indexRaw = await readFile(new URL('data/analysis/deck-card-index.json', root), 'utf8');
const catalogRaw = await readFile(new URL('data/card-catalog.json', root), 'utf8');
const index: DeckCardIndexData = JSON.parse(indexRaw);
const catalog: (ThemeCard & Record<string, unknown>)[] = JSON.parse(catalogRaw).cards;
const candidates = themeRefinements;
const owners = new Map<string, string>();
const comparisons: ThemeDefinition[] = candidates.flatMap(candidate => candidate.paths[0].flatMap((condition, i) => {
    const variants: ThemeDefinition[] = [];
    if (condition.minimum > 1) for (const minimum of [condition.minimum - 1, condition.minimum + 1]) {
        const paths = structuredClone(candidate.paths);
        paths[0][i].minimum = minimum;
        variants.push({ ...candidate, id: `${candidate.id}-condition-${i}-minimum-${minimum}`, paths });
    }
    if (candidate.paths[0].length > 1) variants.push({ ...candidate, id: `${candidate.id}-without-${i}`, paths: [candidate.paths[0].filter((_, j) => i !== j)] });
    if ((condition.names?.length ?? 0) > 1 && condition.names!.length <= 8) for (const name of condition.names!) {
        const paths = structuredClone(candidate.paths);
        paths[0][i] = { ...condition, minimum: 1, names: [name] };
        variants.push({ ...candidate, id: `${candidate.id}-anchor-${name}`, paths });
    }
    for (const variant of variants) owners.set(variant.id, candidate.id);
    return variants;
}));
const result = detectThemeDefinitions(index, catalog, [...candidates, ...comparisons]);
const baseline = result.evidence.slice(0, candidates.length);
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const decks = new Map(index.decks.map(deck => [deck.deckId, deck]));
const signatures = new Map([...decks].map(([id, deck]) => {
    const positive = (lines: typeof deck.main) => decodeCardLines(lines, index.cardNames).filter(c => c.quantity > 0).sort((a, b) => a.name.localeCompare(b.name));
    return [id, hash(JSON.stringify({ main: positive(deck.main), material: positive(deck.material) }))];
}));
const relevant = new Set(candidates.flatMap(t => t.paths.flatMap(p => p.flatMap(c => c.names ?? []))));
for (const name of ['Phantasmagoria', 'Fractured Memories']) relevant.add(name);
for (const entry of baseline) for (const match of entry.matches) for (const path of match.paths) for (const card of path.cards) relevant.add(card);
const output = { version: 1, sources: { indexSha256: hash(indexRaw), catalogSha256: hash(catalogRaw), definitionsSha256: hash(JSON.stringify(candidates)) },
    population: result.population, eligibleDecks: result.eligibleDecks,
    candidates: baseline.map(candidate => {
        const members = new Set(candidate.matches.map(m => m.deckId));
        return { ...candidate, distinctMatchingLists: new Set([...members].map(id => signatures.get(id))).size,
            listSignatures: [...members].map(deckId => ({ deckId, signature: signatures.get(deckId) })),
            comparisons: result.evidence.slice(candidates.length).filter(e => owners.get(e.id) === candidate.id).map(e => ({
                id: e.id, paths: e.paths, decks: e.matches.length,
                retainedDeckIds: e.matches.filter(m => members.has(m.deckId)).map(m => m.deckId),
                addedDeckIds: e.matches.filter(m => !members.has(m.deckId)).map(m => m.deckId),
            })) };
    }), review: summarizeDraftThemes(baseline), catalogEvidence: catalog.filter(c => relevant.has(c.name)).map(c =>
        Object.fromEntries(['name', 'slug', 'classes', 'types', 'subtypes', 'elements', 'level',
            'cost_memory', 'cost_reserve', 'power', 'speed', 'effect', 'legality'].map(key => [key, c[key]]))) };
const target = new URL('data/reference/theme-refinement-review.json', root);
const temporary = new URL(`${target.href}.${randomUUID()}.tmp`);
try { await writeFile(temporary, JSON.stringify(output, null, 2) + '\n'); await rename(temporary, target); }
finally { await rm(temporary, { force: true }); }
console.log(JSON.stringify(output.candidates.map(c => ({ id: c.id, decks: c.matches.length, distinct: c.distinctMatchingLists,
    review: output.review.find(r => r.id === c.id), comparisons: c.comparisons.map(x => ({ id: x.id, decks: x.decks, retained: x.retainedDeckIds.length, added: x.addedDeckIds.length })) })), null, 2));
