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

## Extension: recurring groups and nominated packages

Run `node --import tsx pipeline/src/analysis/cardCompositionAudit.ts --groups` to write `data/analysis/card-group-audit.json`. This preserves the original pair artifact. The cohort, chronological boundary, player priors, context, card quantities, penalty and solver remain the same. Group models add jointly fitted features to context and cards; they do not add the unsuccessful pair specification.

Fixed before inspecting group holdout metrics:

- Discover recurring groups from **training compositions only**, without consulting outcomes. Require 100 distinct matches, 20 events, and 20 players for each retained set. Count a match once if both decks contain the set; count actual distinct player IDs, not deck identities.
- Start with the 150 most frequent eligible singleton cards. Extend a frequency-ranked beam of 200 sets through sizes two to five. Retain up to 100 groups per size at sizes three, four and five, with deterministic card-name ties. This bounded search is not exhaustive and favors staples. The sum of per-deck match support is only a pruning upper bound; final support deduplicates matches across both sides.
- Compare **cards + triples** and **cards + groups of three to five** against cards alone. Group presence is signed between opponents. Quantities remain in the individual-card features; this extension does not test separate quantity thresholds for groups.
- Separately test existing `package-candidates.json` nominations: each explicit anchor plus its member cards, limited to three to five distinct cards. Do not merge families, alternatives, or display `coreCards` into an invented mandatory package. Current curated strategy rules contain no explicit three-card required sets. Candidate groups are nominations, not mechanically verified combos or complete archetype rules.
- Package candidates must pass the same training-support gates. Fit full presence and distinct partial-completion states with two or more members; no state activates for zero/one member. These are associations, not executable game sequences or evidence that drawing a package is likely.
- **Existing nominations postdate the cutoff and were derived from a broader dataset.** Their feature identities are therefore not a clean historical discovery test, even though support and coefficients use training only. Their results are exploratory and reported separately. The source hash is saved. Recurring group discovery has no dependency on that nomination source.

All models use the same evaluation rows and event-cluster uncertainty against individual cards. Report exact-unseen lists and temporal halves as overlapping diagnostics. Multiple exploratory comparisons, repeated use of this retrospective holdout, archetype confounding, current catalog resolution, and cross-event player dependence preclude a public win-rate claim. A group coefficient does not establish that replacing cards with that group improves a deck. No mechanics fixtures or UI are added.

### Group results — November 12, 2026

The cohort and baseline scores exactly reproduce the earlier experiment: 114,817 training matches, 48,500 holdout matches across 748 events. Selected 300 recurring groups (100 each of sizes three, four and five). Six of 24 distinct three-to-five-card package nominations passed training support. All fits converged below the 1e-8 residual threshold: triples 405 iterations, groups 531, nominated packages 231.

| Model (all include context + cards) | Holdout squared match-point error | Change in error vs cards | 95% interval for improvement vs cards |
| --- | ---: | ---: | --- |
| Individual cards | 0.195032 | — | — |
| + 100 triples | 0.195420 | **0.20% worse** | [-0.000576, -0.000228] |
| + 300 groups of 3–5 | 0.195596 | **0.29% worse** | [-0.000761, -0.000371] |
| + six nominated packages / completion states | 0.195014 | 0.009% better | [-0.000013, 0.000040] |

Both recurring-group models worsen prediction in each chronological half and in the both-exact-decks-unseen subset; each corresponding improvement interval is negative. Nominated packages show no clear improvement in any of those checks, with intervals crossing zero. Their post-cutoff nomination source remains an additional limitation independent of statistical uncertainty.

Supported package nominations (card presence, not verified executable combos):

- Ashwound Shot / Seeker's Aetherwing / Trivariate Dream
- Blastshot Pump / Seeker's Rifle / Shadow's Twin
- Art of War / Mnemonic Charm / Zhou Yu, Enlightened Sage
- Magebane Lash / Ravishing Finale / Sablemere, Warden's Grip
- Alice, Golden Queen / Alice, Whim's Monarch / Queen's Gambit
- Advent of the Shenju / Broken Promises / Companion Fatestone

**Decision:** do not promote these groups to a deck-strength score or claim a benefit from completing a nominated package. Retain individual cards as the research candidate and prioritize training-only calibration followed by frozen future evaluation. This bounded frequency search does not rule out rarer packages, champion-specific discovery, different regularization chosen within training, or quantity-sensitive interactions. Further searching on this already-inspected holdout would remain exploratory.

Verification: 19 targeted tests, pipeline TypeScript, exact baseline-score reproduction, full tournament run and convergence checks passed. Group tests cover three-to-five-card discovery, distinct match/event/player support, outcome-independent discovery, exact nomination sets, partial states, synthetic triple signal and side-swap symmetry. No public score, UI change, push or deployment.

## Extension: draw-adjusted card access

Run `node --import tsx pipeline/src/analysis/cardCompositionAudit.ts --draw-access` to write `data/analysis/card-access-audit.json`. This is a separate research artifact; existing pair/group outputs are preserved. The cutoff and last test date are frozen from the original composition report, rather than shifting with newer cached events. The current cached matches inside that window form the cohort, so refreshed data may change membership; all candidate comparisons use the same rows within this run.

Fixed before inspecting results: ridge penalty 100, numerical tolerance 1e-8, maximum 2,000 solver iterations, checkpoints turns **1, 3, 5**, seven-card opening, first-player order, 128 deterministic simulations per supported deck. Checkpoints are scenarios, not estimated game lengths. Compare:

1. Context + individual card quantities (the prior research candidate).
2. The same model plus exact natural Main Deck access at each checkpoint, Material presence, and draw-policy coverage indicators.
3. The second model plus per-card incremental access from supported extra draws, jointly fitted rather than multiplying card win rates by access probabilities.

Natural access uses the existing `fixtureAccess(N, copies, min(N, 6 + turn))` hypergeometric calculation. Material cards have separate presence features and never enter the Main library denominator; presence does not mean an item/champion can already be played. Main and Material quantities remain in the existing baseline.

Draw adjustments reuse the existing Rai conditional-draw policy and Tonoris engine sequence. Conditional triggers, level/element gates, shared payment budgets and destinations follow those policies. Unsupported cards and other engines are not presumed to have no draw value. Both access models include the same Rai/Tonoris/unsupported indicators so policy availability alone cannot explain the incremental comparison. Report supported matches (at least one supported deck) separately as well as the entire cohort, exact-unseen lists and temporal halves.

For each simulation, compare the naturally drawn prefix and modeled drawn prefix of the same shuffled library. Count a name once only when modeled draws find it and natural draws do not. The bonus is that count divided by 128, capped at the remaining exact natural unseen probability. This avoids using a hypergeometric formula at a mean draw count and avoids a lone draw source helping find its own first copy. Rai already exposes these counts; the Tonoris checkpoint callback now exposes both name sets without changing simulation decisions or report values. Shared calculation reference: the paired access estimator in `docs/CALCULATIONS.md`.

Fit vocabulary and coefficients use training only. Computing a holdout deck's access profile uses its submitted list and the current catalog, never its results. Report event-bootstrap improvement against both individual cards and the natural-access model. These are association tests: seeing a card is not playing it, and current draw-focused policies do not simulate an opponent, all engines, mulligans, every opening spirit, or optimal play. Current catalog/mechanics applied retrospectively, Monte Carlo error, feature scaling with ridge, repeated use of the historical holdout, and recurring players remain limitations. This does not validate a universal card-value multiplier or a public win-rate estimate. No new mechanics fixtures are created.

### Transcript evidence available for a separate validation layer

Inventory inspected November 14, 2026: `data/broadcast-timelines.json` contains 223 matches, 532 games and 1,238 narrative beats (1,228 timestamped); all 223 have an event ID. There are 125 beats containing a draw-word mention, **not 125 verified draw actions**. Twelve match deck descriptions mention Rai or Tonoris; those names alone do not establish a supported lineage or an exact decklist match. `order` is a narrative sequence index, never a game turn. Card mentions can describe speculation, an opponent's action or cards never drawn, so they are not binary access labels.

The longer transcripts provide evidence omitted by summaries. In `docs/broadcast-review/osaka-day1/cleaned-transcript.txt`, 5:55:19–5:55:36 (video `g3NNFcNpw3k`, Cashkidz versus ClourX), the commentary describes Cashkidz at level three using Neos Sight with eight objects and an additional draw into memory. This is a **transcript-reported conditional resolution**, not a verified complete turn log. It can anchor a targeted video review of the Tonoris condition and destination. The timeline summary for this match does not mention that draw. No true turn number or cumulative cards-seen count can be assigned from this passage alone.

Recommended next observation fields: match/game/player, source video and timestamp range, explicit own-turn number when available, first-player status, canonical source card, draw count/destination, observed prerequisite, and evidence status (commentary-reported or video-verified). Preserve unknown values; an unmentioned draw is not zero. Attach only stage-appropriate verified decklists, including game-specific sideboard changes where known. Establish coverage intervals before scoring predicted access frequencies or game-length distributions; selective highlights alone cannot supply an unbiased denominator.

Keep these broadcast observations separate from tournament win-rate training. Use them to challenge simulated activation timing, condition frequency and library access, then test revised assumptions on held-out events. They must not become additional independent match outcomes or post-outcome input features. The Worker schema separately supports simulator per-card drawn/drawn-to-memory totals and turn stats, but that is a different population and does not by itself establish available real-match draw telemetry.

### Access results — November 14, 2026

The frozen window reproduced the original 114,817 training matches and 48,500 held-out matches across 748 events. All baseline squared errors exactly match the original experiment. Both access models converged (natural: 6,594 features, 671 iterations; adjusted: 7,449 features, 662 iterations; relative residuals below 1e-8).

| Model (all include context + quantities) | Holdout squared match-point error | Change vs individual cards |
| --- | ---: | ---: |
| Individual cards | **0.1950320635** | — |
| + natural access and coverage controls | 0.1955211283 | 0.251% worse |
| + supported extra-draw access | 0.1955212498 | 0.251% worse |

Natural access worsens error versus cards by 0.000489065, with the 95% event-bootstrap improvement interval entirely negative: [-0.000814515, -0.000170661]. Extra-draw access versus natural access has improvement -0.000000121, interval [-0.000000973, 0.000000784]: no clear benefit. Both access models are worse than cards on exact-unseen lists; the early chronological half is inconclusive versus cards and the later half is worse. Extra draw versus natural remains inconclusive in both halves and exact-unseen lists.

**Coverage is narrow.** Of 49,993 distinct lists across train and test, only 22 qualify for the reviewed Rai policy and 529 for Tonoris; 49,442 have unsupported draw policies. There are 2,191 supported training matches and just **801 supported test matches across 129 events** (at least one supported deck), or 1.65% of the full holdout. This is not a comprehensive test of draw engines throughout the metagame.

On those 801 matches, errors are 0.191639055 for cards, 0.191198087 for natural access and 0.191190563 for adjusted access. The extra-draw improvement over natural is 0.000007525, interval [-0.000033564, 0.000041115]. Both access models versus cards are also inconclusive. Do not describe the small favorable point estimate as an established improvement.

**Decision:** retain individual cards as the prediction candidate. This fixed access specification adds no demonstrated benefit, but limited policy coverage and observational assumptions prevent ruling out draw-aware prediction more broadly. Validate real draw sequences with transcript/video annotations before expanding policies; keep this separate from calibration and prospective tournament validation. No public probability or card-value multiplier is enabled.

Verification: 68 distinct targeted tests across the composition/group/access modules and existing draw, Tonoris and imported champion-access tests passed, as did pipeline and shared TypeScript checks. The first full fit converged but report serialization failed because a single expanded cohort string exceeded V8's limit. The final run streams the same JSON-array encoding into SHA-256; it reproduced the same fit diagnostics without statistical changes. All original baseline errors and the historical-match hash were checked against the prior artifact. No UI changes or deployment.
