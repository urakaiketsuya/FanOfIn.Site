# Metagame card usage

Implementation: `app/src/features/metagame/report.ts`. This is a descriptive registration report, not a performance ranking.

Join the published deck-card index to the popularity index by deckId, then to event metadata by eventId. Include only completed events of the selected format. Count each deckId once; identical lists registered by different players or at different events remain separate registrations. Unknown champions remain in the all-champion denominator and have an explicit Unknown option.

The reporting cutoff is the earliest generatedAt of the three sources. Last 30/90 days means event date in (cutoff minus N days, cutoff]; all time removes the lower bound. This anchors the report to published coverage rather than pretending stale data is current. Future and unfinished events are excluded.

Inclusion = registrations containing the card in the selected section / all matching registrations with available card lists. Empty sideboards remain in the denominator. Nonempty sideboard counts are shown separately. Missing card lists are excluded and reported. Duplicate card lines within a section sum quantities but count presence once. Nonpositive, nonfinite quantities and unresolved dictionary names do not count.

Average copies = total copies / registrations containing the card in that section. Sections never combine. Ordering is inclusion count descending, then name ascending. Champion option counts use the same format and period before champion filtering. No win-rate inference, sideboarding behavior, or unique-player claim is made.

Current scope: usage by champion and section, with optional format and period. Period-over-period trends and signature-card comparisons are separate future work.

## Player card patterns

`app/src/features/players/cardPatternReport.ts` applies the same registration model to one player. Default to Standard and the champion with the most available public registrations; ties use alphabetical order. Usage covers all available history of completed events in the selected format, through the shared publication cutoff. Keep each section separate and include empty sections in the denominator.

For each card and section, find the earliest event date among that player's available lists with the selected champion and format. Cards whose earliest date falls in the last 90 days are displayed as “First seen with [champion]” and linked to that event. Appearances count distinct registrations, including the first. Duplicate lines and duplicate deck IDs do not inflate counts. Sort newest first, then card name. This can include cards from the player's first observed deck; it does not claim the player adopted those cards for the first time. Public-list gaps limit historical coverage. A move from Main to Sideboard is a new observation in Sideboard only.

Player report verification: six combined metagame/player calculation tests cover section denominators, duplicate registrations/lines, player isolation, first observations, champion defaults and empty formats. Browser checks at 360/390/1280px cover lazy data requests, failure/retry, empty results, expansion, champion/section URL reloads, keyboard tabs, 48px controls and 200% text without page overflow. Artwork was visible in the local preview; live deployment was not checked.

### Player trends and signature choices

Recent changes compare (cutoff − 90 days, cutoff] against (cutoff − 180 days, cutoff − 90 days]. Champion, format and section are held constant. Each period needs at least three available player registrations. Compare the union of cards, treating absence within an available period as zero, and order by absolute inclusion percentage-point change, recent count, then name. Suppress differences below 0.05 percentage points (display rounds to one decimal).

Signature choices compare the player's recent 90 days with other players' registrations in the same period, champion and format. Exclude every registration belonging to the selected player from the peer baseline. Require three player lists and ten peer lists; a displayed signature card must appear in at least two player lists and have inclusion at least 0.05 percentage points higher than the peer baseline. These are descriptive minimums, not statistical significance tests. Registrations, not unique players, form denominators. Both comparisons retain separate section denominators, including empty sideboards, and use the shared completed-event and missing-list rules. Show the top six cards with paired 0–100% bars, numerator/denominator and signed percentage-point difference. Sparse samples show progress toward the minimum instead of a comparison.

Comparison verification: seven combined calculation tests pass, including exact adjacent-window boundaries, peer exclusion, sparse samples and cards removed from recent lists. Local browser checks pass at 360/390/1280px for comparison counts, section empty states, source retry, keyboard, touch targets, URL persistence and 200% text without overflow. Card-name fallbacks and loaded desktop card artwork were verified. Live verification remains.

## Meta freshness

`shared/src/metaFreshness.ts` compares adjacent (cutoff − N days, cutoff] and
(cutoff − 2N days, cutoff − N days] windows, N=30 or 90. Cutoff is the earliest
publication time of events, popularity, card index and build taxonomy. The metagame
page defaults to 30 days; its All time usage view retains a labeled 30-day freshness
comparison. Format and optional champion apply to both periods. Deduplicate event and
deck IDs. Include completed events only. Require nonempty Main and Material with
resolved dictionary names and positive integer quantities; Sideboard is ignored.

Coverage denominators are recorded deck entries, not all tournament entrants. Report
usable public lists and uniquely classified build memberships separately in each period.
Missing/invalid lists and ambiguous/unclassified memberships never become new builds.
Use the same published taxonomy for both periods; this is retrospective membership,
not proof that a build was known at the time. Taxonomy changes can revise these values.

Top-five build share sums the five largest classified groups in each period, divided by
all usable public lists, retaining unclassified lists in the denominator. Returning
build share counts current lists assigned to groups with at least three previous-period
registrations, divided by all current usable lists. Without classified lists in both
periods it is unavailable. These shares are observed lower bounds when classification
is incomplete. A build seen once or twice previously is not called common. Repeated
players and copied lists count once per registration, since this measures the played
field rather than unique-player preferences. No combined freshness score or stale/fresh
threshold is assigned.

Card turnover measures absolute change in card inclusion in percentage points within
each champion. Presence is deduplicated across Main and Material, irrespective of copies.
Average across the union of card names observed in the two periods, including absent
cards as zero within a nonempty period. Require at least three usable lists per champion
per period and known champion identity. The headline is weighted by current lists among
comparable champions; show that comparable count. New/absent champions do not imply 100%
turnover. This separates shifts in champion popularity from changes inside their decks.
The six most-played builds show current/previous shares; the six most-played comparable
champions show turnover. Low turnover and concentration describe repetition, not player
enjoyment, balance, causality or predicted performance.

Verification (2026-10-30): five fixture tests cover stable and changed cards/builds,
Sideboard exclusion, deduplication, ambiguous/missing memberships, sparse and empty
periods, future-event exclusion, and the exact period boundary. App/shared typechecks
and focused lint pass. Browser checks cover 390px mobile and 1280px desktop, 48px
filters, no horizontal overflow, 30/90-day switching and empty format results. Source
failure/retry uses the existing shared status component; no new forced failure or
text-zoom check was performed for this panel. Live deployment remains unverified.

### Freshness across seasons

The season history uses the same freshness formulas and usable-list requirements, grouped by the event's explicit season ID. Seasons are ordered by their published start date, oldest first in the charts. Each compares against the immediately preceding catalogued season, even when that season has no usable lists; missing seasons are never silently skipped. The first season has no returning-build or card-turnover comparison. Completed events after the shared publication cutoff, future seasons, and events without a matching season ID are excluded. The current season is labeled in progress until its published end date. Comparisons use full observed seasons (the current season to date), not equal-duration windows. Format and champion filters apply; the rolling period selector does not alter season history. Historical classification remains retrospective using the current taxonomy. No historical snapshots or staleness score are implied.

Season history verification: six freshness fixtures passed, including chronological ordering, missing predecessor data, champion scope, incomplete events, and future seasons. Shared and app typechecks and focused lint passed. Browser checks at 390px and 1280px confirmed readable charts without horizontal overflow, the first-season unavailable comparison, current-season status, and free-play unavailable results. Existing selects remain 48px tall and keyboard Tab moves from Format to Period. Loading was observed; source failure/retry and text zoom were not re-tested for this addition. Three chronological bar charts use 0–100% for build shares and a labeled common scale for card turnover, with visible values and semantic definition lists.

### Linked metagame exploration

The Metagame page now follows a task sequence: identify season trends, compare build shares, inspect card inclusion changes. One URL-backed format/champion/period scope drives the build and card comparison. The default is the latest started season against its immediate predecessor; rolling 30/90-day modes compare adjacent equal windows. The trend overview always provides season context against each season's predecessor. Selecting a season updates the comparison and clears any build selection. The former all-time card-usage mode is replaced by explicit comparisons.

Build changes use the union of classified builds in both periods, so disappearing builds remain visible. Share is registrations in the build divided by all usable public lists in the period; absent builds have zero share only when the period denominator exists. Rows rank by absolute percentage-point change, with stable ID ties. The dumbbell plots share a common zero-based axis across all builds in scope, rounded up to the next five percentage points. Empty periods yield unavailable comparisons, not zero deltas.

Selecting a build filters only card evidence by exact unambiguous taxonomy membership; overall build shares and trend context remain unchanged. Card inclusion is counted once per deck per section, divided by usable Main+Material lists in the selected scope. Missing sideboards remain absent registrations, not evidence of sideboard play; coverage counts are shown separately. Card rows use the union across periods and rank by absolute inclusion change with name ties. A build with no lists in a period has unavailable card inclusion for that period. Card change bars use a fixed −100 to +100 percentage-point scale. Main, Material, and Sideboard remain separate. Trends use aligned ordinal season axes, missing values break line segments, and explicit season controls support touch and keyboard access. Full season names appear in controls and selected values; historical build-share lines remain observed lower bounds.

Linked-flow validation: seven shared-calculation fixtures passed, including disappearing builds, card-section separation, a build with zero current observations, and preservation of overview metrics while filtering cards. App/shared typechecks and focused lint passed. Browser verification at 390×844 and 1280×900 covered loaded and empty states, 48px controls, no horizontal overflow, selecting a build and moving focus to card changes, arrow-key section navigation, season selection clearing the build filter, and rolling-period scope. Loading was observed. Forced source failure/retry and text zoom were not re-tested; no live deployment verification was performed.
