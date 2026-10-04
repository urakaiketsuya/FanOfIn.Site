import { draftThemes, elysianDanteThemeProposal, type ThemeDefinition } from './draftThemes.js';

export interface ReviewedTheme extends ThemeDefinition {
    kind: 'theme';
    status: 'reviewed';
    reviewDocument: string;
}

function clonePaths(paths: ThemeDefinition['paths']): ThemeDefinition['paths'] {
    return paths.map(path => path.map(condition => ({
        ...condition,
        ...(condition.names ? { names: [...condition.names] } : {}),
        ...(condition.subtypes ? { subtypes: [...condition.subtypes] } : {}),
    })));
}

/** Explicit publication decisions, separate from strategy and combo classification. */
export const reviewedThemes: readonly ReviewedTheme[] = [{
    id: 'elysian-dante',
    name: 'Elysian Dante',
    kind: 'theme',
    status: 'reviewed',
    paths: clonePaths(elysianDanteThemeProposal.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'resonator-music',
    name: 'Resonator music',
    kind: 'theme',
    status: 'reviewed',
    paths: clonePaths(draftThemes.find(theme => theme.id === 'draft-resonator')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'discorp',
    name: 'DisCorp',
    kind: 'theme',
    status: 'reviewed',
    paths: clonePaths(draftThemes.find(theme => theme.id === 'draft-discorp')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'angels',
    name: 'Angels',
    kind: 'theme',
    status: 'reviewed',
    paths: clonePaths(draftThemes.find(theme => theme.id === 'draft-angel')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'specters',
    name: 'Specters',
    kind: 'theme',
    status: 'reviewed',
    paths: clonePaths(draftThemes.find(theme => theme.id === 'draft-specter')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, ...[
    ['fairies', 'Fairies', 'fairy'],
    ['mordred-fairy', 'Mordred Fairy package', 'mordred-fairy'],
    ['direwolf-tokens', 'Direwolf token package', 'wolf-tokens'],
    ['memorite-generation', 'Memorite generation', 'memorite'],
    ['angel-descent', 'Angel Descent', 'angel-descent'],
].map(([id, name, draftId]): ReviewedTheme => ({
    id, name, kind: 'theme', status: 'reviewed',
    paths: clonePaths(draftThemes.find(theme => theme.id === `draft-${draftId}`)!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}))];
