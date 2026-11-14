# Seasonal deck forecast — initial release

## Product

The shared deck Analysis / Deck Report now starts with Expected results (Beta):
an equal-skill expected match score against the sampled Standard field, champion
card artwork, matchup percentages, and field shares. The six most common opponents
appear first; the remaining matchups expand inline. Edited deck quantities update
the report without configuring a calculator. Actual historical results stay separate.

All percentages are match-point shares (win 1, draw 0.5, loss 0), not strict win
probabilities. No personalized pilot rating, strength tier, or card-swap claim.
Champions with base coefficients or historical seasonal-layer evidence are supported.
Unknown card contributions remain zero and copy-weighted model coverage is shown.
Unsupported formats/champions, incomplete or illegal decks, missing data, and stale
snapshots have concise unavailable states. Failed first loads offer retry; a valid
cached snapshot remains usable after a failed background refresh.

## Model and field

`shared/src/deckForecast.ts` owns serialized inference. The artifact contains the
quantity-aware base coefficients, the completed-event residual state, prior mass,
calibration scale, and anonymous opposing deck values. It contains no pilot IDs.
Inference uses a 0.5 Elo prior and preserves the research model's two clipping steps
and calibration order. Seasonal residuals are learned from actual-player historical
predictions, not from equal-skill counterfactuals.

The base fit remains frozen at the original 2026-03-01 cutoff. Calibration and prior
mass use the original inner validation split. The online layer replays post-cutoff
matches, incorporating only events recorded complete before the as-of date. This
initial release does not refit card effects on the held-out data.

The opponent sample uses completed events in the preceding 28 days, within the
current authoritative season and reviewed Standard ban regime. Each entrant with
a usable main/material decklist contributes once per event, irrespective of wins,
round count, or placement. Main/material cards must have verified current catalog
legality; sideboards do not contribute to identity or prediction. Missing decklists, unsupported champions,
and unrecognized cards are excluded, so the sample is not the entire competitive
population. Entrant counts refer to included events with available standings and
decklist responses; events missing either response are excluded entirely.

The November 14 snapshot covers 1,964 of 1,992 entrants across 93 events. It replays
the retained 48,500-match seasonal backtest at exactly 0.1921776545481473 error.
Serialized base predictions differ from research predictions by at most 5.6e-16.
The headline is a new field aggregation, not a separately validated field-level
win-rate model. Calibration findings for actual-player predictions do not establish
counterfactual equal-skill accuracy.

## Publish / refresh

```sh
npm run publish:deck-forecast --workspace=pipeline -- --as-of=2026-11-14
```

Omit `--as-of` to use the current UTC date. The command rebuilds the model artifact
at `data/analysis/deck-forecast.json` and updates its entry in `data/manifest.json`.
It does not overwrite any experiment reports. The site consumes it through the
shared published-data cache, including manifest refresh notifications.

Before refresh, review `data/analysis/competitive-ban-regimes.json` through the
as-of date. Publication fails if the current season or ban regime is unverified,
if no eligible field exists, or if export parity fails. Refresh after each ban
change and with new tournament data. This initial command is manual; it is not
wired into scheduled crawling. Preserve the original experiment artifacts.

Snapshots expire after 14 days or at the official season end, whichever comes
first. This is a freshness backstop, not a promise that no bans change inside that
window. Refresh immediately after a new ban takes effect. Until then, the visible
field-as-of date identifies the snapshot being assessed.

## Verification

- Serialization parity, weighted field arithmetic, quantity sensitivity, unknown
  card coverage, unsupported/expired states, and completed-event snapshot tests.
- Seasonal regression fixtures and full original holdout replay.
- Shared/pipeline/app typechecks and app lint.
- Narrow mobile and desktop flows, keyboard expansion, 48px touch targets,
  loading, failure/retry, missing-field and stale-snapshot states.

No live deployment is included until the changes are pushed. Next release action:
push, verify the deployment artifact/manifest, then inspect a valid Standard deck,
an unsupported format, and an edited deck on the live site.
