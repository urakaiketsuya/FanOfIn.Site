# Volcanic Crescendo graveyard fuel

The Stats → Deck Report panel runs `computeJinFuelReport` in `shared/` on Main and
Material only. Eligibility depends only on positive Main quantities of Volcanic Crescendo and at
least one supported discard source: Creative Shock, Creative Tinder, Package Courier,
Hasty Messenger or Sly Songstress. Champion identity does not gate the panel.
Calculation uses the catalog's starting level-zero Spirit and a single contiguous
champion progression from Material (including a Spirit-only progression).
Missing catalog entries, costs or champion life return unavailable rather than
a zero forecast; ambiguous progression shows a focused status. Other champion
abilities are not inferred. The historical Jin function/file names remain internal.

## Sample and resource model

The report opts into the existing `estimateDrawAndDamageInfluence` runner: opening
seven (or the entire smaller Main), going first, five turns, 512 seeded samples.
Merged, alphabetically sorted Main lines make reordered or split input equivalent.
Each sample shares physical hand, memory, field, graveyard, banishment and library
cards. Reserve payments move hand cards into memory, not the graveyard. Recollection
returns memory to hand. One natural card is drawn each turn after the first.

Normal materialization starts on turn two, pays the next champion's printed memory
cost, and advances one level. Eligible Floating Memory in the actual graveyard
pays first; remaining payment banishes random memory cards. A failed complete
payment consumes nothing. Ignite Fate, Fast Cure and Angelic Channeling have
unconditional Floating Memory. The shared reviewed Floating Memory list also
supports Warrior-qualified cards after level one when all selected champions are Warriors. A Fire card spent this way
cannot fuel Crescendo later. Off-element cards may still be discarded or used as
payment; their effects require actual element access.

## Reviewed core engine

| Card | Modeled effect |
| --- | --- |
| Creative Shock; Creative Tinder | Pay Reserve, draw two, discard one. Shock's optional damage bonus is excluded from the Crescendo-only damage display. |
| Package Courier | Pay Reserve, enter the field, optionally discard one remaining hand card and draw one. No card to discard means no draw. |
| Hasty Messenger | Pay Reserve and enter. By default, each surviving copy attacks once per subsequent turn, before new plays, discarding one hand card then drawing one. It never attacks on entry. The report's toggle disables all these attacks. |
| Sly Songstress | Pay Reserve and enter as a Melody activation. Existing copies each discard/draw on Harmony or Melody activation, after payment and before resolution. A newly activated Songstress cannot trigger itself. |
| Musical Curator | Pay Reserve; choose Melody if a Crescendo remains in hand, otherwise Harmony. Scavenge up to 12, stopping at the first matching card; put it in hand and shuffle misses onto the bottom. Revealed misses are neither draws nor graveyard fuel. |
| Dungeon Guide | Pay Reserve, then optionally banish two random memory cards and advance to the next selected champion, ignoring its materialization cost. No advancement past the selected progression. |
| Liminal Guide | A copy already in the graveyard returns to the field and draws one when the champion levels up, including Dungeon Guide level-ups. No subsequent field removal is modeled. |
| Ignite Fate | Pay Reserve, deal two to each champion, then enter the graveyard. Its self-damage affects survival but is excluded from the Crescendo-only damage display. |
| Volcanic Crescendo | With at least three existing Fire graveyard cards, pay Reserve and activate Harmony triggers. Banish all Fire cards then present, recording Empower 3+X. If a Melody resolved this turn, deal X to each champion. The resolving Crescendo cannot banish itself; it enters the graveyard afterward. |

Only Jin, Undying Resolve is immortal during Main plays. Own lethal damage still ends the
sample at the end phase; before level three, lethal damage stops further plays
immediately. No opponent damage, prevention, removal or combat deaths are invented.
Messenger attack opportunities and survival are assumptions, not predicted outcomes.
The model records Empower granted, not damage dealt by an empowered attack.

## Decisions

The first affordable role is selected in this order: Songstress, Creative draw
spells, Courier, Messenger, Curator, Dungeon Guide, Crescendo, Ignite Fate. This
builds the engine before spending fuel; it is a fixed policy, not optimal play.
Crescendo is held until three Fire cards are already in the graveyard and then
consumes all available Fire, including additional Songstress-trigger discards.
It does not hold for five/eight fuel or guarantee a same-turn Melody.

Payment and discard preserve one Crescendo and one of each engine role when other
cards are available; surplus copies may be spent. Reserve payment prefers other
cards, then Fire, then protected cards. Discard prefers unprotected Fire, then a
Liminal Guide while further level-ups are possible, then other cards, then protected
cards. Stable current hand order breaks ties. Payments and mandatory discards can
consume protected copies if there are no alternatives. Optional looting uses the
same priority and only draws when a card was actually discarded.

## Report definitions

- **Resolved Crescendo, 3+/5+/8+ Fire:** fraction of all samples with at least one
  paid, resolved Crescendo banishing that many Fire cards by the indicated turn.
  These are nested thresholds in the same cast-at-three policy, not independently
  optimized odds for waiting until each threshold.
- **Fire fuel remaining:** end-of-turn Fire graveyard count after all payments
  and casts. Shows turns three/five, median and 10th–90th percentiles.
- **Strongest Crescendo:** maximum Empower granted by a resolved Crescendo through
  the checkpoint, with zero for samples that have not cast one. Same percentiles.
- **Harmonize:** fraction of all samples with at least one resolved Crescendo after
  a Melody activation in that same turn. It is not merely the probability of drawing
  the two pieces.
- **Crescendo damage to each champion:** cumulative harmonized Crescendo damage,
  with zero in samples where none occurred. Same percentiles; excludes Ignite Fate,
  combat and other damage. Multiple casts cannot reuse banished physical fuel.

This is a **core engine estimate**, not a complete deck simulator. Other Main
cards remain real payment/discard/drawable resources, but their effects are omitted.
In particular, Seething Intercession's banished-card access, Devil's Lifeline,
Enrage, Angelic Channeling's filtering, Fast Cure's recovery, Arthur's combat effects,
other ally effects and non-champion Material effects are not simulated. No mulligan,
intent, optimal sequencing or opponent response is inferred. Curator's returned
misses affect the future library rather than being approximated as extra draws.

## Verification

`app/test/fixtures/jin-crescendo.json` preserves the supplied 62-card Main and
12-card Material list. Tests cover printed card contracts, Fire-first discard,
reserve versus discard zones, activation ordering, Melody turn reset, repeat
Crescendo consumption, Messenger timing/disable, empty-hand loot, Dungeon/Liminal,
Scavenge, Floating Memory competition, complete six-zone conservation, deterministic
fixture outputs, input reordering/splitting and missing/unsupported states.
The existing Rai fixture's complete draw and damage reports were captured before
integration and compared byte-for-byte afterward; neither changed.

UI verification used the full `UserDeckStats` component with this fixture and the
committed catalog, plus isolated report states. Checked 360px, 390px and 1440px
layouts, overflow, card/name fallbacks, 48px control labels, keyboard Space toggling
with visible focus, recalculation, empty/unrelated decks, loading, missing data and
unsupported lineage. No new disclosures or expanded states are introduced. Browser
text zoom and a deployed production build were not verified.

Champion-independent eligibility regression coverage includes Rai, Lorraine, Spirit-only progression, and absence/zero quantities of the required Main cards.
