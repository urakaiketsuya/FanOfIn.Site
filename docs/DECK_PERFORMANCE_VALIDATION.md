# Deck performance validation

Run offline from the repository root:

```sh
node --import tsx pipeline/src/analysis/deckPerformanceAudit.ts
```

The command reads the committed card catalog and existing event bundles. It never fetches cards, changes a deck, or enables a UI score. Output: `data/analysis/deck-performance-audit.json`. Input catalog and normalized cohort hashes record exactly which inputs were evaluated. Results are deterministic for identical inputs except the generation timestamp.

## What is measured

The outcome is each deck entry's match-point rate `(wins + 0.5 * ties) / matches`, with at least two recorded matches. Each entry has equal weight. Squared error measures prediction of that aggregate rate, **not** a match-level Brier score or a predicted win probability. Standings may include byes; those cannot be removed without joining individual rounds.

Four models share an identical chronological split and cohort:

- Baseline: smoothed historical champion, champion/spirit, and player rates.
- DIAO: baseline plus the legacy composite and four pillars.
- Analytics: baseline plus reviewed effect-source access at 15 cards seen, fully present package joint access, supported Tonoris draw, savings, and progression, plus reviewed paid damage and defense at turns 3 and 5.
- Combined: baseline plus both sets of features.

Source access uses existing shared calculations. An absent reviewed source is zero *reviewed-source access*, not proof the deck lacks the effect. No recognized complete package is missing, not zero consistency. Unsupported trajectory features are missing. Missing values use training-set means with separate missingness indicators. Thus coverage itself can become a predictor; it is not game strength. Tonoris has a separate within-supported-cohort validation to help expose this confound.

The Tonoris policy reuses the existing engine-fixture-backed report without introducing new mechanic fixtures. Its 128-sample audit budget is lower than the interactive report default. Turns 3 and 5 are checkpoints, not assumed game lengths. Sideboard is excluded from deck identity and calculated features.

## Validation boundary

The first 70% of distinct UTC event dates train the models; later dates form the holdout. All entries on a date remain together. Training-only means, scaling, and fixed ridge regularization prevent holdout outcomes from influencing fitting. Baseline residual training uses leave-one-entry-out category means. It is retrospective training, not a simulation of a continuously updated historical predictor. No hyperparameters are selected using the holdout.

Holdout summaries include previously unseen players, previously unseen exact Main/Material lists, and their intersection. These are sensitivity checks, not independent experiments. Similar lists remain possible across the split. A fixed-seed paired bootstrap resamples whole events to estimate error improvement over baseline; intervals are omitted for fewer than 20 events. Repeated-player dependence across events remains. Calibration bins report sample counts, mean prediction, and observed rate; empty bins are null.

## Release decision

Publication is always disabled by this audit. Even positive holdout improvement alone is insufficient to introduce a deck-power score. Before publication:

1. Join opponent and round records; address byes, opponent strength, and matchups.
2. Fit archetype assignments using training data only; champion/spirit is currently only a proxy.
3. Extend paid-damage and defense trajectory coverage beyond reviewed lineages and test simulation-budget sensitivity.
4. Add near-duplicate build-family isolation and sensitivity to player clustering.
5. Check historical card versions/legality and format changes against the current-catalog retrospective features.
6. Repeat validation on an independent later period; establish minimum samples, calibration tolerances, and useful error improvement before inspecting that period.

A future UI should keep observed tournament outcomes separate from model capabilities. Percentiles of draw, damage, or protection are not win probabilities. The existing report can continue showing numbers and contributing cards without a composite score.

## Initial run — November 12, 2026

58,978 entries from 1,952 events; 50,102 distinct Main/Material lists. The March 1, 2026 cutoff leaves 40,695 training entries and 18,283 holdout entries across 748 events.

| Model | Holdout squared error | Relative reduction vs baseline |
|---|---:|---:|
| Historical baseline | 0.053439 | — |
| Baseline + DIAO | 0.053270 | 0.32% |
| Baseline + analytics | 0.053296 | 0.27% |
| Baseline + both | 0.053066 | 0.70% |

The analytics-only improvement interval includes zero. The combined model improves aggregate error slightly, but this is not sufficient evidence for a public score. Only 593 entries have supported Tonoris trajectories; package coverage is 21,272 entries. Unsupported effects remain a substantial coverage constraint. DIAO's frozen bands and the published package definitions were developed with historical data overlapping the holdout; this is a retrospective diagnostic, not a clean prospective validation of feature selection. A future untouched period is required.

## Extended trajectories

Schema version 2 adds 18 features from the existing fixture-backed shared reports:

- Paid champion damage with no opposing allies, and paid ally damage with one or two opposing allies per cast, at turns 3 and 5. These are cumulative outputs before opposing responses. The Rai report retains its 512-sample policy.
- Prevention against one seven-damage hit or three three-damage hits, and recovery with nine existing damage and two opposing allies. Each reports median output and probability of positive output at turns 3 and 5, using 128 samples. These are independent response windows, not cumulative defense over a game.

Unsupported lineages and missing report inputs remain null. Supported scenarios with no output remain zero. Scenario outputs are never added together. No mechanics or new engine fixtures are introduced. The existing lineage policies and conditional restrictions still apply; these do not measure all damage or defense in a deck.

`priorFeatureValidation` reruns the first 12 features on exactly the same cohort and split, allowing a direct comparison with the expanded feature set. Separate `supportedPaidDamage` and `supportedDefense` cohorts expose performance within supported coverage. Their date cutoffs are calculated within each cohort, so their errors must not be compared directly with full-cohort errors. Missingness can still encode champion identity. This second inspection reuses the original holdout and is exploratory, not a new independent validation.

### Extended run — November 12, 2026

The same 58,978 entries and March 1 cutoff reproduce the prior-feature results exactly. Expanded analytics has holdout squared error **0.053167** (0.51% below the historical baseline); expanded combined features has **0.052931** (0.95% below baseline, versus 0.70% previously). The latter is a further 0.25% error reduction relative to the prior combined model. The reported bootstrap intervals compare against the historical baseline, not against the prior feature model.

Coverage is only **22 entries for paid damage** and **784 for defense**. The paid-damage-only evaluation remains null because it does not reach the audit's 30-entry evaluation gate; that gate is not a publication criterion. Defense's supported-cohort holdout has 246 entries. Reviewed exact lineages and Spirit access constrain availability; the paid-damage policy does not cover alternate Rai lineages. These limited, overlapping historical results do not establish general deck strength. Publication remains disabled. Next priority is opponent/round joins, alongside expanded fixture-backed trajectory coverage.
