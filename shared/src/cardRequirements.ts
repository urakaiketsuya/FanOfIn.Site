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
export function matchRequirementPaths(
    paths: readonly Requirement[][],
    sections: Record<Section, ReadonlySet<string>>,
    cards: ReadonlyMap<string, RequirementCard>,
) {
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
