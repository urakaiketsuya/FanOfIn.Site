# Player-adjusted seasonal experiment

Research only. Run from the repository root:

```sh
node --import tsx pipeline/src/analysis/cardCompositionAudit.ts --player-adjusted
```

Writes `data/analysis/card-player-adjusted-audit.json`. The five baseline experiments
and the existing seasonal report are preserved. Uses the same historical cutoff,
training process, validation-only selection, and completed-event seasonal updates.

## What the numbers mean

- **Observed score:** wins plus half of draws divided by appearances.
- **Elo expected score:** expected score using research Elo frozen at the original
  holdout boundary. These are historical player ratings, not leaderboard ranks.
- **Above player expectation:** average observed score minus Elo expectation.
  Multiply by 100 for percentage points. This is not an adjusted win probability.
- **Seasonal expected score:** actual-player prediction from the seasonal model.
- **Equal skill against observed opponents:** replace the base model's Elo prior
  with 0.5, keeping deck features fixed. Apply the same historical seasonal
  correction, then the same calibration. Do not retrain residuals against the
  equal-skill counterfactual and do not subtract Elo again from the final score.

Equal-skill predictions describe the opponents actually faced in the holdout,
not today's popularity-weighted field. They are a model-based standardization,
not an observed counterfactual outcome. Their error against actual-player results
is deliberately not presented as equal-skill validation.

## Summaries and uncertainty

Both sides of each match contribute a champion/deck appearance, with scores and
predictions complemented for the second player. Mirrors contribute two appearances.
Overall model error counts each match once. Champion and exact-list summaries are
separated by format; exact-list identity includes main and material, not sideboard.

Calibration groups both player perspectives by predicted score in 10-point bands.
The complete two-sided population necessarily averages 50%; that aggregate is not
an accuracy claim. Compare predicted and observed score within each band instead.

Each group includes event count, distinct pilots, list count, and the largest
pilot's appearance share. Exact-list output requires at least 20 appearances,
five events, and three pilots; report coverage includes omitted lists. These are
reporting thresholds, not statistical proof of reliability. Champion summaries
retain sparse groups with explicit counts. Raw pilot identifiers are not published.

Residual intervals use 400 deterministic event-cluster bootstrap resamples and
are omitted below 20 events. They do not capture all repeated-player or temporal
online-model dependence, model-fitting uncertainty, or multiple comparisons.
No causal deck-effect or card-swap claim follows from these summaries.

## Limits

Elo is frozen for comparability with the retained experiments; new players use the
existing default rating. Ratings partly reflect historical deck choice and may
be stale later in the holdout. Pilot skill, specialization, deck selection, and
opponent schedules remain confounded. Equalizing the explicit Elo input does not
remove every player-related association learned by the card model.

Future work: evaluate a frozen model on new tournaments, measure sensitivity to
cold-start players and pilot concentration, and separately validate a representative
current-field report before exposing a public deck-strength percentage.

## Historical results — 2026-11-14

48,500 held-out matches across 748 events. Seasonal prediction error reproduces
0.1921776545481473 exactly, versus Elo-only 0.19859169162334062. This report adds
interpretation; it does not improve or replace the seasonal model.

| Champion | Observed score | Elo expectation | Above expectation | Equal-skill estimate |
|---|---:|---:|---:|---:|
| Ciel | 52.8% | 51.2% | +1.6 pp | 51.8% |
| Jin | 51.1% | 49.8% | +1.3 pp | 50.2% |
| Silvie | 42.8% | 46.7% | −4.0 pp | 46.5% |
| Tonoris | 47.7% | 46.3% | +1.4 pp | 48.9% |

These aggregate all observed Standard lists for each champion, not one example
list or the current season alone. Equal-skill estimates retain the observed
opponent schedule. Tonoris has 2,615 appearances, 303 events, and 251 pilots;
its residual interval is −0.49 to +3.23 pp, including zero. Ciel's interval is
+0.89 to +2.61 pp; Jin's is −0.15 to +2.69 pp; Silvie's is −5.78 to −2.49 pp.
These exploratory intervals have no multiple-comparison adjustment.

Selected calibration bands, counting player perspectives:

| Predicted band | Mean prediction | Observed score | Appearances |
|---|---:|---:|---:|
| 50–60% | 54.9% | 55.1% | 17,849 |
| 60–70% | 64.7% | 64.5% | 14,733 |
| 70–80% | 74.5% | 73.5% | 9,709 |
| 80–90% | 84.3% | 81.2% | 4,731 |
| 90–100% | 92.2% | 89.6% | 1,479 |

The high-confidence tail remains overconfident. These bands are descriptive
holdout checks, not additional calibration training or untouched prospective
validation. No production deck score is enabled.

Exact-list support is much thinner: only 54 of 15,745 lists meet the reporting
threshold, covering 3,183 of 97,000 player appearances. Champion-level summaries
therefore must not be represented as evidence for every list using that champion.
