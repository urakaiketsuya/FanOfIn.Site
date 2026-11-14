# Official-season and ban-regime model

Run `node --import tsx pipeline/src/analysis/cardCompositionAudit.ts --seasonal`.
This produces `data/analysis/card-seasonal-audit.json` without overwriting any earlier experiment.
The runner verifies all five files in `experiment-baselines.json` before fitting and before writing.
This is an offline implementation; no public score or UI is enabled.

## Model

The original quantity-aware card model, player Elo and champion/matchup effects remain the base.
An online layer learns **observed minus predicted match-point share** for champions and matchups.
It does not average raw card win rates or relearn individual card coefficients each season.

For residual sum S, count N, prior mass K and fallback F, use `(S + K*F)/(N + K)`.
Global champion means shrink toward zero. The global matchup mean shrinks toward half the
difference between the two champion means. Within an official season and ban regime, champion
means shrink toward the global champion means. The local matchup fallback is the global matchup
correction plus the local-minus-global champion correction. Consequently a brand-new period
falls back exactly to the global correction, rather than discarding prior matchup evidence.
Mirror matches receive no residual correction; swap predictions remain complementary.
Predictions are clipped to [0.01, 0.99] before symmetric confidence calibration.

Both adaptive models start with empty residual state at the evaluation boundary. Their base
card model already contains earlier history. Each receives identical earlier completed-event
outcomes, so differences isolate temporal grouping rather than one model seeing more outcomes.
Results enter only on a date strictly after the recorded event completion date. Unknown,
invalid, or before-start completion dates never enter the residual state. Same-day events cannot
influence each other; delayed results remain pending. Completion is a proxy for availability:
we do not have historical publication timestamps. Base card coefficients and Elo remain frozen.

## Official periods and reviewed history

Use the event's authoritative Omnidex season ID and format. Season dates validate membership;
calendar quarters and set-name guesses are not substituted for missing IDs. Unknown seasons
fall back to the global correction. Known seasons without reviewed ban history use a separately
flagged season-only bucket. Events crossing a known ban/season boundary fall back to global;
no event-specific legality overrides are inferred.

The source-linked ledger `competitive-ban-regimes.json` covers Standard from 2025-12-22 through
2026-11-14 and Pantheon from 2026-04-03 through 2026-11-14. Before/after those reviewed intervals,
ban history is unknown. It models regime boundaries, not complete individual-card legality.
It must be extended/reviewed before forecasting later ban periods. Seasonal bans do not carry
across the official season key; a new season also requires an updated ledger.

Reviewed actual changes:

| Effective date | Standard change | Official source |
|---|---|---|
| 2026-04-03 | Unmake Duality banned | [Announcement](https://www.gatcg.com/article/ban-and-restricted-april-3rd-2026) |
| 2026-04-20 | Baby Green Slime, Grim Pastiche, Carpsong Coda banned; Baby Gray Slime unbanned | [Announcement](https://www.gatcg.com/article/ban-and-restricted-april-20th-2026) |
| 2026-06-29 | Ranger Strides banned | [Announcement](https://www.gatcg.com/article/ban-and-restricted-june-29th-2026) |
| 2026-08-21 | PRD seasonal bans: Baleful Oblation, Fabled Azurite Fatestone, Spirit Blade: Ascension | [Announcement](https://www.gatcg.com/article/ban-and-restricted-august-21st-2026) |

The December baseline and intervening January/February/May/September/October/November reviews
are linked in the ledger. Watchlist-only/no-change announcements do not start new periods.
Errata and Proxia's Vault additions are not separate ban boundaries in this version.

## Selection and evaluation

Preserve the original cutoff (2026-03-01) and test end date (2026-11-09). Fit an inner card model
on the first 80% of original training dates, with Elo frozen at the inner cutoff (2025-11-29).
Use the remaining original training dates to select prior mass from 20/100/400 and fit a
symmetric confidence scale, separately for the global and seasonal candidates. Refit the base
card model on the full original training cohort; freeze all chosen parameters before test.
The calibration sample is also used for parameter selection, so its error is not an unbiased
performance estimate. No test outcome chooses parameters.

Report raw cards, preserved calibrated cards, globally adaptive correction, and seasonal
correction. The legacy scorer key `adjustedContext` denotes preserved calibrated cards in this
report only. `improvementOverGlobalAdaptive95` is the matched adaptive comparison. Period and
champion/matchup/familiarity breakdowns are included. In `errors`, both raw/calibrated fields
contain the final seasonal predictions (identity scale); they are not a calibration ablation.

This is a retrospective **sequential** test, distinct from earlier fixed-cutoff evaluations.
The existing test period has been repeatedly inspected. Event-cluster bootstrap intervals do
not capture all temporal dependence induced by online updates or recurring players. Subgroup
findings are exploratory and not multiplicity-corrected. No causal or public win-rate claim
follows from selecting season-aware modeling as the intended direction.

## Results — 2026-11-14

The original catalog, cohort and match-history fingerprints match the preserved baseline.
Training: 114,817 matches; inner training: 92,289; validation: 22,528; sequential test:
48,500 matches across 748 events. Both numerical fits converged. Both candidates selected
prior mass 100. Global calibration scale: 0.8838519549; seasonal scale: 0.8780072835.

| Model | Squared match-point error |
|---|---:|
| Preserved raw cards | 0.1950320635 |
| Preserved calibrated cards | 0.1935502696 |
| Global adaptive correction | 0.1922386383 |
| Official season + ban correction | 0.1921776545 |

Seasonal error is 0.71% lower than the frozen calibrated model. Most of this benefit is also
available to the global adaptive comparator. The seasonal improvement over that matched
comparator is 0.03%, with paired event-bootstrap 95% interval [-0.00008773, 0.00021551]
in squared-error units: no clear incremental benefit. It helps in the early half (interval
[0.00007808, 0.00046073]) and is inconclusive in the later half
([-0.00036035, 0.00008034]). Exact-unseen lists are also inconclusive versus global adaptation.
These results do not gate the selected season-aware direction, but do limit accuracy claims.

Coverage:

- 48,427 matches have verified season/ban context; 67 have unknown season context and six
  straddle a boundary. Those 73 matches fall back to global correction before applying the
  separately fitted seasonal calibration scale.
- 48,399 have usable completion dates; 101 can be predicted but cannot update online state.
- 6,890 have no previous same-period matchup observation at prediction time. Their correction
  uses the historical matchup and available local champion evidence.
- Held-out official season IDs are 6, 7, and 8. No Pantheon test matches are present, so this
  run does not establish Pantheon performance despite supporting its period mapping.

The artifact includes per-period and champion/matchup/familiarity errors. Season 7 after the
April 20 changes improved versus global adaptation; season 6, season 7 after June 29, and
season 8 had small point-estimate regressions. These are exploratory diagnostics, not fitted
post-hoc offsets.

## Verification and next work

24 distinct targeted tests passed, including temporal isolation, completion delays, format
separation, season/ban resets, fallback, symmetry, ledger expiry and legacy composition/access/
group/calibration behavior. Pipeline and shared typechecks passed. All five preserved artifacts
match their pinned checksums. No UI changes were made.

The requested offline seasonal implementation and historical comparison are complete. Next,
freeze a deployable model/state snapshot for untouched future evaluation and extend reviewed
ban history before December 2025. Broader performance validation remains approximately 90%
complete against its research scope: the new implementation and retrospective evaluation are
done, but prospective accuracy and historical coverage expansion remain unresolved.
