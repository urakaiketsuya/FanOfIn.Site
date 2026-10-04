# Held-theme source refresh — 2026-10-04

This review supplements the tournament-only theme review with a live tournament
lookback and community deck evidence. Community matches describe registered card
packages; they are not tournament adoption, verified independent people, win-rate
evidence, or proof of format legality.

## Tournament lookback

Rechecked unpublished event IDs in the inclusive 64385–65385 range, the existing
crawler's 1,000-ID lookback distance. All 1,001 IDs are accounted for: 220 already
published completed events were skipped and 781 IDs were checked live. Requests
completed without errors. This is a bounded incremental refresh, not a historical
backfill; earlier events outside the window were not checked.

Using the existing eight-player crawl threshold, three newly completed events supplied 50 public lists: 64792 (18), 64862 (14), and
65039 (18). All 50 passed the existing Material-entry eligibility rule and all
card names resolved against the cached catalog. None matched Wolves, DisCorp
Tower, or DisCorp Officer. The original tournament membership counts therefore
remain one, two, and zero respectively for these packages.

`data/reference/held-tournament-refresh.json` records every checked event, the
encoded new lists, catalog hash, definitions, card witnesses, and review result.
It is supplemental review evidence; the main tournament analytics were not
rebuilt or partially overwritten.

## Community refresh

TCGArchitect completed its incremental refresh after 12 pages, finding 82 new or
updated decks and stopping after three unchanged pages. Complete cached lists
are examined with the same shared theme detector and Main/Material boundaries.
ShoutAtYourDecks discovered 1,011 new links over 64 pages, stopping after three
pages with no new links. All 1,011 metadata records were fetched successfully. Full-list retrieval saved
858 qualifying exports (11 before a resumable restart and 847 through two
disjoint workers using the configured two-browser limit). No newly fetched
export had a count mismatch. Three export controls timed out again on retry and remain unavailable:

- `57df1c05-58bb-4fc9-8b41-89c25e3e06bb`
- `cda3f00f-77e6-42ad-9955-b2f5af9652ba`
- `f551d085-443e-42d1-90c0-6451415df234`

The cache retains all completed work. These three failures remain a coverage
limit; failed exports were not treated as empty decks.

Sleeved could not be refreshed because `SLEEVED_API_KEY` is not configured. No
claim of complete coverage across every community source is made.

The community review artifact preserves each matching full Main/Material list,
its source URL, author handle, cached fetch time, recorded format and confidence, card
witnesses, and a list signature. Signatures aggregate duplicate positive card
lines, canonicalize names through the catalog, and preserve section boundaries.
Sideboard is excluded. Main must contain at least 60 cards, its exported count
must match the source metadata, and source-specific quality filters must pass.
Count mismatches are recorded separately and excluded from the review. Author handles are counted within each source only;
matching handles across sites are not assumed to identify the same person.

Run `node --import tsx pipeline/scripts/review-held-community-themes.ts` to rebuild
`data/reference/held-community-theme-review.json` from those source caches.
A listing refresh does not re-fetch all older cached lists; per-list fetch times
remain visible. Recorded format fields are evidence, not a legality check: for
example, a Wolf list titled “Pantheon Allen(wip)” is recorded as Standard by its
source. Do not silently resolve that conflict from its title.

## Findings and recommendation

| Package | Tournament lists in reviewed snapshot | Community matches | Community distinct lists | Recommendation |
| --- | ---: | ---: | ---: | --- |
| DisCorp Tower Automaton | 2 | 21 | 21 | Ready for reviewed package membership |
| Wolves | 1 | 3 | 3 | Keep broad label on hold |
| DisCorp Officer | 0 | 0 | 0 | Keep on hold |

TCGArchitect contributes one Tower and one Wolf list. ShoutAtYourDecks contributes
20 Tower lists from 17 author handles and two Wolf lists from two handles. These
source-specific handles are not a verified count of independent people. Tower
has seven community records classified Standard and 14 with unknown format;
no legality claim follows from this review.

One Tower community list (`11da0750-df37-4cf6-82c0-127283e069fa` on
ShoutAtYourDecks) exactly matches an existing tournament list after canonicalizing
Main/Material quantities. Across both sources and the two tournament matches,
Tower therefore has 22 distinct lists, not 23. Wolves has no exact cross-source
list duplication in the reviewed matches. Counts are membership evidence, not
competitive results or adoption estimates.

Tower is the next recommended publication change. It requires three distinct
Main allies that are both DisCorp and Automaton, plus Main Tower of Dis. This
catalog-verified interaction now recurs across varied community builds. Promote it only as a
reviewed card package, retaining the distinction between community support and
tournament evidence. The published allowlist remains unchanged in this
source-refresh task.

Broad Wolves remains heterogeneous: the observed lists mix Direwolf, ordinary
Wolf, and Automaton/Wolf cards, including the source-format conflict noted above.
The existing Direwolf token package remains the more specific supported label.
Officer still has no observed three-ally Ranger package; do not lower its gates
to manufacture support.

The community audit covers 652 qualifying TCGArchitect lists (651 eligible under
the Material rule) and 21,781 qualifying ShoutAtYourDecks lists (21,671 eligible).
Fourteen older ShoutAtYourDecks lists fail the Main-count consistency check and
are excluded, with their IDs retained in the artifact. No new mismatch was
introduced by this fetch.

## Validation

The saved tournament lists reproduce the three held-definition results. The
community witnesses reproduce their respective memberships, canonical list
hashes, distinct-list counts, and source-specific author-handle counts. Tests
also verify complete lookback accounting and successful card-name resolution.
All 10 relevant tests passed, along with the pipeline typecheck and a separate
strict typecheck of the review script. No UI changes are part of this review.

The original archetype/theme review scope remains 100% complete. The expanded
source-refresh follow-up is approximately 75% complete by source coverage:
Omnidex, TCGArchitect, and ShoutAtYourDecks were checked, with the three unavailable
exports noted above; Sleeved remains blocked on its API key. Further coverage
and the usefulness of any missing lists are unknown. The next implementation
item is publishing Tower as a reviewed package; Wolves and Officer remain holds.
