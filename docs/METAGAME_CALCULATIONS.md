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
