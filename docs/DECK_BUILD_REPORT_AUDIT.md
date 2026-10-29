# Deck versus published build — Release A audit

Audited 2026-10-29. This completes the data/model audit, not the report release.
Reproduce from the repository root:

```sh
node --import tsx scripts/audit-deck-build-report.ts
```

The command reads committed artifacts without changing them. Artifact timestamp:
2026-10-29T12:50:36.675Z. Timings are local Node measurements, not browser benchmarks.

## Findings

| Check | Result |
| --- | --- |
| Recorded lists / published builds | 60,277 / 328 |
| Structurally invalid Main or Material in full index | 0 |
| Unresolved recorded card names in published catalog | 0 |
| Exact identities assigned to conflicting builds | 0 |
| Combined identities with conflicting section allocation | 0 |
| Builds with at least six distinct lists before target exclusion | 315 / 328 |
| Builds spanning multiple champions | 1 |
| Assigned sightings absent from expected champion partitions | 1,153 |
| Those also absent from popularity index | 1,153 |
| Assigned sightings filed under an unexpected champion | 0 |

The full card index covers assigned IDs, but champion partitions require a popularity
entry (`buildDeckDetailPartitions`). All 1,153 omissions arise at that join. They must
remain missing coverage, not absent cards or zero quantities. The 315-build threshold
is an upper bound from the full index; partition omissions and target exclusion still
need checking per displayed cohort.

Largest build: Diao Chan — Fractal of Refreshment / Frostsworn Paladin (`szgmmc`):
2,473 sightings, 2,022 distinct constructions; 130 sightings absent from its partition.
Its champion payload is 2,323,764 bytes uncompressed. Largest combined payload is
7,696,492 bytes for Lorraine — Under Fire / Smoke Bombs (`1g8lbc7`), although that
build has just 30 distinct constructions. Single Lorraine partitions reach 4,695,203
bytes. Complete audit took about 4.3 seconds with partition reads cached.

These payloads favor a compact build-scoped projection before extending this to Browse
or the homepage. Do not load every champion partition for every result card. Keep
the existing detail loader while validating the shared contract; measure actual report
computation and mobile loading before choosing a worker or precomputation.

## Existing contracts and conflicts

| Foundation | Reuse | Required boundary change |
| --- | --- | --- |
| `deckQuantityEvidence` | Exact published membership, signature verification, target exclusion, five-other-list gate, dates and missing counts | Expose section-preserving cohort records; currently only target Main card buckets survive aggregation |
| `basicDeckStats` | Exact section totals, card contributors, unknown/X/null/zero cost distinctions | Use these categories consistently for target and reference; do not duplicate category math |
| `archetypeReport` / `reportDistribution` | Quartile interpolation and per-list fixed-checkpoint access | Existing report weights sightings, includes target, has no five-list gate, and uses different cost categories |
| `drawAccessReport` / `cardAccess` | Actual library size and fixed cards-seen probabilities | Core selection must be cohort scoped; distinguish reviewed required core from 90% observed inclusion |
| `computeDeckAnalysisReport` | Existing turn 3/5 natural and modeled draw distinction | Parser/opening inference live in app; conditional draws are counted, modeled mean is rounded before access; unsuitable as a validated cohort probability model |

Regression fixtures preserve the legacy archetype sighting weighting and ordering,
alongside exact-cohort target exclusion, missing records, hash collisions, ambiguity,
cross-champion loading and zero-copy buckets. Any weighting change is intentional
product behavior, not an incidental refactor.

Deck Stats is shared by tournament, collected, public, saved, builder and standalone
analysis views. Existing quantity evidence is Main-only and supported only for exact
published Standard lists. Archetype Report has its own loader and sighting-based model.
Arbitrary drafts and Pantheon cannot silently inherit these Standard reference values.

## Implementation contract for the next slice

1. Shared cohort resolver: explicit format/build, all recorded events with date range,
   distinct Main+Material identities, excluded target signature, missing IDs and distinct
   sightings. Preserve Main and Material separately; exclude Sideboard. Validate names
   against canonical catalog names without fuzzy merging. If future data has conflicting
   section allocations, retain an unavailable state rather than picking an arbitrary row.
2. Shared metric projection: call the same section-stat logic on every eligible list.
   Require five complete reference lists per catalog-derived statistic; target unknowns
   block that comparison. Return unavailable rather than an empty distribution of zeros.
   Structural sizes may still use structurally valid lists without resolved catalog data.
3. Quantity differences: union of target and reference card names, separate sections,
   zeros included in the all-list distribution. Show current copies, reference median,
   middle 50%, inclusion denominator and card art. Keep existing played-only copy
   summaries explicitly distinct. No winner or optimal-quantity claim.
4. Compact comparison: target dot, reference median marker and middle-50% bar; exact
   values visible without hover. Start with size, types, elements and printed cost bins.
   Show associated cards inline using existing controls. No configuration required.
5. Archetype parity: both consumers call the same cohort/metric engine. A target-scoped
   reference link must carry target exclusion; the unscoped archetype population is
   explicitly different. Test equality with identical membership and exclusion inputs.

Five is a descriptive display minimum, not statistical significance. Quartiles describe
variation between lists, not uncertainty in the mean. Missing reference lists remain
visible even when enough complete lists are available.

Natural turn checkpoints can follow after opening-hand inference becomes a shared,
coverage-aware contract (no silent seven-card fallback). Extra-draw and reviewed-core
turn access are held for model validation: conditional triggers, ordering, materialization,
unknown catalog data and expected-seen approximation must not become a stronger claim
merely because they are compared. Fixed 7/10/15/20 access remains usable independently.

## Verification and remaining work

Read-only audit completed; nine focused archetype/quantity regression tests pass.
No UI or production behavior changed, so no new viewport verification is claimed.
The audit does not establish player comprehension or mobile compute performance.

Release A is approximately 20% complete: scope and audit are established; shared
cohort/metric implementation, deck/archetype integration, compact placements, model
validation and local/live verification remain. Extra-draw scope may change after its
validation. Missing popularity records block complete coverage, not a clearly labeled
partial-cohort implementation. Next: shared cohort resolver and section metric contract,
then the mobile deck-versus-build component.


### Shared engine implementation — 2026-10-29

The section-preserving resolver and composition/quantity projection are implemented.
The existing quantity presentation delegates to the resolver; the new comparison
projection has no UI consumer yet. Fourteen focused tests cover legacy weighting,
exact membership, target exclusion, duplicate sightings, zero-inclusive quantities,
reference-only Material cards, catalog gaps, sparse/unsupported populations and
conflicting section allocations. App/shared/pipeline type checks pass.

Largest-build sample `szgmmc`, target `21122:104`: 1,894 other distinct lists,
2,340 sightings, three excluded target sightings, 130 missing. Main and Material
both have 1,894 catalog-complete references; median sizes 60 and 12. The combined
resolver/projection took 993ms locally in Node, excluding file reads, parsing and
network. This is a performance concern, not a browser benchmark. Next: avoid computing
unused basic-stat categories or cache per-list projections, then integrate the compact
report and verify mobile/desktop behavior. No browser verification or deployment is
claimed for this calculation-layer change. Release A is approximately 35% complete;
UI integration/parity/placement, performance and validation remain.
