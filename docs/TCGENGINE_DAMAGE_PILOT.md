# Direct-damage fixture pilot

Reviewed 2026-10-20 against TCGEngine revision
`34a054ba71c735663c5f8d48befb4bcf5715540a`.

The checked-in `app/test/fixtures/tcgengine-damage-contracts.json` records reviewed
outcomes, source-file SHA-256 hashes, and a minimal independent catalog snapshot
with its fetch timestamp. Tests need neither the engine checkout nor PHP.
These are manually reviewed contracts. Three selected engine replays subsequently
passed: both Purge in Flames cases and the Harbinger missing-element case.
The full engine suite was not run.

## Findings

| Selected case | Engine evidence | Analytics result |
| --- | --- | --- |
| Arcane Blast | Explicit 11 champion damage after paying reserve; advanced lineage seeded | Fixed amount agrees |
| Thunderclap | Champion target rejected; base and level-discount cases target an ally | No champion damage at either level |
| Fireball | Level patched to 2; exactly 3 damage, paying full cost without class discount | Level scaling agrees; class discount does not gate damage |
| Burst Asunder | Base 2; two sacrificed Fractals produce 6 and leave the field | Amount agrees; derived two-Burst conservation test gives 8 |
| Ashwick Cremator | Matching class, empty hand: 2 to each champion; cards in hand: 0 | Conditional ceiling agrees; missing class removes it |
| Purge in Flames | Explicit semantic assertions: 3 with Mage class, 2 without | Corrected unconditional 3 ceiling to 2, upgrading to 3 at the matching champion's natural level checkpoint |

The initial five contracts agreed; extending class-negative coverage exposed the
Purge mismatch. Its replacement bonus now preserves the base damage without class
support and does not add a second physical draw category. Public forecast tests
exercise catalog recognition as well as conditional amount/distribution tests.
Existing independent enumeration and probability-mass tests remain separate.

## Evidence boundaries

- Engine scenarios prepare resources, levels, lineage, and board objects. They do
  not establish probabilities of payment, deployment, survival, or an empty hand.
- The two-Burst conservation case is derived from the printed sacrifice clause and
  the engine's observed removal of both Fractals; it is not a two-spell engine replay.
- Missing-class rejection is checked against catalog text and the analytics model;
  the selected Cremator engine pair instead isolates the empty-hand condition.
- Purge's explicit matching/mismatched-class engine pair was replayed successfully.
  Additional analytics cases cover missing champion, incomplete lineage, duplicate
  lines, and first/second-player timing. These derived cases are not engine replays.
- Advanced-element first/second-player checkpoint tests preserve our existing
  turn-four access assumption. The Arcane Blast fixture supplies its element;
  it does not prove rejection without it or that a deck can unlock it by turn four.
  Actual element eligibility remains outside this pilot's validated coverage.
- The engine's Harbinger of Lightning missing-arcane case was replayed successfully.
  Its corresponding positive scenario uses a Shenju ally to waive the requirement.
  This establishes why a blanket "no matching Material element = zero damage"
  change would be incomplete: some access paths depend on Main-deck board effects.
  No such blanket change was made. Harbinger is boundary evidence, not an additional
  modeled damage formula.
- The local catalog snapshot was fetched 2026-09-28. This is a pinned comparison,
  not a claim that current online card text or later errata were reviewed.

## Updating

Review changed scenario assertions and catalog clauses together before updating a
contract. Record the new revision and file hashes; distinguish a changed rule from
an engine correction. Do not regenerate expected values from analytics output.

The bounded direct-damage contract pilot is complete: class-negative evidence
produced a tested correction, and element-negative evidence established the limit
of applying stateful engine legality to deck-access estimates. A separate element
eligibility model would require a catalog of lineage, enablers and waivers; it is
not validated by this pilot.
Musicbox, Foresee, combat sequencing, affordability, and automatic synchronization
remain deferred. No user interface changed. Purge's published calculation changes
when this commit is deployed; no deployment was requested for this follow-up.
