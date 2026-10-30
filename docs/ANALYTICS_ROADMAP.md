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

2026-10-29: [cohort and model audit](DECK_BUILD_REPORT_AUDIT.md) complete.
Release A is approximately 94% complete: the audit, shared comparison engine,
compact deck-page composition and card comparison views are implemented. Main and Material show
current copies, build medians and middle-50% ranges with one selectable breakdown.
Card-first Main and Material views show current copies, zero-inclusive build medians,
middle-50% ranges and inclusion counts. A focused filter exposes cards only in other
lists, ordered by inclusion; six cards appear initially with expansion. These replace
the Main-only bucket grid. The controller uses one resolved cohort without computing
the unused legacy buckets; composition skips unused traits and caches repeated sections.
A largest-build sample (1,894 references) now took approximately 780ms locally versus
993ms previously; this is not a mobile benchmark and further performance work remains.
Deck-to-archetype navigation now carries a Main/Material snapshot in browser history
state and reuses the same comparison controller, including target exclusion and missing-list
coverage. Report-tab navigation and reload retain the snapshot; unrelated builds reject it.
“View all recorded lists” explicitly switches to the existing sightings-based report.
Copied URLs and new tabs open that broader report; comparison snapshots are not shared URLs.
The comparison resolver and projection now run in a dedicated browser worker. Changed
inputs cancel the previous worker; results are bound to their input and failures expose
Retry comparison. Decoded reference records stay in the worker. Calculation formulas
are unchanged; this removes computation from the UI thread, not total calculation time.
Comparison consumers now supplement page-scoped cards with the reactive local catalog,
using the same catalog for calculation, artwork and detail links. The 1,894-list tournament
sample now has complete composition references, matching its archetype handoff.
Most Played now offers an on-demand, three-card comparison preview using the same
worker result and target-excluded cohort. Closed previews load no comparison partitions.
The same disclosure and comparison now appear on Browse tournament sightings and
homepage discovery cards. Homepage event lists and comparison partitions load on expansion;
the published event supplies the actual format. Failed deck loads offer Retry deck.
Next: browser release validation for deck-load retry, text zoom, and signed-in flows.
Worker cancellation and failure/retry now have focused lifecycle regression coverage.
Extra-draw model validation remains. The percentage is approximate because that
validated model scope remains undecided.

Previous increment verification: 21 focused calculation tests; app/shared type checks; app lint (existing
warnings only). Browser checks at 390×844 and 1280×900 cover Main/Material, keyboard
section switching, cost selection, empty breakdown, category expansion, card expansion,
48px controls and no horizontal overflow. Loading was observed; sparse/unknown/conflict
states are covered by calculation tests. Forced network failure, text zoom and signed-in
saved-deck flows have not been browser-verified for this increment.

Card-view increment verification: 17 focused calculation tests, app type check and
lint (existing warnings only). Browser checks at 390×844 and 1280×900 cover Main and
Material, reference-only cards, expansion/collapse, 48px controls, visible focus and no
horizontal overflow. Loading was observed. Empty/fallback/error states, full keyboard
interaction, text zoom and signed-in flows remain unverified for this increment.

Archetype-handoff verification: 19 focused tests, app type check and lint (existing
warnings only). Browser checks at 390×844 and 1280×900 confirm identical 416-list
references, reload and tab retention, Main/Material keyboard switching, reference-only
cards, 48px exit action and no horizontal overflow. Loading was observed. Forced
network failures, empty/stale-assignment UI, text zoom and signed-in flows remain unverified.

Worker increment verification (2026-10-30): 21 focused tests, app type check, app lint
(existing warnings outside this change), and Vite production bundle pass. Real-data
benchmark checks structured-clone job parity against direct calculation for 1,894- and
416-reference builds; complete output fingerprints match the pre-change baselines.
Browser checks cover both builds, deck-to-archetype navigation, 390px/1280px overflow,
and keyboard Main/Material selection. Loading was observed; worker failure responses
are unit-tested. Forced browser worker failure/retry, rapid-input cancellation, signed-in
flows and device-level frame timing remain unverified. Input cloning and rendering still
run on the UI thread; no end-to-end speedup or frame-time threshold is claimed.

Catalog increment verification (2026-10-30): 20 focused tests, app type check and lint
(existing warnings only). Browser checks at 390×844 and 1280×900 confirm restored Main
composition references, Material reference-only artwork/links, 51-card expansion/collapse,
keyboard section switching and no horizontal overflow. Tournament and archetype values
match for the 1,894-reference sample. Loading was observed; missing-catalog behavior is
unit-tested. Forced sync failure/recovery, empty local catalog, text zoom and signed-in
flows remain unverified in the browser.

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

Release D continuation: season detail now includes a card-illustrated monthly field report, separated by format, with entrant-weighted percentages and complete-event coverage. The latest two observed event months stay visible even when field data is unavailable. Build trajectories and card adoption still require their own cohort/data audit; this report does not infer either from champion counts.

Release D data gate (2026-10-26): [season report audit](SEASON_REPORT_AUDIT.md)
completed with a reproducible read-only command. Recorded-deck lists are structurally
available, but 24.9% lack concrete build assignments and event sampling is sparse.
Season build shares must retain Unclassified; card adoption must be labeled for recorded
lists, distinct from complete-field shares. Next is a shared monthly model and compact
pipeline artifact, then the season UI. Audit complete does not mean report/live release complete.

### Release D completion pass (2026-10-26)

Implemented the remaining bounded page scope:
- Seasons index/detail: monthly recorded-build shares, unclassified share, largest
  gains, same-champion card adoption changes; retains complete-field champion report.
- Battle Chart: adjacent 90-day records and changes, identity and fetched-round coverage;
  existing all-time archive remains separate, with ties no longer credited as opponent wins.
- Players index/profile: recent Standard summaries, per-format records by build,
  opponent experience and card-illustrated changes between the latest two recorded lists.
- Teams: historical event lineups, standings records, known-champion coverage and
  distinct-champion counts; all-time favorite champion substitution removed.
- Regions: local versus other-country complete fields with matching date/format scope,
  and champion recurrence across observed fields.
- Stores/venues: attendance, repeat participation and recurring champion fields,
  each with its own coverage denominator.

Delivery uses five bounded pipeline projections. Unsupported data remains unavailable;
no new classifications or user inputs are required. Calculation fixtures cover source
joins and arithmetic. Local browser verification and release verification are tracked in
`docs/COMPETITION_REPORT_VERIFICATION.md`. Deployment and live browser verification
passed on 2026-10-26 at revision `7a88075d3`.

Release D / #4 is complete: 100% of the bounded scope (all eight page groups implemented, locally verified, deployed and live verified). No release blockers remain. Earlier continuation notes above record historical milestones; this completion record supersedes their pending work. Next recommended work is release A’s cohort/model audit and mobile-first deck-versus-build design. Player comprehension remains an ongoing evaluation, not a claimed release test.


Browse preview increment (2026-10-30): Most Played expansions show the three largest
absolute card-count differences from build medians, across Main and Material. Card
art, names and links remain visible; reference-only cards retain zero current copies.
The full comparison link carries the exact list snapshot. Expanded results retain
cohort counts, dates and missing coverage. This is descriptive ordering, not advice.
Twenty-four focused tests, app type check and lint pass (existing warnings). Mobile 390px
and desktop 1280px checks cover loading, expansion/collapse, keyboard access, 48px
controls and overflow. Full-report navigation preserves the 1,475-list / 1,873-sighting
Silvie comparison and nine unavailable assigned lists. Forced failure/retry, empty-match UI and text zoom remain
unverified in the browser. Sparse/missing references are covered by existing engine
tests; preview ordering and unavailable references have focused tests.


Discovery preview reuse (2026-10-30): shared disclosure now serves Most Played,
Browse tournament sightings, and homepage recent results. Sighting previews resolve
the published event's exact list and format; the homepage's Material-only teaser
is never used as the comparison target. The bounded event-request cache is reused.
Failed or absent deck loads expose Retry deck, which clears that event's cached
response; a null deck no longer remains in a loading state. Closing unmounts the
comparison consumer and terminates its worker.
Seven focused preview/worker/handoff tests, app type check and lint pass (existing
warnings). Mobile 390px and desktop 1280px checks cover both placements, loading,
collapse/reopen, keyboard focus, 48px controls, and overflow. Homepage and Browse
resolve event 66963/player 3753 to the same 1,282 reference lists, 1,578 sightings,
103 unavailable assigned lists, and three card differences. The homepage Ciel
list correctly reports no published assignment. Forced deck-load failure/retry,
text zoom, and signed-in flows remain unverified.


Worker lifecycle release checks (2026-10-30): comparison attempts now accept only
one completion, so late messages or errors cannot replace a finished result. The
hook retains input-bound state and transition rendering. Seven focused lifecycle
tests exercise construction and message-post failures, worker errors, unreadable
messages, calculation errors, successful retries, cancellation, and late events
from a previous deck. These test the production attempt controller with controlled
worker ports; they do not claim to test React scheduling or browser failure UI.
Fourteen combined lifecycle/calculation/preview/handoff tests, app type check, lint,
and the Vite production bundle pass. No layout changed. Browser-forced failures,
event-deck request retry, text zoom, and signed-in flows remain unverified; extra-draw
model validation remains separately pending. Release A is approximately 89% complete,
based on completed discovery/report integration and worker lifecycle coverage; the
remaining model scope makes this an estimate.


Event-load retry checks (2026-10-30): fixed a shared-cache race where a failed older
request could evict a newer retry for the same event. Event loading is now isolated
behind the existing hook, retaining the twelve-event limit and shared in-flight loads.
Seven request-layer tests cover shared loads, network/HTTP/JSON failures, successful
retry, late failure during and after retry, explicit refresh of published errors, and
bounded eviction without cancelling existing consumers. Twenty-one combined focused
tests, app type check and lint pass (existing warnings). Homepage comparison loading
and keyboard collapse/reopen pass at 390px and 1280px, with 48px controls and no
horizontal overflow. Browser-forced errors, text zoom, and signed-in flows remain
unverified. Next: finish those browser checks and validate the extra-draw model.
Release A is approximately 90% complete based on implemented report/discovery scope
and worker/request recovery coverage; extra-draw scope remains uncertain.


Draw-access correction (2026-10-30): removed rounded-mean hypergeometric access from
the automatic deck analysis report. The shared simulation now counts additional
per-card access against the natural prefix of each identical shuffled library.
The report adds that sampled gain to exact natural odds, bounded at one. A lone
engine no longer increases access to itself (the audit's 28.3% case now reports the
correct 15%); independent target cards retain gains from the engine. Existing
resource/seen outputs and natural odds are preserved. Fourteen focused tests pass,
including no-engine equality, deterministic bounded access, and an independent
exact two-card-access check. App/shared type checks and app lint pass (existing
warnings). This changes no page layout; browser checks were not repeated. Memory destinations and
unsupported activation conditions remain unresolved; the standalone hypergeometric
calculator also retains its separate legacy approximation. Next: model hand versus
memory draws and restrict unsupported effects, then finish browser release checks.
Release A is approximately 92% complete, reflecting completed report integration and
the first draw-model correction; remaining supported-effect scope is uncertain.


Draw destination correction (2026-10-30): fixed draw clauses now retain printed order
and hand/memory destination through a shared parser. Printed draw totals reuse that
parser. The report passes the steps to the shared simulation; draws into memory stay
there until recollection, cannot immediately pay Reserve or chain plays, and survive
hand-only discards. Existing sources without explicit steps retain hand draws.
Twenty focused tests cover existing resource/access behavior, memory isolation,
recollection, mixed-destination exhaustion, published Study the Fables wording, and
end-to-end report propagation. App/shared type checks and lint pass (existing warnings).
A catalog check preserves printed draw totals for all 2,535 cards and recognizes 187
cards with memory draws. No layout changed; browser checks were not repeated.
Next: restrict unsupported triggers/activation costs, then finish browser release
checks. Release A is approximately 94% complete: report integration, recovery, access
probabilities and fixed draw destinations are implemented; supported-effect scope
and remaining release verification keep this estimate uncertain.


Supported-effect gate (2026-10-30): the automatic report now accepts only complete
fixed draw-only Main Action text, optionally followed by a fixed discard. It excludes
conditional/activated effects, additional instructions and all Material activations.
The current catalog admits Creative Tinder and Pyretic Prognosis. Printed sources
remain visible with modeled/not-modeled labels; forecasts show modeled/total source
counts and hide the extra-draw legend when none qualify. This is a conservative
supported subset, not validation of all draw mechanics or a full deck forecast.
Twenty-three focused tests cover the gate, resource/access regressions and Material
exclusion. App/shared type checks and lint passed (existing warnings).
Homepage loading and zero-supported coverage were checked at 390px and
1280px with no horizontal overflow: the Silvie example shows 0/11 supported sources
and 9/11 natural cards by turns 3/5. Full analysis source labels, error/retry, text
zoom, and signed-in flows were not browser-verified in this increment.
Release A is approximately 94% complete based on completed report/discovery integration,
recovery tests and the bounded model corrections. Next: verify the complete analysis
flow and remaining browser release checks. Broader effect support is a separate
expansion; release verification remains the blocker, and the percentage is estimated.
