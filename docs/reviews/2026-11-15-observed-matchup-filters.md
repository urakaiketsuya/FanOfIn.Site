# Observed matchup filters

Deck Report now filters observed matchup results by inclusive event dates, format, and event.
Overview and Matchups share the selection. Rates, participating decks, events, and match counts
come from the same cohort. The active cohort stays labeled beside the result. Largest samples
remain first; empty selections show a dash instead of a zero-percent rate.

A separate 2.2 MB artifact contains 1,970 qualifying events and 66,430 event/build-pair rows.
The producer reuses completed-pairing validation and unambiguous taxonomy membership. Mirrors
count once per opponent card, twice as deck outcomes in the aggregate. Existing card-impact data
and algorithms remain intact. See CALCULATIONS.md for cohort and denominator definitions.

## Verification

- App, pipeline, shared TypeScript checks pass; targeted oxlint and diff whitespace checks pass.
- Six focused render/aggregation/producer tests pass, plus the existing competition report integration test.
- Actual app tested with an imported published Silvie deck: 60 Main / 12 Material / 13 Sideboard.
- 360×800, 390×844, 1280×900: no horizontal page overflow; new controls at least 48px high.
- Date filtering, end-date filtering, single-event selection, reset, loading/updating, empty cohort,
  reversed-date error, shared tab selection, and keyboard expansion/collapse verified.
- Keyboard focus visible (2px outline); 261-row expansion and collapse exercised via Enter.
- Ascent Osaka: 75% score rate / 2 deck results / 1 deck / 1 event. October 1–30:
  29% / 7 results / 2 decks / 2 events. UI totals agree with the shared computation on published data.
- Browser checks caught and fixed stale date fields when returning to the retained Overview panel.
- No browser console errors. Browser date fill did not dispatch a React change until a native
  keyboard adjustment; verified using native keyboard input as well as semantic selects.
- Screenshots: `/tmp/observed-matchup-filters/mobile.jpg` and `desktop.jpg`.

Not verified: forced network failure/retry, screen-reader speech, text zoom, authenticated flows,
or deployed production. The new data loader uses existing published-data retry/cache handling.
No deployment or push performed.

This date/event-filter phase of observed-results-first analytics is complete. Next proposed work:
period-to-period matchup comparisons with equally visible samples; comparison cohort rules still
need definition. The broader analytics initiative has no fixed total scope.
