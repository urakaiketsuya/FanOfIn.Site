# Compact report accessibility and text resizing

## Changes

- Range labels wrap between words; numerical endpoints stay together.
- Summary totals and filter fields use text-relative minimum widths, stacking when enlarged text needs room.
- Matchup rates have an accessible metric label. Period deltas expand “pp” to “percentage points, selected minus previous” for assistive technology; missing rates expose “No recorded matches” instead of a bare dash. Champion links announce their new-tab destination.
- Calculations, samples, bands, and visible result wording are unchanged.

## Verification

Local published-data report using the Silvie example deck, 360×800 and 1280×900 viewports.

- Tested both views at normal size and simulated 200% text sizing. Temporary CSS doubled typography tokens and inherited body text while preserving the root spacing unit; computed body text was 32px and observed row rates were 48px. Removed all verification CSS afterward. This is text-resize simulation, not native browser zoom or mobile OS text scaling.
- Before fixes: mobile document width 401px at a 360px viewport; range rows had 389px content inside 326px containers. After fixes: document width equals viewport width at both sizes; both compact views' article scroll widths equal their client widths.
- Inspected actual accessibility-tree output at both viewport sizes: opponent identities, heading hierarchy, rate labels, counts, range endpoints, previous/selected order, expanded state, missing results, and full delta units/direction. Decorative chart marks and scale ticks are excluded from this tree.
- Keyboard Enter expands/collapses both row lists; focus remains on the button, expanded state changes, and desktop focus outline is visible. Report filter/action controls measured at least 48px tall.
- Used all-time results, Jan–Jun 2026 versus the equal preceding period, and October 1–30 versus September 2026. Covered large/long-name rows, missing-side comparisons, zero rates, collapsed ranges, and full-width ranges. Initial loading was observed.
- App TypeScript check, targeted lint for all four changed components, and diff whitespace check passed. No calculation changes or new calculation tests were needed.

## Remaining verification

Native Chrome computer access was denied; Codex native application control is unavailable for safety reasons. Actual VoiceOver speech/navigation could not be tested. The accessibility-tree review is not a screen-reader certification. Native mobile VoiceOver/TalkBack, native browser zoom/OS text scaling, forced network failure, and fully empty filters were not exercised in this pass.

Screenshots: `/tmp/report-accessibility-mobile.jpg` and `/tmp/report-accessibility-desktop.jpg` (200% simulated text).
