# Draft theme publication assessment

This assessment uses the committed historical draft-theme snapshot. It prioritizes
curation; no candidate is approved for publication by this report. No new minimum
sample threshold is introduced. Current-format legality, results, and independent
build diversity have not been assessed.

## Historical coverage

Decks are unique event/player submissions. Players are distinct identifier values,
not verified people. Returning players appear at multiple events. Repeated lists
can contribute multiple submissions; event coverage does not prove independent
builds or gameplay synergy. All 15 candidates have zero malformed deck IDs.

| Candidate | Decks | Events | Players | Returning players | Largest event | Recommendation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Resonator music | 5 | 5 | 5 | 0 | 1 | Theme review |
| Resonator support | 3 | 3 | 3 | 0 | 1 | Package review |
| DisCorp | 17 | 10 | 16 | 1 | 4 | Theme review |
| DisCorp support | 1 | 1 | 1 | 0 | 1 | Hold draft |
| Elysian Dante | 13 | 11 | 10 | 3 | 2 | Refine coverage |
| Angels | 139 | 104 | 103 | 23 | 6 | Theme review |
| Angel Descent | 8 | 8 | 8 | 0 | 1 | Package review |
| Specters | 489 | 280 | 337 | 86 | 21 | Theme review |
| Specter support | 215 | 161 | 156 | 33 | 6 | Refine first |
| Fairies | 57 | 47 | 43 | 2 | 4 | Theme review |
| Mordred Fairy package | 77 | 59 | 58 | 5 | 4 | Package review |
| Wolves | 1 | 1 | 1 | 0 | 1 | Hold draft |
| Direwolf token package | 78 | 51 | 63 | 13 | 7 | Package review |
| Memorite generation | 162 | 136 | 121 | 26 | 4 | Package review |
| Memorite payoff package | 155 | 131 | 113 | 25 | 4 | Package review |

## Candidate decisions

- **Resonator music:** Small but distributed sample; keep music separate from the support package.
- **Resonator support:** Three matches; check whether the support anchors define the same interaction.
- **DisCorp:** Distributed subtype evidence; retain as an overlapping theme.
- **DisCorp support:** Only one player and event; insufficient recurrence to prioritize publication.
- **Elysian Dante:** Detailed review below identifies four missed Elysian-support lists; refine coverage before publication.
- **Angels:** Broad recurring subtype theme; do not infer a single strategy.
- **Angel Descent:** Eight independent player/event matches; verify Descent interaction in representative lists.
- **Specters:** Broad recurring subtype theme; overlap does not establish one engine.
- **Specter support:** Separate support roles before treating buffs and recursion as one engine.
- **Fairies:** Keep generic Fairy theme distinct from the Mordred package.
- **Mordred Fairy package:** Check overlap with existing Luxem Mordred before creating another archetype.
- **Wolves:** Only one player and event; keep separate from the recurring token package.
- **Direwolf token package:** Recurring named pair; assess as a package, not a standalone Wolf archetype.
- **Memorite generation:** Preserve the Material Vassal gate and distinguish generation from payoff.
- **Memorite payoff package:** Review individual payoffs; generation overlap is substantial and counts are not additive.

## Publication work remaining

Elysian Dante now has a detailed review below. Compare the proposed coverage
refinement with the existing rule and record a publication decision after testing
its boundaries.
Then review recurring packages (Mordred Fairy, Direwolf tokens, Memorite) and the
broader subtype themes. Resonator remains a useful early theme candidate despite
its small historical sample. Specter support needs a narrower definition first.

Keep all accepted themes/packages overlapping rather than forcing them into
mutually exclusive archetypes. Preserve section and distinct-name constraints;
the existing production reference-rule format cannot represent these rules
without extension. Do not translate them into looser card-presence rules.

The review page currently shows membership, paths, and overlaps. Recurrence
counts are available in the evidence snapshot and this report; they are not yet
shown on the page. Membership remains unchanged from the preceding snapshot.

## Elysian Dante detailed review

**Decision: refine before publication.** Keep the existing draft detector unchanged
as the comparison baseline. The evidence supports an Elysian support theme within
Hematic Overdrive Dante, but does not yet establish a distinct standalone strategy
or adequate coverage for the name. Do not promote it into the accepted reference
archetypes yet.

Reproduce the supporting artifact with
`node --import tsx pipeline/scripts/review-elysian-dante.ts`.
`data/reference/elysian-dante-review.json` contains input hashes, the tested rule,
all 13 matching Main/Material lists, exact-list signatures, catalog text, and
reference/material/cluster intersections. The detector runs again from source;
this review does not depend on a possibly stale draft-theme snapshot.

### Paths and representative lists

| Group | Decks | Distinct Main/Material lists | Representative |
| --- | ---: | ---: | --- |
| Direct-ally path only | 4 | 4 | `61722:12639` |
| Generator/support path only | 6 | 6 | `61722:19534` |
| Both paths | 3 | 3 | `61285:21866` |

All 13 exact lists differ, including quantities and section placement. This does
not mean 13 independent strategies. “Path only” describes rule membership, not
absence of the other mechanism: `61722:12639` includes Gencode Womb but lacks the
named support anchor; `61722:19534` includes two distinct Elysian allies but falls
below the direct path's three-name threshold. The both-path example has three
Elysian allies, Institute, Womb, and Venous Core. The first two examples use Wind;
the both-path example uses Water. The evidence therefore supports overlapping
methods of supplying Elysian objects, rather than mutually exclusive variants.

### Catalog-supported common plan

Hematic Overdrive's end-phase condition consumes an Elysian object or an Elysian
card from hand/memory. Direct allies provide objects and Elysian Aura; the latter
raises the effective level for Aenean Spell activation/resolution and does not
stack. Institute's On Destroy text summons a Test Subject; Womb conditionally
summons one if no Elysian object is controlled, otherwise drawing into memory.
Do not treat either card's presence as proof a token was successfully produced.

The support anchors serve different roles. Venous Core requires sacrificing an
Elysian ally to materialize, grants Aura and life, and conditionally protects
Aenean activations. Rhesus scales damage with Elysian objects. Lesser Boon grants
an empower ability and graveyard recovery. These support the family interpretation,
but are not interchangeable combo steps or proof of a single win condition.
The cached catalog marks Lesser Boon with `STANDARD.limit: 0`; none of the 13
matched identities includes it. This is a snapshot observation, not verification
of today's legality. Current legality and playable sequences remain unassessed.

### Existing coverage and missed lists

All 13 matches belong to the existing **Dante, Hematic Overdrive** Material
archetype (`544pen`), which contains 18 submissions. Two also match the unreviewed
**Exia** reference (`fractal-exia`): `62266:31561` and `62484:31561`. None intersects
a current build cluster. These are intersections of the recorded snapshots, not
evidence that Exia is a parent strategy or that the candidate is new to the game.

Of the five unmatched Material-archetype submissions, four have two distinct
Elysian allies (Aspirant and Embryonic Hemosynth) plus Epicurean Institute:
`61723:568`, `64530:24268`, `64888:13238`, and `64922:21154`. Three also have Womb.
They lack the current named support anchors and fail the three-ally threshold.
This exposes a coverage gap for a broad Elysian-support label. The fifth,
`64701:14399`, has no Elysian cards or either named generator in its identity.

Next, compare a two-ally-plus-generator alternative against the unchanged rule,
including negative fixtures, before deciding whether to rename this as an
Elysian Dante theme or retain a narrower archetype. Preserve the Material Dante
gate, Main-only ally counting, distinct-name requirements, and sideboard exclusion.
Production rule extension should follow that decision rather than freezing an
under-reviewed definition into the publication format.

### Broader-rule comparison

The comparison now retains both baseline paths and adds a third: Material
Hematic Overdrive, at least two distinct Main Elysian allies, and Institute or
Womb in Main/Material. The full eligible population produces 17 matches: all 13
baseline matches plus exactly the four missed lists above. No baseline match is
removed, and `64701:14399` remains excluded. This is coverage of 17 of the 18
recorded Hematic Overdrive submissions, not a precision estimate or win-rate claim.

**Curation decision: treat the broader candidate as an Elysian Dante theme.**
The additional path captures the documented support family without requiring a
named payoff. It does not establish a standalone strategy or an executable combo.
The comparison-only proposal is stored separately from the default detector;
existing draft-page counts and production classification remain unchanged.

The version-2 review artifact records the proposed definition, all qualifying
witnesses, retained/added/removed IDs, and recurrence. Tests cover both generator
alternatives, missing requirements, repeated copies, Sideboard, wrong champion
and ally sections, and absent/non-ally catalog entries. An end-to-end fixture
locks the exact four additions against the current historical inputs.

Next implement section-aware, distinct-name and catalog-subtype requirements in
the curated publication path, with backward compatibility for existing rules.
Then apply this reviewed theme definition and regenerate its visible evidence.
Other draft families still require their own publication decisions; this result
must not automatically promote all 15 candidates.

### Publication matcher foundation

Implemented a shared section-aware matcher for draft detection and curated evaluation, with exact historical parity for all 17 broader Dante matches. Boundary tests cover misplaced champions, repeated copies and duplicate lines, zero quantities, Sideboard substitution, missing section evidence, and empty paths. Existing reference rules retain their semantics.

Publication remains pending: add validated import/export support and visible rule descriptions before accepting section-aware definitions, then publish the reviewed theme with regenerated evidence. The import boundary rejects the new internal field until that interface work is complete.

The shared matcher now validates complete requirement paths before evaluation. Invalid sections, non-positive or non-integer minima, empty filters, missing selectors, and unknown condition fields fail closed for the entire rule. Regression coverage preserves the reviewed 17-deck membership. Import remains gated until the review interface displays these conditions.


### Curator import and requirement display

Validated section-aware paths now round-trip through strategy backups, including drafts and undo. Malformed paths reject the complete backup. The curator displays every alternative path and its required conditions in both evidence and the editor, with distinct-name counts and section scope explicit. Imported paths are read-only in the editor and preserved by other edits. Browser evaluation now retains catalog subtypes across the worker boundary.

Verification: four focused matcher/import tests pass, including all 17 reviewed Dante matches. App typecheck passes; lint reports six existing warnings. A local test import displayed all three paths at 390px and 1280px without page overflow; keyboard disclosure and 48px review buttons checked. Browser evaluation returned 17 matches and rejected 64701:14399. Temporary import was undone. Empty search verified; failure/retry and storage-write failure states were not simulated in the browser. Publication of the reviewed theme and regenerated evidence remains pending.

### Reviewed theme artifact

Elysian Dante now has an explicit reviewed-theme definition (`elysian-dante`) and a separate `data/reference/reviewed-theme-evidence.json` artifact. Its three paths reproduce exactly the 13 retained and four added decks from the review, with no removed decks. The artifact records source and definition hashes, witnesses, recurrence, and path counts. Regenerate it with `node --import tsx pipeline/scripts/rebuild-reviewed-themes.ts`; replacement is atomic and repeat runs are deterministic.

The shared detector now supports reviewed definitions while preserving the complete draft evidence contract. All 15 draft definitions and their historical evidence remain unchanged. Reviewed themes do not enter strategy, archetype, or combo counts. This is the data publication step only: the app still displays the baseline draft review. Next connect the separate reviewed artifact to a clearly labeled theme view, then verify mobile, desktop, and failure states.


### Reviewed theme display

The Themes page now defaults to Reviewed themes, displaying Elysian Dante and its
17 matching decks. Draft candidates remain in a separate tab with all 15 baseline
definitions, including the earlier 13-deck Dante rule. Each tab retains its search
and mounted review state. Overlap language explicitly limits comparisons to that
snapshot; reviewed theme membership does not change archetype or combo counts.

Verification: app typecheck passed; browser checks at 390px and 1280px found no
horizontal overflow. The new tabs, search, and disclosures measure 48px high.
Keyboard arrow switching and Enter expansion worked; empty search, preserved
search across tabs, reviewed rules, and matching deck links were checked. Loading
and fetch failure/retry remain implemented independently per tab but were not
simulated in this pass; text zoom was not tested.

## Resonator music publication decision

**Decision: publish as an overlapping reviewed theme, retaining the draft baseline.**
The rule requires three distinct Main-deck Resonator allies and two distinct
Main-deck cards with Harmony or Melody subtype. Either music subtype suffices;
it does not require one of each. Copies, Material cards, and Sideboard cards
cannot substitute for those distinct Main-deck names. No champion gate is added.

Reproduce the review with `node --import tsx pipeline/scripts/review-resonator.ts`.
`data/reference/resonator-review.json` records source hashes, exact lists,
section/quantity signatures, catalog mechanics, witnesses, and two relaxed-rule
comparisons. The five matches are `61549:4571`, `61722:25782`, `62146:25312`,
`62616:19726`, and `64329:9180`: five events, five player IDs, and five distinct
Main/Material lists. This small historical sample does not establish independent
strategies, current legality, or competitive strength.

The catalog supports a common music interaction. Music Aficionado discounts
itself after a Harmony or Melody activation; Musical Curator searches for either
subtype; ZENA can use either subtype in the graveyard to pay reserve cost.
Fanclub Leader buffs Resonator allies after music activations, Performance
Enthusiast gains its conditional buff counter, and Tribute Singer enables a
conditional discounted music activation. These are different supporting roles,
not a verified sequence or a single win condition.

The first two lists use three Resonator names, while the other lists use five or
six. Music ranges from two to eight distinct names. Music classification follows
catalog subtypes rather than an Action-only filter: Brackish Lutist is included
when present. Reducing the ally minimum to two while retaining two music names,
or reducing music to one while retaining three allies, adds no historical decks.
This supports retaining the existing conservative boundary, but does not prove
complete coverage of every possible Resonator build. Lists below both minima
were not part of these one-condition comparisons.

All three draft Resonator-support matches are contained in the five music
matches. Keep that package draft pending its own role review; its overlap does
not justify another archetype or automatic package publication.

The reviewed artifact now contains Elysian Dante (17 decks) and Resonator music
(5 decks). Existing draft definitions, archetype counts, and combo counts remain
unchanged. The existing Themes view consumes the regenerated reviewed artifact.
Regression checks lock exact historical membership and reject missing names,
extra copies, duplicate lines, and Material/Sideboard substitutions. No UI code
changed in this publication; browser layout and failure states were not retested.
