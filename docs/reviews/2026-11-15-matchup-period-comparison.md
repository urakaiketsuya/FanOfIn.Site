# Observed period comparison

Added opt-in comparison for bounded date ranges across all events. The previous
period has the same inclusive UTC day count, with the same format and build.
Rates, result samples, decks, and events have equal visual prominence. The change
is in percentage points; an empty cohort has no rate or delta.

Verified with a published Silvie deck at 360×800 and 1280×900. September 1–30
returned 0% from 3 deck results; October 1–30 returned 29% from 7, a +28.6-point
change. Stacked mobile and side-by-side desktop layouts had no horizontal page
overflow. Keyboard activation, 2px focus outline, 48px comparison button, loading,
event exclusion, and empty periods were checked. No browser console errors.
Screenshots: /tmp/matchup-period-comparison/{mobile,desktop}.jpg.

Five focused tests cover existing observed reports, leap-year/inclusive date
boundaries, invalid ranges, event exclusion, and empty versus zero-rate rendering.
App and shared typechecks and targeted lint passed. Forced network errors,
screen-reader speech, and text zoom were not verified. No deployment.

This aggregate comparison phase is complete. Next: per-opponent period changes
with both sample counts, to make shifts in opponent mix visible. The broader
observed-results initiative remains open-ended.
