# Derived stat calculations

Internal reference for every non-trivial derived number in this app — what it computes, the exact
formula/threshold, and *why* it's defined that way. Written for future maintainers (human or AI)
who need to know whether a number can be trusted for a new use case, not just what it currently
displays as. Source of truth is always the linked file; if this doc and the code disagree, the code
is right and this doc is stale.

## Elo ratings (`pipeline/src/analysis/elo.ts`)

Not a self-implemented Elo formula — Omnidex already returns a per-match `eloChange` for each
side, so `computeEloRatings` just replays those deltas onto a running total per player, processing
events in chronological order (`event.date` ascending). Every player starts at `BASELINE_RATING =
1500`. Byes/pairings with `pairing.length !== 2` are skipped (no opponent to rate against).

**Upset detection**: a match is an "upset" when the winner's `|eloChange| >= config.upsetEloSwingThreshold`
(default 20, `GATCG_UPSET_THRESHOLD` env override). Using Omnidex's own delta directly means we
don't need to separately track pre-match rating gaps — a big swing already means Omnidex's own
system considered the outcome surprising.

## Elo rating history (`pipeline/src/analysis/elo.ts`, `data/analysis/elo-history.json`)

`computeEloRatings` already replays every historical match in chronological order on every single
pipeline run (Omnidex's cache holds full history, not just the current state) — the full rating
trajectory is a free byproduct of that replay, not something that needs to accrue over time the way
[price history](#price-history-pipelinesrcpricinghistoryts-appsrcfeaturespricingusepricehistoryts)
does. `history` records one `RatingCheckpoint` per event a player appeared in (not per match) —
collapsing a multi-round Swiss event into one point avoids charting round-by-round noise, and keeps
the dataset bounded by real event counts rather than match counts (the single most active player in
a real run has ~900 matches but far fewer distinct events).

Published as its own file, `elo-history.json`, rather than folded into `elo.json` — `elo.json` is
fetched broadly (leaderboards, achievements), while a player's full trajectory is only ever read on
that one player's own profile page. Same "split the broad/small part from the narrow/large part"
precedent as `DeckPopularityEntry` vs. the full `DeckSightingsData`, and `priceHistory.json` vs.
`prices.json` — except here there's no cap needed at all, since a player's checkpoint count only
grows as real events happen, never per pipeline run.

`PlayerProfile.tsx` charts `eloHistoryData.history[String(playerId)]` via `ThemaSparkline`
(`app/src/features/thema/ThemaSparkline.tsx`) once a player has ≥2 checkpoints — no series-selection
logic needed here (unlike price history's Normal/Foil fallback), since there's only ever one rating
series per player.

## Hipster / novelty score (`pipeline/src/analysis/hipster.ts`)

Answers "how unusual is this build, for this Champion specifically" — not "how unusual are these
cards across the whole game," which would just measure how identifiable a champion's cards are
(nearly every card in an Alice list looks rare if compared against every other champion's decks).

Processes decks in chronological order. For each Champion, tracks a running `fieldCounts: Map<cardName,
timesSeen>` and `totalDecksByChampion` count, both **as they stood before the current event** — decks
within the same event score against last-week's field, not against each other, and not against
this event's other entries.

Per-card novelty = `1 - (seenCount / totalSoFar)`, clamped at 0, treated as `1` (max novelty) when
`totalSoFar === 0` (this Champion has no prior data yet). A deck's score is the average novelty
across every card in its main+material set. Player score is the plain average of their deck scores.

## Player profiles (`pipeline/src/analysis/playerDecks.ts`, `rivals.ts`)

Two independent per-player rollups, both scoped to a single player rather than the meta-wide.

**`computePlayerDeckProfiles`**: which Champions a player runs most (`topChampions`, top 5 by deck
count) and which cards show up most in their decks, split main/material/sideboard since those are
structurally different pools. Counted by **deck count, not raw copies** — a card that's a 4-of in
one list shouldn't outrank a 1-of that's a staple across ten different decks; "how often do you
reach for this" is the question, not "how many total copies have you registered." Reuses
`decklists.ts`'s section-tallying helpers (`tallySectionCounts`/`topCardsFromCounts`) rather than
reimplementing — same helpers `archetypes.ts` below uses for its own per-archetype top cards.

**`computeRivals`**: a player's most-played opponents, selected by games played (not win rate —
frequency decides who counts as a "rival," not how those games went), then the top 10 by games are
re-sorted **win rate ascending** so the worst matchups surface first — the useful framing for a
player looking at their own page is "who gives me trouble," not "who I've simply played the most."
Walks `bundle.pairingsByRound` the same way `elo.ts` replays match deltas, and skips the same two
cases Elo does: pairings with no second side (byes), and team-format pairings (`pairing.id` is a
team-name string, not a numeric player id, for those formats — no individual identity to attach a
rivalry to).

## Meta-wide per-card and per-keyword win-rate stats (`cardStats.ts`, `cardQuantityStats.ts`, `deckCompositionStats.ts`, `keywordStats.ts`)

Four analysis modules sharing one shape: walk every event's decklists + standings, bucket by some
key, shrink each bucket's average win rate toward 50% via `shrinkWinRate` (the shared helper — see
its own doc comment in `shared/src/winRateShrinkage.ts`), keyed differently per module:

- **`computeCardStats`** (`cardStats.ts`) — per **card name**: deck count, total copies, event
  count, win rate, plus `recentDeckCount`/`priorDeckCount` (30-day windows, most-recent-event-date
  anchored, not wall-clock — so a `GATCG_ANALYSIS_ONLY` re-run against the same cached data always
  produces the same windows) for downstream "trending" comparisons. `marketPrice` is left `null`
  here and filled in by `build.ts`, which joins against `data/prices.json` afterward — this module
  has no pricing data of its own.
- **`computeCardQuantityStats`** (`cardQuantityStats.ts`) — per **(card name, copy count)**: does
  running a card at 4x actually win more than at 2x? A card only ever run at a single quantity
  across the whole dataset is dropped (`quantities.length < 2`) — same "nothing to compare against"
  reasoning used for `CardQuantityStat` everywhere else a with/without split needs both sides
  populated.
- **`computeCompositionWinRates`** (`deckCompositionStats.ts`) — per **(main-deck card type, 10-point
  composition-percentage bucket)**: does running more Allies (as a *share* of the main deck, by
  copies) correlate with winning more? Scoped to the **main deck only** — material is a mostly-fixed
  category (Champion prints, relics) that would dilute a gameplan signal, and sideboard is excluded
  as situational tech, same "deck identity" convention as everywhere else in this doc. Requires a
  known win rate to even enter the accumulator (`if (winRate === undefined) continue`) since the
  entire point is the win-rate correlation — there's no other use for this dataset's rows.
- **`computeKeywordStats`** (`keywordStats.ts`) — per **ability keyword** (via the shared
  `computeKeywordComposition`, the same keyword-detection helper `useDeckIdentity`'s Keyword
  Composition chart uses client-side): does a keyword's presence in a deck correlate with a higher
  win rate, as a real meta-wide, sortable stat instead of only ever being visible per single deck.

All four resolve raw decklist card names through `resolveCard` before using them as accumulator
keys (not `cardIndex.get` directly) — these modules read `bundle.decklists` independently of
`decklists.ts`, so without this they'd be exposed to the same mis-cased/curly-quote identity-split
bug documented under "Card name resolution" below.

## Archetypes / Battle Chart (`pipeline/src/analysis/archetypes.ts`)

The older, coarser per-Champion rollup (`archetypes.json`, `ArchetypeSummary`) — still published
and still the data source for `BattleChart.tsx`'s matchup matrix, `BrowseDecksIndex.tsx`, and the
Champion/Champions pages; **not** the same thing as `archetypeTaxonomy.ts`'s cluster-level "named
builds" below despite the similar domain (investigated directly, confirmed genuinely different axes
— see the Data Roadmap note in the project plan).

Groups every deck by its identified Champion (`decklists.ts`'s `findChampionName`) and tallies
top cards (main/material/sideboard), a Spirit-companion breakdown, and a Spirit-element breakdown
per Champion. Decks with no identifiable Champion are excluded from grouping entirely rather than
falling back to a class+element bucket — that string isn't a real Champion identity, and a
fabricated bucket would silently mix genuinely different decks. Archetypes below
`config.minBattleChartSampleSize` are dropped as noise, same threshold used everywhere else a
per-group sample needs a floor.

**Named Spirits get their own parallel identity.** A Spirit with a personal name ("Kaze, Spirit of
Wind" — has a comma, unlike the generic "Spirit of Wind") is tracked a second time in
`namedSpirits`, with the exact same stats shape as a real Champion, aggregated across every deck
running that Spirit regardless of Champion. Not mutually exclusive with `archetypes` — a deck with
both a real Champion and a named Spirit counts toward both, since "which Champion is this" and
"which named companion is this" are separate, non-competing questions about the same deck.

**Battle chart**: walks `bundle.pairingsByRound` (same source `elo.ts`/`rivals.ts` use), keeping
only 2-sided pairings where both decks resolved a Champion, and keys each matchup as
`${lowerName}__${higherName}` (alphabetically sorted, not by which side won) so `A vs B` and `B vs
A` pairings accumulate into the same entry rather than splitting a matchup's real game count in
half across two mirrored keys. Matchups below the same `minBattleChartSampleSize` floor are dropped.

## Deck price (`pipeline/src/analysis/deckPricing.ts`)

`computeDeckPrice` sums known card prices for a card-count map (main+material — sideboard excluded,
same deck-identity convention as everywhere else). Missing-price cards are simply skipped from the
sum rather than treated as free — the function returns `null` (not `0`) when *no* card in the map
had a known price at all, so a deck genuinely priced at $0 (impossible in practice, but structurally
distinct) is never confused with "we don't have pricing data for this deck."

## Deck card index (`pipeline/src/analysis/deckCardIndex.ts`)

Full per-decklist card membership (main/material/sideboard, by section) for every public decklist —
the raw material behind the "which cards get played together" filter on Card Stats
(`useCardCombination.ts`) and deck-popularity lookups. Deliberately a separate published dataset
from `DeckSightingsData` (event/player/placement context) rather than merged into it, so that
leaner dataset stays cheap to fetch while this one — structurally the bulkiest, since it's every
card of every decklist — carries the weight; the two join back together by a shared `deckId`
(`${eventId}:${player}`).

Computed in two layers: `computeFullDeckCardIndex` builds the human-readable `{name, quantity}`
form and writes it to `pipeline/.cache/deck-card-index-full.json` (a local working artifact, not
published — see "Client load-time optimizations" below for why the published form is dictionary-
encoded instead, and why the full form is still kept on disk rather than discarded).
`computeDeckCardIndex` then encodes it against a shared `cardNames` dictionary before returning —
same `[cardNameIndex, quantity]` encoding documented in that section.

## Card name resolution (`pipeline/src/cards/catalog.ts` — `resolveCard`, `normalizeCardKey`)

Every raw decklist card name (`{card: string, quantity: number}`, free text a player/organizer
typed, submitted to Omnidex — there is no card-ID field anywhere in the raw decklist shape) is
resolved against the card catalog before it's used as a card-identity key anywhere in the
pipeline. This wasn't always true: an exact-string, case-sensitive `cardIndex.get(line.card)`
(and, in several files, no catalog lookup at all for the *key* even when one happened for other
purposes) meant a decklist submitted with non-canonical casing ("dungeon guide" instead of
"Dungeon Guide") or a different apostrophe character (straight `'` vs. the catalog's curly `’`)
silently became a second, disconnected card identity — no slug, no price, undercounted
popularity. Verified live against the real published data: **249 real cards had their deckCount
split across 322 entries** in `cards.json` this way (e.g. "Dungeon Guide" at 31,908 decks vs. a
"dungeon guide" ghost entry at 20, both real submissions of the same card) before this fix.

`resolveCard(cardIndex, raw)` tries an exact match first (the overwhelming common case — no
folding cost), then falls back to a case/quote-folded match (`normalizeCardKey`: NFKC-normalize,
fold curly quote variants to straight, trim, lowercase) against a lazily-built, memoized folded
index. Only a card that fails *both* is treated as genuinely unmatched (unchanged from prior
behavior — still tracked under its own literal text via `unmatchedCardNames`, not dropped).

Every place a raw decklist card name becomes an identity key calls this — not just
`decklists.ts`'s `tally`/`findChampionName`/`toLines`/`findSpirit` (whose resolved
`DeckCardLine.name`/`championName`/`spiritName` then propagate for free into everything that
consumes `DeckSignature`), but also `cardStats.ts`, `cardQuantityStats.ts`, `similarity.ts`,
`archetypeTaxonomy.ts`, `deckCompositionStats.ts`, `keywordStats.ts`, and `hipster.ts` — these
read `bundle.decklists` raw and independently of `decklists.ts`, confirmed by grepping every
`line.card`/`entry.decklist` touch point in `pipeline/src` rather than assuming decklists.ts was
the only ingestion boundary. `findChampionName`'s own identity split (`card.name.split(",")[0]`)
resolves the full card name first, then splits — a mis-cased Champion printing previously could
make the lookup miss entirely (`if (!card) continue`) and silently misidentify the deck's
Champion, not just cost a slug link.

`buildCardIndex`'s own `Map` stays exact-match/canonical-keyed, unchanged — `resolveCard` is a
separate, additive lookup path, so no existing `cardIndex.get(...)` call elsewhere in the
codebase needed to change or is at risk from this.

Price matching had the same class of bug from a different source: `loadPriceByName`
(`pipeline/src/analysis/build.ts`) used to join by matching TCGPlayer's own product display name
(`CardPriceEntry.cardName`) against the GA catalog's card name — fragile whenever TCGPlayer
suffixes a product name the GA name doesn't (e.g. "Stonescale Band" only listed as "Stonescale
Band (002B)"; confirmed on ~11% of all 3,838 priced editions in `data/prices.json`). Fixed by
joining on the precise key both sides actually share: `CardSignature.editions` (set prefix +
collector number per printing, fetched from the GA API's `Card.editions` but previously discarded
when narrowing to `CardSignature`) against `data/prices.json`'s own `priceKey(setPrefix,
collectorNumber)` keys — the same per-edition join `app/src/features/cards/CardDetail.tsx`
already does client-side. `editions` is absent (not empty) on a stale on-disk catalog cache from
before this field shipped; always read with `?? []`, self-heals within the existing 24h cache TTL.

## Champion identity (`pipeline/src/analysis/decklists.ts` — `findChampionName`)

A deck's Champion is the named identity behind whichever CHAMPION-typed printing in the Material
Deck has the **highest `level`** (verified live against the GA API: e.g. "Alice, Distorted Queen"
is level 1, "Alice, Phantom Monarch" level 2, "Alice, Trifle's Royalty" level 3 — separate physical
cards per level, not one card that changes). This is what the player actually built toward. Ties
(two identities both topping out at the same level, e.g. neither got played past level 1) fall back
to whichever has more copies in the material deck. Spirit companions (level 0, e.g. "Sabrina, Spirit
of Water") only win if nothing else in the deck qualifies.

This replaced an earlier majority-vote-by-copies approach specifically because copy count doesn't
track what the deck is built around — a deck could easily run more copies of a lower-level card
than a level 3 one. `championName` computed here feeds every downstream per-Champion stat: deck
sightings, similarity grouping, archetypes, hipster scores, player deck profiles, and the season
trends below — it's a single source of truth, not recomputed independently anywhere else.

Only the Material Deck is checked. ~0.7% of decklists resolve to `null` (surfaced in the UI as
"Unknown champion") — investigated whether these had their Champion misplaced under "main" instead
(a plausible submission-tool quirk), but checked several real examples directly against the card
catalog (e.g. event 60368 player 848) and every "Name, Title"-formatted card in their main decks
turned out to be a UNIQUE ALLY (e.g. "Blanche, Sheltering Saint"), not a Champion. These decklists
genuinely have no Champion-type card submitted in either section — an upstream Omnidex data gap,
not something recoverable from the data we're given. A main-deck fallback was tried and reverted
after confirming (post-regeneration) it resolved zero of the 385 affected sightings.

## Deck sighting fields (`pipeline/src/analysis/deckSightings.ts`)

One record per public decklist ("sighting" = one player's decklist at one event). Several fields
are derived, not raw Omnidex data:

- **`placementPercentile`** — `placement / event.players.length`. E.g. `0.02` = top 2%. `null` when
  placement or player count is unavailable. This exists because a raw placement number isn't
  comparable across events of wildly different sizes — 3rd of 300 and 3rd of 10 look identical as
  bare numbers but mean very different things.
- **`eventTierWeight`** — looked up from `EVENT_CATEGORY_WEIGHTS` (`shared/src/omnidex-index-types.ts`):
  worlds 3.0, nationals 2.5, ascent 2.0, regionals 1.5, store-championships 1.0, regular 0.5.
- **`weightedScore`** — `eventTierWeight * (1 - placementPercentile)`, or `0` when percentile is
  unknown. The single sortable "how good was this finish" number — a top-1% finish at an Ascent
  outranks a raw #1 at an 8-player regular. Used as the default sort ("best") on Top Decks and for
  ranking `topDecks` on Champion/Card detail pages.
- **`duplicateCount`** — count of *other* players (not the same player reusing their own list
  across events) who ran an identical main+material card list. Signals netdecking rather than
  independent brewing. Computed from `canonicalSignature` (sorted `name:qty` pairs, main+material
  only — this exact convention is reused everywhere a deck's "identity" matters, see below).
- **`underplaced`** ("Tough finish" badge) — `winRate >= 0.6 && wins >= 3 && placementPercentile !==
  null && placementPercentile > 0.3`. Flags a strong match record that still finished outside the
  top 30% of the field — Swiss tiebreakers (opponents' win %) can badly punish a good record against
  a weak schedule, so this isn't a data error. Threshold chosen empirically against the real
  dataset: ~4% of sightings qualify (718/17,554 at time of writing), including several literal 3-0
  or 4-0 records that still landed in the bottom half — e.g. a 3-win Tristan deck finishing #8 of
  17 at a store championship (47th percentile). Loosening the bar further (e.g. requiring only
  winRate >= 0.5) mostly captures decks that just had an average record, which isn't the same
  finding — the current thresholds were picked specifically to isolate the "should have done
  better" cases, not general middling performance.
- **`winner`** = `placement === 1`. **`topCut`** = placement within `event.singleEliminationCutSize`.
  **`high`** = match win rate >= 50%. These three (plus the netdecking idea) were adapted
  independently from Fractal of Insight's "which decks did well" concept, not their code or data —
  see the AGPL note in the project plan (Phase 13) for why that distinction matters.

## Champion season trends (`pipeline/src/analysis/championTrends.ts`)

Built on top of `computeDeckSightings` output (not a re-walk of event bundles) since sightings
already carry every field needed: season, Champion, `weightedScore`.

**Why `shareOfSeason`, not raw score**: verified against real data that a champion's total
`weightedScore` isn't comparable across seasons because backfill coverage grew a lot over time
(2,488 sightings in the earliest season vs. 11,808 in the most recent) — a champion could look like
it "grew" between seasons purely because the dataset got bigger, not because it got more popular.
`shareOfSeason` = this champion's total `weightedScore` that season ÷ every champion's combined
`weightedScore` that season, which normalizes that away.

**Season order** is derived from data, not hardcoded or assumed from `seasonId` ordering — each
season's position is its earliest sighting's `eventDate`, sorted ascending. Every champion gets one
entry per season in the full dataset (zero-valued for seasons they had no sightings in), so a
champion going quiet shows up as a real zero rather than being silently absent from the array.

**Trend classification** compares `shareOfSeason` between the two most recent seasons *in the whole
dataset* (not this champion's own two most recent appearances) — so missing a season entirely
surfaces as "absent," not skipped:
- Both seasons zero sightings → `insufficient-data`.
- Previous season zero, latest season ≥ `config.minBattleChartSampleSize` (5) → `new`.
- Previous season ≥ threshold, latest season zero → `absent`.
- Either season below the threshold (and not exactly zero) → `insufficient-data` — too little data
  in one of the two seasons to trust a direction.
- Otherwise, `deltaPct = (latest.shareOfSeason - prev.shareOfSeason) * 100`; `> +2pp` → `rising`,
  `< -2pp` → `falling`, else `stable`. The ±2 percentage-point stable band was picked by eyeballing
  the real distribution of season-to-season share changes — most champions move by low single-digit
  points normally, so a ±2pp band separates real momentum from noise without being so wide it never
  fires.

Verified against a real gut-check: comparing top-5-by-`weightedScore` champions season over season
by hand found 60-80% carryover most transitions, but one genuine meta shake-up (Mortal Ambition →
Abyssal Heaven, only 1 of 5 carried over) and several one-season-only breakouts (e.g. Diao Chan) —
confirming season-level trend tracking surfaces real signal, not noise.

## Archetype taxonomy (`pipeline/src/analysis/archetypeTaxonomy.ts`)

Data-derived named builds (e.g. "Water Guo Jia") — distinct from `archetypes.json`'s
`ArchetypeSummary` (the older, coarser per-Champion rollup, still published unchanged since
Battle Chart reads it for its matchup matrix). Reference point was Fractal of Insight's `/deck/`
page (~51 named archetypes like "Crux Lorraine"), but their system — re-read directly from
`fractal/archetypes.py` — is a **hand-curated rule engine** (`require`/`exclude` card lists,
`require_combos`, `require_element`, ~51 definitions authored by a human) under AGPL-3.0. Copying
their curated archetype-to-card mappings would carry that license's obligations, so this is
independently derived from our own decklists via clustering, not curation — same general *shape*
(named builds defined by discriminating cards), different origin.

**Cards, not Champion, decide clustering.** Originally this ran per-Champion (group Champion X's
decks, cluster within that group, repeat per Champion) — but that structurally couldn't detect a
shell netdecked under more than one Champion, since decks under different Champions were never
even compared. Checked directly against real data: reconstructing every published cluster's full
main+material multiset and scoring cross-Champion pairs with the same weighted Jaccard found 57
cluster pairs ≥0.35 similar despite different Champions, several ≥0.7 (e.g. "Fire Arisanna" vs.
"Fire Merlin (Library Witch)" at 0.82) — the same "Library Witch"/"Dungeon Guide" and "Snow
Fairy"/spades-toolbox shells were being split into up to 5 separate per-Champion entries purely
because clustering couldn't see across the Champion boundary. So clustering below is global and
Champion-blind; each resulting cluster then reports every Champion it was actually played under.

**Method**:
1. Group *all* decks (every Champion at once) by exact main+material signature (same convention as
   `useDeckPopularity.ts`'s `canonicalSignature` — Champion isn't part of this signature, since
   it's tracked in its own zone, not the main/material sections) — keep only signatures with ≥2
   distinct players (same bar as Popular Decks; a one-off brew isn't a "build"). Each group tracks
   a per-Champion tally (`championTallies`) of which decks/players ran it under which Champion —
   almost always one Champion, but not structurally guaranteed.
2. **Greedy nearest-seed clustering**, not union-find/single-linkage, over the full global set of
   build-groups: sort by player count descending; each group joins the best-scoring *existing
   cluster seed* (weighted Jaccard, reused from `similarity.ts`) if ≥ `CLUSTER_THRESHOLD` (0.45),
   else seeds a new cluster. Single-linkage was tried first and rejected — verified live against
   Guo Jia (our largest Champion, 7,154 decks → 238 multi-player build-groups) that union-find on
   any pairwise edge ≥ threshold **chains into 3-4 giant blobs at every threshold from 0.35-0.6**
   (a resembles-b, b resembles-c doesn't mean a resembles-c, but single-linkage merges them
   anyway). Greedy nearest-seed avoids this — at 0.45, Guo Jia alone still produces a clean
   10-cluster split whose top clusters separate by element (Water/Wind/Fire), confirmed by
   inspecting each cluster's defining cards; going global on top of that didn't reopen the
   giant-blob problem — verified by replicating this exact algorithm against the published
   `deck-card-index.json` + `deck-sightings.json` (55,840 decks): 116 published clusters, comparable
   to the old per-Champion count of 128, not a collapse into a handful of blobs.
3. Clusters need ≥5 total players (`config.minBattleChartSampleSize`) to publish.
4. **Defining cards**: present in ≥80% of the cluster's player-weighted decks (`DEFINING_MIN_IN_CLUSTER`)
   *and* present in <85% of decks generally (`DEFINING_MAX_GLOBAL_PRESENCE`, over every deck in the
   dataset) — the second condition is what keeps a cluster's defining-card list from just being
   universal staples. A card that's a signature staple of one particular Champion (so it's rare
   globally, since only that Champion's decks run it, but common within this cluster) still
   correctly reads as "defining" under the global baseline — that's the same intent as the old
   per-Champion baseline, just measured against the whole dataset instead of one Champion's decks.
   Both thresholds are initial values chosen from inspecting real output, same status as
   `MIN_SCORE` or the trend ±2pp band elsewhere in this doc — tunable, not final.
5. **Champion breakdown**: each cluster reports every Champion it was played under
   (`championBreakdown`, `{championName, deckCount, playerCount}[]`, sorted by playerCount
   descending) by aggregating its member build-groups' `championTallies`. The top entry is the
   cluster's **plurality Champion** (most players; ties broken by deckCount then name) — this is
   what `championName` and champion-scoped naming/linking use. In the same real-data replication
   above, 25 of 116 published clusters span more than one Champion (e.g. a 235-player "Water Diao
   Chan" cluster that's actually 211 Diao Chan + 28 Arisanna + a handful of others running the
   identical Burst Asunder/Fractal shell).
6. **Naming**: dominant non-colorless element among the defining cards (via the card catalog's
   `elements` field), formatted `"{Element} {plurality Champion}"`. No element signal → falls back
   to `"{plurality Champion} — {top defining card}"`. When two clusters land on the same name
   (whether or not they share a plurality Champion), the smaller one gets `(card name)` appended —
   walking its own defining-card list in order for the first name not already claimed by an
   earlier disambiguation in the same collision group (not just its #1 card — a real bug during
   development: three-plus same-named clusters can share the same top *generic* defining card,
   e.g. "Dungeon Guide", and collide again after a naive single-card disambiguation).

**Card → archetypes reverse index**: `ArchetypeTaxonomyData.cardClusterIndex` maps a card name to
every cluster it's a `definingCards` member of (with that cluster's prevalence for the card),
built by inverting each cluster's already-computed `definingCards` list — same "iterate clusters,
invert into a lookup" shape as `CardImpactData.deckClusterIndex` in `cardImpact.ts`, just
card-keyed and to multiple clusters instead of deck-keyed to one. Scoped to defining cards only
(not every card any member deck happens to run) so it answers "which named build(s) does this
card help define," not "which decks contain it" — the latter is already covered by other
per-card stats (`cards.json`, `card-quantity-stats.json`). Powers the "Archetypes" section on a
card's own page (`app/src/features/cards/CardDetail.tsx`), replacing an older Champion-level
"Popular with Champions" block that read the coarser per-Champion `archetypes.json`.

**Season data**: each cluster also carries `seasons` (per-season deckCount/playerCount/eventCount/
avgWinRate, only for seasons it actually has sightings in — not zero-padded like
`championTrends.ts`'s season array, since this is for filtering, not gap-detection) and `trend`
(comparing the build's own two most recent seasons *with data*, not necessarily calendar-adjacent
if it skipped one). Season order within a cluster comes from each season's earliest event date
within that cluster's own sightings, not `seasonId` — same reasoning as `championTrends.ts`.
`trend` is raw `playerCountChange`/`winRateChangePct` deltas, deliberately **not** normalized the
way `championTrends.ts`'s `shareOfSeason` is — this was asked for as a direct player-count/win-rate
comparison, so a build's raw growth reflects both real popularity change and the season's overall
backfill coverage growing; read the number in that light rather than as a pure signal the way
`shareOfSeason` is.

## Card Impact (`pipeline/src/analysis/cardImpact.ts`, `matchupCardImpact.ts`)

For a named build (archetype cluster), does having a given card (in any of Main/Material/
Sideboard) correlate with a higher win rate than not having it? Answers two things at once:
"does sideboard tech actually matter" (filter the result by `role: "sideboard"`) and "what could
improve this decklist" (any card not already in a viewed decklist, positive `adjustedLift`, for
the cluster it belongs to — resolved via `deckClusterIndex`). Correlational, not causal — a card
being associated with a higher win rate doesn't mean playing it *causes* that outcome; strong
players may simply choose good cards more often. Every UI surface carries the same caveat.

**Core computation** (`computeCardImpactEntries`, shared by both the general and matchup-scoped
callers below): for each card name appearing in any row, split rows into "with"/"without" buckets,
average each bucket's outcome, then shrink each average toward a `baseline` (not a flat 50%) using
the same Bayesian-average shape as `cardStats.ts`'s win-rate shrinkage
(`(sum + prior * baseline) / (n + prior)`, `prior = config.winRateShrinkagePriorWeight`) —
anchoring to the *cluster's own* baseline rather than a global 50% is more honest, since a build can
sit well off 50% due to Swiss/tournament dynamics. `adjustedLift = shrunkWith - shrunkWithout`. A
card is only kept if **both** buckets meet `config.cardImpactMinSampleSize` (default 5, same
magnitude as `minBattleChartSampleSize`) — this also quietly excludes a cluster's own
defining/staple cards from ever appearing as a "suggestion", since they're in ~100% of the
cluster's decks by construction and their "without" bucket has ~no data. **Role** (`main` /
`material` / `sideboard` / `mixed`) is whichever section accounts for ≥80% of a card's "with"
appearances; below that it's genuinely split ("mixed"). Sections are tracked as three separate
sets (not main+material collapsed into one) — an earlier version merged them, which meant a
champion/relic that only ever lives in the Material Deck always showed `role: "main"` (a real bug,
fixed after being reported against live data — e.g. "Sabrina, Spirit of Water" now correctly shows
`role: "material"`).

**General Card Impact** (`computeCardImpact`): outcome = each deck's event-aggregate win rate
(`DeckSighting.winRate`), baseline = the cluster's own `avgWinRate`. Published per-cluster, top 30
by `adjustedLift`, plus a `deckClusterIndex` (deckId → clusterId) so any viewed decklist elsewhere
in the app can resolve its own cluster's suggestions without knowing its Champion or build name.

**Matchup Card Impact** (`computeMatchupCardImpact`): the same computation, but scoped to one
specific opponent named build and driven by real per-game pairing outcomes instead of event-
aggregate win rate — the only way to isolate "how did this build do specifically against THIS
opponent build". Loops `bundle.pairingsByRound` the same way `archetypes.ts`'s battle chart does,
keeping only pairings where *both* sides are members of some cluster (via `deckClusterIndex`,
rebuilt locally from `ArchetypeCluster.deckIds`). Two entries are recorded per pairing — one keyed
`clusterA__clusterB`, one `clusterB__clusterA` — since "my cards" vs "opponent cards" are
asymmetric and each cluster needs its own view of the matchup.
- `myCards`: bucketed by whether *my* side had the card, scored against *my* outcome — same as
  general Card Impact, just scoped to games against this one opponent.
- `opponentCards`: bucketed by whether the *opponent* had the card, but still scored against *my*
  outcome — a negative `adjustedLift` here means "when they have this card, I do worse against
  them." Sorted ascending (most negative first) rather than descending, since the useful signal is
  the opponent's most punishing cards, not their least.

**Sample size reality**: named-build-vs-named-build is a small population by construction — even
the single biggest Champion-level matchup in the whole dataset (Silvie vs Lorraine, from the
existing Battle Chart) tops out around 1,600 games, and a specific cluster vs a specific opponent
cluster is a fraction of that. Below `config.minBattleChartSampleSize` total games, the card-level
split is skipped entirely (guaranteed to come up empty) — but the matchup still publishes its
`games`/`baselineWinRate` summary with empty `myCards`/`opponentCards`, so the UI can say "not
enough data for a card breakdown" instead of the matchup silently not existing. In practice this
means most matchup rows will have a games/win-rate summary but no card table — only the largest
clusters against the largest opponents will have enough games to say anything about individual
cards.

**Answer cards** (`computeAnswerCards`, called `answers` on `ClusterMatchupImpact`): for a card B
that already qualifies as "hurts you," does running one of *my* own cards A blunt that — i.e., do I
do better specifically in the games where the opponent had B, if I also had A? Restrict to rows
where the opponent had B, split those by whether I had A, shrink each side toward *that subset's
own* mean outcome (not the whole matchup's baseline — using the matchup baseline would understate
B's harm by mixing in every game B wasn't even present for), and keep only positive mitigation
(`computeSingleCardImpact`/`computeCardImpactEntries`, same shared scoring core as everywhere
else). This is a strictly smaller population than the matchup's own `opponentCards` split
(B-present rows, further split a second way), so most matchups' precise cluster-level pool doesn't
have room for it — verified against the biggest real matchup (Tera Silvie's own mirror, 94 games):
its worst "hurts you" card was already a 16-vs-78 split on card B alone, leaving only 16 games to
divide a second way by card A.

Because of that, the computation tries the precise cluster-level pool first and, only when a given
(A, B) pair doesn't clear `cardImpactMinSampleSize` on both sides there, falls back to a second,
much bigger pool: every recorded pairing between my whole Champion and the opponent's whole
Champion, not gated by cluster/named-build membership at all (built the same way as the cluster
pool — same `pairingsByRound` loop, same per-game card sections — just keyed by
`${championA}__${championB}` instead of `${clusterA}__${clusterB}`, and requiring only that both
sides resolved a Champion, not that they belong to a named-build cluster). Each published answer
carries `scope: "cluster" | "champion"` so the UI can disclaim the broader, less precise ones.
Verified against real output: 302 of 1,247 published answers resolved at the precise cluster level,
963 needed the Champion-level fallback — confirming the fallback is the common case, not an edge
case, exactly as the sample-size math above predicts.

## Guided Deck Builder (`app/src/features/deckbuilder/useDeckBuilderPopulation.ts`, `useSuggestedBuild.ts`)

Assembles a suggested build for a Champion (+ optional Spirit filter) from real decks — not one
example decklist, but the actual highest-win-rate card at each slot — and lets the viewer lock in
their own picks, re-ranking the rest against a population conditioned on those locks. Fully
client-side, no new pipeline dataset: Spirit isn't published at individual-deck grain anywhere
(only as a per-Champion aggregate in `archetypes.json`), so it's derived here the same way
`computeDeckIdentity` already derives elements client-side — decode the material section, check the
card catalog's own `types`/`subtypes` (`CHAMPION` + `SPIRIT`), same rule
`pipeline/src/analysis/decklists.ts`'s `findSpirit` uses.

**Locked cards need no ranking data to justify their presence** — they're the viewer's explicit
choice, always included as-is. Only the *remaining* slots get ranked, against
`shared/src/cardImpact.ts`'s `computeCardImpactEntries` (the exact same with/without/shrink core
used by every other Card Impact surface), fed a population filtered to the chosen Spirit and, if
any cards are locked, further filtered to decks containing every one of them. When that conditional
population drops below a minimum size, ranking falls back to the Spirit-only population instead of
returning nothing — disclosed in the UI, same "precise-first, broader-disclaimed-fallback" pattern
`matchupCardImpact.ts`'s answer cards already use.

**Champion-level print slots need a different rule than everything else.** Spot-checked directly:
not every Champion has exactly one card per level — Silvie and Lorraine have multiple different
prints at the *same* level (alternate lineages), so which print fills a level slot has to be picked
from data, not assumed. But the normal lift-ranking approach systematically fails here: a
near-universally-run print (most decks run every level of their own Champion) usually can't clear
the with/without sample bar, since its "without" bucket is too thin — the same "excludes
defining/staple cards" behavior already documented as *expected* for general Card Impact suggestions.
For a flex-slot suggestion that's fine; a Champion's own level print is structurally close to
mandatory, so this falls back to whichever print is simply most common at that level in the
population, rather than silently omitting the level. Verified live: Diao Chan (single print per
level) includes all three; Silvie (three different level-3 variants) correctly includes exactly one,
picked by lift where enough data exists.

Material items are consistently 1-copy-each in real decklists (spot-checked); Main deck copy counts
vary and unique-flagged cards (`types` includes `"UNIQUE"`) are capped at 1, everything else at 4 —
each suggested card's quantity is the modal (most common) quantity observed for it in the ranking
population, capped at that legal max. Target deck sizes (main/material totals) are also the
population's own modal totals rather than assumed 60/12, since real decklists vary slightly (60 vs.
61 seen in spot checks).

**A locked card's section is determined from raw presence, not from the ranking data.** Real bug,
reported and fixed live: locking a non-Champion Material card (e.g. a relic) sent it to Main. Cause —
the section-placement check looked up the card in `entryByName`, which is built from `ranked`, and
`ranked` deliberately excludes every locked card (so a card doesn't compete against itself for a
slot). That lookup was therefore always `undefined` for any locked card, silently defaulting all of
them to "main" regardless of where they're actually played. Fixed with a dedicated `sectionOf`
helper that counts raw main/material presence directly from the Spirit-filtered population
(independent of the lock-conditioned ranking population, so it stays stable regardless of fallback
state) and applies the same >=80%-majority rule as role classification elsewhere.

**Buddy cards** (`useBuddyCards.ts`): for each locked-in card, the other cards most often run
alongside it — deliberately *not* filtered by win rate the way the main suggestions are. A real
combo piece or deckbuilding staple can be run together constantly without that pairing ever clearing
Card Impact's with/without sample bar (e.g. if both cards are individually near-universal, there's
no "without" population to compare against) — this is a separate, unfiltered co-occurrence lens
specifically so a genuinely synergistic pick isn't invisible just because the numbers can't
distinguish it. Support-gated (>=5 co-occurring decks) to avoid noise; each buddy shows the % of
decks with the locked card that also ran it, with its own "Add" button that locks it in directly,
bypassing the ranked suggestions entirely.

**Layout is four tabs** (Build / Stats / Buddy Cards / Log), added once the page had enough
independent surfaces stacked on one scroll to need separating — same `useTabParam` deep-linking
pattern used everywhere else tabs appear on this site. Stats reuses the exact composition/rating
functions a deck's own dedicated page uses (`computeDeckComposition`, `computeDeckRating`,
`computeMemoryCostCurve`, `computeReserveCostCurve` — all from `app/src/lib/deckIdentity.ts`),
recomputed live from whatever's currently assembled (locked + suggested lines combined), so Power
Rating and the composition donuts update immediately as cards are locked, added, or removed —
verified live: locking one card changed the composite Power Rating from 6.00 to 6.25 in the same
render pass.

**Observed win rate among matching decks**: the real average win rate of decks matching the Spirit filter *and* every
currently-locked card (`conditionalWinRate` in `SuggestedBuild`) — not a synthesized prediction.
The UI displays the matching sample size beside it and explicitly marks populations below ten decks
as insufficient for a stable summary. Fallback populations are named where they are used.
Summing individual cards' `adjustedLift` values to estimate a whole-deck win rate was considered and
rejected: lift figures aren't independent (a card's lift already reflects correlation with whatever
else typically accompanies it), so adding ~30 of them would compound into a number with no honest
error bars. The actual conditional population average carries no such risk — it's just "how have
real decks exactly like this actually performed" — and updates every time a lock changes which
population that is. Shown against `baselineWinRate` (the same population before any locks) so a
lock's real effect is visible as a delta, and the same delta is captured per-action in the change
log. Verified live: locking one card moved the shown rate from 46% to 47% (+0.6pp), logged
identically in both the header and that action's log entry.

**Locks with too little data don't get to swing it.** The population used for
`conditionalWinRate` is filtered to decks containing *every* locked card — but a lock is only
included in that filter once it clears `MIN_SAMPLE_SIZE` (5) occurrences in the Spirit-filtered
population. Without this, two real bugs showed up back to back, both reported live: locking a card
nobody in the population has ever played (e.g. "Ariel, Archangel of Natura" — confirmed exactly 1
Diao Chan deck runs it) required every row to contain it, which is trivially impossible and zeroed
out the whole conditional population, making the win rate vanish entirely; loosening the bar to
"at least 1 occurrence" fixed that but let that single deck's own 37.5% win rate dominate the
entire reported number (38%, a real -8.7pp swing off a sample of one). Neither is "this card hurts
your odds" — both are "we don't have enough data on this specific card to say anything," which
should leave the win rate contributed by every other lock alone rather than distorting or erasing
it. Same sample-size philosophy Card Impact already applies everywhere else, just gating
conditioning instead of ranking.

## Card-page win-rate synergy (`app/src/features/cards/useCardSynergy.ts`)

A card's own detail page already had "Most used with" (`useCardCombination.ts` — ranked by raw
co-occurrence count, split into Main/Material/Sideboard). This is a different question, asked
directly by the user: not "what's commonly played alongside this card" but "does *also* running a
given other card correlate with actually winning more" — a real win-rate interaction, not just
popularity. Reuses `computeCardImpactEntries` a fourth time (general Card Impact, matchup Card
Impact, Guided Deck Builder — see above), this time scoped globally: the population is simply every
deck (any Champion) containing the page's card, baseline is that population's own mean win rate, and
candidates are every other card seen in it. The card itself never appears in its own results without
special-casing — every row in the population already contains it, so its "without" bucket is always
empty and automatically fails the minimum-sample gate.

## Same effect shape (`app/src/lib/cardSimilarity.ts`, `useSimilarCards.ts`)

Groups cards by `sorted(types) | sorted(subtypes) | numbers-normalized effect text` (digits replaced
with `#`, `**` bold markers stripped, `**Preserved?**` handled like every other keyword regex
elsewhere). Templates under 15 characters are excluded — otherwise every blank-effect stat-stick in
the catalog collapses into one meaningless mega-group. Deliberately does **not** rank or declare an
upgrade: spot-checked against real data before shipping and found genuine same-day cost/stat
tradeoffs between siblings, plus large intentional per-element design-parallel families (16 Spirit
cards sharing one template) — an automated "X is strictly better" verdict would be wrong often
enough that this stays a side-by-side comparison.

**Power-creep deltas**: `statDiff(card, sibling)` shows each sibling's cost/power/life/durability
*relative to* the card being viewed (`other - card`), not an absolute score — e.g. "costs 1 less" is
a plain, verifiable fact a reader can act on, not a synthesized rating. A symbolic cost (e.g. `"X"`)
or a missing stat on either side yields `null` (rendered as nothing), never a fabricated 0.

**Low-sample reference callout**: for a card with `CardStat` missing entirely or `deckCount < 5`
(the codebase's established "too few observations to trust" threshold — see
`useChampionCardImpact.ts`'s `MIN_SAMPLE_SIZE`), the same tab also surfaces `Card.references`/
`referenced_by` more prominently. These are Omnidex/GATCG's own designer-curated explicit
references (a card's text literally naming another card) — not inferred, and not pipeline-computed
(`grep -rn "references" pipeline/` turns up nothing; the fields arrive pre-populated on the API
response). Shown specifically when real win-rate data is too thin to be useful, since it's a
higher-confidence signal in that situation than a shrunk-toward-50%, near-zero-sample win rate.

**Rejected approach — a single "Predicted Power" score per card**: tested whether a card's own
text-derived signal count (the same evasion/banish/destroy/negate/fast-activation/recover-N/
protection/draw regex detectors `computeDeckRating` below already uses) correlates with that card's
own real `adjustedWinRate`, across 1,675 cards with `deckCount >= 20` in `data/analysis/cards.json`.
Result: no meaningful correlation (combined signal count vs. adjustedWinRate: r = 0.057; every
individual signal under 0.07 in magnitude) — one card's keyword presence in a 60-card deck is
swamped by which Champion/archetype/deck-quality actually drove that deck's results, the same
reason `computeDeckRating` only works as a whole-decklist aggregate, not a per-card score. Don't
re-attempt a fabricated per-card number without redoing this validation on a smarter feature set
(e.g. re-testing within one card type/cost bucket instead of pooled across all types).

## Intent cards (`app/src/lib/cardIntent.ts`, `useIntentCards.ts`)

A different relationship than "same effect shape": not near-identical cards, but cards **designed
to work together** — one card produces a resource/condition, another's text explicitly consumes or
cares about that same thing. Three detection tracks, all validated against the real card corpus
before building (2,495 cards, `pipeline/.cache/cards.json`):

- **Named token economies**: `extractProducedTokens` matches `**Summon** a/an/N <Name> token(s)` in
  effect text; `extractConsumedTokens` matches `sacrifice a/an/N <Name>`. Matched by the token's own
  name, not a hardcoded list — Powercell is the validated case (18 cards summon one, 10 separately
  sacrifice one, a genuine shared resource economy), and the same pattern picks up any future shared
  token economy automatically. Most other named tokens are single-card-specific and will show zero
  or one match — expected, not a bug.
- **Tribal/subtype categories**: no production-detection needed — a card simply *is* a producer of
  its own `subtypes` (Chessman, Automaton, Specter, Beast, Elysian, VelTech, ...) by existing. Only
  the consumer side needs a regex: `sacrifice|control(s)?|banish ... from` + a subtype string,
  matched against the real subtype vocabulary collected from the loaded catalog (not hardcoded).
  Validated: "sacrifice/control a Chessman [piece]" alone appears on 10+ real cards.
- **Why `subtypes`, never `types`**: the false-positive risk here is generic sacrifice costs —
  "sacrifice an ally" / "sacrifice an item" appear as unrelated boilerplate on many unconnected
  cards. Matching against the 5 broad `types` values (ALLY/ITEM/WEAPON/ACTION/...) would pair every
  card of that type with every card that happens to sacrifice one, which is noise, not a designed
  relationship. `subtypes` values are specific tribal/flavor categories, not generic cost nouns, so
  this filter is what keeps the feature signal instead of noise.
- **Empower ↔ level-scaled Spell damage**: `extractsEmpowerGrant` matches any card whose effect
  bold-grants `**Empower**` (any magnitude — N, X, or N+X); `benefitsFromEmpower` matches Spell cards
  whose own damage is written in terms of `**LV**` (Grand Archive's own reminder-text shorthand for
  "your champion's level" — e.g. "Deal **LV** damage", "Deal 1+**LV** damage"), since Empower's grant
  is specifically "the next Spell card you activate this turn resolves as if your champion got +N
  level." Verified against the real corpus: 37 cards grant Empower, and of every card referencing
  `**LV**` in a genuine "deal ... damage" clause (12 total, found by a bounded-gap regex — see
  `DEAL_LV_DAMAGE_RE`), 9 are actually Spell-subtype and therefore real Empower consumers; the other
  3 (two Potions, one Skill) also deal LV-scaled damage but aren't Spells, so Empower structurally
  can't apply to them and they're deliberately excluded, not just missed. Unlike the tribal/subtype
  track, there's no `via` value to look up — both sides always report `via: "Empower"`, since it's a
  single named ability rather than an open-ended vocabulary of tokens or subtypes.

Empty results (`feeds`/`poweredBy` both `[]`) are the normal case — only cards actually part of a
named token economy, tribal economy, or the Empower relationship will have entries.

**Validated vs. experimental tiers**: every `IntentMatch` carries a `tier`. `"validated"` is the
sacrifice/control/banish-from (subtypes) and Summon/sacrifice (tokens) triggers above — the ones
actually checked against the real card corpus before shipping. `"experimental"` adds three broader
subtype triggers (reveal/discard/return-from-your-discard-pile) that are real, plausible GA TCG
patterns but have **not** had that same corpus check — a generic-enough trigger is exactly what
turns this from a designed-relationship signal into noise (see the `types`-vs-`subtypes` reasoning
above). `intentCards()` always computes both tiers (cheap — it's just more regexes, no extra data),
but `CardDetail.tsx`'s Intent tab only shows validated matches by default; experimental matches are
opt-in behind a checkbox naming the count and the risk, and are visually tagged when shown. Promote
an experimental trigger to validated only after doing the same real-corpus check the original three
got.

**Subtype normalization is non-destructive**: `normalizeSubtype` only lowercases — it does *not*
strip a trailing "s" the way `normalizeTokenName` does. Subtypes have a canonical spelling straight
from `card.subtypes` (a real API field), so there's nothing to unify the way token names (discovered
from free effect text with no catalog entry of their own) need; blindly stripping "s" here used to
mangle any subtype whose real singular form happens to end in "s" (e.g. a hypothetical "Glass" →
"Glas"), corrupting both the matching key and the `via` text shown to the user. Pluralization when
searching effect text is still handled, just non-destructively — each trigger regex's own trailing
`s?` matches the plural form without altering the stored subtype string.

**A word-token-quantified gap can swallow the separator it still needs**: `DEAL_LV_DAMAGE_RE` was
first drafted with a `FILLER`-style word-token gap, `(?:\s+\S+){0,3}`, between `**LV**` and
`\bdamage\b` — modeled on the subtype triggers' gap conventions above. It matched **zero** real
cards. Root cause: at zero repetitions the group contributes nothing, so `\bdamage\b` had to sit
immediately adjacent to `**LV**` with no space — but the real text always has one ("**LV** damage").
At one-or-more repetitions, `(?:\s+\S+)` itself greedily consumes " damage" as its own `\S+` token,
leaving nothing left over for the literal `\bdamage\b` that follows — so no repeat count ever
actually left a real gap. Rewriting the gaps as plain bounded character classes (`[^.]{0,N}`, which
match whitespace directly rather than needing a separate token boundary) fixed it immediately and
matched all real cases. Caught only by testing the exact regex against the real corpus rather than
trusting it by inspection — same discipline that caught the earlier banish-from and Imbue-prefix
bugs.

**The banish-from gap is bounded, not "anywhere in the sentence"**: the banish trigger originally
allowed `[^.]*` between the subtype match and `from <zone>` — any non-period characters, i.e.
anywhere later in the same sentence. That could credit the banish trigger with a `from` clause
belonging to a different effect entirely, e.g. "Banish a Beast ally, then look at the top card from
your deck" has no period separating the banish from an unrelated draw effect's own "from your deck".
`BANISH_FROM_GAP` bounds it to at most 4 words past the subtype match, which comfortably covers real
phrasing like "banish a Beast ally from your opponent's discard pile" (a 1-word gap: "ally") without
reaching into an unrelated clause further down the same sentence.

## Deck similarity (`pipeline/src/analysis/similarity.ts`)

**Base metric**: weighted Jaccard, a.k.a. Ruzicka similarity, over each deck's card-copy multiset
(main+material, counts included — 4 copies of a card count 4x toward both intersection and union,
not just "present/absent"). `intersection = sum(min(a[card], b[card]))` over shared cards; `union =
aTotal + bTotal - intersection`. Score = `intersection / union`, threshold `MIN_SCORE = 0.35` to
count as a "similar deck" match. Only computed within the same Champion — cross-champion pairs are
always near-zero and not worth the cost.

**Why MinHash/LSH for large groups**: naive O(n²) comparison is fine for small groups but becomes
the dominant cost once a single champion's deck count gets into the thousands — a real full run
timed Guo Jia's group (3,611 decks, ~6.5M pairs) at 49.6s with the naive approach, and multi-year
backfill data will push the biggest groups considerably higher. `LSH_GROUP_THRESHOLD = 250` — at or
below that, the exact nested-loop comparison runs (already sub-second, not worth the setup cost).
Above it, `findLshCandidatePairs` only exactly-scores pairs that land in the same MinHash/LSH
bucket, verified (both synthetically and against real data) to keep ~99%+ recall of the true
`>= 0.35` matches while touching a small fraction of all possible pairs.

**The multiset→set trick**: MinHash is defined over sets (presence/absence), not multisets
(counts). `expandTokens` turns a card-copy multiset into a token set by expanding each card into
`"CardName#1"`, `"CardName#2"`, ... up to its quantity — standard set-Jaccard over the expanded
tokens is then exactly equal to weighted (multiset) Jaccard over the original counts, so the
existing MinHash machinery applies unmodified.

**LSH tuning**: `MINHASH_K = 90` hash functions, `LSH_ROWS = 3`, giving `LSH_BANDS = 30`. The
collision-probability curve `P(candidate) = 1 - (1 - s^rows)^bands` has its 50%-point at
`s = (1/bands)^(1/rows) ≈ 0.32` — deliberately a bit *below* the real `MIN_SCORE = 0.35`, so genuine
matches near the cutoff are still likely to surface as LSH candidates (favoring recall). The exact
weighted-Jaccard call is what actually decides "is this really >= 0.35" — LSH only decides what's
worth exactly-scoring, never what counts as a match.

**Persisted cache**: one file per Champion, `pipeline/.cache/similarity-cache/{champion-slug}.json`,
keyed by `deckId|deckId` pair, only for pairs that cleared `MIN_SCORE` (caching every pair would
grow unbounded with a champion's deck count — an earlier version of this cache hit 347MB and made
runs hang). Non-matches are cheap enough to just recompute on a re-run. Held in memory as a `Map`,
not a plain object — a plain object with millions of string keys degrades badly in V8 (dictionary-
mode storage, GC pressure); a real full-backfill run with heavy netdecking (Guo Jia alone: ~6.8M
matches out of ~6.8M candidates scored, close to a 100% hit rate) grew the old object-cache to the
point where scoring crawled at ~0.2 pairs/sec — Map has none of that degradation at this scale.
Serialized to disk as a JSON array of `[key, value]` pairs, not `{key: value}` — a real run hung for
16+ minutes at 99% CPU inside `Object.fromEntries`/`Object.entries` (confirmed via a macOS `sample`
stack trace showing it stuck in `JSObject::CreateDataProperty`), because building a huge plain
object one property at a time hits the *exact same* V8 degradation the Map switch above was meant
to avoid — it just moved the bottleneck from "every `scorePair` call" to "every flush". Arrays avoid
`CreateDataProperty` entirely.

**Why one cache file per Champion, not one shared cache**: a real run threw `RangeError: Map maximum
size exceeded` (V8's hard cap, ~16.7M entries) after combining just three champion groups in a
dataset this heavily netdecked. Since `scorePair` only ever compares two decks from the *same*
champion group, cache keys never collide across champions — there was never a reason to hold every
champion's pairs in one Map simultaneously, and doing so meant the combined cache size scaled with
the *whole dataset* instead of the largest single champion group. Splitting by champion bounds each
individual cache to that champion's own deck count and sidesteps the V8 limit entirely.

Flushed to disk periodically (every 5 minutes, plus always at the end of each champion's group)
rather than only once at the very end, so a kill/crash mid-run only re-scores whatever happened
since the last flush for the *current* champion — not the whole run.

**Per-deck match list is capped at `TOP_K` (3) while accumulating**, not just at the end —
`addMatch` keeps each deck's match array sorted and bounded to `TOP_K`, evicting the lowest-scoring
entry when a better one is found. This is the actual memory bottleneck in a heavily-netdecked
champion group: one popular list can match nearly every other deck in its group, so letting the
array grow unbounded (only trimming to top-3 at the very end) crashed a real run with a heap OOM at
~4GB even after the `Map` fix above. Only the top 3 are ever read back out, so there's no reason to
hold more than that at any point.

**Incremental publish**: `computeDeckSimilarity` takes an optional `onChampionComplete` callback,
invoked with a champion's finished, already-capped entries right after that group's scoring
completes — a champion's matches are only ever found within its own group (cross-champion pairs are
never scored), so its results are genuinely final the moment the group's loop ends. `build.ts` uses
this to rewrite `data/analysis/similarity.json` after every champion instead of only once at the
end, and writes every other (fast, non-champion-scoped) analysis output to disk as soon as it's
computed rather than holding everything hostage until deck similarity — the slowest step — finishes.

## Floating Memory (`app/src/lib/deckIdentity.ts` — `computeFloatingMemory`)

Regex: `/(\[([^\]]+)\]\s*)?\*\*Floating Memory\*\*/g` over each card's `effect` text (bold-markdown
keyword convention — Grand Archive card text bolds ability keywords as `**Keyword**`). Splits into:

- **`base`** — unconditional Floating Memory (no `[...]` qualifier).
- **`classBonus`** — `[Class Bonus]` Floating Memory, counted only if the qualifier overlaps the
  deck's champion's classes, or `[X Bonus]` matched against the exact champion name.

Deliberately does **not** count `[Level N+]` / `[Sheen N+]`-conditional Floating Memory — whether
those conditions are met depends on live game state (current level/sheen), which isn't derivable
from a static decklist. Undercounting here was chosen over guessing.

## Ally Power (`app/src/lib/deckIdentity.ts` — `computeAllyPower`)

Scoped strictly to `card.types.includes("ALLY")` with a non-null `power` field — verified against
the full catalog to have 100% power coverage on all ALLY-type cards, so this scoping is safe (no
silent gaps). Reports `averagePower`, `totalPower`, `allyCopies`, and a `byPower` histogram, all
weighted by copies in the deck.

## Keyword composition (`app/src/lib/deckIdentity.ts` — `ABILITY_KEYWORDS`, `computeKeywordComposition`)

`ABILITY_KEYWORDS` is a curated ~44-entry list sourced from the official keyword glossary
(rules.gatcg.com/glossary/keywords-and-abilities), deliberately excluding trigger-timing labels,
conditional/restriction markers, "Memory," and "Floating Memory" (which has its own stat above) —
those aren't genuine ability keywords and would pollute the chart. Matching is bold-markdown
presence per card copy (`**Keyword**` / `**Keyword N**`), not repeat-mention counting — a card that
says "Vigor" twice in its own text still counts once. "Preserve"/"Preserved" gets special-cased
matching since it appears in two grammatical forms.

## Damage classification (`app/src/lib/deckIdentity.ts` — `computeDamageComposition`, `parseDamageClauses`, `classifyTarget`)

Damage text is **not** bold-markdown like keywords — it's plain prose ("Deal 3 damage to..."), so
this is regex-parsed directly: `Deal (\d+(?:\+X)?|X) damage\s*([^.]*)` after stripping `**` markers,
one clause per regex match.

**Target classification** (`classifyTarget`) — four real categories plus a fallback, in careful
order because target phrasing is genuinely ambiguous:

1. **Self** — `your champion` / `own champion` is the caster paying a cost against *themselves*
   (e.g. "deal 2 damage to your champion"), not reach damage at an opponent. Stripped out before
   scanning for "champion" so it can't masquerade as a Champion-target clause (this was a real bug
   caught during verification — the fix distinguishes "deal 4 damage to target ally attacking your
   champion" as Ally-targeted, not Champion or Self, since "your champion" there is just flavor
   context for *which* ally, not the target).
2. **Champion** / **Ally** / **Unit** — picked by whichever noun (champion/ally/unit) appears
   *first* in the remaining (self-stripped) target text, since that's the one "target"/"deal damage
   to" is grammatically modifying. "Unit" is Grand Archive's real shared supertype for allies AND
   champions (confirmed via rules.gatcg.com) — bare "target unit" genuinely can resolve to either at
   play time, so it's its own bucket rather than a guess.
3. **Other** — fallback when none of the above nouns appear.

**Value kind**: `fixed` (plain number) vs `variable` (X or N+X — depends on game state, not
derivable from a static list).

**Per-card conditionality label**: `Variable` if any clause on the card is variable, else
`Conditional` if the card has multiple Deal-damage clauses (usually an escalating level-gated
effect), else `Fixed`.

**`championRange` / `allyRange`** — min–max damage totals, summed **only** from clauses that are
both Champion/Ally-targeted *and* fixed-value (excludes Self, Unit, Other, and variable-X clauses
entirely, rather than guessing at a range). This is deliberately a conservative "guaranteed
reachable damage" number, not an upper bound on the deck's real damage output.

## Memory / Reserve cost curves (`app/src/lib/deckIdentity.ts` — `computeMemoryCostCurve`, `computeReserveCostCurve`)

Weighted by copies (not unique cards) — an earlier version weighted by unique card count, but that
made every deck's curve sum to roughly the same total regardless of how varied its costs actually
were, flattening the chart into a uniform size across different decks. Copy-weighting is the
correct "mana curve" convention: it reflects what you'll actually draw and cast, not just what's on
the list once.

Both exclude **Champions** — they start in play from the lineage rather than being drawn and cast,
so their cost answers a different question (deck-building budget, not "what will I be casting turn
to turn"). Both exclude **X-cost cards** (`cost_memory`/`cost_reserve` encoded as `-1`), same
reasoning as the damage classifier. Overflow buckets: memory costs above 6 are rare (verified
against the catalog — only a handful of non-champion cards exceed 3, topping out at 12), folded
into `"6+"`; reserve costs above 8 fold into `"8+"` (real range runs 0–16 with a long thin tail).

## Deck power rating (`app/src/lib/deckIdentity.ts` — `computeDeckRating`)

A four-pillar deck power/style rating — **Aggro / Consistency / Interaction / Resilience**, each
1–10, averaged into a composite — shown on every deck page ("Power Rating" section). Independently
designed for Grand Archive, not a port of Magic: The Gathering's CRISPI system
([deckcheck.co](https://deckcheck.co/blog/crispi-deep-dive), the direct inspiration): CRISPI's own
pillars don't translate as-is. Two structural differences drove real design decisions before any
code was written:

- **No tutors.** "Search your deck/memory for a card" matches only 1–3 cards in the entire catalog
  (confirmed by direct count). CRISPI's Consistency leans heavily on a tutor ladder; that has no
  equivalent here, so Consistency is built from card draw (tiered by repeatable vs. one-shot) and
  Floating Memory instead.
- **No turn-by-turn simulation data exists anywhere** (same reason "average damage per turn" was
  ruled out entirely as a stat, see the damage-classification history). CRISPI's Speed is a
  hypothetical goldfish-turn count that needs either simulation or human judgment — neither is
  available here. **Aggro** replaces it: real, code-computable board-pressure proxies (memory
  curve, average Ally power, evasion, guaranteed damage) rather than a simulated turn count.

Scoped **per decklist, not per champion** — the same champion can have genuinely opposite real
builds. Confirmed directly: Guo Jia's Ascent-winning build (9-0-3, undefeated) reads as a
controlling deck (high memory cost, high Floating Memory, zero damage floor), while a separately
popular Guo Jia build with 15 players reads clearly aggressive (average Ally power 3.00 — double
the format-wide average of 1.53 — plus real evasion and a 45-damage floor). Rating at the champion
level would erase exactly this distinction.

### Calibration

Every score-band boundary is a real percentile, not a round number — computed from **94 real
tournament-winning decklists** (every Regionals + Ascent 1st-place sighting in the dataset at the
time of writing: 90 Regionals + 4 Ascent). This calibration pass changed the design twice before it
ever became a score:

- **Preserve** (a real recursion keyword, 25 cards in the full catalog) appeared in **zero** of the
  94 winning decklists. Dropped entirely as a Resilience signal rather than shipping something
  that's always zero against real data.
- The **median** winning deck's guaranteed champion-damage floor was **0**, and even the 75th
  percentile was still 0 — most competitive decks pressure through combat (Ally power, evasion,
  threat count), not direct-damage spells. Damage floor is real but a *minority-archetype* signal,
  weighted accordingly rather than driving Aggro on its own.

`championDamageFloor` (from `computeDamageComposition`'s `championRange.max`) is capped at 25
before scoring — a deck's total possible burn summed across a whole 60-card list overstates what's
actually usable once the champion (average life ~21, range 15–32) would already be dead.

### Signals and point formulas

All signals are counted weighted by copies in the decklist (main + material, same convention as
every other per-deck stat). `avgNonChampionCost` and `avgAllyPower` reuse `computeAllyPower`;
`floatingMemory` reuses `computeFloatingMemory`; `championDamageFloor`/`allyDamageFloor` reuse
`computeDamageComposition` — no signal is computed twice.

- **Aggro** = `max(0, avgAllyPower−1.0)×10 + evasion×0.5 + threats×0.5 + max(0, 1.5−avgNonChampionCost)×3 + min(championDamageFloor,25)×0.2 + min(allyDamageFloor,15)×0.15`
  `evasion` = Unblockable (×3, rare/premium — only 8 cards in the whole catalog) + Ranged N (×1, common). `threats` = Ally cards with power ≥ 2.
- **Consistency** = `min(repeatableDraw×4 + min(oneShotDraw,30), 50) + min(floatingMemory,35)×0.5`
  `repeatableDraw` (recurring draw effects, weighted higher) vs. `oneShotDraw` (single-use), matching CRISPI's own draw-quality tiering even though the tutor half of its Consistency table doesn't apply here.
- **Interaction** = `min(banish,30)×0.3 + destroy×0.3 + negate×2 + fastSpeed×1.5 + min(championDamageFloor,25)×0.1`
  Banish and Destroy are weighted low deliberately — banish appears in every single one of the 94 winning decks (minimum 9 copies), confirming it's table stakes, not a differentiator. Destroy is real removal but weaker than Banish here specifically because **Preserve** triggers on Destroy, not Banish — a card that's Destroyed can come back; one that's Banished can't. Negate (a real counterspell-equivalent) and Fast-speed access are weighted much higher since those are what actually separated the 94 real winners.
- **Resilience** = `min(recover,30)×0.3 + protection×0.5 + threats×0.3`
  `recover` is Grand Archive's life-gain keyword — a real Resilience lever with no equivalent in Commander's 40-life 4-player pods, since a `recover 3` is meaningfully large against a ~21-life champion. `protection` = Spellshroud + Intercept + Prevent combined.

### Score bands

Each pillar's raw points map to a 1–10 score via boundaries at the real min/p10/p25/median/p75/p90/max
from the 94-deck calibration sample (`toScore` in `computeDeckRating`); below the observed minimum
compresses to a flat 3, since no real tournament winner in the sample scored lower there and there's
no percentile data to subdivide 1–3 further. The composite score averages the four *converted* 1–10
scores, not the raw points (which live on different scales) — same method CRISPI itself uses.

One open finding, not yet resolved: **Resilience's score band is comparatively compressed**
(median 10.2 to p75 12.1 is a narrow gap versus the other three pillars), meaning it differentiates
real winning decks less sharply. This may mean the formula's weights need revisiting, or it may be
a genuine signal that resilience varies less among decks that already win events than aggro/interaction
do — worth watching as more tournament data (the ongoing multi-year backfill) becomes available to
recalibrate against.

## Price history (`pipeline/src/pricing/history.ts`, `app/src/features/pricing/usePriceHistory.ts`)

`buildPrices()` (`pipeline/src/pricing/build.ts`) has always overwritten `data/prices.json`
wholesale every run — only ever "the price right now," even though the pipeline has been running
on a weekly cron (`.github/workflows/data-refresh.yml`) the whole time. `updatePriceHistory`
appends instead of overwriting: it reads the **already-published** `data/priceHistory.json` (not a
separate cache — this pipeline commits `data/` directly, so the file on disk before a run *is* the
prior run's published state, defaulting to `{}` on a missing/unparsable file — covers both "first
run ever" and a corrupt file the same way), pushes one `PriceHistoryPoint` per priced edition keyed
by the same `priceKey(setPrefix, collectorNumber)` `PriceData.prices` uses, and trims each edition's
array to the most recent `PRICE_HISTORY_MAX_POINTS` (52 — about a year at the weekly cadence,
`shared/src/pricing.ts`). An edition present in a prior run's history but missing from the current
run (TCGCSV briefly dropping a product) is left untouched rather than getting a forced null point or
being deleted — just a gap in that edition's series.

**No backfill exists or is possible** — TCGCSV/TCGplayer don't expose historical pricing through the
API this pipeline reads, so history only starts accumulating from whenever this shipped. A card
freshly viewed after ship has exactly one point and shows no chart; the client-side gate is simply
"render nothing below 2 points" (see below), so this resolves itself automatically as weeks pass
rather than needing a "not enough data yet" message.

**Only `market` is tracked**, not the full `PriceQuote` (low/mid/high) — a trend line only needs one
number per point, and `market` is already the number treated as "the real price" everywhere else in
this codebase (Card Stats, `computeDeckPrice`, the price line on `CardDetail.tsx` itself). Kept
**per-edition, not per-card-name**, matching `PriceData.prices` exactly — different printings of the
same card can carry very different prices, so collapsing them would blend unrelated trend lines.

**Bounded growth by construction**: 3,838 priced editions × 52 points × ~55 bytes/point ≈ 11MB
steady-state once a full year has accrued — grows weekly until the cap, then stays flat. This is the
directly-opposite tradeoff from the (rejected) idea of committing the multi-GB Omnidex raw cache to
git every run (see "Omnidex crawl cache seeding" below) — small enough here that a flat-forever file
is simply fine, no seeding/bootstrapping trick needed.

**Client side**: `usePriceHistoryData()` is a thin `usePublishedData("price-history",
"/data/priceHistory.json")` wrapper — the same generic manifest-gated fetch-if-stale + IndexedDB
cache every `analysis-*` dataset uses (see "Client load-time optimizations" below). Deliberately
*not* modeled on `usePriceLookup.ts`'s bespoke direct-fetch-plus-dedicated-Dexie-table pattern —
that pattern exists because `prices.json` needs fast per-card Map lookups across many list-view rows
at once; `priceHistory.json` is only ever read for one card at a time on `CardDetail.tsx`, so the
generic dataset-cache path is the better fit and needed no new Dexie table or schema version.

`CardDetail.tsx` charts whichever series has ≥2 real points — Normal preferred, Foil as a fallback,
nothing rendered if neither qualifies (`selectPriceSeries`) — via `ThemaSparkline`
(`app/src/features/thema/ThemaSparkline.tsx`, a generic `{values: number[]}` inline-SVG line chart
already used for the unrelated Thema price-rank history page), rather than a new chart component or
library.

## TCGplayer Mass Entry export (`app/src/lib/tcgplayerMassEntry.ts`)

Not documented in TCGplayer's public API reference — reverse-engineered from a real working
Moxfield-generated URL and verified live against the actual site. Format:
`tcgplayer.com/massentry?productline=<game>&c=<qty> <name>||<qty> <name>||...`. `"Grand Archive"` is
used verbatim as the productline value, matching TCGplayer's own category name (see
`pipeline/src/pricing/tcgcsv.ts`'s `GA_ARCHIVE_CATEGORY_NAME`) — confirmed by loading a generated URL
directly, which correctly pre-selected "Grand Archive TCG" as the product line and populated every
item, including names with commas/apostrophes ("Sadi, Blood Harvester", "Assassin's Ripper"),
encoded via `URLSearchParams` (which handles the `||` delimiter and special characters correctly
even though it percent-encodes rather than matching the example's raw `+`/`||` styling — both are
valid and TCGplayer's server decodes either the same way).

## Tabletop Simulator export (`app/src/lib/ttsExport.ts`)

Not a spritesheet-based `CustomDeck` (TTS's usual "deck of cards" mechanic, which needs a single
grid image of every card face) — instead, each unique card gets its own 1x1 `CustomDeck` "sheet"
whose `FaceURL` points straight at the card's already-hosted `api.gatcg.com` image. No image
processing needed client-side, and no CORS/canvas-tainting risk from drawing a cross-origin image
onto a canvas. There's no real card-back art in our data, so `BackURL` reuses the same face image
(harmless — `BackIsHidden: true` keeps it hidden in normal play). Main/Material/Sideboard are
exported as separate stacks laid out side by side, mirroring Grand Archive's actual deck structure
rather than merging everything into one pile. A stack that resolves to exactly one card is emitted
as a bare `Card` object instead of a one-item `DeckCustom`, matching how TTS itself serializes a
single-card "stack" when saving — an actual `DeckCustom` with one `ContainedObjects` entry is not a
state TTS produces on its own.

## VOD/media links (`pipeline/src/curated/vods.ts`)

Omnidex has no video-link field, so this is the pipeline's only hand-curated (not crawled) dataset —
edited directly at `pipeline/curated/vods.json` (`{"<eventId>": [{"label", "url"}]}`), checked into
git, and republished to `data/omnidex/vods.json` on every pipeline run regardless of fetch/analysis
mode (same as the manifest write). The publish step cross-checks curated ids against the crawled
cache and warns (doesn't fail the build) on an id that isn't there, since a typo'd event id would
otherwise silently produce a dead link with no feedback. Read client-side via `useVodsData()`
(`app/src/features/events/data.ts`) — a separate `usePublishedData` fetch from `EventDetail.tsx`'s
own `useEventBundle`, since that hook reads live from the Omnidex API + IndexedDB rather than the
published static bundle.

## Omnidex crawl cache seeding (`pipeline/src/omnidex/cache.ts` — `seedCacheFromPublished`)

`pipeline/.cache/omnidex/` (raw per-event bundles, gitignored, ~400MB) is what makes crawls
idempotent — `crawlEvents()` skips re-fetching any event whose cache entry already has a terminal
status, and incremental mode starts its scan from `meta.json`'s `maxKnownId` minus a lookback
window. A brand-new checkout has none of this, so its first "incremental" crawl falls back to
scanning a full year of ids (`config.backfillYear`) with a live, rate-limited API call per id —
slow, and unnecessary, since `pipeline/.cache/omnidex/events/` and the already-committed
`data/omnidex/events/` were verified byte-for-byte identical across all 20,705 events (same keys,
same content — every cached bundle that ever got published went out untouched).

`crawlEvents()` calls `seedCacheFromPublished()` first, which copies every file from
`data/omnidex/events/` into the local cache and seeds `meta.json`'s `maxKnownId` from the published
`index.json`'s max event id — but **only when the local cache is genuinely empty** (zero files);
any existing entry, even one, skips this entirely, so a real in-progress local crawl's state is
never touched. The seeded `maxKnownId` is a conservative underestimate (the published index only
covers deep-fetched "substantial" events, not every id ever scanned and skipped), so the very next
incremental crawl re-scans a bounded gap near the frontier rather than picking up at the exact
prior stopping point — `meta.json` self-corrects to the precise value once that crawl finishes.
Verified locally: seeding populated all 20,705 cached bundles and the following incremental scan
started at id ~59,901 (near the real ~60,729 frontier) instead of scanning from 2026's start.

Deliberately not committing `pipeline/.cache/` itself to git instead of doing this: it changes on
every pipeline run and git doesn't diff JSON blobs efficiently, so the repo/clone size would grow
by roughly the full cache size every week, forever. The scheduled weekly refresh (GitHub Actions)
already avoids re-crawling via `actions/cache` (`.github/workflows/data-refresh.yml`); this seeding
step is for everything outside that cache's scope — a new machine, or an interactive session that
only has a fresh `git clone`.

## Pipeline REPL (`pipeline/src/repl.ts`, `npm run repl` in `pipeline/`)

Formalizes a pattern used repeatedly during this project's development: validating a new stat
against real cached data via a throwaway Node script before trusting it (e.g. the archetype
clustering threshold, the defining-card prevalence fix). The REPL eagerly loads `bundles` (crawled
events, filtered to `status === "complete"`), `catalog`, and `cardIndex` — cheap — and preloads
every `compute*` analysis function into scope *uninvoked*, so an expensive one (`computeDeckSimilarity`,
`computeDeckCardIndex`) only runs if explicitly called.

## Achievements (`pipeline/src/analysis/achievements.ts`)

Every badge is derived purely from data already computed elsewhere in the pipeline (Elo, hipster
scores, deck sightings, judge rosters) — no new crawling, and deliberately no hand-curated tier
(a "best deck name" style community spotlight would follow the VOD-curation pattern above if ever
added, but isn't part of this). Thresholds were chosen by checking real distributions via
`pipeline/src/repl.ts` before picking a number, not guessed:

- **Tournament wins by tier** (`won-worlds`, `won-nationals`, `won-ascent`, `won-regionals`,
  `won-store-championships`, `won-regular`) — first `DeckSighting.winner` per player per
  `eventCategory`.
- **Giant Slayer** — first Elo upset win (reuses the existing `config.upsetEloSwingThreshold`
  detection from `elo.ts`). 2,507 of ~13,700 rated players in a real run.
- **Rating milestones** (`rating-1700`/`1800`/`1900`) — a player's current rating (a running total,
  not a tracked peak) clearing each threshold; `lastEventDate` used as `earnedAt` since the exact
  crossing date isn't tracked. Chosen after checking the real distribution: nobody in a real run
  ever reaches 2200, so milestones above ~1900 would be permanently unearnable.
- **Trailblazer** — first deck at/above a 0.9 hipster novelty score (~top 1%; real-run percentiles:
  median 0.63, 90th 0.78, 99th 0.91).
- **Overperformer** — 3rd `underplaced` ("tough finish") sighting for a player. 142 of ~13,700
  players clear this in a real run (max ever seen: 7).
- **Trendsetter** — earliest player of a decklist signature (same `canonicalSignature` used for
  `DeckSighting.duplicateCount`, exported from `deckSightings.ts` rather than reimplemented) that
  at least 4 other distinct players went on to run. 135 of ~48,900 signatures qualify in a real
  run. Recomputes signatures directly from bundles rather than adding a signature field to the
  published `DeckSighting` type, which is deliberately kept lean (see its own doc comment).
- **Grinder** — 15th public decklist within one season, per player. 102 of ~19,400 (season,
  player) pairs clear this in a real run (max ever seen: 28).
- **Veteran Judge** / **Dedicated Judge** — judge level ≥25, or 50+ events judged, tracked directly
  from each bundle's `judges` field (not the separately-published judge roster, to avoid a
  cross-module dependency between `omnidex/build.ts` and `analysis/build.ts`). 114 and 137 of 929
  judges respectively in a real run (max level seen: 52; max events judged: 196).

Achievements like Grinder and Trendsetter are earned repeatably in the underlying data (multiple
qualifying seasons, multiple originated decklists) but are collapsed to a single unlock per player
— the earliest qualifying instance — so the achievement model stays "one badge per player per
achievement," consistent with every other achievement here, rather than showing duplicate badges.

Each `AchievementUnlock` also carries optional `eventId`/`deckId`/`opponentPlayerId` fields so the
UI can link out to the event, the specific decklist, or (for Giant Slayer) both sides of the match
— see "Compare-tool deep links" below for how those get turned into links.

## Compare-tool deep links (`app/src/features/compare/deepLink.ts`)

`buildCompareLink(pairs)` builds a `/compare?add=eventId:player,...` URL; `CompareIndex.tsx` reads
the `add` param once player/event data is loaded, seeds the compare set from it, then strips the
param (so removing a seeded deck later doesn't re-add it on a refetch). Two call sites:
`EventPairings.tsx` (a "Compare decklists" link per 2-sided, numeric-id pairing — team-battle
pairings, which have non-numeric ids per the Elo note above, are excluded) and achievement unlocks
(`AchievementDetail.tsx` — "View deck" for a single `deckId`, "Compare match" for Giant Slayer's
`opponentPlayerId`, comparing both sides of the actual upset).

## Client load-time optimizations

Three changes, made together to address the app's biggest measured load-time cost: fetching and
parsing the published datasets in `data/analysis/` and `data/omnidex/`, several of which are tens
of megabytes.

**1. `data/manifest.json` (`pipeline/src/manifest.ts`, `app/src/lib/sync/usePublishedData.ts`)** —
a tiny `{datasetKey: generatedAt}` map, written once at the very end of every pipeline run by
re-reading each published file's first ~200 bytes (every dataset writes `generatedAt` as its first
key, so this avoids `JSON.parse`-ing files that can be 90MB+ just to check one field). Before this
existed, `usePublishedData` had no way to know a dataset was unchanged without downloading and
fully parsing it first — every mount of a component using a large dataset (e.g. opening a card's
"Combos" tab, which uses `deck-card-index.json`) re-paid that cost even when nothing had changed
since the previous visit. Now the manifest is checked first (cached at module scope, one fetch per
page load), and the real file is only fetched when its `generatedAt` differs from what's already in
IndexedDB. Falls back to the old always-fetch behavior if the manifest is missing or fails to load,
so this is purely additive — nothing breaks if `manifest.json` is stale or absent.

**2. Dictionary-encoded `deck-card-index.json` (`pipeline/src/analysis/deckCardIndex.ts`,
`shared/src/analysis-types.ts`'s `decodeCardLines`)** — this dataset's lines used to be
`{"name": "...", "quantity": N}` per card per deck, repeating the same ~2,500 card names millions
of times across ~57k decks (93MB raw in one real run). Now each deck's lines are
`[cardNameIndex, quantity]` tuples against a single `cardNames: string[]` dictionary shipped once
per file, and consumers (`useCardCombination.ts`, `useDeckPopularity.ts`) either work directly
against the numeric indices (faster than string-keyed Sets/Maps, as a bonus) or decode back to
`{name, quantity}` via `decodeCardLines` where the original shape is still needed (signature
building, rendering). The full, human-readable form is preserved on disk at
`pipeline/.cache/deck-card-index-full.json` — a local working artifact only, not published or
committed — in case the raw per-deck data is needed for debugging without re-walking every event
bundle.

**3. Route-based code-splitting (`app/src/routes.tsx`)** — every page component is now
`React.lazy`-loaded instead of eagerly imported, so Vite emits one JS chunk per route instead of a
single bundle containing all ~25 pages' code. Verified with a real build: the main bundle dropped
from 506KB (146KB gzipped) to 320KB (101KB gzipped), with the rest split into small per-route
chunks fetched on demand. `Home` stays eagerly imported since it's the most common landing page and
lazy-loading it would just add a loading flash for no benefit.

**4. In-flight fetch dedup + a lean `deck-popularity-index.json` (`app/src/lib/sync/usePublishedData.ts`,
`pipeline/src/analysis/build.ts`)** — added after a real reported bug: Popular Decks / All Decks
reloading itself repeatedly on mobile. Root-caused to two compounding issues, verified live with a
cleared IndexedDB and the network panel:
- `usePublishedData` had no dedup for concurrent callers wanting the same key — `/decks` mounts
  `useDeckPopularity` and `useCardCombination`, which both pull `deck-card-index.json`, and neither
  had written the IndexedDB cache yet when the other checked, so each independently fetched and
  `JSON.parse`'d the same 20MB+ file. Fixed with a module-scoped `Map<key, Promise<void>>` so
  concurrent callers share one in-flight refresh instead of racing.
- Even fully deduped, `useDeckPopularity.ts` (which both pages depend on for their base list) still
  needed the *entire* `deck-sightings.json` — which had grown to 40MB+ (every sighting's full
  keyword breakdown, price, and repeated event/season name strings) — just to read each sighting's
  `championName`/`winRate` for grouping. Fixed by publishing `deck-popularity-index.json`, a lean
  8-field projection (`DeckPopularityEntry` in `shared/src/analysis-types.ts`) with none of that
  weight, and pointing `useDeckPopularity.ts` at it instead. `PopularDeckRow.tsx`'s "Played by"
  section (which does need the full per-sighting detail) was also split into a child component,
  `ExpandedDeckRow`, so that fetch only fires once a row is actually expanded — previously every
  one of the ~30 rows on a page fired it unconditionally on mount, unused unless expanded.

Together: on a cold cache, several concurrent multi-hundred-MB in-memory parses is enough memory
pressure that Safari will silently kill and reload the tab — exactly the reported symptom. Not
provably eliminated without device-level memory profiling, but the actual bytes downloaded and
parsed for a first visit to either page dropped from roughly 65MB (deck-sightings.json +
deck-card-index.json, each fetched multiple times) to a fraction of that (deck-popularity-index.json
+ deck-card-index.json, each fetched exactly once).

**Operational notes for future pipeline runs** (nothing manual required, but worth knowing):
- The manifest is regenerated unconditionally at the end of every run, reading whatever's currently
  on disk — safe to run after a fetch-only, analysis-only, or full pipeline invocation; it always
  reflects reality rather than tracking state through the run.
- The `deck-card-index.json` dictionary is rebuilt from scratch every run (card indices are **not**
  stable across generations — index 42 today might be a different card next run). This is never a
  problem in practice since the app always fetches `cardNames` and `decks` together as one atomic
  JSON file, but don't persist a bare `cardNameIndex` anywhere without also persisting which
  generation's dictionary it came from.
- `pipeline/.cache/deck-card-index-full.json` is overwritten every run and never committed — if
  the `.cache/` directory is deleted entirely, it's simply recreated on the next run with no data
  loss (it's derived from the same event bundles the encoded version comes from).

## ShoutAtYourDecks filter thresholds (`pipeline/src/shoutatyourdecks/filter.ts`)

`shouldKeepDeck` decides which scraped decks are worth the browser cost of a full decklist fetch
(see `pipeline/src/shoutatyourdecks/README.md` for the full three-phase pipeline). Two checks:

- **`mainCount >= config.sydMinMainDeckSize`** (default 60, `GATCG_SYD_MIN_MAIN_DECK_SIZE` env
  override). Grand Archive's constructed Main deck minimum is 60 cards — more is legal, less isn't
  a real deck. `mainCount` comes from the deck page's own `Main (N)` header (see
  `metadataFetch.ts`), so this check runs on the cheap HTTP-only metadata pass, before anything
  pays for a browser session.
- **Title excludes `config.sydTitleExcludePattern`** (default `"copy"`, case-insensitive,
  `GATCG_SYD_TITLE_EXCLUDE_PATTERN` env override). Titles like "Untitled Deck - Copy" are scratch
  duplicates left over from a user editing in the site's own deck builder, not decks meant to be
  browsed. Validated against a live 24-deck sample: every title matching this pattern was junk (no
  false positives) — none of the 20 kept decks in that sample happened to fall under the 60-card
  threshold, so that check is validated by definition/rules rather than by an observed example yet;
  worth spot-checking again once a full crawl surfaces some.

## ShoutAtYourDecks analytics (`pipeline/src/shoutatyourdecks/analytics/`)

Four stats computed over the ShoutAtYourDecks scrape (see `pipeline/src/shoutatyourdecks/README.md`)
and published to `data/shoutatyourdecks/analytics/` — deliberately standalone from every Omnidex-
derived stat above and from `pipeline/src/analysis/`, per the same "separate dataset" decision the
scraper itself was built under. None of this reuses Omnidex's `canonicalSignature`/`deckSightings.ts`/
`similarity.ts`, even where the underlying idea is the same — small logic duplication is the
deliberate trade-off for keeping the two sources fully decoupled.

- **Card inclusion** (`cardInclusion.ts`): `deckCount`/`percentOfDecks`/`totalCopies`/
  `avgCopiesWhenIncluded` per card, over main+material (deck-identity convention below), resolved
  against the card catalog via `resolveCard` (`pipeline/src/cards/catalog.ts`). Per-champion
  breakdowns are only published for champions with `>= config.sydMinChampionSampleSize` (default 5)
  decks — same reasoning as `minBattleChartSampleSize` elsewhere in this doc.
- **Champion/element popularity** (`popularity.ts`): champion popularity covers every filtered deck
  (no decklist needed — it's already in the cheap metadata). Element popularity needs the actual
  card list, so it's scoped to decks with a fetched decklist only (`elementDecksConsidered`), and
  uses the **top-2-elements-by-copies, NORM-excluded** identity convention — the same one
  `computeDeckIdentity` (`app/src/lib/deckIdentity.ts`) uses, reimplemented locally here since
  `pipeline` can't import from the `app` workspace directly.
- **Price distribution** (`priceDistribution.ts`): min/p10/p25/median/p75/p90/max/mean of
  `priceLow`, overall and per-champion (same min-sample gate as card inclusion). Decks with a null
  price are excluded entirely rather than treated as $0.
- **Archetype clustering** (`archetypeClustering.ts`): groups decks by `(champion, exact main+material
  card list)` — a fresh, standalone reimplementation of the same idea as Omnidex's
  `canonicalSignature`. **Exact-match only, not similarity-based** — this finds decks that are
  literal copies of each other (real signal: validated against the first partial-data run, where the
  largest cluster was 16 decks that all traced back to a named regional-tournament list), but will
  not group "same core, 3 different tech slots" decks together. Clusters below
  `config.sydMinArchetypeClusterSize` (default 2) aren't published — most decks are singletons, which
  is expected for hand-built decklists, not a bug. A real similarity-based archetype detector (the
  way `similarity.ts`/`hipster.ts` work for Omnidex) is a materially bigger undertaking and
  deliberately out of scope here.

- **Deck era inference** (`deckEra.ts`): ShoutAtYourDecks never captured a real deck creation/update
  date — there's no such field on the site at all. This infers a *lower bound* instead: a card's
  release date comes from its earliest printing (`CardSignature.editions[].releaseDate`, sourced
  from the raw GA API's `set.release_date` — previously fetched and silently discarded by
  `pipeline/src/cards/catalog.ts`, now kept), and a deck's inferred date is the **max** across every
  card in it — i.e. a deck can't be older than the newest card it requires. Decks are bucketed by
  the set that produced that bounding card, standing in for a "season" grouping in the absence of
  any real date. This is honestly a floor, not the deck's actual date: a deck built yesterday from
  only year-old cards infers as year-old. Known wrinkle: alternate-printing set prefixes (`PTM` vs
  `PTM 1st`, `AMB` vs `AMB Alter`) currently bucket separately even though they're the same
  timeframe — not wrong, just more fragmented than a true season grouping would be. The "Deck era"
  chart on `/community-decks` (`CommunityDecksIndex.tsx`) addresses this client-side rather than in
  the published data: it merges buckets sharing the exact same `earliestDate` before charting (real
  data has several same-day pairs — `PTM`/`PTM 1st`, `RDO`/`RDO 1st`, `AMB`/`AMB 1st`, three-way for
  `PRD`/`PRD 1st`/`PRDSD` — going from 24 published buckets down to 16 real release moments), and
  shows the merged set name(s) on hover. The published `deck-era.json` itself is left un-merged —
  other consumers may want the per-print-variant granularity, so the fold is a display-only choice,
  not a change to what's published.

Every output file's `generatedAt` is paired with a `decksConsidered` (or per-stat equivalent) count —
worth checking before trusting a number, since Phase 3 of the scrape (full decklist fetch) can still
be in progress when this runs, and four of the five stats depend on it.

## The "deck identity" convention

Used consistently across nearly every stat above and in `useDeckPopularity.ts`, `computeDeckIdentity`,
`computeDeckComposition`, and the pipeline's `canonicalSignature`: **main + material** define what a
deck "is" for grouping/signature/classification purposes; **sideboard is excluded** as situational
tech rather than part of the deck's identity. This is why, e.g., Popular Decks groups by
main+material only, and why damage/keyword/memory-curve stats on a deck page don't include sideboard
cards. The one deliberate exception is the TCGplayer export button, which includes sideboard too —
that's a purchasing action ("buy everything shown"), not a classification one.
