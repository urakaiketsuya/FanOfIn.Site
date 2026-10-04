import { elysianDanteThemeProposal, type ThemeDefinition } from './draftThemes.js';

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
}];
