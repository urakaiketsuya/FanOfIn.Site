# Theme refinement review — 2026-10-04

All five follow-up work items have been assessed. Eleven narrower membership labels are approved; Wolves and the two DisCorp support roles remain evidence holds. These labels describe registered card packages, not executable combos, strategic strength, format legality, or guaranteed board states. Existing strategy classification and combo guides are unchanged.

## Evidence and decisions

The current cached deck index is newer than the original ten-candidate review. Counts below come from `data/reference/theme-refinement-review.json`, which records source and definition hashes, deck IDs, card witnesses, list signatures, recurrence, overlap, and requirement-removal/threshold comparisons. Historical review artifacts remain historical. Publication uses an explicit allowlist in `shared/src/reviewedThemes.ts`.

| Work item / package | Submissions | Distinct lists | Decision |
| --- | ---: | ---: | --- |
| Memorite Blade payment | 150 | 146 | Publish |
| Memorite Facet weapon package | 9 | 9 | Publish |
| Memorite Anthem package | 8 | 8 | Publish |
| Resonator Fanclub music | 4 | 4 | Publish |
| Resonator Forese music | 4 | 4 | Publish |
| Resonator Module music | 4 | 4 | Publish |
| Specter Templar package | 110 | 104 | Publish |
| Specter Lawsur combat | 28 | 27 | Publish |
| Specter Ticket graveyard support | 105 | 96 | Publish |
| Alice Distort Specters | 11 | 11 | Publish |
| Alice Phantasmagoria Specters | 206 | 191 | Publish |
| Wolves | 1 | 1 | Hold |
| DisCorp Tower Automaton package | 2 | 2 | Hold |
| DisCorp Officer package | 0 | 0 | Hold |

Counts overlap and must not be added. Publication is a curated decision based on coherent card interactions and independent historical lists, not an automatic minimum-count rule.

## 1. Memorite payoffs

All three require at least one of the existing eight Main Memorite generators. Blade additionally requires Material Shardforged Blade: its Memorite sacrifice pays one memory cost. This label does not require Merlin because the payment effect is unconditional; its separate Merlin attack bonus is not asserted. Removing the generator increases coverage from 150 to 164 submissions.

Facet requires Main Facet Together and an identity WEAPON. Its opponent-turn restriction, sacrificing Memorites, and controlling the target weapon are game-state requirements, not inferred from registration. All nine observed lists already include both generator and weapon, but both gates remain to prevent future unsupported matches. Fractured Memories is not necessary for the weapon-buff portion, so this label does not promise its additional sheen effect.

Anthem requires Main Crystallized Anthem and Material Merlin, Memorite Vassal, whose entry grants Fractured Memories. All eight observed lists include this access. The rule does not establish damage prevention, accumulated sheen, or a future recollection payoff. Mastery access is represented by its granting champion rather than requiring an unregistered mastery card.

## 2. Resonator support

Each role requires three distinct Main Resonator allies and two distinct Main Harmony/Melody cards. Fanclub adds Main Fanclub Leader for the music-triggered ally power boost. Forese adds Main Forese and a named eligible non-advanced Resonator ally costing at most three; the five-card target pool was checked against cached costs and elements. Module adds Material ResonanTech Module for its music discount and glimpse effect.

The same four lists, from four events and four players, satisfy all three packages. These are overlapping support roles within Resonator music, not evidence for three independent archetypes. Removing the music gate currently adds no lists, but would permit future mismatches and is therefore rejected. Three- versus four-ally and one- versus three-song sensitivity checks retain these four lists. Presence cannot prove Forese's scavenge succeeds or Module's materialization discount applies on the field.

## 3. Specter support

All five roles require three distinct Main Specter allies.

- Templar adds Main Incinerated Templar, another named Specter ally costing at most three, and a Material Cleric or Warrior champion. The target pool conservatively excludes Templar itself; it does not attempt to prove a spare copy is in the graveyard. The class gate removes two lists from the ungated 112. It establishes registered class access, not the active champion or timing.
- Lawsur adds Main Lawsur, the Carpenter. Its ally-count power and awake-Specter stealth effects form the combat package.
- Ticket adds Material Ticket to the Afterlife. This is graveyard support membership; it does not promise an activatable card in the graveyard or the Alice recovery bonus.
- Distort adds Main Distort Reality and a Material Alice champion. Its Alice-dependent effect returns Specter cards within a total reserve-cost budget and makes them ephemeral; registration cannot establish execution or available resources.
- Phantasmagoria adds Material Alice, Distorted Queen, whose entry grants the mastery. This corrects the earlier direct-mastery screen, which matched zero lists. The 206 matches are mastery-access memberships, not evidence that the mastery has been gained or its counters accumulated in a game.

Three-to-four-ally tightening retains 66 Templar, 25 Lawsur, 89 Ticket, 11 Distort, and 131 Phantasmagoria lists. This sensitivity is recorded, not presented as proof of optimal thresholds.

## 4. Wolves

The current snapshot still has only one three-Wolf list. Lowering to two distinct Main Wolf allies yields seven; raising to four yields zero. The pool mixes different Wolf packages and does not justify a single new supported interaction. Keep the already published Direwolf Alpha + Dire Requiem package. Reopen broad Wolves after additional independent three-Wolf lists allow an interaction-based review; do not lower the threshold merely to increase coverage.

## 5. DisCorp support

Tower now requires three distinct Main allies that are **both** DisCorp and Automaton, plus Main Tower of Dis. The explicit catalog-derived name pool prevents the shared subtype-OR matcher from accidentally accepting either subtype alone. Two lists qualify, each from a separate event and player; both also pass the four-ally threshold. This improves on the previous one-list snapshot but remains sparse evidence.

Officer requires three distinct Main DisCorp allies, Main Acheron Express Officer, and a Material Ranger champion for class access. No lists qualify; lowering to two allies yields two. Keep both roles unpublished. Reopen Tower with additional independent lists and Officer with observed three-ally Ranger packages. Existing broad DisCorp membership remains available.

## Reproduction and limits

Run `node --import tsx pipeline/scripts/review-theme-refinements.ts`, then `node --import tsx pipeline/scripts/rebuild-reviewed-themes.ts`. Counts use positive Main/Material entries only, exclude Sideboard, deduplicate deck IDs with the last entry winning, and use existing material-entry eligibility rules. Lists are hashed from sorted positive Main and Material lines with quantities and section boundaries. Event/player recurrence is separate from list diversity.

All named card mechanics were checked against the cached catalog. No live game-state simulation, current-format legality assessment, or new-data crawl was performed. The five-item follow-up scope is complete; future evidence collection for the held packages is outside this snapshot review.

Validation: 44 relevant tests passed across the combined run and the corrected
historical-fixture rerun; shared and pipeline typechecks passed. Tests cover source
reproduction, publication decisions, catalog target pools, Main/Material boundaries,
Sideboard exclusion, zero quantities, distinct music, class access, weapon access,
and mastery access. No UI code changed; browser checks were not repeated.

## Live frontier follow-up — 2026-10-04

Checked all 39 event IDs from 65347 through the live frontier at 65385 against
the public Omnidex API. The published event index, generated at
2026-10-04T12:14:45.412Z, already reaches 65346; the older local crawl metadata
was therefore not used as the published-data cutoff.

The check found 13 completed events without public decklists, 18 RSVP events,
four started events, two completable events, and two canceled events. The three
events marked for public decklists (65359, 65374, and 65379) are still in RSVP.
No completed event in this range offers public decklists, so there is no new
membership evidence to add. Wolves remains at one observed list, Tower at two,
and Officer at zero in the reviewed snapshot; all three holds remain unchanged.

`data/reference/theme-frontier-check.json` records the check time, published
index hash, range, event statuses, and source links. Its 39 unique consecutive
IDs and status totals were verified against the fetched responses. This is a
bounded frontier check, not a complete data refresh: earlier pending events and
community deck sources were not rechecked. No detector or UI behavior changed.

The defined archetype/theme review initiative remains 100% complete. The next
evidence-gathering step is to refresh earlier pending tournaments and community
deck sources through their existing ingestion workflows, then reassess only
packages with additional independent lists. The amount of useful new evidence
is unknown; this check does not establish that none exists elsewhere.

A subsequent [source refresh](HELD_THEME_SOURCE_REFRESH.md) checked the recent
unpublished tournament range and community decks. It recommends Tower for a
future reviewed-package publication based on additional community evidence;
Wolves and Officer remain holds. The published allowlist is unchanged by that
source-refresh report.
