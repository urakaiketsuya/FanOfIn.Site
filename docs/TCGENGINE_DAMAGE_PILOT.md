# Direct-damage fixture pilot

Reviewed 2026-10-20 against TCGEngine revision
`34a054ba71c735663c5f8d48befb4bcf5715540a`.

The checked-in `app/test/fixtures/tcgengine-damage-contracts.json` records reviewed
outcomes, source-file SHA-256 hashes, and a minimal independent catalog snapshot
with its fetch timestamp. Tests need neither the engine checkout nor PHP.
These are manually reviewed contracts, not a claim that the engine suite was run.

## Findings

| Selected case | Engine evidence | Analytics result |
| --- | --- | --- |
| Arcane Blast | Explicit 11 champion damage after paying reserve; advanced lineage seeded | Fixed amount agrees |
| Thunderclap | Champion target rejected; base and level-discount cases target an ally | No champion damage at either level |
| Fireball | Level patched to 2; exactly 3 damage, paying full cost without class discount | Level scaling agrees; class discount does not gate damage |
| Burst Asunder | Base 2; two sacrificed Fractals produce 6 and leave the field | Amount agrees; derived two-Burst conservation test gives 8 |
| Ashwick Cremator | Matching class, empty hand: 2 to each champion; cards in hand: 0 | Conditional ceiling agrees; missing class removes it |

No formula changes were required for these selected contracts. Public forecast tests
exercise catalog recognition as well as conditional amount/distribution tests.
Existing independent enumeration and probability-mass tests remain separate.

## Evidence boundaries

- Engine scenarios prepare resources, levels, lineage, and board objects. They do
  not establish probabilities of payment, deployment, survival, or an empty hand.
- The two-Burst conservation case is derived from the printed sacrifice clause and
  the engine's observed removal of both Fractals; it is not a two-spell engine replay.
- Missing-class rejection is checked against catalog text and the analytics model;
  the selected Cremator engine pair instead isolates the empty-hand condition.
- Advanced-element first/second-player checkpoint tests preserve our existing
  turn-four access assumption. The Arcane Blast fixture supplies its element;
  it does not prove rejection without it or that a deck can unlock it by turn four.
  Actual element eligibility remains outside this pilot's validated coverage.
- The local catalog snapshot was fetched 2026-09-28. This is a pinned comparison,
  not a claim that current online card text or later errata were reviewed.

## Updating

Review changed scenario assertions and catalog clauses together before updating a
contract. Record the new revision and file hashes; distinguish a changed rule from
an engine correction. Do not regenerate expected values from analytics output.

The first contract integration is complete. Before calling class/element negative
coverage complete, find or author explicit engine cases for missing class and
missing advanced element, then review how those states map to deck-only inputs.
Musicbox, Foresee, combat sequencing, affordability, and automatic synchronization
remain deferred. No user interface or production calculations changed.
