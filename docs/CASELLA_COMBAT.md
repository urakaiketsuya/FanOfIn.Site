# Casella paid combat sequences

This is a resource-constrained, unopposed turn progression report, not a predicted match outcome.
The user-supplied Casella Wind list is retained in app/test/fixtures/casella-wind.ts.
Its level-three name is normalized from “Cantarice” to the reviewed catalog's
“Cantatrice”. Song is carried separately and never shuffled into Main.

## Multi-turn population and starting state

The live report now uses `casellaTurnForecast`: 64 reproducible shuffled Main
orders, followed continuously through the player's own turns 1–5. Displayed
checkpoints are own turns 2, 3, 4 and 5, not global alternating turn numbers.
Going first is the fixed report/comparison policy. The shared simulator also
supports going second for verification. Spirit of Wind draws seven; the starting
player skips their first draw and cannot attack on that first turn. No mulligan
or opponent actions are simulated. Song stays outside Main.

Each trajectory starts at Spirit, zero aria, no deployed allies and no Charger.
On subsequent turns, pay for the next Casella level before recollecting memory.
Spend graveyard Reclaim Floating Memory first, then field Poise Active Memory,
then randomly banish the remaining cost from memory. An unaffordable level does
not partially spend resources. If not leveling, materialize listed Backup Charger
for zero memory; this still consumes that turn's materialization. Going second
can materialize Charger on the first own turn. Other regalia remain available for
Shopkeep's optional banishment but their activations are not modeled.

Dungeon Guide's paid entry can banish two random memory cards to level immediately.
Only actually reached levels unlock Arcane and Casella abilities. Each level entry
resolves once. Surviving memory returns to hand, then the normal draw occurs.
Deployed allies wake each own turn; temporary buffs expire, permanent Chromatic
counters persist. Returned/replayed allies lose both. Song premieres, aria, lineage,
banished Arcane and field resources persist. No free recurring level/aria/Charger
reset occurs at checkpoints.

Each turn searches up to 40 actions, retaining 12 distinct states per layer.
Payment branches reserve low-priority or high-priority cards. A fixed heuristic
selects one end state to carry forward: cumulative damage plus retained board
power/counters ×0.6, level ×2, aria ×0.2, hand+memory ×0.15, Refrain ×0.5,
Charm ×0.5, Poise ×0.3, Powercell ×0.3, and 1.2 for sufficient next-level memory.
These weights retain useful opening deployments; they are not fitted to match
results and do not imply optimal play. Pending singing must resolve before a
state can be retained. Search uses supported draws and their sampled outcomes;
its best-found lines are not an unbiased estimate of human play.

The p10/median/p90 range is cumulative unopposed damage over these trajectories.
Level-three percentage is the fraction actually reaching it by that checkpoint;
repeat-attack percentage counts trajectories with at least one paid same-turn
replay attack. A median-damage trajectory supplies additive regular attack,
replay attack, buff and trigger contributions, end-of-turn ally count and cards
accessed. These are not independent marginal medians. “Cards accessed” counts
cards drawn to hand/memory or acquired by scavenge, not cards merely inspected.

`sequenceCasellaCombat` / `casellaCombatForecast` retain the original conditional
level-three burst API for regression coverage. That API alone begins at level
three, four aria and an available listed Charger; it no longer drives the UI.

## Conservation and sequencing

Activating an ally pays its reserve cost from other actual hand cards, moving them
to memory. Those cards cannot pay again or be activated from memory in this burst.
An ally may attack once per deployment. Reclaim and Protector return a physical
ally to hand; replay pays again, loses its modifiers, and creates another attack.
Returned copies are tracked separately from never-attacked copies of the same name.
Aella suppression is not an immediate repeat attack. StrideTech returns to memory,
not to hand. Neither gets a free replay. Buff power is recorded separately from
printed power; Final Refrain trigger damage is a fourth, separate contribution.

Harness Lightning chooses its buff or aria mode, never both, and banishes itself.
Benediction uses empower two; opponent-dependent empower four is not assumed.
Casella's own singing costs three reserve and a non-Spirit inner champion; the
level-two champion is banished first. Removing level one disables future aria
conversion. Hymn and Poise provide their own paid singing opportunities.
Song costs remove aria. Final Refrain triggers once per nonzero removal event.
Premiere happens once per Song; Finale requires four face-up Songs. Chromatic
and Thunder modify only allies already on the board; returned allies lose them.
Thunder's arcane bonus is capped at six. Skyward's optional three-aria payment
is a separate removal event. Aiss's next-ally discount is consumed once.

The bounded policy includes supported entry draws, Fairy Whispers, Turbo Charge,
Aiss scavenge and Stormblade's optional random-memory banish/scavenge. It does not
model opponent interaction, blocking, survival, recovery, opponent negations,
all alternative uses of the listed Material cards, Three Visits glimpse/recovery,
Aella suppression across opponent turns, or defensive reserve spending.
No damage is granted for Reversal's Polarity without an opponent negation.
These limitations must not be hidden by labeling this resolved game damage.

## Provenance

scripts/import-tcgengine-casella.mjs imports existing upstream scenario excerpts
verbatim with file hashes and engine revision into tcgengine-casella-contracts.json.
They establish Reclaim zone movement, Harness modes/self-banish, Benediction's
conditional mode and Aella's suppression/cost boundaries. The tests are adapters,
not an executed PHP engine replay. The local engine has no Casella Song scenarios;
those rules use the repository's reviewed spoiler text. No synthetic scenario is
presented as a TCGEngine fixture. The acceptance deck and conservation regressions
are explicitly local analytics tests.

## Integration and validation

CombatAccessReport selects the Casella report for Casella Material lineages;
non-Casella reports retain their existing behavior. Casella-to-Casella comparisons
use the same opening/turn policy and match own-turn checkpoints. Comparison
controllers retain Song lists. Missing lineage, Song or catalog coverage hides the
report consistently with the site's empty-report policy. No automatic default Song
list is inferred. UserDeckStats already carries Song and loads its card artwork.

The catalog-based acceptance deck, split-line/order invariance, paid replays,
physical-copy distinction, lost buffs, memory-return boundary, Charger payment,
aria triggers, one-time premiere, and missing-data behavior have focused regressions.
Existing ally/Forese/Musicbox/Slime forecasts remain under their existing tests.
The imported engine contracts additionally include existing Protector, StrideTech,
Stormblade, Fairy Whispers, Turbo Charge rejection and Windmill scenarios.

## Multi-turn verification and calibration boundary

The importer additionally preserves existing Dungeon Guide and Floating Memory
integration actions/assertions verbatim, plus separately labeled engine timing
excerpts with source hashes. No new upstream fixtures are authored. Existing
engine fixtures establish mechanics; these imports do not execute the PHP engine.
Poise and Casella/Song mechanics remain reviewed catalog-derived contracts.

Regression checks cover first/second-player opening differences, paid deployment
and acceleration, memory-before-recollection, persistent allies, Floating/Active
Memory consumption, expired Harness versus persistent Chromatic, one-time premiere,
all 60 Main-card rotations with physical-card accounting, deterministic shuffled
populations, missing-data hiding and existing non-Casella forecasts.

This is rules/resource calibration, not empirical calibration. Survival, blockers,
opponent interaction, mulligans and player sequencing frequencies need observed
turn data before this can be called expected match damage. Scope remains the
supported Casella Wind package; unsupported card effects supply no damage/draw.
