# Card-model calibration and error audit

Run `node --import tsx pipeline/src/analysis/cardCompositionAudit.ts --calibrate`.
Output: `data/analysis/card-calibration-audit.json`. Research only; no public score or UI change.

## Protocol

Reuse the original composition experiment's cutoff and final test date. The original training
period is divided at 80% of its distinct UTC dates. Fit a card model on the earlier portion;
use its predictions on the later training portion to fit one confidence scale. Player Elo
is recalculated and frozen at that inner cutoff, so calibration outcomes cannot influence
calibration predictions. Same-date events stay in the same partition.

For predictions `p` and match-point outcomes `y`, fit:

```
scale = clamp(sum((p - 0.5) * (y - 0.5)) / sum((p - 0.5)^2), 0, 1)
p_calibrated = 0.5 + scale * (p - 0.5)
```

This minimizes calibration-sample squared error under a symmetric shrinkage constraint.
It preserves ranking, 50% ties, and complementary predictions when opponents swap sides.
A zero denominator uses scale 1. Empty/invalid observations fail. No intercept, subgroup
adjustments, or holdout-driven parameter search are used. Draws count as 0.5: the target
is expected match-point share, not a draw-free win probability.

Refit the original card model on all original training matches, then apply the frozen scale.
Report raw and calibrated predictions on the existing historical holdout, exact-unseen
subset, and chronological halves. Separately report the fully frozen inner model with its
inner-cutoff Elo on the same holdout. This checks whether improvement depends on transferring
the scale to the refitted model; it does not make the test prospective.

## Error breakdown definitions

- Champion: both player perspectives, including both appearances in mirror matches.
- Matchup: one observation per match, grouped by recorded format and lexically sorted champion
  pair; prediction/outcome refer to the first champion. Mirrors retain the original
  outcome-independent orientation.
- Deck familiarity: relative to the full original training set. Exact main/material list;
  new list with all card names seen; new list with up to 10% unseen copies; or new list with
  over 10% unseen copies. Copy shares include main and material, exclude sideboard, and use
  global training card-name coverage. This is not a nearest-deck-family similarity measure.

Each group reports appearances, unique matches, events, predicted/observed share, signed bias
(positive means overprediction), squared error, and paired calibration improvement.
Uncertainty uses 400 deterministic event-cluster bootstrap resamples, keeping the two player
perspectives together. Intervals are omitted below 20 events; support is flagged at 100
appearances and 20 events. Subgroups are exploratory, not multiplicity-corrected findings.
Champion and familiarity aggregates contain overlapping matches, so do not sum their match
counts or treat them as independent samples. Overall signed bias cancels across both sides;
use per-group bias and squared error instead.

## Limits

The retrospective test period has already been inspected in earlier experiments. This run
keeps its outcomes out of calibration fitting but is not untouched future validation.
Only one calibration split is used. Current catalog resolution, absent historical ban eras,
published-deck selection, player recurrence across events, and near-duplicate lists remain
limitations. Changes in group error do not establish that a card or champion causes losses.
No existing performance or calculation documentation is changed by this separate audit.

## Results (2026-11-14)

All source fingerprints (catalog, cohort, and historical match results) match the original
composition artifact. Original training: 114,817 matches. Inner fit: 92,289 matches before
2025-11-29. Calibration: 22,528 matches from 2025-11-29 through 2026-02-28. Test: 48,500
matches across 748 events from 2026-03-01 through 2026-11-09. Both fits converged.

The fitted scale is **0.8665719828086804**. A 90% prediction becomes 84.66%; 10% becomes
15.34%. The adjustment changes confidence, not which side is favored.

| Evaluation | Raw card error | Calibrated card error | Paired improvement 95% interval |
|---|---:|---:|---:|
| Full holdout | 0.195032 | **0.193550** | [0.001029, 0.001848] |
| Both exact lists unseen | 0.195782 | **0.194216** | [0.001124, 0.001931] |
| Earlier half | 0.190791 | **0.189865** | [0.000400, 0.001434] |
| Later half | 0.199274 | **0.197236** | [0.001547, 0.002575] |
| Fully frozen inner model | 0.201919 | **0.199771** | [0.001692, 0.002496] |

Full-holdout error falls **0.76% relative to raw cards**. The confidence adjustment helps both
temporal halves and also the older, fully frozen model. This supports using the calibrated
candidate for subsequent research. It does not improve ranking or establish prospective accuracy.

### Champion residuals

Selected supported champion groups, after calibration. These are player appearances, not
independent matches. Percentages are match-point share. The full artifact includes all 21
champions and uncertainty; selection below highlights substantial residuals with larger samples.

| Champion | Appearances | Predicted | Observed | Predicted minus observed |
|---|---:|---:|---:|---:|
| Jin | 4,190 | 44.75% | 51.12% | -6.37 pp |
| Tonoris | 2,615 | 43.23% | 47.74% | -4.52 pp |
| Alice | 2,799 | 38.28% | 41.75% | -3.46 pp |
| Mordred | 610 | 37.21% | 30.33% | +6.88 pp |
| Kongming | 1,660 | 45.56% | 40.39% | +5.17 pp |
| Silvie | 4,093 | 46.34% | 42.76% | +3.59 pp |

A global adjustment cannot correct champion-specific directional errors. Shrinking toward 50%
can worsen some groups: Dante's error increased from 0.172471 to 0.174898 (326 appearances;
58 events; improvement interval [-0.004530, -0.000273]). Subgroup intervals are exploratory,
without correction for searching many groups. Do not use them as automatic champion offsets.

### Matchup residuals

The artifact includes 229 format/champion-pair groups; 113 meet the support flag. Examples
below are standard-format matches, percentages from the first named champion's perspective.
They are conditional sample averages, not universal matchup rates.

| Matchup | Matches | Calibrated prediction | Observed |
|---|---:|---:|---:|
| Jin vs Silvie | 199 | 49.07% | 68.59% |
| Ciel vs Jin | 474 | 58.76% | 41.98% |
| Arisanna vs Tonoris | 172 | 61.61% | 45.93% |

The model can favor the wrong side on average even after calibration. Candidate explanations
include changing card pools, champion variants, player estimates, and stale matchup effects;
these aggregates do not identify the cause. Investigate era-aware residuals using training-only
splits before choosing additional features.

### Familiarity residuals

| Familiarity | Appearances | Raw error | Calibrated error | Calibrated bias |
|---|---:|---:|---:|---:|
| Exact list seen | 2,418 | 0.179672 | 0.179958 | +0.23 pp |
| New list, all cards seen | 20,265 | 0.184641 | 0.184713 | +1.38 pp |
| New list, up to 10% unseen copies | 32,432 | 0.196519 | 0.195081 | +1.43 pp |
| New list, over 10% unseen copies | 41,885 | 0.199795 | 0.197425 | -1.79 pp |

Calibration clearly improves the two unseen-card categories. Its small error increases in the
two familiar-card categories have intervals spanning zero. Lists with more unseen cards have
higher observed error, but their players, opponents, champions and dates also differ: this is
not an isolated causal effect of unfamiliarity. A majority of player appearances include at
least one card absent from training; missing learned card effects and metagame drift warrant
further investigation.

## Decision and next work

Retain the calibrated individual-card model as the leading research candidate. Keep it offline.
The bounded calibration/error-audit task is complete; the broader performance-validation
initiative is approximately 90% complete against the existing scope, with frozen prospective
evaluation still outstanding. Preserve model/source versions before collecting untouched later
events. Era-aware champion/matchup diagnostics are the next research extension, and must be
selected on training-only temporal splits, not by fitting these displayed test residuals.

Verification: 18 targeted calibration/composition/access/group tests; pipeline typecheck;
original cohort/catalog/history fingerprint equality; original raw-card and context errors
unchanged; both numerical fits converged. No UI changed, so browser verification does not apply.
