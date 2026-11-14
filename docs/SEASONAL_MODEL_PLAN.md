# Season-aware deck-performance model

Decision recorded 2026-11-14: retain all existing experimental results. Use official competitive
seasons as the primary temporal context, with effective ban/restriction changes defining
subperiods within each season. This is the selected modeling direction regardless of whether
the next retrospective comparison improves error. Report its measured performance honestly;
selection of temporal context is not evidence that predictions are accurate.

## Preserved baseline

`data/analysis/experiment-baselines.json` pins five existing reports to their exact Git revision,
SHA-256 checksum, and byte count: deck performance, card composition/pairs, groups/packages,
card access/draw, and calibration/error breakdowns. All are already committed at the recorded
revision. Recover the original bytes with `git show <revision>:<path>`; Git history provides
storage without duplicating the reports. Keep the pinned revision reachable in repository
history. The manifest is a recovery reference, not an automatic write guard.

Future seasonal runs must write a new artifact (proposed `data/analysis/card-seasonal-audit.json`)
and must not replace the preserved reports or change their conclusions. Preserve the baseline
cohort hashes, split dates, calibration parameters and results as recorded. The manifest does
not archive the complete raw event cache or fitted coefficients; those need separate retention
before claiming fully reproducible future predictions.

## Period identity

- Use each event's authoritative Omnidex season ID, rather than inferring a season from a set
  name, calendar quarter or rolling window. Keep formats separate.
- Within a season and format, start a new ban regime on the effective date of an actual ban,
  unban or restriction change. Use announcement dates only to track when information became
  available, not when legality changed.
- A watchlist change or a no-change B&R announcement does not start a new regime.
- Seasonal bans end at the officially defined season boundary; permanent bans persist until
  an explicit change. Do not infer historical bans from today's card-catalog legality.
- Missing season IDs and unverified historical ban periods remain explicitly unknown. Do not
  silently assign them to the latest season or treat unverified periods as having no changes.
- Events that straddle a change, or have an official legality exception, require an explicit
  policy/override rather than guessing from an announcement date.

The existing app snapshot records current bans, but it is not a historical ban ledger. A
reviewed, source-linked effective-date history is required before a full ban-aware backtest.

## Modeling and evaluation requirements

Retain the quantity-aware card model, player/opponent context and calibration as the historical
baseline. Estimate season/regime-specific deviations with shrinkage toward broader historical
evidence when samples are small. Raw seasonal card win-rate averages alone should not replace
player/opponent adjustment. A new period must have a defined historical fallback before enough
results arrive; it cannot borrow outcomes from the future.

For historical predictions, use only completed results available before each prediction date.
Batch same-date results so they cannot influence each other. If the seasonal model updates as
a season progresses, compare against a baseline with the same update opportunity and clearly
label sequential evaluation separately from the existing fixed-cutoff tests. Choose shrinkage
and recalibration on earlier temporal partitions, not the already inspected test residuals.

Report overall error and calibration, season/regime coverage, early-season fallback coverage,
and the existing champion/matchup/familiarity breakdowns. Retain unfavorable outcomes. No
public win-rate forecast is authorized by this planning decision alone.

## Official sources checked

- https://www.gatcg.com/article/introducing-seasonal-banlists — seasonal bans last one competitive
  season, allow mid-season changes, and supplement the regular B&R process.
- https://www.gatcg.com/article/ban-and-restricted-october-16th-2026 — explicitly reports no
  changes; this announcement should not create an artificial new ban regime.

## Implementation status — 2026-11-14

Implemented as a separate offline model and report; see [CARD_SEASONAL_EXPERIMENT.md](CARD_SEASONAL_EXPERIMENT.md).
Official event season IDs and reviewed ban regimes now drive sequential champion/matchup
adjustments with historical fallback. Earlier reports remain byte-identical. The matched
backtest is complete; its seasonal increment is inconclusive, and the seasonal direction is
retained as requested. Historical ban coverage before December 2025 and untouched future
validation remain follow-up work, not claims of this implementation.
