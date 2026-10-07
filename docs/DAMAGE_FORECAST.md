# Deck-derived damage forecast

Updated 2026-10-07. This specification supersedes the earlier conditional-damage
and independent-product combo approximations in CALCULATIONS.md's Direct-damage
forecast section. The public API remains `computeAggressionForecast(main, catalog,
material, playOrder = "first")`; there are no player-entered board-state options.

## Meaning of the forecast

Checkpoints are 7, 10, 15 and 20 Main cards seen, with a 60-card minimum deck size.
The conservative and optimistic distributions describe **printed damage access**.
Draw probabilities use exact enumeration for bounded state spaces. Deploying objects, paying costs, resolving effects,
and retaining the objects are optimistic assumptions, not probabilities inferred
from the deck. The UI distinguishes the two distributions' expected values,
medians, p10/p90, and chances of accessing 5 or 10 damage. These are not a single
confidence interval and are not a match-win or resolved-damage forecast.

One physical Main card enters one category, including when it has both payoff and
support roles. The distribution enumerates joint multivariate hypergeometric
outcomes with weight `product(choose(categoryCopies, drawnCopies)) / choose(N, n)`.
Each outcome is evaluated before computing expectations, quantiles or thresholds.
Zero-damage cards retain their probability mass; duplicate imported lines merge.
Identical category roles merge for efficiency, except distinct Unique objects.
Material entries are not randomly drawn. Sideboards are excluded.

To keep complex mixed-engine decks responsive, enumeration switches to 32,768
repeatable, without-replacement hand samples when an intermediate layer exceeds
40,000 states. The UI explicitly labels those checkpoints as sampled estimates.
Category sorting and a fixed seed make the results stable across rerenders and
input ordering. Dice outcomes are still integrated exactly within each sampled
hand. The ordinary Diao reference deck stays on the exact path.

## Supported formulas

| Card | Deck-derived optimistic contribution |
| --- | --- |
| Fireball | `1 + level`, using contiguous champion levels actually present in Material and the natural `turn - 1` ceiling |
| Essence of Blizzards | `1 + level`; rested opposing target is an unresolved condition and remains marked partial |
| Refracting Missile | `1 + drawn Fractal objects` per drawn Missile |
| Shimmering Refraction | `drawn phantasia objects` per drawn copy |
| Glowering Conflagration | `1 + drawn phantasia objects` per drawn copy; base 1 retained conservatively |
| Burst Asunder | `2 * drawn Bursts + 2 * drawn Fractals` when at least one Burst is drawn; Fractals are spent once across all Bursts |
| Decaying Reproach | `3 * drawn Reproaches + 2 * min(4 * drawn Reproaches, supported wither counters)` |
| Potion Infusion: Volatility | Independent `4 + D6` distributions for `min(drawn Volatilities, drawn compatible Potions)` activations |

Fractals count as support only when printed as Fractal phantasia objects.
Phantasias count their actual object type; each distinct Unique object contributes
once regardless of duplicate copies drawn. The optimistic sequence uses
non-consuming payoffs before sacrificing support to Burst, so those payoffs may
share the board but two Bursts cannot reuse a sacrificed Fractal. Token generation,
Fracturize conversions, recursion, and object removal are not inferred.

Compatible Potions have a printed sacrifice ability whose activation cost does
not include resting: Volatility first rests its target, so a Potion requiring
`[REST], Sacrifice` cannot then pay that cost in the same sequence. One Potion
pays for one modeled Volatility activation; no repeated stacking is assumed.
Own printed damage and an eligible Potion role remain in the same category.
Dice are convolved exactly after determining the available paired activations.

Wither support recognizes fixed `Put N wither counters on target non-champion
object` effects whose bonus is supported by the Material champions. Conditional
phase/trigger effects and unbounded multi-target counts are not treated as known
supplies. One source supplies its fixed amount once. Main sources must be drawn
with Reproach; supported Material sources become optimistic options from turn 2
(or turn 4 for advanced elements). A legal opposing target and retained counters
remain unresolved, so Reproach and Material wither support are marked partial.

## Champion and timing conditions

Named champion bonuses require that champion's lineage in Material. Class bonuses
require a matching class among resolved Material champion cards. Fixed conditional
effects wait for the earliest required champion level on that natural timeline. Unknown or absent
requirements do not silently become enabled. Generic board/trigger conditions,
including Cremator's empty-hand end-phase condition, contribute only to the
optimistic ceiling when the known champion/class requirement is supported. Their
audit entries remain partial; there is no invented probability of an empty hand.

The natural level ceiling is `max(0, turn - 1)`, capped by a contiguous Material
lineage starting at level 1. Players begin at level 0 and skip their first
materialize phase ([starting rules](https://rules.gatcg.com/general-rules/general-rules-starting-the-game),
[materialize phase](https://rules.gatcg.com/game-mechanics/game-mechanics-turn-order/turn-order-materialize-phase)). Missing intermediate levels cannot be skipped. Level buffs,
accelerants, and payment sequencing are not inferred. Personal turn is
`max(1, seen - 6)` playing first or `max(1, seen - 7)` playing second. Advanced
elements retain the turn-4 gate, so 10 cards seen is still too early playing second.

Fabled Ruby Fatestone requires Guo Jia before reporting its separate potential
recurring rate. That rate is explicitly conditional on materialization and bonus
activation, remains marked partial, and is never added to draw-checkpoint totals.

## Diao's phantasia package

Full Bloom requires Diao in Material and contributes its four-Flowerbud sequence
once per active Unique Full Bloom (8 damage), after the advanced-element gate.
Other supported Flowerbud generators contribute only in outcomes that also contain
Full Bloom. Bold markup in real catalog text is normalized before recognition.

Scepter of Awakening requires Diao and Scepter in Material, the advanced-element
gate, and at least four phantasia objects in the same draw. It contributes only the
strongest eligible non-Ally phantasia attack, including the granted buff counter
(`reserve cost + 1`). Full Bloom therefore supplies an 8-power candidate, not 7. The
[buff-counter rules](https://rules.gatcg.com/game-mechanics/game-mechanics-counters)
add one power per counter.
Payment, materialization and attack readiness remain optimistic conditions. The
Scepter is never counted once per candidate or once per duplicate Full Bloom.

## Coverage and verification

Mixed fixed/variable effects retain a partial audit status when only the fixed
portion is supported. Unrecognized damage text on an Ally is reviewed rather than
hidden as ordinary combat. Missing catalog entries remain visible. Unsupported
variable formulas are not silently labeled complete.

Regression fixtures preserve real catalog text without depending on the crawler
cache. Tests cover independent hand enumeration, total probability mass, co-draw
requirements, shared sacrifices/counters, exact dice, absent champion/class gates,
missing lineage levels, first/second-player timing, Unique objects, and duplicate
import lines. The homepage example is regenerated from the real deck `8qjzzs` using
the same engine; it now includes Missile and Refraction alongside Burst.
