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
playability, a Level Locked requirement, or the level reached in a game. The champion-decks
filter is separate. Filters, section, period, format, and sorting round-trip through the URL.
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
