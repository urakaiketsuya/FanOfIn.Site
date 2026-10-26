# Competition report release verification

Initiative: #4 / release D, tournament and competitive analytics.

## Scope

All eight page groups in the roadmap have implementations. Complete-field event and
season reports retain their stricter population; recorded-list/build reports remain
separate. Historical team membership is available in event registrations. No persistent
team identity is inferred. Missing sources remain visible as unavailable.

## Calculation checks

- Shared regression fixtures: duplicate observations, unclassified/ambiguous build
  assignments, missing months/lists, invalid dictionary names, once-per-list adoption,
  Sideboard exclusion, ties, byes, incomplete/conflicting matches, geographic exclusion.
- Pipeline end-to-end fixture: period boundaries, duplicate events, hidden lists,
  player/build records, card quantity changes, repeated attendance, complete fields,
  event-date team lineups and source standings bye convention.
- Existing season field, event report, and preceding-event comparisons retained.

## Release gates

Local checks passed:
- Event index/detail, seasons index/detail, Battle Chart, players index/profile, teams,
  regions and stores at 390px and 1280px, keyboard focus and report link touch targets.
- 200% root text size with no horizontal page overflow. Fixed long event titles,
  event metadata wrapping, and Battle Chart/team select sizing found by these checks.
- Loading, failed fetch, keyboard-accessible 48px retry, recovery and empty results
  for all five new datasets. Missing fields/identities and card-name fallbacks also
  exercised with published data. New reports have no expansion controls.
- Eighteen focused shared/pipeline regression tests; app, shared and pipeline typechecks.
- App lint: no errors, seven pre-existing refresh-export warnings.
- Production build and published-artifact validation.
- Published totals reconcile: build buckets to recorded sightings, player records to
  match totals, build/opponent records to player totals, attendance and field counts.

Browser evidence: `/tmp/check-competition.cjs`, `/tmp/check-competition-states.cjs`,
`/tmp/check-season-zoom.cjs`, and `/tmp/competition-*.png` (local verification artifacts).
Normal card images and unavailable identity/name fallbacks were visually inspected.

Five projections total about 384 KiB gzip. The largest is recent players, 311 KiB gzip
(3.1 MiB JSON); local Node parsing measured about 53ms. This is not a mobile-network
benchmark. Season/Battle/places/teams projections avoid fetching full lists solely for
these reports.
Published projections regenerated from local source artifacts; no network data mutation.
Push and live verification: pending.

A successful local build does not establish player comprehension. The design retains
visible percentages/counts, common scales, readable names and linked cards; player-task
validation remains an ongoing product evaluation rather than an unperformed test claim.
