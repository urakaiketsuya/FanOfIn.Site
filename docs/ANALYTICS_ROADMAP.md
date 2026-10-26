# Results-first analytics roadmap

Planned 2026-10-25. Status: roadmap defined; event-detail delivery is underway under this
initiative. Existing calculations and reports are foundations, not newly completed
milestones. This is an ordered backlog, not a commitment to deliver every page at once.

## Outcome and scope

Make Fan of Insight a statistical report illustrated with cards: automatic results
that help users understand a deck, compare choices, interpret competition, and use
their collection. Opening a report requires no new classifications or scenario inputs.
Use the current deck, page, format and filters as context. Keep interactive calculators
separate, and preserve their drafts when navigating between tools.

Reuse existing analysis before inventing metrics. Every report must identify its
population, period, denominator, and whether it is observed or modeled using concise
labels. Keep methodology in CALCULATIONS.md, not explanatory panels or accordions.
Do not add universal deck scores, inferred win probabilities, or automatic deck edits.

This initiative extends the automatic deck, fixture, archetype, package and collection
foundations. It does not reopen the full rules-engine project. Coordinate with the
existing Deck Decision Report and deferred Deck Basics initiatives: retain their
ownership of package decisions and basic composition/access calculations, respectively.
This roadmap owns contextual comparison and placement across pages, not duplicate math.

## Delivery order

| Release | Scope | Dependency | Completion gate |
| --- | --- | --- | --- |
| A | This deck versus its archetype | Cohort and calculation audit | One integrated deck-to-archetype report passes the gates below |
| B | What changed between lists | A's shared metric contracts | Compare and saved versions agree on every reported delta |
| C | How cards and builds are used | Stable cohort aggregation | Card, champion and archetype views share quantities and denominators |
| D | What happened in competition | Event participant/result/list coverage audit | Field and top-cut reports reconcile to source records |
| E | What the collection enables | Existing availability and allocation logic | Coverage previews reconcile with saved decks and simultaneous demand |
| Later | Secondary discovery and specialist pages | Relevant preceding release | Each item gets a bounded spec before implementation |

Ship releases independently. E can follow B if competitive data work blocks D; it
does not depend on C or D. No calendar estimates until
each release's audit establishes data coverage and implementation size.

## A — This deck versus its archetype (first release)

**Question:** How does this exact list differ from comparable lists?

1. Audit existing report consumers, cohort membership, formats, catalog resolution,
   draw models and loading cost. Record reusable calculations and unresolved gaps.
2. Define the reference cohort: same supported format and published build, explicit
   period, deduplicated exact lists for construction distributions. Show distinct
   lists and sightings separately. Exclude the target exact list from its benchmark.
   Do not silently substitute a champion-wide population when no build resolves.
3. Establish a documented minimum cohort for each statistic before release. Sparse,
   missing and incomplete cohorts retain a short status; they do not become zeros.
4. Ship deck detail with card-quantity differences and existing cost/composition
   distributions, then add natural/extra cards seen at turns 3 and 5 and reviewed
   core access only where the same model can be run consistently for the cohort.
5. Reuse the reference results on archetype detail; expose only a compact summary on
   Browse Decks. Homepage showcases the same component, not a separate formula.

**Visual:** this list's dot against the cohort median and middle 50% range, with
contributing cards visible. Between-list variation is not a confidence interval.
Cards seen uses the existing natural/extra draw distinction. Access and affordability
remain separate; do not substitute access at expected cards seen for a full probability
distribution without validating and labeling that approximation.

**Acceptance:** target exclusion and duplicate handling are tested; quantities join
by canonical card identity; Main and Material remain distinct; Sideboard is excluded;
missing catalog entries cannot improve a result. Deck and archetype pages show identical
reference values. The default report needs no input. Audit large-cohort computation
before choosing caching or pipeline precomputation.

## B — What changed between lists

| Page | Deliverable |
| --- | --- |
| Compare Decks | Paired values and deltas for individual access, package completeness, draw throughput and supported resource/defense outcomes; changed cards directly alongside |
| Saved deck detail | Current versus previous version using the same comparison engine; preserve version identity |
| Deck Builder | Small result preview for the latest edit; never apply a suggested edit automatically |
| Deck Review | Up to three largest supported differences from the reference build, with cards |
| My Decks | Compact version-change summaries linked to the full comparison |

**Acceptance:** swaps, quantity changes and deck-size changes recompute both sides;
probabilities use percentage points; unchanged cards can still change access when the
denominator changes. Conditional outcomes retain their conditions. Shared resources
are not summed twice. Missing coverage cannot be presented as an improvement. No
overall winner label. Report state never mutates either source deck.

## C — How cards and builds are used

| Page | Deliverable |
| --- | --- |
| Card detail | Copy-count distributions by build, adoption history and observed alternative choices in comparable lists |
| Card Stats | Adoption change and concentration across champions/builds, with population counts |
| Card Staples | Stable versus recent adoption using comparable periods |
| Cards browse | Optional compact inclusion and typical-quantity line within current filters |
| Card Packages | Observed exact variants, complete-package frequency and joint access across actual lists |
| Card Discovery | Eligible new cards alongside competing slots and modeled candidate-swap differences; reuse DTR Alter eligibility |
| Champions index/detail | Build-share distribution and comparable behavioral profiles of each build |
| Archetypes index/detail | Construction stability, quantity distributions and draw-adjusted checkpoints extending the existing report |
| Archetype Compare | Aligned distributions, rather than a synthetic average deck |
| Community/shared decks | Construction trends with community and tournament sources kept separate |
| Pantheon | Reuse presentation only after verifying format-specific rules and cohorts |
| Sets / By Set | Observed card adoption after release and adopting builds |

**Acceptance:** inclusion across all eligible lists differs visibly from quantity
among lists playing a card; missing lists are excluded and counted. Release comparisons
use compatible elapsed windows. Alternatives are observed choices, not claims of
functional interchangeability. Package pools remain distinct from exact variants.
Correlations between inclusion and results are never causal recommendations.

## D — What happened in competition

Implementation note (2026-10-25): the first event-detail report adds percentage-led
champion advancement, field versus top-cut share, and same-champion card inclusion, using real cut size and complete
public field coverage. It defaults to Report while preserving deck/player deep links.
Unsupported or incomplete events retain explicit status. Remaining release D scope:
the other page integrations below; live verification is pending. The preceding-field
comparison now uses the nearest three matching events within 90 days, weighted by
entrant count, with complete-field and completion-time validation. It retains unavailable
cohorts rather than skipping missing events. Archive audit: 1,783 of 22,272 indexed
events advertise complete public deck coverage; each selected bundle is revalidated. Events index previews now show the three largest champion shares and the remaining share, alongside attendance, in list and calendar views. Published summaries contain 1,545 validated complete individual fields. Mobile and desktop checks passed; live verification and other page integrations remain. This note does not mark release D complete.

| Page | Deliverable |
| --- | --- |
| Event detail (first) | Field versus top-cut share, conversion, top-cut card adoption and preceding-field comparison |
| Events index | Compact field-composition strip and attendance |
| Seasons index/detail | Champion/build trajectories, emerging builds and card changes across periods |
| Battle Chart | Match records, sample coverage and comparable-period changes; missing cells remain missing |
| Players index/profile | Scoped recent records, results by build, deck evolution and matchup experience |
| Teams | Event-date roster results, champion coverage and lineup diversity where historical membership exists |
| Regions | Local versus broader trends and choices recurring across events |
| Stores/venues | Attendance, returning participants and recurring fields where identifiers and records support them |

**Acceptance:** define top cut per event and distinguish share from conversion; exclude
byes and handle ties consistently with documented records. Partial decklists cannot
stand in for the entire field. Date windows, format, event type and source coverage
are explicit. Missing historical team membership blocks team claims, not other pages.
Keep participant identities within their existing visibility permissions.

## E — What the collection enables

| Page | Deliverable |
| --- | --- |
| Collection | Missing cards blocking the most saved decks; decks closest to available-copy readiness |
| Quick Buy | Before/after coverage from explicitly selected purchases, plus remaining shortages |
| My Decks | Independent readiness and simultaneous assembly conflicts |
| Card Locations | Copy conflicts, loans and assignment blockers with location actions |
| Looking For/trading | Explicit wants matched to available, uncommitted inventory |
| Official decks/products | Missing cards supplied and saved-deck overlap using verified product contents |

**Acceptance:** use shared ownership, availability and allocation helpers. Independent
coverage is not simultaneous assembly. Buying previews do not update inventory until
the user records acquisition. Loans, reservations, printing preferences and sideboard
scope retain existing semantics. Rank blockers by explicit saved-deck goals, not an
assumption that users want to buy every useful card. No additional purchasing input
is required merely to view a report.

## Later and intentionally unchanged

Recorded-play and simulation reporting was removed from this initiative on 2026-10-25.
Existing Combo Lab, Goldfish, Match Log, Timeline and Simulator features remain unchanged;
this roadmap does not schedule their expansion.

- Tags and strategies: observed co-occurrence and quantities after C; preserve discovery focus.
- Thema/price history: printing/finish-specific trends only after coverage validation.
- Achievements: rarity and unlock history, after confirming eligible population.
- Artists: collection coverage as a secondary enhancement.
- Pack opener: statistical outcomes only with reliable collation data; otherwise deferred.
- Homepage: reuse one deck report, one card adoption result and one event result as their
  releases ship; no independent analytics backlog or calculation engine.
- Account, settings, documentation, media kit and changelog: no new analytics dashboard.

## Shared release gates

- Use bars for quantities, lines for time, dots/intervals for distributions and paired
  comparisons, and stacked bars only for mutually exclusive parts of a common total.
  Card art and readable linked names identify the contributors; color is supplementary.
- Review each chart against its question, data type and user task before implementation.
  Use a compact exact-value alternative accessible without hover. No methodology accordions.
- Match calculations across pages via shared logic; add representative regression cases
  for the changed numerical boundary and record formulas in CALCULATIONS.md.
- Verify 360–390px and desktop layouts, 48px touch targets, keyboard focus, zoom and no
  page overflow. Check loading, empty, failed, partial and unsupported states.
- Preserve deck/version/filter context across links. Large recomputations use transition
  feedback; measure representative load cost before rollout.
- Validate locally, then deploy only when requested and verify the integrated live flow.
  A local implementation note alone does not mark a release complete.

## Tracking and success

Every release tracks: scoped → data audited → implemented → locally verified → live
verified. A blocked metric can be deferred explicitly while independent verified metrics
ship; never silently expand a cohort or fill missing values to satisfy a release gate.

Measure report agreement across pages, coverage of eligible decks, time to first useful
result, and whether users can identify the changed cards and interpret the comparison
without configuring a calculator. Collection previews must reconcile to actual saved
quantities. Page views alone do not demonstrate analytical usefulness.

Next work: release A's cohort/model audit and one mobile-first deck-versus-build design.
Planning is complete; event-detail implementation has begun. Existing foundations reduce
effort, but cohort and event-data coverage remain unverified dependencies.
