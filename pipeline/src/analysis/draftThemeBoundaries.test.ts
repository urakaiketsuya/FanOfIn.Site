import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectDraftThemes, type ThemeCard } from '../../../shared/src/draftThemes.js';
import type { DeckCardIndexData } from '../../../shared/src/analysis-types.js';

const catalog: ThemeCard[] = JSON.parse(readFileSync(new URL('../../../data/card-catalog.json', import.meta.url), 'utf8')).cards;
const source: DeckCardIndexData = JSON.parse(readFileSync(new URL('./fixtures/theme-review-index.json', import.meta.url), 'utf8'));
const resonators = ['Breezy Looper', 'Current Groover', 'Music Aficionado'];
const discorp = ['Biding Endroid', 'Cellforger Droid', 'Cellwarden Droid'];
const angels = ['Angel Attendant', 'Angelic Vanguard', 'Benediction Angel'];
const specters = ['Black Ice Spellweaver', 'Crossroads Specter', 'Drifting Abysshell'];
interface Example { id: string; main: string[]; material?: string[]; path?: number }
// Hand-authored minimal examples, independent of the rule-definition structure.
const examples: Example[] = [
    { id: 'resonator', main: [...resonators, 'Anthem of Vitality', 'Belted Tune'] },
    { id: 'resonator-support', main: resonators, material: ['ResonanTech Module'] },
    { id: 'discorp', main: discorp },
    { id: 'discorp-support', main: [...discorp, 'Tower of Dis'] },
    { id: 'elysian-dante', main: ['Elysian Aspirant', 'Elysian Orphan', 'Embryonic Hemosynth'], material: ['Dante, Hematic Overdrive'] },
    { id: 'elysian-dante', main: ['Gencode Womb', 'Venous Core'], material: ['Dante, Hematic Overdrive'], path: 1 },
    { id: 'angel', main: angels },
    { id: 'angel-descent', main: [...angels, "Seraphic Legion's Descent"] },
    { id: 'specter', main: specters },
    { id: 'specter-support', main: [...specters, 'Ticket to the Afterlife'] },
    { id: 'fairy', main: ['Dream Fairy', 'Snow Fairy', 'Spark Fairy'] },
    { id: 'mordred-fairy', main: ['Dream Fairy', 'Gildas, Faesworn Monarch'], material: ['Mordred, Flawless Blade'] },
    { id: 'wolf', main: ['Blazing Direwolf', 'Direwolf Alpha', 'Gray Wolf'] },
    { id: 'wolf-tokens', main: ['Direwolf Alpha', 'Dire Requiem'] },
    { id: 'memorite', main: ['Crystalline Reality', 'Glassgale Flock'], material: ['Merlin, Memorite Vassal'] },
    { id: 'memorite-payoff', main: ['Crystalline Reality'], material: ['Shardforged Blade'] },
];

function fixture(main: string[], material: string[] = [], sideboard: string[] = [], quantity = 1): DeckCardIndexData {
    const cardNames = [...new Set([...main, ...material, ...sideboard])];
    const encode = (names: string[]): [number, number][] => names.map(name => [cardNames.indexOf(name), quantity]);
    return { ...source, cardNames, decks: [{ ...source.decks[0], main: encode(main), material: encode(material), sideboard: encode(sideboard) }] };
}
function matches(example: Example, index = fixture(example.main, example.material), cards = catalog) {
    return detectDraftThemes(index, cards).evidence.find(e => e.id === `draft-${example.id}`)!.matches;
}

for (const example of examples) {
    test(`${example.id} path ${example.path ?? 0}: exact core matches; every required name matters`, () => {
        const result = matches(example);
        assert.equal(result.length, 1);
        assert.deepEqual(result[0].paths, [{ path: example.path ?? 0, cards: [...example.main, ...(example.material ?? [])].sort() }]);
        for (const section of ['main', 'material'] as const) {
            for (const name of example[section] ?? []) {
                const reduced = { ...example, [section]: example[section]!.filter(n => n !== name) };
                assert.equal(matches(reduced).length, 0, `missing ${section} ${name}`);
                assert.equal(matches(reduced, fixture(reduced.main, reduced.material, [name])).length, 0, `sideboard ${name}`);
                assert.equal(matches(reduced, fixture(reduced.main, reduced.material, [], 4)).length, 0, `extra copies cannot replace ${name}`);
            }
        }
    });
}

test('champion gates require Material, including the token-only Dante path', () => {
    for (const example of examples.filter(e => ['elysian-dante', 'mordred-fairy', 'memorite'].includes(e.id))) {
        assert.equal(matches(example, fixture([...example.main, ...example.material!])).length, 0, example.id);
    }
});

test('tribal matches require catalog-confirmed allies, not merely matching names or subtypes', () => {
    for (const example of examples.filter(e => ['resonator', 'discorp', 'angel', 'specter', 'fairy', 'wolf'].includes(e.id))) {
        const name = example.main[0];
        assert.equal(matches(example, undefined, catalog.filter(c => c.name !== name)).length, 0, `unknown ${name}`);
        assert.equal(matches(example, undefined, catalog.map(c => c.name === name ? { ...c, types: ['ACTION'] } : c)).length, 0, `non-ally ${name}`);
        assert.equal(matches(example, fixture(example.main.slice(1), [name])).length, 0, `Material ally ${name}`);
    }
});

test('Dante preserves both evidence paths when both qualify', () => {
    const direct = examples.find(e => e.id === 'elysian-dante' && !e.path)!;
    const token = examples.find(e => e.id === 'elysian-dante' && e.path === 1)!;
    const result = matches(direct, fixture([...direct.main, ...token.main], direct.material));
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].paths.map(p => p.path), [0, 1]);
});

test('broader Dante proposal requires two distinct Main allies and a generator', async () => {
    const { elysianDanteThemeProposal } = await import('../../../shared/src/draftThemes.js');
    const allies = ['Elysian Aspirant', 'Embryonic Hemosynth'];
    const champion = ['Dante, Hematic Overdrive'];
    const detect = (index: DeckCardIndexData, cards = catalog) => detectDraftThemes(index, cards, [elysianDanteThemeProposal]).evidence[0].matches;
    for (const generator of ['Epicurean Institute', 'Gencode Womb']) {
        const main = [...allies, generator];
        assert.deepEqual(detect(fixture(main, champion))[0].paths.map(p => p.path), [2]);
        assert.equal(detectDraftThemes(fixture(main, champion), catalog).evidence.find(e => e.id === 'draft-elysian-dante')!.matches.length, 0);
        for (const name of main) {
            const reduced = main.filter(n => n !== name);
            assert.equal(detect(fixture(reduced, champion, [name], 4)).length, 0, `sideboard and copies cannot replace ${name}`);
        }
        assert.equal(detect(fixture(main)).length, 0);
        assert.equal(detect(fixture([...main, ...champion])).length, 0);
        assert.equal(detect(fixture([allies[0], generator], [...champion, allies[1]])).length, 0);
        assert.equal(detect(fixture(main, champion), catalog.filter(c => c.name !== allies[0])).length, 0);
        assert.equal(detect(fixture(main, champion), catalog.map(c => c.name === allies[0] ? { ...c, types: ['ACTION'] } : c)).length, 0);
    }
});

test('broader Dante proposal adds exactly the four reviewed historical lists', async () => {
    const { elysianDanteThemeProposal } = await import('../../../shared/src/draftThemes.js');
    const baseline = detectDraftThemes(source, catalog).evidence.find(e => e.id === 'draft-elysian-dante')!;
    const proposed = detectDraftThemes(source, catalog, [elysianDanteThemeProposal]).evidence[0];
    const before = new Set(baseline.matches.map(m => m.deckId));
    const after = new Set(proposed.matches.map(m => m.deckId));
    assert.equal(before.size, 13);
    assert.equal(after.size, 17);
    assert.deepEqual([...before].filter(id => !after.has(id)), []);
    assert.deepEqual([...after].filter(id => !before.has(id)), ['61723:568', '64530:24268', '64888:13238', '64922:21154']);
    assert.equal(after.has('64701:14399'), false);
});
