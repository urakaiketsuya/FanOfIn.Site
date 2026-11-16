# Observed build copy comparison

Archetype Compare uses `buildCopyDistributions` over published build membership
and the recorded deck-card index. Dictionary partitions decode independently;
repeated deck IDs and membership IDs count once. The existing `observedLists`
normalizer aggregates positive safe-integer quantities and excludes missing Main
lists. Sideboards never enter the report.

Main and Material have separate available populations. A missing/empty Material
section is unavailable for Material comparison. A card absent from an available
section is zero copies. Every bucket's percentage uses all available sections in
that build; inclusion is the fraction with at least one copy. Quantities are not
conditioned on playing the card. An unavailable population produces null shares,
not zero. Registration sightings are the unit, not unique players.

Each card has aligned buckets across selected builds: 0–4 for Main, 0–1 for
Material, plus any other observed positive quantities. Counts above normal limits
remain visible as observations, without declaring legality. The list includes
unchanged cards. Ordering is descending maximum pairwise total variation distance:
`0.5 * sum(abs(p(q) - r(q)))`, then card name. Pairs with unavailable populations
are excluded from ranking. This detects differences even when mean copies match.
Bars share a fixed 0–100% scale. Six cards per section initially, six more per action.

This replaces the build mode's average-quantity tables, centroid merge explanation,
and truncated defining-card overlap table. Material-route mode is unchanged.
No mechanic fixture or generated artifact is required.
