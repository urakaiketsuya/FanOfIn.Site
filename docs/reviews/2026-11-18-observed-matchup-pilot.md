# Observed Matchups pilot

Compact responsive rows replace the matchup card grid. Champion thumbnails and names
remain visible. Every row uses the same 0–100% scale with a 50% reference, overall-rate
dot, match count, and contributing event count. The line shows observed event low–high,
not an uncertainty interval. Single-event results show only a dot. Empty results remain
hidden; loading and actionable retry states remain visible.

Verification:
- Nine app tests and three pipeline cohort tests passed, including ties, reversed pairs,
  mirrors, filtering, zero-match exclusion, single-event display, and range text.
- App and shared TypeScript checks; targeted component lint; diff whitespace check.
- Real AnalysisMatchups component in a temporary local fixture, with representative
  samples, long names, catalog artwork, and missing-art fallbacks.
- Mobile 360×800 and 390×844, desktop 1280×900: no horizontal overflow; controls at least
  48px tall; aligned desktop charts and stacked mobile rows.
- Keyboard expansion, visible focus, empty/loading/error states, keyboard retry verified.
- Screenshots: /tmp/observed-matchups-mobile.jpg and /tmp/observed-matchups-desktop.jpg.
- Fixture files removed. Authenticated full-page journey, live network recovery,
  screen-reader speech and text zoom were not tested.

Next: apply the compact comparison layout to period comparisons after reviewing this pilot.
