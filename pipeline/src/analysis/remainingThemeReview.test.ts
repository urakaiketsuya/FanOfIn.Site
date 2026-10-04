import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectThemeDefinitions, draftThemes } from '../../../shared/src/draftThemes.js';
import { reviewedThemes } from '../../../shared/src/reviewedThemes.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const indexRaw = read('./fixtures/theme-review-index.json');
const catalogRaw = read('../../../data/card-catalog.json');
const index = JSON.parse(indexRaw);
const catalog = JSON.parse(catalogRaw).cards;
const review = JSON.parse(read('../../../data/reference/remaining-theme-review.json'));
const publications = [
    ['fairies', 'draft-fairy', 57], ['mordred-fairy', 'draft-mordred-fairy', 77],
    ['direwolf-tokens', 'draft-wolf-tokens', 78], ['memorite-generation', 'draft-memorite', 162],
    ['angel-descent', 'draft-angel-descent', 8],
] as const;

test('all ten historical candidates reproduce frozen memberships; only approved definitions publish', () => {
    assert.match(review.sources.indexSha256, /^[a-f0-9]{64}$/);
    // Source hashes describe the original full snapshot, not this reduced fixture.
    assert.match(review.sources.catalogSha256, /^[a-f0-9]{64}$/);
    assert.match(review.sources.referenceSha256, /^[a-f0-9]{64}$/);
    assert.equal(review.candidates.length, 10);
    const definitions = review.candidates.map((c: { id: string }) => draftThemes.find(d => d.id === c.id)!);
    const result = detectThemeDefinitions(index, catalog, definitions);
    for (const entry of result.evidence) {
        const saved = review.candidates.find((c: { id: string }) => c.id === entry.id);
        assert.deepEqual(saved.matches, entry.matches);
        assert.deepEqual(saved.paths, entry.paths);
        // Prefix-related candidates must never borrow one another's comparisons.
        for (const comparison of saved.comparisons) {
            const suffix = comparison.id.slice(entry.id.length);
            assert.match(suffix, /^-(condition|without|anchor)-/);
        }
    }
    assert.equal(review.luxemMordred.decks, 92);
    assert.equal(review.luxemMordred.fairyPackageOverlap.length, 68);
    const expectedDistinct = [42, 61, 1, 75, 154, 151, 3, 1, 8, 200];
    assert.deepEqual(review.candidates.map((c: { distinctMatchingLists: number }) => c.distinctMatchingLists), expectedDistinct);
    for (const [id, draftId, count] of publications) {
        const definition = reviewedThemes.find(t => t.id === id)!;
        const saved = review.candidates.find((c: { id: string }) => c.id === draftId);
        assert.equal(saved.matches.length, count);
        assert.deepEqual(definition.paths, saved.paths);
    }
    for (const id of ['wolf', 'discorp-support', 'resonator-support', 'specter-support', 'memorite-payoff'])
        assert.equal(reviewedThemes.some(t => t.id === id), false);
});

const fixtures = [
    { id: 'fairies', main: ['Gildas, Faesworn Monarch', 'Dream Fairy', 'Snow Fairy'], material: [] },
    { id: 'mordred-fairy', main: ['Gildas, Faesworn Monarch', 'Dream Fairy'], material: ['Mordred, Flawless Blade'] },
    { id: 'direwolf-tokens', main: ['Direwolf Alpha', 'Dire Requiem'], material: [] },
    { id: 'memorite-generation', main: ['Protect Her At All Costs', 'Shardwing Searchlight'], material: ['Merlin, Memorite Vassal'] },
    { id: 'angel-descent', main: ['Angel Attendant', 'Benediction Angel', 'Fount Seraphim', "Seraphic Legion's Descent"], material: [] },
];
for (const fixture of fixtures) test(`${fixture.id}: required cards respect quantity, distinctness, and sections`, () => {
    const definition = reviewedThemes.find(t => t.id === fixture.id)!;
    const cardNames = [...fixture.main, ...fixture.material];
    const match = (main: string[], material: string[], sideboard: string[] = [], zero?: string) => {
        const encode = (names: string[]) => names.map(name => [cardNames.indexOf(name), name === zero ? 0 : 4]);
        return detectThemeDefinitions({ ...index, cardNames, decks: [{ ...index.decks[0], main: encode(main), material: encode(material), sideboard: encode(sideboard) }] }, catalog, [definition]).evidence[0].matches.length;
    };
    assert.equal(match(fixture.main, fixture.material), 1);
    for (const name of cardNames) {
        const main = fixture.main.filter(n => n !== name);
        const material = fixture.material.filter(n => n !== name);
        assert.equal(match(main, material), 0, `missing ${name}`);
        assert.equal(match(main, material, [name]), 0, `sideboard ${name}`);
        assert.equal(match(fixture.main, fixture.material, [], name), 0, `zero ${name}`);
        assert.equal(match([...main, main[0]], material), 0, `duplicate cannot replace ${name}`);
        const requirement = definition.paths[0].find(c => c.names?.includes(name));
        if (requirement?.section !== 'identity') {
            assert.equal(fixture.main.includes(name) ? match(main, [...material, name]) : match([...main, name], material), 0, `wrong section ${name}`);
        }
    }
});
