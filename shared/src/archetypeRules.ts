import { decodeCardLines, type DeckCardIndexData } from './analysis-types.js';
export interface ArchetypeRule {
    anyCards: string[];
    allCards: string[];
    excludeCards: string[];
    comboGroups: string[][];
    element: string | null;
    typeCounts: Record<string, number>;
}
export interface ReferenceDefinition {
    id: string;
    name: string;
    parentId: string | null;
    rule: ArchetypeRule;
    sourceLine: number;
    reviewStatus: 'unreviewed' | 'accepted' | 'rejected';
}
export interface ReferenceArchetypes {
    source: {
        name: string;
        url: string;
        revision: string | null;
        sha256: string;
        file: string;
    };
    definitions: ReferenceDefinition[];
}
export interface RuleDeck {
    deckId: string;
    cards: string[];
    elements: string[];
    typeCounts: Record<string, number>;
    materialEntries: number;
    unknownCards: string[];
}
export function ruleDecks(index: DeckCardIndexData, catalog: readonly {
    name: string;
    types: string[];
    elements: string[];
    level: number | null;
}[]): RuleDeck[] {
    const cards = new Map(catalog.map(c => [c.name, c]));
    return [...new Map(index.decks.map(d => [d.deckId, d])).values()].sort((a, b) => a.deckId.localeCompare(b.deckId)).map(d => {
        const main = decodeCardLines(d.main, index.cardNames).filter(c => c.quantity > 0), mat = decodeCardLines(d.material, index.cardNames).filter(c => c.quantity > 0);
        const typeCounts: Record<string, number> = {};
        for (const line of main)
            for (const type of cards.get(line.name)?.types ?? [])
                typeCounts[type] = (typeCounts[type] ?? 0) + line.quantity;
        const elements = [...new Set(mat.flatMap(line => cards.get(line.name)?.level === 0 ? cards.get(line.name)!.elements.map(e => e.toUpperCase()) : []))];
        return { deckId: d.deckId, cards: [...new Set([...main, ...mat].map(c => c.name))].sort(), elements: elements.length ? elements : ['NORM'], typeCounts, materialEntries: mat.length, unknownCards: [...new Set([...main, ...mat].filter(c => !cards.has(c.name)).map(c => c.name))] };
    });
}
export function evaluateArchetypeRule(rule: ArchetypeRule, deck: RuleDeck) {
    const present = new Set(deck.cards), failures: string[] = [];
    if (deck.materialEntries > 12)
        failures.push('More than 12 material entries (Fractal eligibility)');
    if (!rule.anyCards.some(c => present.has(c)))
        failures.push('Missing an any-of card');
    for (const card of rule.allCards)
        if (!present.has(card))
            failures.push(`Missing required card: ${card}`);
    for (const card of rule.excludeCards)
        if (present.has(card))
            failures.push(`Excluded card: ${card}`);
    if (rule.comboGroups.length && !rule.comboGroups.some(g => g.length > 0 && g.every(c => present.has(c))))
        failures.push('No complete all-of group');
    if (rule.element && !deck.elements.includes(rule.element.toUpperCase()))
        failures.push(`Requires ${rule.element} spirit access`);
    for (const [type, n] of Object.entries(rule.typeCounts))
        if (n > 0 && (deck.typeCounts[type] ?? 0) < n || n < 0 && (deck.typeCounts[type] ?? 0) > -n)
            failures.push(`Main-deck ${type}: requires ${n > 0 ? 'at least' : 'at most'} ${Math.abs(n)}`);
    if (deck.unknownCards.length && (rule.element || Object.values(rule.typeCounts).some(Boolean)))
        failures.push('Incomplete catalog evidence');
    return { matches: failures.length === 0, failures, matchedCards: rule.anyCards.filter(c => present.has(c)) };
}
export function evaluateDefinition(def: ReferenceDefinition, definitions: ReferenceDefinition[], deck: RuleDeck, seen = new Set<string>()): ReturnType<typeof evaluateArchetypeRule> {
    if (seen.has(def.id))
        return { matches: false, failures: ['Cyclic parent rule'], matchedCards: [] };
    seen.add(def.id);
    const result = evaluateArchetypeRule(def.rule, deck);
    if (def.parentId) {
        const parent = definitions.find(d => d.id === def.parentId);
        const p = parent ? evaluateDefinition(parent, definitions, deck, seen) : null;
        if (!p?.matches) {
            result.matches = false;
            result.failures.unshift(...(p?.failures.map(f => `Parent: ${f}`) ?? ['Missing parent rule']));
        }
    }
    return result;
}
export function validArchetypeRule(v: unknown): v is ArchetypeRule {
    if (!v || typeof v !== 'object')
        return false;
    const r = v as ArchetypeRule, strings = (x: unknown): x is string[] => Array.isArray(x) && x.every(c => typeof c === 'string' && c.trim().length > 0);
    return strings(r.anyCards) && strings(r.allCards) && strings(r.excludeCards) && Array.isArray(r.comboGroups) && r.comboGroups.every(g => strings(g) && g.length > 0) && (r.element === null || typeof r.element === 'string') && !!r.typeCounts && typeof r.typeCounts === 'object' && !Array.isArray(r.typeCounts) && Object.values(r.typeCounts).every(n => Number.isSafeInteger(n));
}
export interface StrategyEvidence {
    id: string;
    deckIds: string[];
    players: number;
    events: number;
    missingMetadata: number;
    confidence: 'recurring' | 'candidate' | 'no-evidence';
    champions: {
        name: string;
        decks: number;
        players: number;
        events: number;
    }[];
    seasons: {
        name: string;
        decks: number;
    }[];
    core: {
        name: string;
        prevalence: number;
        cohortPrevalence: number;
        enrichment: number;
    }[];
    jointCoreCards: string[];
    jointCorePrevalence: number | null;
    cohortDecks: number;
    builds: {
        id: string;
        matched: number;
        total: number;
    }[];
    overlaps: {
        id: string;
        decks: number;
        jaccard: number;
    }[];
    boundary: {
        deckId: string;
        failures: string[];
    }[];
    suggestions: {
        cards: string[];
        decks: number;
        players: number;
        events: number;
        prevalence: number;
    }[];
}
export interface ReferenceAnalysis extends ReferenceArchetypes {
    generatedAt: string;
    population: number;
    discoveries: {
        buildId: string;
        name: string;
        cards: string[];
        unmatchedDecks: number;
        total: number;
    }[];
    evidence: StrategyEvidence[];
}
export interface CuratedStrategy {
    definition: ReferenceDefinition;
    coreCards: string[];
    description: string;
    packageIds: string[];
    sourceHash: string;
    mechanics: 'unverified' | 'verified';
    mechanicsEvidence: string;
}
export interface StrategyStore {
    version: 1;
    entries: CuratedStrategy[];
    drafts: CuratedStrategy[];
    undo?: CuratedStrategy[];
}
export function parseStrategyStore(raw: string): StrategyStore {
    const v = JSON.parse(raw);
    const valid = (a: unknown): a is CuratedStrategy[] => Array.isArray(a) && a.every(e => e && typeof e.definition?.id === 'string' && e.definition.id.length > 0 && typeof e.definition.name === 'string' && e.definition.name.trim().length > 0 && (e.definition.parentId === null || typeof e.definition.parentId === 'string') && ['unreviewed', 'accepted', 'rejected'].includes(e.definition.reviewStatus) && validArchetypeRule(e.definition.rule) && Array.isArray(e.coreCards) && e.coreCards.every((c: unknown) => typeof c === 'string') && Array.isArray(e.packageIds) && e.packageIds.every((c: unknown) => typeof c === 'string') && typeof e.description === 'string' && typeof e.sourceHash === 'string' && ['unverified', 'verified'].includes(e.mechanics) && typeof e.mechanicsEvidence === 'string' && (e.mechanics !== 'verified' || e.mechanicsEvidence.trim().length > 0)) && new Set(a.map(e => e.definition.id)).size === a.length;
    if (v?.version !== 1 || !valid(v.entries) || !valid(v.drafts) || (v.undo !== undefined && !valid(v.undo)))
        throw new Error('Invalid strategy backup; existing choices were preserved.');
    return v;
}
