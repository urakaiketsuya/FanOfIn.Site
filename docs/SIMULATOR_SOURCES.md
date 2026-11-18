# Simulator source filtering

`/simulator?source=clarent` (default) and `/simulator?source=gao` select a source.
The selector preserves other query parameters and browser back/forward navigation.

The public summary's existing top-level fields remain Clarent game telemetry.
An additive `matchSources` array contains separate `gao` and `clarent` aggregates
from authenticated completed-match submissions. Each includes match and draw
counts, deck snapshot count, game count, first-player results, average turns, and
the number of games with reported turns. Sources with no submissions have zero
counts and null rates/averages. Older snapshots without this field display an
unavailable state rather than claiming GAO has no matches.

First-player win rate uses only games with a reported first player; drawn games
remain in that denominator. Average turns uses only games with reported turns.
Deck counts are submitted snapshots, not unique deck identities. These aggregates
publish no match IDs, deck IDs, decklists, URLs, names, or participant identities.

Clarent's detailed game telemetry and its completed-match submissions are shown
separately because the same games may appear in both. No cross-endpoint identity
mapping exists, so adding the totals would risk double counting. GAO's match-only
contract does not report card activity, weapons, or per-turn events; those detailed
Clarent sections are not shown under GAO.

The pipeline validates and preserves `matchSources` in the existing published
`data/simulator/summary.json`. Deploy the updated Worker and refresh simulator
analytics before publishing the page to populate the source statistics. No database
migration is needed. Existing consumers of the top-level Clarent summary retain
their behavior.

Verification (2026-11-18): 19 Worker tests and 16 focused pipeline tests passed;
app, shared, pipeline, and Worker typechecks and targeted UI lint passed. Chromium
checks at 390px and 1280px covered populated source switching, URL/history,
keyboard focus, 48px selection control, and page overflow. Empty GAO, older snapshot,
and failed-load/retry states passed with isolated response fixtures. Native touch
and production source-summary deployment were not exercised.
