import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { themeRefinements } from '../../../shared/src/themeRefinements.js';
import { detectThemeDefinitions, summarizeDraftThemes } from '../../../shared/src/draftThemes.js';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const indexRaw = read('../../../data/analysis/deck-card-index.json');
const catalogRaw = read('../../.cache/cards.json');
const catalog = JSON.parse(catalogRaw).cards;
const index = JSON.parse(indexRaw);

test('refinement evidence reproduces all fourteen candidates against its current sources', () => {
    const saved = JSON.parse(read('../../../data/reference/theme-refinement-review.json'));
    const hash = (s: string) => createHash('sha256').update(s).digest('hex');
    assert.deepEqual(saved.sources, { indexSha256: hash(indexRaw), catalogSha256: hash(catalogRaw), definitionsSha256: hash(JSON.stringify(themeRefinements)) });
    const result = detectThemeDefinitions(index, catalog, themeRefinements);
    assert.equal(result.evidence.length, 14);
    assert.deepEqual(saved.review, summarizeDraftThemes(result.evidence));
    for (const entry of result.evidence) {
        const candidate = saved.candidates.find((c: { id: string }) => c.id === entry.id);
        assert.deepEqual(candidate.matches, entry.matches);
        assert.deepEqual(candidate.paths, entry.paths);
        for (const comparison of candidate.comparisons) assert.match(comparison.id.slice(entry.id.length), /^-(condition|without|anchor)-/);
    }
});

function matches(id: string, main: string[], material: string[] = [], sideboard: string[] = [], zero?: string) {
    const cardNames = [...new Set([...main, ...material, ...sideboard])];
    const encode = (names: string[]) => names.map(n => [cardNames.indexOf(n), n === zero ? 0 : 4]);
    return detectThemeDefinitions({ ...index, cardNames, decks: [{ ...index.decks[0], main: encode(main), material: encode(material), sideboard: encode(sideboard) }] }, catalog, [themeRefinements.find(t => t.id === id)!]).evidence[0].matches.length;
}

test('Memorite payoffs require their distinct enablers', () => {
    const generator = 'Shardwing Searchlight';
    assert.equal(matches('memorite-blade', [generator], ['Shardforged Blade']), 1);
    assert.equal(matches('memorite-blade', [generator, 'Shardforged Blade']), 0);
    assert.equal(matches('memorite-blade', [], ['Shardforged Blade'], [generator]), 0);
    assert.equal(matches('memorite-blade', [generator], ['Shardforged Blade'], [], generator), 0);
    assert.equal(matches('memorite-facet', [generator, 'Facet Together'], ['Shardforged Blade']), 1);
    assert.equal(matches('memorite-facet', [generator, 'Facet Together']), 0);
    assert.equal(matches('memorite-anthem', [generator, 'Crystallized Anthem'], ['Merlin, Memorite Vassal']), 1);
    assert.equal(matches('memorite-anthem', [generator, 'Crystallized Anthem'], [], ['Merlin, Memorite Vassal']), 0);
});

test('all Resonator support roles require Main music; copies cannot replace distinct songs', () => {
    const allies = ['Fanclub Leader', 'Musical Curator', 'ZENA, Echo Weaver', 'Forese, Fervid Cantor'];
    for (const id of ['resonator-fanclub', 'resonator-forese', 'resonator-module']) {
        assert.equal(matches(id, [...allies, 'Belted Tune', 'Steady Verse'], ['ResonanTech Module']), 1);
        assert.equal(matches(id, [...allies, 'Belted Tune', 'Belted Tune'], ['ResonanTech Module']), 0);
        assert.equal(matches(id, allies, ['ResonanTech Module', 'Belted Tune', 'Steady Verse']), 0);
    }
});

test('Specter support distinguishes class access, combat, graveyard support and mastery access', () => {
    const specters = ['Liminal Guide', 'Unyielding Wraithguard', 'Evercurrent Raider'];
    assert.equal(matches('specter-templar', [...specters, 'Incinerated Templar'], ['Alice, Distorted Queen']), 1);
    assert.equal(matches('specter-templar', [...specters, 'Incinerated Templar'], ['Merlin, Memorite Vassal']), 0);
    assert.equal(matches('specter-lawsur', [...specters, 'Lawsur, the Carpenter']), 1);
    assert.equal(matches('specter-ticket', specters, ['Ticket to the Afterlife']), 1);
    assert.equal(matches('specter-ticket', specters, [], ['Ticket to the Afterlife']), 0);
    assert.equal(matches('specter-distort', [...specters, 'Distort Reality'], ['Alice, Distorted Queen']), 1);
    assert.equal(matches('specter-distort', [...specters, 'Distort Reality']), 0);
    assert.equal(matches('specter-phantasmagoria', specters, ['Alice, Distorted Queen']), 1);
    assert.equal(matches('specter-phantasmagoria', [...specters, 'Phantasmagoria']), 0);
});

test('Tower needs Automaton allies and Officer needs Ranger access', () => {
    const bots = ['Cellforger Droid', 'Haze Droid', 'Virgil, Altered Future'];
    assert.equal(matches('discorp-tower', [...bots, 'Tower of Dis']), 1);
    assert.equal(matches('discorp-tower', ['Cellforger Droid', 'Haze Droid', 'Acheron Express Officer', 'Tower of Dis']), 0);
    assert.equal(matches('discorp-officer', [...bots, 'Acheron Express Officer'], ['Diana, Keen Huntress']), 1);
    assert.equal(matches('discorp-officer', [...bots, 'Acheron Express Officer']), 0);
});

test('publication includes the eleven approved refinements and reproduces refreshed evidence', async () => {
    const { reviewedThemes } = await import('../../../shared/src/reviewedThemes.js');
    const saved = JSON.parse(read('../../../data/reference/reviewed-theme-evidence.json'));
    const result = detectThemeDefinitions(index, catalog, reviewedThemes);
    assert.deepEqual(saved.evidence, result.evidence);
    for (const candidate of themeRefinements) {
        const published = reviewedThemes.find(t => t.id === candidate.id);
        if (['wolf-refinement', 'discorp-tower', 'discorp-officer'].includes(candidate.id)) assert.equal(published, undefined);
        else assert.deepEqual(published?.paths, candidate.paths);
    }
});

test('curated target pools retain their catalog cost, element and intersection boundaries', () => {
    type Card = { name: string; types: string[]; subtypes: string[]; cost_reserve: number | null; elements: string[] };
    const cards = catalog as Card[];
    const namedPool = (id: string, condition: number) => themeRefinements.find(t => t.id === id)!.paths[0][condition].names!.slice().sort();
    assert.deepEqual(namedPool('resonator-forese', 3), cards.filter(c => c.types.includes('ALLY') && c.subtypes.includes('RESONATOR') && c.cost_reserve !== null && c.cost_reserve <= 3 && c.elements.every(e => ['NORM', 'FIRE', 'WATER', 'WIND'].includes(e))).map(c => c.name).sort());
    assert.deepEqual(namedPool('specter-templar', 2), cards.filter(c => c.types.includes('ALLY') && c.subtypes.includes('SPECTER') && c.cost_reserve !== null && c.cost_reserve <= 3 && c.name !== 'Incinerated Templar').map(c => c.name).sort());
    assert.deepEqual(namedPool('discorp-tower', 0), cards.filter(c => c.types.includes('ALLY') && c.subtypes.includes('DISCORP') && c.subtypes.includes('AUTOMATON')).map(c => c.name).sort());
});
