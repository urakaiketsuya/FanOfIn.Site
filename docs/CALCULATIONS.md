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

Data-derived named builds within each Champion (e.g. "Water Guo Jia") — distinct from
`archetypes.json`'s `ArchetypeSummary` (the older, coarser per-Champion rollup, still published
unchanged since Battle Chart reads it for its matchup matrix). Reference point was Fractal of
Insight's `/deck/` page (~51 named archetypes like "Crux Lorraine"), but their system —
re-read directly from `fractal/archetypes.py` — is a **hand-curated rule engine**
(`require`/`exclude` card lists, `require_combos`, `require_element`, ~51 definitions authored by
a human) under AGPL-3.0. Copying their curated archetype-to-card mappings would carry that
license's obligations, so this is independently derived from our own decklists via clustering, not
curation — same general *shape* (named builds defined by discriminating cards), different origin.

**Method**:
1. Group a Champion's decks by exact main+material signature (same convention as
   `useDeckPopularity.ts`'s `canonicalSignature`) — keep only signatures with ≥2 distinct players
   (same bar as Popular Decks; a one-off brew isn't a "build").
2. **Greedy nearest-seed clustering**, not union-find/single-linkage: sort build-groups by player
   count descending; each group joins the best-scoring *existing cluster seed* (weighted Jaccard,
   reused from `similarity.ts`) if ≥ `CLUSTER_THRESHOLD` (0.45), else seeds a new cluster.
   Single-linkage was tried first and rejected — verified live against Guo Jia (our largest
   Champion, 7,154 decks → 238 multi-player build-groups) that union-find on any pairwise edge
   ≥ threshold **chains into 3-4 giant blobs at every threshold from 0.35-0.6** (a resembles-b,
   b resembles-c doesn't mean a resembles-c, but single-linkage merges them anyway). Greedy
   nearest-seed avoids this — at 0.45, Guo Jia produces a clean 10-cluster split whose top clusters
   separate by element (Water/Wind/Fire), confirmed by inspecting each cluster's defining cards.
3. Clusters need ≥5 total players (`config.minBattleChartSampleSize`) to publish.
4. **Defining cards**: present in ≥80% of the cluster's player-weighted decks (`DEFINING_MIN_IN_CLUSTER`)
   *and* present in <85% of the Champion's other decks (`DEFINING_MAX_CHAMPION_WIDE`) — the second
   condition is what keeps a cluster's defining-card list from just being the Champion's universal
   staples. Both are initial values chosen from inspecting real output, same status as `MIN_SCORE`
   or the trend ±2pp band elsewhere in this doc — tunable, not final.
5. **Naming**: dominant non-colorless element among the defining cards (via the card catalog's
   `elements` field), formatted `"{Element} {Champion}"`. No element signal → falls back to
   `"{Champion} — {top defining card}"`. When two of a Champion's clusters land on the same name,
   the smaller one gets `(card name)` appended — walking its own defining-card list in order for
   the first name not already claimed by an earlier disambiguation in the same collision group
   (not just its #1 card — a real bug during development: three-plus same-named clusters can share
   the same top *generic* defining card, e.g. "Dungeon Guide", and collide again after a naive
   single-card disambiguation).

**Scope**: per-Champion only, not cross-Champion the way Fractal's "Slimes" or "Cats" can span
multiple Champions — matches this project's framing (a Champion can have multiple distinct builds)
and avoids a bigger, riskier generalization. Live run: 128 named builds across 20 Champions,
zero duplicate names, Guo Jia's top 3 (Water/Wind/Fire, ~120-170 players each) matching hand
inspection exactly.

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

## The "deck identity" convention

Used consistently across nearly every stat above and in `useDeckPopularity.ts`, `computeDeckIdentity`,
`computeDeckComposition`, and the pipeline's `canonicalSignature`: **main + material** define what a
deck "is" for grouping/signature/classification purposes; **sideboard is excluded** as situational
tech rather than part of the deck's identity. This is why, e.g., Popular Decks groups by
main+material only, and why damage/keyword/memory-curve stats on a deck page don't include sideboard
cards. The one deliberate exception is the TCGplayer export button, which includes sideboard too —
that's a purchasing action ("buy everything shown"), not a classification one.
