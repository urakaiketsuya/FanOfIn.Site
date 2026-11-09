# Card Staples

`/cards/staples` is a card-first discovery view. `/cards/stats` retains detailed meta-wide
analysis. Main, Material, and Sideboard are independent observation populations here;
this does not change main + material deck identity elsewhere.

## Population and identity

`pipeline/src/analysis/cardStaples.ts` publishes `analysis/card-staples.json` as part of
analysis. The targeted local rebuild is `node --import tsx pipeline/scripts/build-card-staples.ts`;
it reads the published event bundles and cached catalog without network requests.

The latest snapshot of each event wins. Completed, dated events with public decklists
contribute one observation per `${eventId}:${player}`. Repeated player entries collapse
before counting. A later hidden entry does not resurrect an earlier public entry.
Card names resolve with the existing canonical catalog resolver; known cards are keyed
by slug, and unmatched names use normalized name keys. Printings do not create new rows.
Multiple lines for one card add quantities but contribute only one presence per section.

Each selected cohort has exactly one period, format, and champion population. Null format
or champion means the aggregate, so aggregates must never be summed with their component
cohorts. Champion identity uses the existing material-deck signature. Unknown identities
remain explicitly labeled rather than being omitted from aggregate counts.

Champion cohorts also split by build. `championCard` is the highest-level, non-Spirit
champion card of the champion's line in the deck's material (equal levels pick the name that
sorts first). A cohort with `championCard: null` is all builds of that champion. The build
cohorts partition their champion's decks: no deck is in two builds. A deck that lists only
lower-level champion cards belongs to the build of its highest card, so "Level 1" builds are
decks that never list a higher level. `findStapleCohort` and `stapleChampionBuilds` in
`shared/src/cardStaples.ts` select them. Older projections lack the field and read as all builds.

An array means a reported section, including an explicitly empty array. An absent section
is unknown and excluded from that section's denominator. This is source reporting coverage,
not a claim that an empty source array proves the player registered no sideboard cards.
The page shows reported sideboard coverage. No sideboard performance claim implies that
those cards were boarded in for a particular match.

## Metrics

- Inclusion = distinct decks containing the card in that section / reported sections in
  the selected cohort. Card filters never alter the denominator; champion, period, and
  format filters select a different cohort.
- Average copies = total copies / decks containing the card, within that section.
- Usually N copies = most frequent registered quantity among containing decks; a frequency
  tie chooses the smaller quantity. Zero quantities and invalid quantities do not count.
- Adjusted deck win rate uses the existing `shrinkWinRate` and configured prior from
  `docs/CALCULATIONS.md`: the mean of per-deck standings win rates, ties worth half a win,
  shrunk toward 50%. Decks without standings do not enter the result denominator. Missing
  outcomes are null. Performance sorting requires at least max(5, minimum decks) result
  observations. This is association with deck results, not causal card strength.
- 30/90 day windows use event timestamps with age strictly less than 30/90 days, anchored
  to the latest completed event date. All recorded results has no lower date bound.
  The publication's through-date is shown alongside results.

## Facets and ordering

The shared selector in `shared/src/cardStaples.ts` intersects facet categories and returns
one row per canonical card. Elements match any selected value. Keywords explicitly match
any or all selected values, using the shared `KEYWORD_PATTERNS` ability parser. Timing labels
and art tags are not promoted into keywords. Card type, class, and reserve/memory cost use
catalog metadata. Unknown costs do not match a numeric ceiling.

Champion card level selects CHAMPION cards by their catalog level; it does not infer
playability, a Level Locked requirement, or the level reached in a game. The Champion and
Build selectors (next to Element and Rank by) pick a deck cohort instead and are separate from
it. They use the `champion` and `build` URL parameters; choosing another champion clears
`build`. Filters, section, period, format, and sorting round-trip through the URL.

Champion pages show the same cohorts, rows and denominators in a Staples section
(`ChampionStaples.tsx`, standard format, all recorded results, Main and Material). It links to
`/cards/staples` with the selected champion, build and section. Spirit element is the element of
the Spirit a deck plays. It is not a card element and is not a staples cohort, so the Spirit
breakdown stays a separate view on the champion page.
Clear filters retains the selected section, format, period, and sort. The filter sheet applies
changes immediately, so it owns no unsaved selection draft.

Usage sorts by deck count (equivalent to inclusion inside one cohort), quantity by average
copies, and performance by adjusted win rate. Ties use deck count then canonical card name.
Results use incremental display of 24 cards and shared art/name fallbacks. Loading, refresh
failure/retry, and no-result states remain visible without discarding filters.

Trend, cross-champion breadth, price, and printed level-requirement extraction are follow-up
metrics, not inferred from current totals or the champion-level field.

## Community source

The Deck source selector switches between tournament results and community decklists. The
community projection is `analysis/community-card-staples.json`, built from full published
ShoutAtYourDecks, Sleeved, and TcgArchitect lists by analysis and the targeted rebuild. The
community blend also republishes it from its current accepted full lists after a harvest.
The compact community search index cannot supply section quantities or sideboards.
Existing source-specific acceptance filters apply; empty main/material lists are excluded.

Community uses the same canonical cards, champion identity, facets, section denominators,
quantity mode, and ordering logic as tournament Staples. Latest source + deck ID snapshots
win. Exact canonical lists collapse across authors and sources after repeated lines merge.
The fingerprint includes format, main, material, sideboard, and Pantheon boon quantities;
missing sections remain distinct from explicit empty arrays. Lists with different sideboards
remain different observations in this projection. This fingerprint does not change the
site's main + material deck grouping identity.

Tournament and community populations are selectable rather than pooled: a community copy
of a tournament list cannot inflate tournament inclusion or performance. Community counts
are unique registered lists, not players or tournament entries. There are no community
match outcomes, so win-rate controls and metrics are hidden. All community cohorts use the
full archive; fetchedAt selects snapshots but is never treated as a play or creation date.
Switching sources preserves card filters and remembers tournament period/performance choices;
community resolves those choices to full archive/most played. Clear filters preserves source.

## Package check: Jin, Undying Resolve (2026-11-06, tournament decks)

Of 1,748 decks listing Jin, Undying Resolve (main + material), counted from
`deck-card-index.json`: Berserker Plate 1,715, Mend Flesh 1,658, Enrage 1,583, Seething
Intercession 683. All four together: 625 decks. The usual exact variant of the four is
Seething Intercession x4, Berserker Plate x1, Mend Flesh x4, Enrage x4 (266 of the 625).
Seething Intercession is a newer card: 194 of the 203 decks in the last 90 days contain it
(181 contain all four), against 39% all-time. All-time inclusion alone hides it, so a package
view must show recent and all-time evidence apart. Per-card usual copies cannot give the exact
variant: counts must come from decks that contain the whole package.

## Champion packages

`pipeline/src/analysis/championPackages.ts` publishes `analysis/champion-packages.json`
(rebuild alone with `node --import tsx pipeline/scripts/build-champion-packages.ts`). It uses the
same observations as Staples, standard format only, main + material, no sideboard. A package
exists for each champion and each build (`championCard`) with at least 100 decks.

- Core = cards in at least 75% of the build's decks in the primary window: the last 90 days
  when there are at least 30 such decks, otherwise all decks. Up to 16 cards. If fewer than 25
  decks hold the whole core, the least common core card moves out until 25 do. Champion cards
  are left out (they are the build's identity). No win rate is needed.
- Options = cards in 25% to 75% of the primary window, up to 12. They are not in the core.
- Exact copies = quantity patterns of the core, counted only in decks that hold every core
  card, not combined from each card's usual copies. Recent and all-time counts stay apart.
- Every card shows recent and all-time inclusion side by side; they are never blended.

The champion page shows this in a Package section (`ChampionPackage.tsx`) for the build picked
in the Staples section. "Add to new deck" is the only action that changes anything: it merges
the core (with the chosen copy pattern) and any selected options into the new-deck draft on
this device (`packageDraft.ts`), then opens `/decks/new`. A card already in the draft keeps its
larger quantity.

## Reproducible Jin Exia validation (2026-11-08)

Run `node --import tsx pipeline/scripts/validate-jin-exia.ts`. The read-only check uses
published event bundles, the canonical catalog, and the same latest-event/player selection
as Staples. It verifies the published level-3 Jin population and every published exact
core variant against source Main + Material quantities. Sideboard does not complete a core.
The saved result is `docs/experiments/jin-exia-validation.json`.

This check deliberately uses **standard format and the highest champion card**
`Jin, Undying Resolve`, matching the build selector. The earlier November 6 check above
used a different source/scope, so those totals are not directly comparable.

The Exia starter core is Seething Intercession (Main), Berserker Plate (Material),
Mend Flesh (Main), and Enrage (Main). All four catalog entries are verified as Exia.
609 of 1,727 observations contain the complete core, including 168 of 192 in the
last 90 days. In that card order, the leading recent exact variant is **4/1/4/3**
(169 all-time observations, 79 recent); **4/1/4/4** leads all-time (259, 17 recent).
These are tournament observations, not unique players or independent validation samples.
This is descriptive package validation, not a win-rate or causal-strength claim.

The existing champion-page package is a broader ten-card build core, including
non-Exia cards. Its 443 complete observations and all five published exact variants
also match the source lists. The four-card Exia starter is a validated subset for
future element-specific package selection, not a replacement for that broader core.

Champion and build controls use a single column on phones. Unavailable build links
retain their requested scope and show an empty state with an All builds recovery action;
they must not silently broaden to the champion aggregate. Build changes use a transition.

Verification for this follow-up: app/pipeline/shared TypeScript checks passed; the
21 focused staples, community, blended-source, package and draft tests passed.
App lint passed with existing warnings outside these changes. Browser checks at
360px and 1280px covered champion/build controls, 48px targets, no page overflow,
filter-sheet Escape/focus restoration, champion-change build reset, expanded rows,
Main/Material switching, preserved deep links, unavailable-build recovery, and Jin
package display. Loading, empty, error and retry states passed using intercepted
Staples responses. Mobile and desktop screenshots were visually inspected.

### Published Jin Exia package

The level-three Jin build now offers Full build package and EXIA package selections.
The EXIA pool uses the same build population and existing mining thresholds, after
restricting Main/Material cards to catalog EXIA membership. Champion cards and
Sideboard remain excluded. This is a Jin pilot; other builds retain their full package.

The generated pool has six required core cards and eight optional cards. It extends
the original four-card validation with Shuang Ji of Sacrifice and Relentless Outburst:
528 complete observations, including 163 of 192 recent observations. Exact variants
are recomputed over these six cards; the earlier four-card counts remain a separate
experiment. Optional additions are user choices, not part of an observed core variant.

The packageElement URL parameter selects the pool. Each pool retains its variant and
optional selections while switching; changing builds starts a new selection. Package
links and new-deck drafts include the element in their title. The read-only Jin
validation checks both published pools against source observations.

Verification: app, pipeline, and shared typechecks passed; focused lint and six
package mining/draft tests passed. Source validation checks all published Jin
variants. Browser checks at 360px and 1280px covered pool switching, keyboard
focus, retained variant choices, 48px buttons, overflow, draft creation, and
unavailable-selection recovery. Loading, error, and empty states were exercised.
Native phone keyboards and production deployment were not tested.

### Element package rollout — November 9, 2026

Element packages now cover every qualifying specific champion build. Candidates
come from catalog elements on observed Main/Material cards (including NORM and
multi-element membership), rather than assuming the highest champion card lists
every element the build plays. Aggregate “All builds” cohorts keep full packages.

Each element pool retains the entire build population, including decks with no
cards in that element. Existing minimums and ranking remain unchanged: 100 build
observations, recent basis at 30 recent observations, 75% core inclusion, at least
two core cards and 25 complete observations. Options require 25% inclusion.
Sideboard and champion cards remain excluded. Unsupported pools are not published.
Pool ordering is deterministic, with the full build first and elements alphabetical.

Run `node --import tsx pipeline/scripts/validate-champion-packages.ts` after the
targeted package rebuild. This read-only audit checks regeneration completeness,
unique identities, catalog element membership, population denominators, inclusion
rates, usual quantities, complete-core counts, and independently enumerated exact
variants against source event observations. It checks full packages as well as
element packages. No network crawl is needed.

The November 8 source snapshot validates 126 packages, including 75 element
packages across 38 builds and 19 champions, with 541 exact variants checked.
See `docs/experiments/champion-element-packages-validation.json`. New event
backfills are included; historical pilot counts may therefore differ. The rebuild
updates only the package artifact and its manifest generation.

Rollout verification: pipeline typecheck, seven focused mining/draft tests, and the
full source audit passed. Merlin Kingslayer, Rai Storm Seer, and Diana Moonpiercer
passed 360px/1280px browser checks for URL selection, pool switching, keyboard focus,
48px pool controls, overflow, and package-to-draft flow. Loading/error/empty handling
is unchanged from the pilot and was not retested in this data rollout. Native phone
keyboards and production deployment were not exercised.

Release integration (November 9): merged remote release 54878495a and rebuilt from
its November 9 events. All 126 packages pass the source audit, including 75 element
packages across 38 builds / 19 champions and 542 exact variants. Omni artifacts
match remote main byte-for-byte; all unrelated manifest generations are preserved.
