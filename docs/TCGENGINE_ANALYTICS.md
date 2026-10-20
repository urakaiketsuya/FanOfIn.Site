# Fixture-backed analytics expansion

Reviewed 2026-10-20. Source revision and SHA-256 hashes are pinned in
`app/test/fixtures/tcgengine-analytics-contracts.json`, together with independent
catalog excerpts from `data/card-catalog.json` (generated 2026-10-19). This is a
manual review of fixtures and their assertions, not an automated engine sync.
The engine suite was not rerun for this expansion.

## Delivered scope

| Requested category | Supported first implementation | Fixture sources |
| --- | --- | --- |
| Conditional costs | Crosswind Cuts, Thunderclap, Frozen Dismissal, Tidal Lock, Surging Obstruction, Burst Asunder, Total Whiteout, Jianyu | wind-attacks, damage-backlog, water-negates, water-negates2, water-actions2, water-rest |
| Floating Memory | 44 named Norm/Wind cards; matching/mismatched class contracts; finite payment capacity | norm-floating, wind-floating, Scenario::gaFloatingPays |
| Draw destinations | Innervate Knowledge, Conjure Downpour, Fractal of Waves, Hunt | water-actions2, water-rest |
| Resource damage | Burst Asunder, Strategem of Myriad Ice | water-actions2; existing Burst contract |
| Recovery | Mire Reparation, Spalling Cleanse, Serene Wind, Innervate Knowledge | water-actions2, wind-champions |
| Durability | Ceremonial Stormblade, including missing class | wind-items |
| Attack bonuses | Calculated Foresight, Windstrike Soldier, Poised Strike | water-rest, wind-attacks |
| Enabler access | Burst/Fractal, Hunt/Bishop and Pawn, Strategem and Foresight/Floating Memory | relevant card clauses; probabilities derived independently |
| Negate coverage | Engulf, Frozen Dismissal, Tidal Lock | water-negates |
| Tax pressure | Surging Obstruction odd/even reserve costs | water-negates2 |
| Damage versus prevention | User-selected unequal event sequence vs Breeze or Destiny independently | existing prevention rules and contracts; sequence arithmetic derived |
| Removal thresholds | Thunderclap printed life, Arrow Trap attacking-ally mode | damage-backlog, cards-a |
| Recovery against pressure | Supported recovery vs the same damage sequence | recovery sources above; offset arithmetic derived |
| Graveyard disruption | Thurible, Ma Chao, Purified Shot, opponent choice range | wind-items, wind-uniques, water-rest |
| Intercept comparison | Port Smuggler, Protector's Plate; four supported attack sources | norm-allies4, norm-items2, wind-attacks |
| Specific disruption | Whiteout entry, Nia/Jianyu named-card tax | water-rest |
| Own-deck versions | Per-card outcomes, effective costs, Floating Memory, access and package deltas, changed cards | shared calculations above |

All requested categories have a bounded implementation. Coverage is not the
entire catalog. Unreviewed rules, generic legality, full combat sequencing,
affordability, automatic graveyard population, lethal timing, opponent choices,
and matchup win probabilities remain out of scope. Scenario toggles describe
state selected by the user; deck copies are not assumed to be in play.

## Review details

The Norm/Wind floating families explicitly call gaFloatingPays for positive and
negative class cases. The helper asserts banishment and successful level-up
payment, or that the graveyard/Material cards remain unchanged on a class miss.

Conjure Downpour's fixture seeds one memory card, pays three reserve, then asserts
five memory cards: its four-memory threshold is post-payment. Stormblade's fixture
asserts three durability with two Wind allies and one without the class bonus:
the printed one durability must not be lost. Strategem asserts two resources are
banished and deals 3+3, not one six-damage event. Innervate's positive and no-lineage
fixtures establish its delevel gate; engine activation-cost wiring was also read.

Graveyard choice ranges and access probabilities are derived tests, not engine
replays. Printed-life coverage cannot assert that an ally will be destroyed when
other effects apply. The catalog supplies life and durability; the older pipeline
cache omits those fields and must not be treated as zero.

## Verification

`app/test/fixtureAnalytics.test.ts` covers source/catalog class agreement, payment
conservation, cost thresholds, draw destinations, recovery gates/caps, attack
conditions, independent probability enumeration, package membership, targeting
and tax splits, unknown stats, graveyard choice, unequal ordered damage events,
version changes and empty/missing-catalog rendering. The pre-existing defense
suite remains in use. Browser verification exercises mobile/desktop layouts,
scenario changes, keyboard controls, state retention and visible data errors.
