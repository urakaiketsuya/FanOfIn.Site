# Calculator archive

Calculators are hidden from active navigation while their source, tests, saved
scenarios, profiles, and combo records remain intact. `CALCULATORS_ENABLED` is a
build-time constant, not a user setting.

- Deck Report retains Overview and Matchups; calculator handoffs and setup are hidden.
- Saved-deck stats retain Deck Report, Card traits, and Changes & packages.
  Version comparisons and combat-access reports already exist in Deck Report.
- Compare omits Calculators. Old `view=calculators` links fall back to the report.
- Combo Lab navigation and test links are hidden. Its old route redirects to
  Deck Report, retaining the `deck` query parameter. Published combo pages remain.
- Matchup planning retains its deck/planning flow but hides the scenario calculator.
- No probability, scoring, or persistence logic changed. Existing model-based reports
  remain labeled as models; this archive does not turn estimates into observed results.

## Verification

Verified the real local Deck Report at 360×800, 390×844, and 1280×900 using a
local Rai fixture and published data. Overview and historical Matchups remain
available; the calculator tab and handoffs are absent. Arrow-key navigation moves
selection/focus with a visible 2px outline; section tabs are 48px tall. No page
overflow at mobile or desktop. Expanded mobile Tools navigation contains Goldfish,
Life Tracker, and Match Log, with no Combo Lab. The legacy Combo Lab URL redirects
to Deck Report. Loading, unavailable data, missing-card fallback, and empty package
results were observed. Before/after screenshots are in `/tmp/draw-access-pilot/`
(`archive-before-*` and `archive-after-*`).

All five navigation and saved-tab rendering tests pass. Targeted lint and
`cd app && npx tsc -b --noEmit` pass. No deployment or signed-in save flow
was exercised. Browser attachment/timeouts prevented completing fresh no-deck and
multi-deck comparison UI checks; those paths were reviewed in source, with the
saved-tab fallback covered by a rendering test. Screen-reader speech and text zoom
were not tested.

Next: prioritize observed match results, matchup sample sizes, and comparable-build
outcomes in the report. The archive is complete; that broader analytics scope is
not yet defined.
