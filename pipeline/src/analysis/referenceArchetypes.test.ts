import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateArchetypeRule, evaluateDefinition, ruleDecks, parseStrategyStore, type ArchetypeRule, type ReferenceArchetypes, type RuleDeck, type DeckSighting, type ArchetypeCluster } from '@gatcg/shared';
import { analyzeReferenceArchetypes } from './referenceArchetypes.js';
const rule: ArchetypeRule = { anyCards: ['A', 'B'], allCards: [], excludeCards: [], comboGroups: [], element: null, typeCounts: {} };
const deck: RuleDeck = { deckId: '1:1', cards: ['B'], elements: ['FIRE'], typeCounts: { ALLY: 20 }, materialEntries: 12, unknownCards: [] };
test('Fractal semantics: ANY, OR of ALL groups, exclusions, type quantities, element and material gate', () => {
    assert.equal(evaluateArchetypeRule(rule, deck).matches, true);
    assert.equal(evaluateArchetypeRule({ ...rule, anyCards: [] }, deck).matches, false);
    assert.equal(evaluateArchetypeRule({ ...rule, allCards: ['A'] }, deck).matches, false);
    assert.equal(evaluateArchetypeRule({ ...rule, comboGroups: [['A', 'B'], ['B']] }, deck).matches, true);
    assert.equal(evaluateArchetypeRule({ ...rule, comboGroups: [['A', 'B']] }, deck).matches, false);
    assert.equal(evaluateArchetypeRule({ ...rule, excludeCards: ['B'] }, deck).matches, false);
    assert.equal(evaluateArchetypeRule({ ...rule, typeCounts: { ALLY: 20 }, element: 'Fire' }, deck).matches, true);
    assert.equal(evaluateArchetypeRule({ ...rule, typeCounts: { ALLY: -19 } }, deck).matches, false);
    assert.equal(evaluateArchetypeRule(rule, { ...deck, materialEntries: 13 }).matches, false);
});
test('dictionary decoding excludes sideboards, counts main quantities, deduplicates deck IDs', () => {
    const d = { deckId: '1:1', main: [[0, 4]] as [
            number,
            number
        ][], material: [[1, 1]] as [
            number,
            number
        ][], sideboard: [[2, 4]] as [
            number,
            number
        ][] };
    const decoded = ruleDecks({ generatedAt: 'x', cardNames: ['B', 'Spirit', 'A'], decks: [d, d] }, [{ name: 'B', types: ['ALLY'], elements: ['NORM'], level: null }, { name: 'Spirit', types: ['CHAMPION'], elements: ['FIRE'], level: 0 }]);
    assert.equal(decoded.length, 1);
    assert.deepEqual(decoded[0].cards, ['B', 'Spirit']);
    assert.equal(decoded[0].typeCounts.ALLY, 4);
    assert.deepEqual(decoded[0].elements, ['FIRE']);
});
const reference: ReferenceArchetypes = { source: { name: 'test', url: 'test', revision: null, sha256: 'x', file: 'test' }, definitions: [{ id: 'a', name: 'A', parentId: null, rule, sourceLine: 1, reviewStatus: 'unreviewed' }, { id: 'b', name: 'B', parentId: 'a', rule: { ...rule, allCards: ['C'] }, sourceLine: 2, reviewStatus: 'unreviewed' }] };
test('parent rules and cycles fail closed', () => {
    assert.equal(evaluateDefinition(reference.definitions[1], reference.definitions, deck).matches, false);
    const defs = structuredClone(reference.definitions);
    defs[0].parentId = 'b';
    assert.equal(evaluateDefinition(defs[0], defs, deck).matches, false);
});
test('overlapping membership, independent evidence, deterministic output and immutable builds', () => {
    const decks = [{ ...deck, cards: ['B', 'C'] }, { ...deck, deckId: '2:2', cards: ['B', 'C'] }, { ...deck, deckId: '2:3', cards: ['B', 'C'] }];
    const sightings = decks.map((d, i) => ({ deckId: d.deckId, player: i + 1, eventId: i ? 2 : 1, championName: 'Lorraine', format: 'standard', seasonName: 'Test' } as DeckSighting));
    const builds = [{ id: 'stable', deckIds: ['1:1', '2:2', 'outside'], namingCards: ['B', 'C'] } as ArchetypeCluster];
    const before = JSON.stringify(builds);
    const a = analyzeReferenceArchetypes(reference, [...decks, decks[0]], sightings, builds, 'fixed');
    assert.equal(a.population, 3);
    assert.equal(a.evidence[0].deckIds.length, 3);
    assert.equal(a.evidence[0].overlaps[0].decks, 3);
    assert.equal(a.evidence[0].confidence, 'recurring');
    assert.deepEqual(a.evidence[0].builds, [{ id: 'stable', matched: 2, total: 3 }]);
    assert.deepEqual(a, analyzeReferenceArchetypes(reference, [...decks].reverse(), sightings, builds, 'fixed'));
    assert.equal(JSON.stringify(builds), before);
    assert.equal(analyzeReferenceArchetypes(reference, [deck], sightings, builds, 'fixed').evidence[0].confidence, 'candidate');
});
test('imported fixture has unique IDs, faithful Crux ANY semantics and subtypes', () => {
    const input = JSON.parse(readFileSync(new URL('../../../data/reference/fractal-archetypes.json', import.meta.url), 'utf8')) as ReferenceArchetypes;
    assert.equal(input.definitions.length, 75);
    assert.equal(new Set(input.definitions.map(d => d.id)).size, 75);
    const crux = input.definitions.find(d => d.name === 'Crux Lorraine')!;
    assert.equal(crux.rule.anyCards.length, 4);
    assert.equal(crux.rule.allCards.length, 0);
    assert.equal(evaluateDefinition(crux, input.definitions, { ...deck, cards: ['Ghosts of Pendragon'] }).matches, true);
    assert.equal(evaluateDefinition(crux, input.definitions, { ...deck, cards: ['Ghosts of Pendragon', 'Merlin, Kingslayer'] }).matches, false);
});
test('backup parser rejects malformed rules and unsubstantiated verified mechanics', () => {
    assert.throws(() => parseStrategyStore('{"version":1,"entries":[{}],"drafts":[]}'));
    assert.deepEqual(parseStrategyStore('{"version":1,"entries":[],"drafts":[]}'), { version: 1, entries: [], drafts: [] });
});
test('publication requires accepted parents and preserves public output on invalid input', async () => {
    const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { writeReferenceArchetypes } = await import('./writeReferenceArchetypes.js');
    const dir = await mkdtemp(join(tmpdir(), 'strategy-publication-'));
    try {
        await mkdir(join(dir, 'reference'));
        await mkdir(join(dir, 'analysis'));
        await writeFile(join(dir, 'reference/fractal-archetypes.json'), JSON.stringify(reference));
        const catalog = [{ name: 'B', types: ['ALLY'], elements: ['FIRE'], level: null }, { name: 'C', types: ['ALLY'], elements: ['FIRE'], level: null }, { name: 'A', types: [], elements: [], level: null }];
        const index = { generatedAt: 'x', cardNames: ['B', 'C'], decks: [{ deckId: '1:1', main: [[0, 1], [1, 1]] as [
                        number,
                        number
                    ][], material: [], sideboard: [] }] };
        const entry = (i: number) => ({ definition: { ...reference.definitions[i], reviewStatus: 'accepted' }, coreCards: ['B'], description: 'Test', packageIds: [], sourceHash: 'x', mechanics: 'unverified', mechanicsEvidence: '' });
        const backup = join(dir, 'backup.json');
        await writeFile(backup, JSON.stringify({ version: 1, entries: [entry(1)], drafts: [] }));
        await assert.rejects(writeReferenceArchetypes(dir, index, catalog, [], [], backup), /Accept parent/);
        await writeFile(backup, JSON.stringify({ version: 1, entries: [entry(0), entry(1)], drafts: [] }));
        await writeReferenceArchetypes(dir, index, catalog, [], [], backup);
        const published = JSON.parse(await readFile(join(dir, 'analysis/curated-strategies.json'), 'utf8'));
        for (const name of ['reference-archetypes', 'curated-strategies']) {
            const raw = await readFile(join(dir, `analysis/${name}.json`), 'utf8');
            assert.ok(raw.slice(0, 200).includes(JSON.parse(raw).generatedAt), 'Manifest prefix must contain generation');
        }
        assert.equal(published.definitions.length, 2);
        assert.equal(published.evidence[0].deckIds.length, 1);
        const prior = await readFile(join(dir, 'analysis/curated-strategies.json'), 'utf8');
        await writeFile(backup, JSON.stringify({ version: 1, entries: [{ ...entry(0), sourceHash: 'stale' }], drafts: [] }));
        await assert.rejects(writeReferenceArchetypes(dir, index, catalog, [], [], backup), /source changes/);
        assert.equal(await readFile(join(dir, 'analysis/curated-strategies.json'), 'utf8'), prior);
        await writeReferenceArchetypes(dir, index, catalog, [], []);
        assert.equal(JSON.parse(await readFile(join(dir, 'analysis/curated-strategies.json'), 'utf8')).definitions.length, 2);
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
});
