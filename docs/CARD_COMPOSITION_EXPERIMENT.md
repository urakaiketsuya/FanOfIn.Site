# Card composition and tournament results

Research only. Run from the repository root:

```sh
node --import tsx pipeline/src/analysis/cardCompositionAudit.ts
node --import tsx --test pipeline/src/analysis/cardCompositionValidation.test.ts pipeline/src/analysis/opponentValidation.test.ts
```

Output: `data/analysis/card-composition-audit.json`. No app score or public prediction is enabled.

## Question and fixed design

Does card composition improve predictions of tournament match results beyond historical player strength and champion matchups? Compare five models on the same linked match cohort:

1. **Player baseline:** prior-day research Elo for both players, frozen throughout holdout.
2. **Card average:** training-only per-card match-point rates, smoothed with 20 neutral appearances. Average by copies in each deck; predict `0.5 + own average - opponent average`, clipped to 0.01–0.99.
3. **Adjusted context:** player baseline plus champion-within-format and champion-matchup-within-format residual features.
4. **Cards:** jointly fit context and signed differences in card quantities divided by four.
5. **Cards + pairs:** jointly fit context, quantities, and signed within-deck card-pair presence.

The average model is deliberately simple and has no player adjustment. Its input is card *appearance*, not evidence that the card was drawn or played. Cards present on both sides contribute both outcomes. The adjusted models use one observation per match, avoiding treating each card as an independent match.

Use main and material sections only. Include validated completed-event pairings with both eligible public decklists, valid nonnegative standings records with at least two matches, and known champion/card identities. Byes, malformed outcomes, duplicates and invalid player IDs are excluded by the existing match collector. Draws score 0.5: this is prediction of match-point share, not pure win probability.

First 70% of distinct linked UTC dates train; later dates hold out. No date crosses the fitting boundary. All card rates, pair selection, model coefficients and feature vocabulary come from training only. Historical Elo uses prior dates only; no API Elo changes or final standings enter that rating. Holdout outcomes are used only for evaluation.

Fixed before inspecting holdout metrics: ridge penalty 100, a diagonally preconditioned conjugate-gradient solve with at most 2,000 iterations, stopping when relative normal-equation residual is at most 1e-8. Pair selection requires at least 100 distinct training matches and 20 distinct training events; select at most the 3,000 most frequent eligible pairs, with deterministic name ordering for ties. Pair support counts a match once even when both decks contain the pair. No hyperparameter or pair selection by holdout outcome. Diagnostics record convergence; a run reaching the cap without convergence is approximate.

Report mean squared match-point error, calibration bins and paired event-cluster bootstrap intervals (400 deterministic resamples). Positive improvement means lower error. Compare against adjusted context and against cards to isolate the contribution of pair features. Also report matches where both exact deck identities were unseen in training and two chronological halves of the holdout. Those halves are diagnostics, not additional independent experiments; their boundary can split an event. Bootstrap intervals are omitted with fewer than 20 events.

## Interpretation limits

- This retrospective holdout overlaps earlier research. It is not an untouched prospective validation.
- Event format does not capture historical release or ban eras. The current catalog resolves historical names; historical legality/card versions are not reconstructed.
- Only matches with two eligible public lists enter the composition experiment. Results may not generalize to unpublished lists or casual play.
- Exact unseen identities can still be near-duplicates of training decks. No isolated deck-family holdout is claimed.
- Players recur across events. Event-cluster intervals do not account for all player dependence.
- Frequent pair selection favors established cards; new cards, rare pairs and larger groups are not adequately covered.
- A coefficient is an association conditional on this model, not evidence that adding or removing the card causes a change in win rate.
- These calculations use card identities and quantities, not game mechanics. No new TCGEngine mechanic fixtures are needed or created; tests use synthetic statistical records.

A useful retrospective result warrants a separately fixed future evaluation. It does not by itself authorize public percentages or card-swap recommendations.

The initial 60-pass numerical solve did not converge (maximum last coefficient changes 0.00012–0.00127). Before inspecting holdout metrics, the numerical cap was raised to 2,000 without changing the statistical objective, features, regularization or split.

The 2,000-pass coordinate solve converged for context and cards, but not pairs (maximum last pair coefficient change 0.0000446). Before inspecting holdout metrics, the solver was replaced with preconditioned conjugate gradients for the same ridge objective. No statistical hyperparameters changed. The closed-form solver test also passed with the replacement.

## Results — November 12, 2026

Training: 114,817 matches. Holdout: 48,500 matches across 748 events, March 1–November 9, 2026. Training covered 1,791 cards; the pair model selected 3,000 pairs. All final fits converged: context 42 iterations, cards 229, pairs 877; relative normal-equation residuals were below 1e-8.

| Model | Holdout squared match-point error | Error reduction vs adjusted context |
| --- | ---: | ---: |
| Player strength | 0.198592 | -0.25% |
| Simple card-average matchup estimate | 0.222380 | -12.26% |
| Player strength + champion/format matchup context | 0.198093 | — |
| Context + individual card quantities | **0.195032** | **1.55%** |
| Context + cards + pairs | 0.199118 | -0.52% |

The card model improves on context by 0.003061 squared-error units; paired event-bootstrap 95% interval **[0.001866, 0.004472]**. It improves on context in both chronological halves (early 0.003804, later 0.002319; both intervals positive). Among 46,289 holdout matches where both exact decks were unseen, improvement is 0.002737, interval **[0.001542, 0.004136]**. These are overlapping robustness checks, not independent replications.

Pairs increase error **2.10% relative to cards alone**. The paired improvement interval versus cards is entirely negative: **[-0.004807, -0.003411]**. This fixed pair specification did not generalize better. That does not prove every pair model or a model with training-only tuning must fail.

Calibration still blocks public percentages: in the card model's highest prediction bin, 1,593 matches averaged **95.16% predicted match points versus 85.47% observed**. The model has useful additional signal, but extreme predictions are overconfident. These are match-point shares with draws at 0.5, not pure win rates.

**Decision:** retain the adjusted individual-card model as a research candidate. Do not use averaged card win rates or this pair model as a public strength score. Next, use training-only temporal validation for calibration and model selection, freeze the candidate, and evaluate future untouched tournaments. Near-duplicate family isolation, historical release/ban eras, and player dependence remain unresolved. Larger groups were not tested and are not justified by the pair result alone.

Verification: 16 targeted validation tests, pipeline TypeScript check, full real-data run, and convergence diagnostics passed. No UI changes or deployment were made.
