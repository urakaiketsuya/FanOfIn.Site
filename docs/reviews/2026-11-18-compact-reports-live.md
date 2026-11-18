# Compact reports: live deployment verification

Verified https://fanofin.site/deck-analysis on 2026-11-18 using the public Silvie example deck at 360×800 and 1280×900 browser viewports.

## Release repair

Production initially served `57acdb59e`; deployment of `3e4494230` failed because `analysisMatchups.test.ts` expected the retired “Recorded games” label. Updated the assertion to the compact “games” label without changing UI behavior or calculations.

Fix: `fac6aa2cd254a36ee8813b3318f9852bc0b6234f`. All 1,170 tests selected by the local app `.test.ts` run passed. The full CI release checks, Pages deployment, and production smoke checks passed in run https://github.com/urakaiketsuya/FanOfIn.Site/actions/runs/44397704051. Public `release.json` confirmed this revision.

## Live checks

- Imported the representative 60 Main / 12 Material Silvie list through Check decklist → Open in Analysis → Matchups.
- Both compact views rendered at mobile and desktop widths without page or row overflow. Mobile controls measured 48px tall. Card art, long build names, rates, samples, range endpoints, and keyboard focus remained readable.
- All-time results: 8,292 deck results, 1,903 decks, 494 events. Tristan: 500 matches / 115 events, 51% overall, middle event range 25–75%, full range 0–100%. Mirror rows correctly retained a collapsed 50–50% range.
- Keyboard expansion/collapse worked at both viewport sizes: 261 matchups and 151 opponent comparisons. Comparison selection survived Overview → Matchups navigation.
- January–June 2026 comparison: 552 selected versus 483 previous deck results; paired rows retained separate samples, ranges, and directional deltas.
- October 1–30 versus September: 7 versus 3 results; selected-only and previous-only opponents showed absent rates as dashes with “No recorded matches” text, distinct from observed 0%. Long Lorraine names wrapped on mobile.
- Event 65658: 1 match / 1 event / 100%, with no invented range band.
- Future-date empty scope hid result sections at both sizes. Reset restored results. Initial loading and updating status were observed. No browser console errors were recorded.

## Limits and evidence

Responsive browser viewports, not physical phones. Native VoiceOver/TalkBack, native text zoom, and forced network-failure/retry were not tested in this live pass; prior native-access blockers remain.

Screenshots: `/tmp/live-compact-mobile-matchups.jpg`, `/tmp/live-compact-mobile-period.jpg`, `/tmp/live-compact-desktop-matchups.jpg`, `/tmp/live-compact-desktop-period.jpg`.
