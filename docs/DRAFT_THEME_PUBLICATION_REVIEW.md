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


## DisCorp publication decision

**Decision: publish DisCorp as an overlapping reviewed theme.** Retain the
baseline of three distinct Main-deck DisCorp allies, without a champion gate.
Material, Sideboard, duplicate lines, and extra copies cannot satisfy missing
names. DisCorp Domains and Items do not count as allies. This is tribal membership,
not a new strategy, a verified combo sequence, or a claim of competitive strength.

Reproduce with `node --import tsx pipeline/scripts/review-discorp.ts`.
`data/reference/discorp-review.json` preserves source hashes, exact positive
Main/Material lists, section/quantity signatures, witnesses, catalog evidence,
and comparisons at two and four distinct allies. The baseline contains 17
matching decks with 17 distinct lists, across 10 events and 16 player IDs.
One player returns; the largest event contributes four matches.

The cached mechanics support overlapping Powercell and Automaton interactions:
Cellforger Droid creates Powercells, Overcharged Droid benefits from controlling
them, Sinon sacrifices them for its cascade ability, and Virgil gains conditional
stats from them. Haze Droid contributes stealth without a direct tribal payoff.
Tower of Dis specifically buffs DisCorp Automaton allies, not every DisCorp ally.
These roles justify a broad tribe label without implying that every match uses
one engine or that every card is itself a tribal payoff.

Two allies would add ten lists: six Haze Droid/Virgil pairs, two Shieldroid/Virgil
pairs, Acheron Express Officer/Virgil, and Acheron Express Officer/Overcharged Droid.
Retain three as a conservative coverage boundary; those pairs do not alone
establish a dedicated tribal plan. Four allies would retain 11 and omit six
baseline lists. Neither comparison establishes an optimal threshold or exhaustive
coverage; lists below two allies were not inspected by this review.

Only `64888:17615` meets the existing support-package rule, through Tower of Dis.
Keep DisCorp support draft. Cell Reactor appears in two other baseline lists and
supports Automatons rather than DisCorp specifically; it is recorded for review,
not silently added to the package rule. Future Powercell package review should
separately assess generators and consumers instead of equating tribe and engine.

The reviewed artifact now contains Elysian Dante (17), Resonator music (5), and
DisCorp (17). Draft definitions and archetype/combo counts remain unchanged.
No UI code changed; browser layout and loading/error states were not retested.


## Angels publication decision — 2026-10-04

Publish **Angels** as a reviewed theme requiring **three distinct positive-quantity Main-deck cards with both ALLY type and ANGEL subtype**. No champion or named support card is required. Material and Sideboard allies cannot satisfy this requirement. This is a tribal membership label, not a claim of a single strategy, a working combo, strength, or current legality.

`pipeline/scripts/review-angels.ts` reproduces the decision against the source-hashed index and cached catalog. `data/reference/angel-review.json` retains exact membership witnesses, threshold comparisons, full positive Main/Material lists and their signatures, and relevant catalog records. Duplicate deck IDs use the detector's last-record policy.

- Baseline: 139 submissions, 104 events, 103 players, 23 returning players; largest event contributes six submissions; no unknown identities.
- Those submissions represent 115 distinct positive Main/Material list signatures, rather than 139 unique builds.
- Two distinct Main Angel allies retains all 139 and adds 771 submissions. Four retains only 29 and adds none. Three is the conservative curation boundary retained here, not a statistically proven optimum.
- The most common exact Angel subset is Angel Attendant, Benediction Angel, and Fount Seraphim (56 submissions). Other combinations span multiple classes and elements; no champion gate is justified by this tribal definition.

Cached card text supports a shared Imbue theme: Angel Attendant gains intercept when imbued and draws on death; Benediction Angel draws into memory and recovers two on its imbued entry; Fount Seraphim has taunt and, when imbued on entry, temporarily makes opposing allies enter rested. Archangels have different element-specific Imbue conditions. Membership does not check whether a deck can reliably satisfy those conditions. Triskit is also an Angel ally in the catalog despite lacking Imbue, so Imbue is not part of the subtype definition.

Angelic Channeling is an Angel **ACTION**, and Seraphic Legion's Descent is an Angel **PHANTASIA**: neither counts as an ally. Descent searches for and banishes Angel allies, replaces cards banished from hand/memory with memory draws, and has a level-three-or-higher paid rest ability permitting activation, until end of turn, of a target card banished by it. Its eight matching submissions are a subset of the tribal baseline. **Angel Descent remains draft** pending its own package review; the broad Angels label does not require it or assert that its setup is available.

Publication adds a separate reviewed definition while retaining the original draft and comparison evidence. Regression coverage checks exact historical membership, saved-artifact parity, distinct-name counting, zero quantities, section boundaries, and non-ally exclusions. No UI code changed; browser checks were not repeated for this data publication.


## Specters publication decision — 2026-10-04

Publish **Specters** as a reviewed theme requiring **three distinct positive-quantity Main-deck cards with both ALLY type and SPECTER subtype**. No champion or named support is required. Material and Sideboard cards cannot satisfy this requirement. This labels tribal membership, without asserting a single strategy, a working combo, strength, or current legality.

`pipeline/scripts/review-specters.ts` reproduces the source-bound review. `data/reference/specter-review.json` retains membership witnesses, threshold comparisons, full positive Main/Material lists and signatures, and relevant cached catalog records. Duplicate deck IDs follow the detector's last-record policy.

- Baseline: 489 submissions across 280 events and 337 players, including 86 returning players; largest event contributes 21 submissions; no unknown identities.
- The baseline contains 448 distinct positive Main/Material list signatures.
- Two distinct Main Specter allies retains all 489 and adds 2,373 submissions. Four retains 182 and adds none. Three remains a conservative curation boundary, not a statistically proven optimum.
- The most common exact Specter subset is Evercurrent Raider, Liminal Guide, and Unyielding Wraithguard (169 submissions). Incinerated Templar, Liminal Guide, and Vengeful Paramour appears in 34; Evercurrent Raider, Liminal Guide, and Vengeful Paramour appears in 29.

Cached mechanics support overlapping graveyard and ephemeral interactions. Liminal Guide returns from the graveyard on champion level-up, becomes ephemeral, and draws a card. Unyielding Wraithguard has taunt and returns on death as ephemeral. Veiled Oracle becomes ephemeral on entry and glimpses three. Lawsur instead supplies power on entry based on other Specter allies and grants awake Specter allies stealth. These effects do not justify imposing one champion or requiring every member to have Ephemerate.

**Specter support remains draft.** Its 215 matches are a subset of the tribal baseline, but its anchors describe different roles: Incinerated Templar conditionally reanimates a reserve-cost-three-or-less Specter ally under Class Bonus; Lawsur supplies tribal combat support; Ticket to the Afterlife discounts Specter graveyard activations and activated abilities; Distort Reality has Alice-gated mass graveyard setup and field deployment. Within the baseline, those anchors appear in 112, 28, 105, and 11 identities respectively, with overlap. Their presence alone does not establish an executable engine or satisfy their conditions.

Phantasmagoria is a **MASTERY** card in the catalog and appears in none of the reviewed Main/Material identities. The identity-only detector does not establish Mastery availability; this absence must not be interpreted as evidence that players lack access to it. A later support review should separate combat payoffs, graveyard enablers, and champion/Mastery-dependent packages before promotion. Distort Reality and Ticket to the Afterlife are non-ally Specter cards and cannot count toward the tribal ally threshold.

Publication adds the fifth reviewed theme and preserves the original drafts. Regression checks cover exact historical membership, saved-artifact parity, threshold comparisons, distinct-name counting, zero quantities, section boundaries, and non-ally exclusions. No UI code changed; browser checks were not repeated for this data publication.

## Remaining ten candidates — completed review, 2026-10-04

This decision supersedes earlier pending-review notes for these ten candidates. Five publish as **reviewed membership themes**; three require narrower definitions before publication; two remain on hold for evidence. Reviewed membership does not assert an executable combo, competitive strength, or current legality. Original drafts remain available for comparison. No accepted strategy or combo-guide definitions change.

| Candidate | Submissions | Distinct list signatures | Events / players | Decision |
|---|---:|---:|---:|---|
| Fairies | 57 | 42 | 47 / 43 | Publish |
| Mordred Fairy package | 77 | 61 | 59 / 58 | Publish |
| Direwolf token package | 78 | 75 | 51 / 63 | Publish |
| Memorite generation | 162 | 154 | 136 / 121 | Publish |
| Angel Descent | 8 | 8 | 8 / 8 | Publish |
| Resonator support | 3 | 3 | 3 / 3 | Defer separate publication; refine music requirement |
| Specter support | 215 | 200 | 161 / 156 | Defer umbrella; separate support roles |
| Memorite payoff package | 155 | 151 | 131 / 113 | Defer umbrella; separate sacrifice and sheen payoffs |
| Wolves | 1 | 1 | 1 / 1 | Hold for more evidence |
| DisCorp support | 1 | 1 | 1 / 1 | Hold for more evidence and narrower roles |

### Evidence and reproducibility

Run `node --import tsx pipeline/scripts/review-remaining-themes.ts`. The source-hashed `data/reference/remaining-theme-review.json` records all ten definitions and exact membership witnesses, recurrence and pairwise overlap, distinct positive Main/Material list signatures, individual-anchor and removed-condition comparisons, threshold sensitivity, relevant cached card records, and overlap with the imported Luxem Mordred rule. Lists can be recovered by deck ID from the hashed index; they are not duplicated into this artifact. Duplicate deck IDs use the shared detector's last-record policy. Sideboard and nonpositive quantities are excluded. Counts overlap; signatures identify identical registered Main/Material contents, not independently developed strategies. Comparison thresholds are sensitivity checks, not fitted or proven optimal thresholds. All ten have zero unknown event/player identities.

### Fairies: publish

Require three distinct positive Main cards with ALLY type and FAIRY subtype, without a champion gate. Two allies selects 107 submissions (50 additional); four selects 35. Preserve the three-name tribal boundary used for the other reviewed tribes. Cached Fairies share stealth but have different entry effects: Dream Fairy returns an opposing ally to memory, Snow Fairy rests and suppresses an ally's wake-up, Spark Fairy supplies delayed damage, and Warrior of the Fae Realm stores a Sword attack for a later turn. Gildas has a Mordred-specific prevention ability; that restriction does not apply to the broad Fairy subtype.

The broad label overlaps the Mordred package in 56 submissions. One Fairy submission falls outside it, while 21 Mordred package submissions have only two qualifying Fairy names. Neither definition subsumes the other.

### Mordred Fairy package: publish

Require a Material CHAMPION whose name starts with `Mordred,`, two distinct Main Fairy allies, and Main Gildas, Faesworn Monarch. Gildas itself counts as one of the two Fairies. Its Mordred Bonus ability pays two and rests to prevent the next four damage to a target unit; controlling another Fairy reduces the resource payment by two. Gildas also has stealth and vigor. Membership establishes the pieces, not simultaneous field presence, ability timing, or successful prevention.

Removing the champion gate adds four submissions. Reducing the Fairy minimum to one adds two; raising it to three retains 56 of 77. Removing the Gildas anchor adds none in this snapshot, but keep the anchor because it explains the package and prevents future false positives. The imported **Luxem Mordred** rule matches 92 submissions using Luminescent Slash in identity, and overlaps this package in 68. Thus nine package submissions lack that imported label, and 24 imported-label submissions lack this package. Preserve both independently; this is a comparison with the imported rule, not a claim that the rule completely describes Luxem Mordred strategy.

### Direwolf token package: publish

Require both Direwolf Alpha and Dire Requiem as distinct positive Main names. Requiem summons a Direwolf and can summon another by banishing a fire card from the graveyard under Class Bonus. Alpha has Pride 2, can also summon a Direwolf under Class Bonus by banishing a fire graveyard card, and gives other Wolf objects +1 power under Class Bonus at level two or higher. The Direwolf token sacrifices itself at the beginning of the end phase. The package label does not imply these conditional effects are always enabled or that tokens persist.

Alpha alone selects 93 submissions; Requiem alone selects 557; either selects 572. Both selects 78, so retain both anchors. Generated tokens do not need to appear in the registered deck. Only one of the 78 also satisfies the three-name Wolves tribe; broad tribal counting is unsuitable as the token-package gate.

### Memorite generation: publish

Preserve Material Merlin, Memorite Vassal plus two distinct positive Main generators from the existing eight-card pool. Each generator's cached text summons a Memorite object; some optional or extra effects depend on Prepare, Imbue, Merlin Bonus, or sheen. Vassal grants Fractured Memories on entry and can pay two to summon a Memorite Blade. Material membership establishes access to the champion card, not that its entry has happened.

Dropping Vassal adds one submission. Retain the champion requirement to identify the reviewed Merlin package, without claiming Memorite generation is impossible elsewhere. One generator selects 312 submissions, two selects 162, and three selects 54. Vassal alone selects 592. Two generators distinguish repeated generation options from incidental inclusion. Protect Her At All Costs appears in 159 baseline submissions and Shardwing Searchlight in 138; these counts overlap. The full generator pool is alternatives, not eight mandatory cards.

### Angel Descent: publish

Preserve three distinct Main Angel allies plus Seraphic Legion's Descent in positive Main/Material identity. Descent is a PHANTASIA, not an ally. Its entry searches the deck for Angel allies and banishes them along with any selected Angel allies in hand, memory, and/or graveyard. It draws into memory for cards banished from hand and memory this way. At level three or higher its paid rest ability permits activation, until end of turn, of a target card banished by it. The text does not require that the card was banished that same turn.

Eight submissions satisfy the package; two allies selects 11 and four selects five. Descent without the ally threshold also selects 11. Preserve three for a substantial Angel pool, while recognizing that two allies can still interact with Descent. This is an access-and-pool label; it does not verify level, resources, specific banished targets, or activation legality at a given game state.

### Resonator support: defer separate publication

All three matches include each of Fanclub Leader, Forese, Fervid Cantor, and ResonanTech Module. Changing the ally threshold to two or four leaves the same three. This snapshot cannot distinguish which support anchor defines the package. Fanclub buffs Resonators when music is activated; Forese can rest on music activation to scavenge a qualifying Resonator onto the field; Module discounts the next Harmony or Melody and glimpses. The draft requires none of that music, so its OR-of-support rule can admit unsupported future lists. Existing Resonator music remains the published label. Follow-up: evaluate a music-required support subset and individual roles with additional lists; do not infer that three observed lists validate the broad OR rule.

### Specter support: defer umbrella publication

The 215 submissions contain 200 list signatures. Individually requiring the draft support anchors yields 112 Templar, 28 Lawsur, 105 Ticket, 11 Distort Reality, and zero Phantasmagoria matches, with overlap. Lowering the tribe minimum to two selects 244; raising it to four selects 152. Removing the tribe requirement selects 255.

These anchors describe different mechanisms: conditional reanimation (Templar), combat support (Lawsur), graveyard-cost reduction (Ticket), and Alice-dependent setup/deployment (Distort Reality). Phantasmagoria is a Mastery, and identity absence does not determine access. Do not publish one engine from this union. Follow-up: separate reanimation, combat, and graveyard-activation packages, then test their class/champion requirements and target pools. The existing Specters membership theme remains published.

### Memorite payoff package: defer umbrella publication

Of 155 submissions, 149 contain Shardforged Blade, nine Facet Together, and eight Crystallized Anthem, with overlap. Only 108 satisfy the stricter generation package; 47 do not. Removing the generator requirement selects 170, while generator presence without any payoff selects 429.

Blade can sacrifice a Memorite to pay one memory cost and has an additional Merlin Bonus against sheen-marked allies. Facet Together is opponent-turn-only, sacrifices Memorites to increase a controlled weapon's power, and adds sheen to Fractured Memories. Anthem prevents damage, adds sheen when prevention occurs, and later scales Memorite power with that Mastery's sheen. The current draft checks neither a weapon for Facet nor Mastery access for the sheen payoffs. Follow-up: review generator-plus-Blade separately, require a weapon pool for Facet, and establish Mastery access for Anthem. Do not treat a generator plus any payoff as one validated engine.

### Wolves and DisCorp support: hold

Wolves has one submission (`22485:15045`), versus six at two allies and zero at four. Cached Wolves include beasts and DisCorp Automatons with different mechanics; subtype alone does not establish a shared engine. Keep the candidate unpublished until additional distinct lists support a broad tribe. The reviewed Direwolf package already covers the recurring token interaction.

DisCorp support has one submission (`64888:17615`), which uses Tower of Dis. Acheron Express Officer has zero matches under the draft rule. Two DisCorp allies would select three submissions; four still selects one. Tower buffs DisCorp Automaton allies; Officer's Class Bonus grants another DisCorp ally Ranged 3 on entry. These are distinct support roles with too little evidence for the OR rule. Retain broad DisCorp as reviewed; reconsider support after more qualifying lists and role-specific checks.

### Completion and verification scope

All 15 original candidates now have a publication disposition: ten reviewed definitions, three deferred for refinement, and two held for additional evidence. The ten-candidate review batch is complete; the deferred follow-ups are explicit future work, not published engines. Historical evidence is source-bound and does not establish current-format legality. Regression tests cover source hashes, exact historical memberships, publication parity, and missing/duplicate/zero/Sideboard/wrong-section boundaries for every new definition. No UI code changes in this batch; mobile and desktop browser checks were not repeated for this data publication.

### Follow-up refinements completed (2026-10-04)

The three deferred families have now been split into eleven explicit reviewed
membership packages. Wolves and the two DisCorp support roles were rechecked
against a newer deck snapshot and remain held. See
[Theme refinement review](THEME_REFINEMENT_REVIEW.md) for current counts, rules,
publication decisions, sensitivity checks, and reopening criteria. Earlier counts
in this document describe their original snapshots.
