/** Section-aware requirements count distinct positive-quantity card names. */
export type Section = 'main' | 'material' | 'identity';
export interface Requirement {
    section: Section;
    minimum: number;
    names?: string[];
    type?: string;
    subtypes?: string[];
    prefix?: string;
}

export interface RequirementCard { name: string; types: string[]; subtypes?: string[] }

/** Reject malformed or unknown filters rather than silently broadening a rule. */
export function validRequirementPaths(value: unknown): value is Requirement[][] {
    const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
    const texts = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every(text);
    return Array.isArray(value) && value.length > 0 && value.every(path =>
        Array.isArray(path) && path.length > 0 && path.every(value => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
            const r = value as Record<string, unknown>;
            return Object.keys(r).every(key => ['section', 'minimum', 'names', 'type', 'subtypes', 'prefix'].includes(key)) &&
                ['main', 'material', 'identity'].includes(r.section as string) &&
                Number.isSafeInteger(r.minimum) && (r.minimum as number) > 0 &&
                (r.names === undefined || texts(r.names)) &&
                (r.type === undefined || text(r.type)) &&
                (r.subtypes === undefined || texts(r.subtypes)) &&
                (r.prefix === undefined || text(r.prefix)) &&
                [r.names, r.type, r.subtypes, r.prefix].some(filter => filter !== undefined);
        }));
}

export function matchRequirementPaths(
    paths: readonly Requirement[][],
    sections: Record<Section, ReadonlySet<string>>,
    cards: ReadonlyMap<string, RequirementCard>,
) {
    if (!validRequirementPaths(paths)) return [];
    return paths.flatMap((path, i) => {
        if (!path.length) return [];
        const witnesses = path.map(condition => [...sections[condition.section]].filter(name => {
            const card = cards.get(name);
            return (!condition.names || condition.names.includes(name)) &&
                (!condition.prefix || name.startsWith(condition.prefix)) &&
                (!condition.type || card?.types.includes(condition.type)) &&
                (!condition.subtypes || condition.subtypes.some(s => card?.subtypes?.includes(s)));
        }));
        return witnesses.every((w, j) => w.length >= path[j].minimum)
            ? [{ path: i, cards: [...new Set(witnesses.flat())].sort() }] : [];
    });
}
