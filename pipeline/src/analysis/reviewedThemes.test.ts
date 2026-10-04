import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { detectThemeDefinitions, summarizeDraftThemes } from '../../../shared/src/draftThemes.js';
import { reviewedThemes } from '../../../shared/src/reviewedThemes.js';

test('reviewed publication reproduces the Dante decision and source-bound evidence', () => {
    const raw = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    const index = raw('../../../data/analysis/deck-card-index.json');
    const catalog = raw('../../.cache/cards.json');
    const saved = JSON.parse(raw('../../../data/reference/reviewed-theme-evidence.json'));
    const decision = JSON.parse(raw('../../../data/reference/elysian-dante-review.json'));
    const result = detectThemeDefinitions(JSON.parse(index), JSON.parse(catalog).cards, reviewedThemes);
    const hash = (s: string) => createHash('sha256').update(s).digest('hex');
    assert.equal(result.evidence.length, 2);
    assert.equal(result.evidence[0].kind, 'theme');
    assert.equal(result.evidence[0].status, 'reviewed');
    assert.equal(result.evidence[0].matches.length, 17);
    assert.equal(result.evidence[0].matches.some(m => m.deckId === '64701:14399'), false);
    assert.deepEqual(result.evidence[0].matches.map(m => m.deckId).sort(), [...decision.comparison.retainedDeckIds, ...decision.comparison.addedDeckIds].sort());
    assert.deepEqual(result.evidence[0].paths, decision.comparison.proposed.paths);
    assert.deepEqual(saved, { ...result, status: 'reviewed', review: summarizeDraftThemes(result.evidence), sources: { indexSha256: hash(index), catalogSha256: hash(catalog), definitionsSha256: hash(JSON.stringify(reviewedThemes)) } });
});


test('reviewed Resonator membership preserves the inspected lists and boundary', () => {
    const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    const decision = read('../../../data/reference/resonator-review.json');
    const index = read('../../../data/analysis/deck-card-index.json');
    const catalog = read('../../.cache/cards.json').cards;
    const definition = reviewedThemes.find(theme => theme.id === 'resonator-music')!;
    const result = detectThemeDefinitions(index, catalog, [definition]).evidence[0];
    assert.deepEqual(result.matches, decision.candidate.matches);
    assert.deepEqual(result.paths, decision.candidate.paths);
    assert.deepEqual(result.matches.map(match => match.deckId), ['61549:4571', '61722:25782', '62146:25312', '62616:19726', '64329:9180']);
    const main = ['Music Aficionado', 'Musical Curator', 'ZENA, Echo Weaver', 'Belted Tune', 'Steady Verse'];
    const match = (names: string[], material: string[] = [], sideboard: string[] = []) => {
        const cardNames = [...new Set([...main, ...material, ...sideboard])];
        const encode = (values: string[]) => values.map(name => [cardNames.indexOf(name), 4]);
        return detectThemeDefinitions({ ...index, cardNames, decks: [{ ...index.decks[0], main: encode(names), material: encode(material), sideboard: encode(sideboard) }] }, catalog, [definition]).evidence[0].matches.length;
    };
    // Two Melodies suffice: the rule does not require one card of each music subtype.
    assert.equal(match(main), 1);
    for (const name of main) {
        const reduced = main.filter(card => card !== name);
        assert.equal(match(reduced, [], [name]), 0);
        assert.equal(match(reduced, [name]), 0);
        assert.equal(match([...reduced, reduced[0]]), 0);
    }
});
