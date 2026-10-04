import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { detectThemeDefinitions, summarizeDraftThemes } from '../../../shared/src/draftThemes.js';
import { reviewedThemes } from '../../../shared/src/reviewedThemes.js';

test('frozen reviewed lists reproduce publication decisions and definition identity', () => {
    const raw = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    const index = raw('./fixtures/theme-review-index.json');
    const catalog = raw('../../../data/card-catalog.json');
    const saved = JSON.parse(raw('../../../data/reference/reviewed-theme-evidence.json'));
    const decision = JSON.parse(raw('../../../data/reference/elysian-dante-review.json'));
    const result = detectThemeDefinitions(JSON.parse(index), JSON.parse(catalog).cards, reviewedThemes);
    const hash = (s: string) => createHash('sha256').update(s).digest('hex');
    assert.equal(result.evidence.length, 21);
    assert.equal(result.evidence[0].kind, 'theme');
    assert.equal(result.evidence[0].status, 'reviewed');
    assert.equal(result.evidence[0].matches.length, 17);
    assert.equal(result.evidence[0].matches.some(m => m.deckId === '64701:14399'), false);
    assert.deepEqual(result.evidence[0].matches.map(m => m.deckId).sort(), [...decision.comparison.retainedDeckIds, ...decision.comparison.addedDeckIds].sort());
    assert.deepEqual(result.evidence[0].paths, decision.comparison.proposed.paths);
    // Historical fixtures stay frozen; refreshed production evidence has a newer population.
    assert.deepEqual(saved.evidence.map((entry: { id: string; paths: unknown }) => ({ id: entry.id, paths: entry.paths })), reviewedThemes.map(entry => ({ id: entry.id, paths: entry.paths })));
    assert.deepEqual(summarizeDraftThemes(saved.evidence), saved.review);
    assert.equal(saved.sources.definitionsSha256, hash(JSON.stringify(reviewedThemes)));
});


test('reviewed Resonator membership preserves the inspected lists and boundary', () => {
    const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    const decision = read('../../../data/reference/resonator-review.json');
    const index = read('./fixtures/theme-review-index.json');
    const catalog = read('../../../data/card-catalog.json').cards;
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


test('reviewed DisCorp preserves inspected membership and distinct Main allies', () => {
    const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    const decision = read('../../../data/reference/discorp-review.json');
    const index = read('./fixtures/theme-review-index.json');
    const catalog = read('../../../data/card-catalog.json').cards;
    const definition = reviewedThemes.find(theme => theme.id === 'discorp')!;
    const result = detectThemeDefinitions(index, catalog, [definition]).evidence[0];
    assert.equal(result.matches.length, 17);
    assert.deepEqual(result.matches, decision.candidate.matches);
    assert.deepEqual(result.paths, decision.candidate.paths);
    assert.equal(decision.comparisons[0].addedDeckIds.length, 10);
    assert.equal(decision.comparisons[1].baselineOverlap, 11);
    assert.equal(decision.comparisons[2].baselineOverlap, 1);
    const cardNames = ['Cellforger Droid', 'Haze Droid', 'Virgil, Altered Future', 'Tower of Dis', 'Cell Reactor'];
    const match = (main: number[], material: number[] = [], sideboard: number[] = []) => {
        const encode = (names: number[]) => names.map(name => [name, 4]);
        return detectThemeDefinitions({ ...index, cardNames, decks: [{ ...index.decks[0], main: encode(main), material: encode(material), sideboard: encode(sideboard) }] }, catalog, [definition]).evidence[0].matches.length;
    };
    assert.equal(match([0, 1, 2]), 1);
    assert.equal(match([0, 1, 3, 4]), 0); // DisCorp items/domains are not allies.
    for (const missing of [0, 1, 2]) {
        const remaining = [0, 1, 2].filter(n => n !== missing);
        assert.equal(match(remaining, [missing]), 0);
        assert.equal(match(remaining, [], [missing]), 0);
        assert.equal(match([...remaining, remaining[0]]), 0);
    }
});


test('reviewed Angels preserves historical membership and excludes non-ally Angel cards', () => {
    const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    const decision = read('../../../data/reference/angel-review.json');
    const index = read('./fixtures/theme-review-index.json');
    const catalog = read('../../../data/card-catalog.json').cards;
    const definition = reviewedThemes.find(theme => theme.id === 'angels')!;
    const result = detectThemeDefinitions(index, catalog, [definition]).evidence[0];
    assert.equal(result.matches.length, 139);
    assert.deepEqual(result.matches, decision.candidate.matches);
    assert.deepEqual(result.paths, decision.candidate.paths);
    assert.equal(decision.distinctMatchingLists, 115);
    assert.equal(decision.comparisons[0].addedDeckIds.length, 771);
    assert.equal(decision.comparisons[1].baselineOverlap, 29);
    assert.equal(decision.comparisons[2].baselineOverlap, 8);
    const cardNames = ['Angel Attendant', 'Benediction Angel', 'Fount Seraphim', 'Angelic Channeling', "Seraphic Legion's Descent"];
    const match = (main: number[], material: number[] = [], sideboard: number[] = [], quantity = 4) => {
        const encode = (names: number[]) => names.map(name => [name, quantity]);
        return detectThemeDefinitions({ ...index, cardNames, decks: [{ ...index.decks[0], main: encode(main), material: encode(material), sideboard: encode(sideboard) }] }, catalog, [definition]).evidence[0].matches.length;
    };
    assert.equal(match([0, 1, 2]), 1);
    assert.equal(match([0, 1, 3, 4]), 0);
    assert.equal(match([0, 1, 2], [], [], 0), 0);
    for (const missing of [0, 1, 2]) {
        const remaining = [0, 1, 2].filter(n => n !== missing);
        assert.equal(match(remaining, [missing]), 0);
        assert.equal(match(remaining, [], [missing]), 0);
        assert.equal(match([...remaining, remaining[0]]), 0);
    }
});


test('reviewed Specters preserves historical membership and excludes non-ally Specter cards', () => {
    const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
    const decision = read('../../../data/reference/specter-review.json');
    const index = read('./fixtures/theme-review-index.json');
    const catalog = read('../../../data/card-catalog.json').cards;
    const definition = reviewedThemes.find(theme => theme.id === 'specters')!;
    const result = detectThemeDefinitions(index, catalog, [definition]).evidence[0];
    assert.equal(result.matches.length, 489);
    assert.deepEqual(result.matches, decision.candidate.matches);
    assert.deepEqual(result.paths, decision.candidate.paths);
    assert.equal(decision.distinctMatchingLists, 448);
    assert.equal(decision.comparisons[0].addedDeckIds.length, 2373);
    assert.equal(decision.comparisons[1].baselineOverlap, 182);
    assert.equal(decision.comparisons[2].baselineOverlap, 215);
    const cardNames = ['Evercurrent Raider', 'Liminal Guide', 'Unyielding Wraithguard', 'Distort Reality', 'Ticket to the Afterlife'];
    const match = (main: number[], material: number[] = [], sideboard: number[] = [], quantity = 4) => {
        const encode = (names: number[]) => names.map(name => [name, quantity]);
        return detectThemeDefinitions({ ...index, cardNames, decks: [{ ...index.decks[0], main: encode(main), material: encode(material), sideboard: encode(sideboard) }] }, catalog, [definition]).evidence[0].matches.length;
    };
    assert.equal(match([0, 1, 2]), 1);
    assert.equal(match([0, 1, 3, 4]), 0);
    assert.equal(match([0, 1, 2], [], [], 0), 0);
    for (const missing of [0, 1, 2]) {
        const remaining = [0, 1, 2].filter(n => n !== missing);
        assert.equal(match(remaining, [missing]), 0);
        assert.equal(match(remaining, [], [missing]), 0);
        assert.equal(match([...remaining, remaining[0]]), 0);
    }
});
