import { matchRequirementPaths, validRequirementPaths } from '../../../shared/src/cardRequirements.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateArchetypeRule, ruleDecks, validArchetypeRule } from '../../../shared/src/archetypeRules.js';
import { detectDraftThemes, elysianDanteThemeProposal } from '../../../shared/src/draftThemes.js';

test('curated matcher preserves all 17 reviewed Dante memberships and fails closed without section evidence', () => {
    const index = JSON.parse(readFileSync(new URL('../../../data/analysis/deck-card-index.json', import.meta.url), 'utf8'));
    const catalog = JSON.parse(readFileSync(new URL('../../.cache/cards.json', import.meta.url), 'utf8')).cards;
    const rule = { anyCards: ['Dante, Hematic Overdrive'], allCards: [], excludeCards: [], comboGroups: [], element: null, typeCounts: {}, paths: elysianDanteThemeProposal.paths };
    const expected = detectDraftThemes(index, catalog, [elysianDanteThemeProposal]).evidence[0].matches.map(m => m.deckId);
    const decks = ruleDecks(index, catalog);
    const matched = decks.filter(d => evaluateArchetypeRule(rule, d).matches);
    assert.equal(matched.length, 17);
    assert.deepEqual(matched.map(d => d.deckId), expected);
    assert.equal(evaluateArchetypeRule(rule, { ...matched[0], sections: undefined }).matches, false);
    assert.equal(evaluateArchetypeRule(rule, { ...matched[0], catalogCards: undefined }).matches, false);
    assert.equal(evaluateArchetypeRule({ ...rule, paths: [] }, matched[0]).matches, false);
    assert.equal(evaluateArchetypeRule({ ...rule, paths: [[]] }, matched[0]).matches, false);
    assert.equal(evaluateArchetypeRule({ ...rule, anyCards: [] }, matched[0]).matches, false);
    // Import remains unavailable until the review interface can display these conditions.
    assert.equal(validArchetypeRule(rule), false);
    assert.equal(validArchetypeRule({ ...rule, paths: undefined }), true);
});

test('section requirements count names instead of copies and ignore sideboards', () => {
    const catalog = ['Dante', 'Ally A', 'Ally B'].map(name => ({ name, types: ['ALLY'], subtypes: ['ELYSIAN'], elements: [], level: null }));
    const rule = { anyCards: ['Dante'], allCards: [], excludeCards: [], comboGroups: [], element: null, typeCounts: {}, paths: [[{ section: 'material' as const, minimum: 1, names: ['Dante'] }, { section: 'main' as const, minimum: 2, type: 'ALLY', subtypes: ['ELYSIAN'] }]] };
    const match = (main: [number, number][], material: [number, number][]) => evaluateArchetypeRule(rule, ruleDecks({ generatedAt: '', cardNames: catalog.map(c => c.name), decks: [{ deckId: '1:1', main, material, sideboard: [[2, 4]] }] }, catalog)[0]).matches;
    assert.equal(match([[1, 4]], [[0, 1]]), false);
    assert.equal(match([[1, 4], [1, 1]], [[0, 1]]), false);
    assert.equal(match([[1, 1], [2, 1]], [[0, 1]]), true);
    assert.equal(match([[0, 1], [1, 1], [2, 1]], []), false);
    assert.equal(match([[1, 1], [2, 0]], [[0, 1]]), false);
});


test('requirement validation rejects malformed filters without broadening membership', () => {
    const valid = { section: 'main', minimum: 1, type: 'ALLY' };
    const invalid = [null, {}, [], [[]], [[null]], [[[]]],
        ...[
            { section: 'sideboard' }, { minimum: 0 }, { minimum: -1 },
            { minimum: 1.5 }, { minimum: Infinity }, { minimum: '1' },
            { names: [] }, { names: [''] }, { names: [1] },
            { subtypes: [] }, { subtypes: ['  '] }, { prefix: '' },
            { type: ' ' }, { subtype: 'ELYSIAN' },
        ].map(patch => [[{ ...valid, ...patch }]]),
        [[{ section: 'main', minimum: 1 }]],
    ];
    const sections = { main: new Set(['Ally']), material: new Set<string>(), identity: new Set(['Ally']) };
    const cards = new Map([['Ally', { name: 'Ally', types: ['ALLY'] }]]);
    for (const value of invalid) {
        assert.equal(validRequirementPaths(value), false, JSON.stringify(value));
        assert.deepEqual(matchRequirementPaths(value as never, sections, cards), []);
    }
    for (const filter of [{ names: ['Ally'] }, { type: 'ALLY' }, { subtypes: ['ELYSIAN'] }, { prefix: 'Al' }]) {
        assert.equal(validRequirementPaths([[{ section: 'identity', minimum: 1, ...filter }]]), true);
    }
    assert.deepEqual(matchRequirementPaths([[valid]] as never, sections, cards), [{ path: 0, cards: ['Ally'] }]);
    // A valid alternative must not hide a malformed condition elsewhere in the rule.
    assert.equal(validRequirementPaths([[valid], [{ ...valid, minimum: 0 }]]), false);
});
