import { decodeCardLines, type DeckCardIndexData } from './analysis-types.js';

export interface ThemeCard { name: string; types: string[]; subtypes: string[] }
type Section = 'main' | 'material' | 'identity';
interface Requirement {
    section: Section;
    minimum: number;
    names?: string[];
    type?: string;
    subtypes?: string[];
    prefix?: string;
}
export interface DraftTheme {
    id: string;
    name: string;
    kind: 'theme' | 'engine' | 'archetype';
    status: 'draft';
    /** Alternative paths; each path requires every condition. */
    paths: Requirement[][];
}
export interface DraftThemeMatch { deckId: string; paths: { path: number; cards: string[] }[] }

/** Review counts describe membership only, never strategic validity or strength. */
export function summarizeDraftThemes(evidence: readonly (DraftTheme & { matches: DraftThemeMatch[] })[]) {
    const memberships = evidence.map(entry => new Set(entry.matches.map(match => match.deckId)));
    return evidence.map((entry, i) => {
        const members = memberships[i];
        const overlaps = evidence.flatMap((other, j) => {
            if (i === j) return [];
            const sharedDecks = [...members].filter(id => memberships[j].has(id)).length;
            return sharedDecks ? [{ id: other.id, decks: sharedDecks, jaccard: sharedDecks / (members.size + memberships[j].size - sharedDecks) }] : [];
        }).sort((a, b) => b.decks - a.decks || a.id.localeCompare(b.id));
        return {
            id: entry.id,
            decks: members.size,
            exclusiveDecks: [...members].filter(id => !memberships.some((set, j) => j !== i && set.has(id))).length,
            paths: entry.paths.map((_, path) => ({
                path,
                decks: new Set(entry.matches.filter(m => m.paths.some(p => p.path === path)).map(m => m.deckId)).size,
                exclusiveDecks: new Set(entry.matches.filter(m => m.paths.some(p => p.path === path) && m.paths.every(p => p.path === path)).map(m => m.deckId)).size,
            })),
            overlaps,
        };
    });
}
const names = (section: Section, minimum: number, ...cards: string[]): Requirement => ({ section, minimum, names: cards });
const allies = (subtype: string, minimum = 3): Requirement => ({ section: 'main', minimum, type: 'ALLY', subtypes: [subtype] });
const music: Requirement = { section: 'main', minimum: 2, subtypes: ['HARMONY', 'MELODY'] };
const dante = names('material', 1, 'Dante, Hematic Overdrive');
const generators = ['Crystalline Reality', 'Crystalvein Awakening', 'Glassgale Flock', 'Obelith Escort', 'Protect Her At All Costs', 'Shardwing Searchlight', "Silvergale Monstrosity's Call", "Silvergale Obelith's Call"];
const draft = (id: string, name: string, kind: DraftTheme['kind'], ...paths: Requirement[][]): DraftTheme => ({ id: `draft-${id}`, name, kind, status: 'draft', paths });

/** Independently reviewed candidates; never automatically promoted into production taxonomy. */
export const draftThemes: DraftTheme[] = [
    draft('resonator', 'Resonator music', 'theme', [allies('RESONATOR'), music]),
    draft('resonator-support', 'Resonator support', 'engine', [allies('RESONATOR'), names('identity', 1, 'Fanclub Leader', 'Forese, Fervid Cantor', 'ResonanTech Module')]),
    draft('discorp', 'DisCorp', 'theme', [allies('DISCORP')]),
    draft('discorp-support', 'DisCorp support', 'engine', [allies('DISCORP'), names('identity', 1, 'Tower of Dis', 'Acheron Express Officer')]),
    draft('elysian-dante', 'Elysian Dante', 'archetype', [dante, allies('ELYSIAN')], [dante, names('identity', 1, 'Epicurean Institute', 'Gencode Womb'), names('identity', 1, 'Venous Core', 'Rhesus Eradication', 'Lesser Boon of Elysian Blood')]),
    draft('angel', 'Angels', 'theme', [allies('ANGEL')]),
    draft('angel-descent', 'Angel Descent', 'engine', [allies('ANGEL'), names('identity', 1, "Seraphic Legion's Descent")]),
    draft('specter', 'Specters', 'theme', [allies('SPECTER')]),
    draft('specter-support', 'Specter support', 'engine', [allies('SPECTER'), names('identity', 1, 'Incinerated Templar', 'Lawsur, the Carpenter', 'Ticket to the Afterlife', 'Distort Reality', 'Phantasmagoria')]),
    draft('fairy', 'Fairies', 'theme', [allies('FAIRY')]),
    draft('mordred-fairy', 'Mordred Fairy package', 'engine', [{ section: 'material', minimum: 1, type: 'CHAMPION', prefix: 'Mordred,' }, allies('FAIRY', 2), names('main', 1, 'Gildas, Faesworn Monarch')]),
    draft('wolf', 'Wolves', 'theme', [allies('WOLF')]),
    draft('wolf-tokens', 'Direwolf token package', 'engine', [names('main', 2, 'Direwolf Alpha', 'Dire Requiem')]),
    draft('memorite', 'Memorite generation', 'engine', [names('material', 1, 'Merlin, Memorite Vassal'), names('main', 2, ...generators)]),
    draft('memorite-payoff', 'Memorite payoff package', 'engine', [names('main', 1, ...generators), names('identity', 1, 'Crystallized Anthem', 'Facet Together', 'Shardforged Blade')]),
];

export function detectDraftThemes(index: DeckCardIndexData, catalog: readonly ThemeCard[]) {
    const cards = new Map(catalog.map(c => [c.name, c]));
    // Catch misspelled curated anchors instead of silently generating empty evidence.
    for (const definition of draftThemes)
        for (const path of definition.paths)
            for (const condition of path)
                for (const name of condition.names ?? [])
                    if (!cards.has(name)) throw new Error(`Missing draft-theme anchor: ${name}`);
    const evidence = draftThemes.map(definition => ({ ...definition, matches: [] as { deckId: string; paths: { path: number; cards: string[] }[] }[] }));
    const decks = [...new Map(index.decks.map(d => [d.deckId, d])).values()].sort((a, b) => a.deckId.localeCompare(b.deckId));
    let eligibleDecks = 0;
    for (const deck of decks) {
        const positive = (lines: typeof deck.main) => decodeCardLines(lines, index.cardNames).filter(c => c.quantity > 0);
        const material = positive(deck.material);
        if (material.length > 12) continue;
        eligibleDecks++;
        const main = new Set(positive(deck.main).map(c => c.name));
        const sections = { main, material: new Set(material.map(c => c.name)), identity: new Set([...main, ...material.map(c => c.name)]) };
        for (const entry of evidence) {
            const paths = entry.paths.flatMap((path, i) => {
                const witnesses = path.map(condition => [...sections[condition.section]].filter(name => {
                    const card = cards.get(name);
                    return (!condition.names || condition.names.includes(name)) && (!condition.prefix || name.startsWith(condition.prefix)) && (!condition.type || card?.types.includes(condition.type)) && (!condition.subtypes || condition.subtypes.some(s => card?.subtypes.includes(s)));
                }));
                return witnesses.every((w, j) => w.length >= path[j].minimum) ? [{ path: i, cards: [...new Set(witnesses.flat())].sort() }] : [];
            });
            if (paths.length) entry.matches.push({ deckId: deck.deckId, paths });
        }
    }
    return { version: 1 as const, status: 'draft' as const, population: decks.length, eligibleDecks, evidence };
}
