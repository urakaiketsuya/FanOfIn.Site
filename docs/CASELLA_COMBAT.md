# Casella paid combat sequences

This is a conditional level-three burst report, not a turn-five outcome prediction.
The user-supplied Casella Wind list is retained in app/test/fixtures/casella-wind.ts.
Its level-three name is normalized from “Cantarice” to the reviewed catalog's
“Cantatrice”. Song is carried separately and never shuffled into Main.

## Population and starting state

At each existing cards-seen checkpoint, sample 64 reproducible Main-card pools
without replacement. Treat the accessed pool as available in hand, with no ally
already deployed. Assume the complete level-three Casella lineage is established
and its level-one/two entry empowers were converted to four aria. This deliberately
does not estimate the chance of reaching that starting state or retaining those
cards/counters. A listed Backup Charger is assumed available on the field; its activation still
pays three reserve, banishes Charger, then supplies one Powercell and memory draw.
Other non-champion Material cards remain in Material for Shopkeep banishment.

Each sample searches up to 40 actions, retaining 12 distinct states per layer.
Payment branches reserve low-priority or high-priority cards; the best damage line
found is retained, not claimed globally optimal. Main ordering is canonicalized.
The p10/median/p90 range describes the sampled access pools under this policy.
A representative median line supplies the four additive damage contributions;
these are not sums of independently computed marginal medians.

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
full materialization timing, or all alternative uses of the listed Material cards.
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
use the same starting state and match actual cards-seen checkpoints. Comparison
controllers retain Song lists. Missing lineage, Song or catalog coverage hides the
report consistently with the site's empty-report policy. No automatic default Song
list is inferred. UserDeckStats already carries Song and loads its card artwork.

The catalog-based acceptance deck, split-line/order invariance, paid replays,
physical-copy distinction, lost buffs, memory-return boundary, Charger payment,
aria triggers, one-time premiere, and missing-data behavior have focused regressions.
Existing ally/Forese/Musicbox/Slime forecasts remain under their existing tests.
The imported engine contracts additionally include existing Protector, StrideTech,
Stormblade, Fairy Whispers, Turbo Charge rejection and Windmill scenarios.
