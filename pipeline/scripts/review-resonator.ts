import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { decodeCardLines, type DeckCardIndexData } from '../../shared/src/analysis-types.js';
import { detectThemeDefinitions, draftThemes, summarizeThemeRecurrence, type ThemeCard } from '../../shared/src/draftThemes.js';

const root = new URL('../../', import.meta.url);
const indexRaw = await readFile(new URL('data/analysis/deck-card-index.json', root), 'utf8');
const catalogRaw = await readFile(new URL('pipeline/.cache/cards.json', root), 'utf8');
const index: DeckCardIndexData = JSON.parse(indexRaw);
const catalog: (ThemeCard & { effect: string })[] = JSON.parse(catalogRaw).cards;
const candidate = draftThemes.find(theme => theme.id === 'draft-resonator')!;
const definitions = [candidate, ...[[2, 2], [3, 1]].map(([allies, music]) => ({
    ...candidate, id: `comparison-${allies}-allies-${music}-music`,
    paths: [[{ ...candidate.paths[0][0], minimum: allies }, { ...candidate.paths[0][1], minimum: music }]],
})), draftThemes.find(theme => theme.id === 'draft-resonator-support')!];
const result = detectThemeDefinitions(index, catalog, definitions);
const baseline = result.evidence[0];
const matched = new Set(baseline.matches.map(match => match.deckId));
const reviewedIds = new Set(result.evidence.flatMap(entry => entry.matches.map(match => match.deckId)));
const cards = new Map(catalog.map(card => [card.name, card]));
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const lists = [...new Map(index.decks.map(deck => [deck.deckId, deck])).values()]
    .filter(deck => reviewedIds.has(deck.deckId)).sort((a, b) => a.deckId.localeCompare(b.deckId)).map(deck => {
        const positive = (lines: typeof deck.main) => decodeCardLines(lines, index.cardNames).filter(card => card.quantity > 0).sort((a, b) => a.name.localeCompare(b.name));
        const main = positive(deck.main);
        const material = positive(deck.material);
        const mainNames = [...new Set(main.map(card => card.name))];
        return { deckId: deck.deckId, baseline: matched.has(deck.deckId), signature: hash(JSON.stringify({ main, material })),
            resonators: mainNames.filter(name => cards.get(name)?.types.includes('ALLY') && cards.get(name)?.subtypes.includes('RESONATOR')),
            music: mainNames.filter(name => cards.get(name)?.subtypes.some(type => ['HARMONY', 'MELODY'].includes(type))), main, material };
    });
const relevantNames = new Set(lists.flatMap(list => [...list.resonators, ...list.music]));
const output = { version: 1, status: 'review', sources: { indexSha256: hash(indexRaw), catalogSha256: hash(catalogRaw) },
    candidate: baseline, recurrence: summarizeThemeRecurrence(matched),
    distinctMatchingLists: new Set(lists.filter(list => list.baseline).map(list => list.signature)).size,
    comparisons: result.evidence.slice(1).map(entry => ({ definition: definitions.find(definition => definition.id === entry.id),
        matches: entry.matches, addedDeckIds: entry.matches.filter(match => !matched.has(match.deckId)).map(match => match.deckId),
        baselineOverlap: entry.matches.filter(match => matched.has(match.deckId)).length })),
    catalogEvidence: catalog.filter(card => relevantNames.has(card.name)), lists };
const target = new URL('data/reference/resonator-review.json', root);
const temporary = new URL(`${target.href}.${randomUUID()}.tmp`);
try { await writeFile(temporary, JSON.stringify(output, null, 2) + '\n'); await rename(temporary, target); }
finally { await rm(temporary, { force: true }); }
console.log(JSON.stringify({ recurrence: output.recurrence, distinctMatchingLists: output.distinctMatchingLists,
    comparisons: output.comparisons.map(({ definition, addedDeckIds, baselineOverlap }) => ({ id: definition?.id, addedDeckIds, baselineOverlap })),
    lists: lists.map(({ deckId, baseline, resonators, music }) => ({ deckId, baseline, resonators, music })) }, null, 2));
