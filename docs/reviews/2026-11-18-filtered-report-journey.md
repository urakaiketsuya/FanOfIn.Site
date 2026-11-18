# Full filtered report journey

Verified the real /deck-analysis page with committed catalog, taxonomy, and observed
matchup artifacts, using the homepage Silvie list through Paste → Check → Open in Analysis.
No fixture component or injected report state was used.

Fixed:
- Comparison visibility was owned separately by Overview and Matchups and disappeared
  when returning to Matchups. The page now owns it alongside the shared filter scope.
- Single-result matchup labels now use “1 match” / “1 game”.
- The tested deck rendered 488 card-interaction panels by default (a roughly 256,000px
  desktop page). It now shows three complete interaction panels with explicit expand/
  collapse controls; the whole interaction set remains available.

Verified at 390×844 and 360×800 mobile and 1280×900 desktop:
- Loaded the 60-main / 12-material Silvie deck without altering a saved deck.
- Date scope 2026-10-01 through 2026-10-30: 7 results, 2 decks, 2 events, 29% rate.
- Equal previous period 2026-09-01 through 2026-09-30: 3 results, 1 event, 0% rate.
- STANDARD format retained the counts; CANTRIP Regionals narrowed to 4 results,
  1 deck, 1 event, 25% rate. Independently checked against the shared cohort calculation.
- Single-event selection suppresses comparison and event ranges. Returning to All events
  restores the comparison. Overview ↔ Matchups retains filters and comparison visibility.
- Reset restores 8,292 results / 494 events. A future-date selection hides results while
  retaining filters and Reset. Verified empty results on desktop and mobile.
- Keyboard expansion/collapse of 9 opponent comparisons, 261 matchup rows, and the
  interaction preview. No horizontal overflow; report controls have 48px minimum height.
- Real artwork, long names, zero rates, absent previous-period rows and event ranges.
- Loading state observed during initial published-data fetch.

11 focused regression tests, app TypeScript, targeted lint, and diff whitespace check.
Screenshots in /tmp/report-journey-{mobile,desktop}-{matchups,comparison}.jpg.

Limitations: no injected network failures, authenticated account-save journey,
screen-reader speech, native on-screen keyboard, or text zoom. The in-app browser's
programmatic date fill needed native arrow-key input to commit the date change.

Next: review whether event extrema remain useful across many small events; numerous
all-time ranges span 0–100%. That is accurate observed variation, not uncertainty.
