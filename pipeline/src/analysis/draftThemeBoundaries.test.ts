import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectDraftThemes, type ThemeCard } from '../../../shared/src/draftThemes.js';
import type { DeckCardIndexData } from '../../../shared/src/analysis-types.js';

const catalog: ThemeCard[] = JSON.parse(readFileSync(new URL('../../../data/card-catalog.json', import.meta.url), 'utf8')).cards;
const source: DeckCardIndexData = JSON.parse(readFileSync(new URL('../../../data/analysis/deck-card-index.json', import.meta.url), 'utf8'));
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
