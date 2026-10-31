# Broadcast event map

`npm run pipeline:broadcast-events` builds `data/broadcast-events.json` and its manifest
entry from the saved `data/omnidex/events/<eventId>.json` snapshots and broadcast recaps.
The root `npm run build` regenerates this projection before building the app. Rerun the
command when editing recaps or updating source event snapshots. No live service is
required to build or browse it. The shared builder is `shared/src/broadcastEventMap.ts`.

The projection includes all saved official pairings for the 11 events with broadcast
coverage, grouped by event ID and explicit stage ID. It preserves source round numbers,
player IDs, status, score and bronze labels. It does not reconstruct missing rounds,
seedings, entrants or byes. A connector exists only when a completed pairing has exactly
one winner and exactly one non-bronze pairing in the immediately following elimination
round contains that player. Swiss matches never receive advancement connectors.

A recap attaches only when both exact, case-insensitive player names identify one
pairing within the event and stage (and round for Swiss), with matching bronze status.
Unverified identities, ambiguous matches and duplicate assignments remain separate
recap links. There is no fuzzy name join. The current 110 recaps all attach uniquely.

The map presents official scores, not inferred broadcast game counts. Worlds 2026's
final is 2–1 in the official snapshot and 3–2 in the broadcast recap. Both are retained
in their respective contexts. Only recap-specific deck descriptions supply named champion portraits; spirit fallbacks
follow the source rules below.

Desktop windows show up to three consecutive rounds ending at one selected match,
using verified predecessor links. Larger cuts offer branch selection; a window ending
at one match contains at most seven ordinary single-elimination matches. Unconnected
source matches are displayed separately rather than attached to invented slots.
Mobile shows one round with pagination. Event, stage, round, branch, page, query and
champion filters use URL state. IndexedDB caches the published map, and failed refreshes
keep cached results with Retry available.

When a recap has no named champion portrait, the map falls back to catalog-verified
SPIRIT champions in that player's public Material deck. Names, not guessed elements,
are projected into each pairing. Stage-specific lists take precedence; when a stage
has its own list evidence, players without that evidence do not inherit another stage's
registration. Conflicting lists, private lists and zero-quantity lines provide no fallback.
Spirit portraits remain separate from champion identification and filtering. Missing
catalog artwork retains the spirit name; result-only spirit portraits link to card details.
