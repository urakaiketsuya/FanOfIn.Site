import { draftThemes, elysianDanteThemeProposal, type ThemeDefinition } from './draftThemes.js';

export interface ReviewedTheme extends ThemeDefinition {
    kind: 'theme';
    status: 'reviewed';
    reviewDocument: string;
}

/** Explicit publication decisions, separate from strategy and combo classification. */
export const reviewedThemes: readonly ReviewedTheme[] = [{
    id: 'elysian-dante',
    name: 'Elysian Dante',
    kind: 'theme',
    status: 'reviewed',
    paths: structuredClone(elysianDanteThemeProposal.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'resonator-music',
    name: 'Resonator music',
    kind: 'theme',
    status: 'reviewed',
    paths: structuredClone(draftThemes.find(theme => theme.id === 'draft-resonator')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'discorp',
    name: 'DisCorp',
    kind: 'theme',
    status: 'reviewed',
    paths: structuredClone(draftThemes.find(theme => theme.id === 'draft-discorp')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'angels',
    name: 'Angels',
    kind: 'theme',
    status: 'reviewed',
    paths: structuredClone(draftThemes.find(theme => theme.id === 'draft-angel')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}, {
    id: 'specters',
    name: 'Specters',
    kind: 'theme',
    status: 'reviewed',
    paths: structuredClone(draftThemes.find(theme => theme.id === 'draft-specter')!.paths),
    reviewDocument: 'docs/DRAFT_THEME_PUBLICATION_REVIEW.md',
}];
