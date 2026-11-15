# Card/build analytics coverage audit

2026-11-15. Release C continuation; this audit does not mark Release C complete.

## Inspected surfaces

| Surface | Existing foundation | Remaining work |
| --- | --- | --- |
| Card detail (`CardDetail`, `CardInfoPanel`) | Tournament inclusion; separate community inclusion; visible copy distribution among playing lists, including rare observations | Build-scoped distributions now implemented from recorded membership; compatible adoption periods and observed alternative choices remain. Single-quantity cards need the updated pipeline artifact. |
| Card Stats (`CardStatsIndex`) | Usage and win-rate rows, population count | Replace raw-count “Hot” ranking with comparable-period inclusion changes; add champion/build concentration with explicit denominators. |
| Staples (`staples/CardStaples`) | Section-aware populations; format/champion/build filters; all/30/90-day cohorts; source controls | Stable/recent comparison needs nonoverlapping, equal-length periods. Do not compare 30 days to the overlapping 90-day population as a trend. |
| Packages (`PackagesIndex`) | Full published pools and requirements; separate research surface | Exact observed variants, complete-package frequency and joint access must be audited against actual lists; full pools are not tested variants. |
| Discovery (`CardDiscoveryIndex`) | Existing new-release eligibility and identity matching | Add competing slots and supported swaps only after an actual reference list is selected. Champion + Spirit alone cannot supply the deck denominator or payment state. Keep suggestions opt-in. |
| Archetype report (`ArchetypeReport`) | Recorded-list inclusion, typical copies and middle 50%; draw-adjusted supported checkpoints | Full quantity histograms and period-consistent construction stability. |
| Archetype Compare (`ArchetypeCompare`) | Centroid similarity and average quantity differences | Replace the card quantity comparison with aligned observed distributions and availability counts. Do not treat average decks as played decks. |

## Still to inspect

Cards browse, Champion index/detail, community/shared-deck construction trends,
Pantheon and Sets/By Set need their own end-to-end cohort and presentation audit.
This document records inspected source behavior, not browser acceptance for those pages.

## Next implementation slice

Build-scoped copy distributions are now implemented on Card detail, using recorded
sightings and published archetype membership. Inclusion, playing-list quantities
and list availability have separate denominators; Sideboard is excluded.

Implement equal-period adoption with denominator data before reusing it in
Card Stats, Staples, Sets and build history. Observed alternatives must be described
as observed choices, not functional substitutes or causal win-rate improvements.
Supported swaps reuse the existing paired fixture models; unsupported results stay
unavailable. No additional game-mechanic fixtures are needed for copy distributions.

## Verification of this slice

The card-detail copy presentation and quantity producer have focused regression
coverage for low-count choices, single-quantity cards, missing distributions,
Main + Material aggregation, duplicate sightings and Sideboard exclusion.
The historical pipeline artifact was not regenerated; new single-quantity coverage
requires an analysis rebuild. Existing multi-quantity artifacts work immediately.
