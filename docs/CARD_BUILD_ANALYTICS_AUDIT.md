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

Equal-period adoption calculation and publication are implemented, including
category-scoped populations on a shared calendar. Next: regenerate the artifact
and replace Card Stats raw-count Hot ranking with inclusion change before reusing
it in Staples, Sets and build history. UI integration remains open. Observed alternatives must be described
as observed choices, not functional substitutes or causal win-rate improvements.
Supported swaps reuse the existing paired fixture models; unsupported results stay
unavailable. No additional game-mechanic fixtures are needed for copy distributions.

## Verification of this slice

The card-detail copy presentation and quantity producer have focused regression
coverage for low-count choices, single-quantity cards, missing distributions,
Main + Material aggregation, duplicate sightings and Sideboard exclusion.
The historical pipeline artifact was not regenerated; new single-quantity coverage
requires an analysis rebuild. Existing multi-quantity artifacts work immediately.

### Adoption report follow-through

Card Stats now ranks Adoption change by normalized equal-period inclusion and
shows previous/recent percentages with signed percentage points. Category filters
use matching populations; legacy or empty-period data is unavailable. cards.json
has been regenerated through the shared publisher using local cached inputs.
The earlier raw-count Hot finding is resolved for Card Stats; other comparison
surfaces still require their own audit before reusing this report.

### Observed build variants follow-through

Archetype Report now groups exact Main+Material member lists and presents observed
alternatives as card quantity differences against the most common actual list.
Frequency is available-sighting share, not player share or win rate. Full lists
and recorded-deck links make each alternative inspectable. This resolves the
observed-variant presentation for build reports; card-detail competing choices,
package-specific exact variants and reference-deck-supported swaps remain separate
work. The older outside-membership similarity search is unchanged.

### Reference-deck discovery follow-through

Discovery now accepts an actual pasted, library or active reference list. It uses
that list for new-release matching and lets the user choose a guarded one-copy
Main swap, inspect existing paired forecasts, and explicitly open a local Analysis
draft. Champion-only browsing does not offer forecasts. This closes the
reference-context prerequisite for Discovery swaps; automatic competing-slot
ranking and card-detail alternatives remain separate work. New-release connections
remain structural suggestions, not observed substitutions or claimed win-rate gains.

### Competing choices and package variants follow-through

Card detail's Decks tab now shows strict observed one-card alternatives: same
published build, equal copies/section, otherwise identical Main+Material. Each
result links a real matched pair and shows matched-list shares/counts. This closes
the observed-choice slice; functional swap rankings remain a different question.

Published packages now show complete/eligible registration frequency, partial
counts and exact section-aware pool projections among complete lists. The full
pool stays separately labeled. Package joint-access aggregation across recorded
cohorts remains unaudited; these observations do not claim tested execution.

### Archetype Compare follow-through — 2026-11-16

Build comparisons now show aligned observed copy distributions with zero-copy
buckets, section-specific available/requested counts, inclusion and actual card
art/name fallbacks. Missing sections remain unavailable. Equal means with different
quantity choices remain distinguishable. The centroid merge explanation and average
copy tables are removed from build mode; route comparisons are unchanged.
See BUILD_COPY_DISTRIBUTIONS.md for denominators and deterministic ranking.
Next: comparable-period Card detail/Staples adoption and recorded-cohort package access.

### 2026-11-17 — Staples adoption follow-through

Tournament Staples now compares adjacent 30-day windows within matching format,
champion, champion-card build, section and card-facet populations. Card rows retain
both gains and disappearances; empty/missing populations remain unavailable.
Community/blended adoption remains out of scope without comparable dated history.
Next card/build work: package joint-access forecasts across actual cohorts, followed
by champion/build concentration and construction stability.
