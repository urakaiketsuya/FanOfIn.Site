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

**Persisted cache**: `pipeline/.cache/similarity.json` keyed by `deckId|deckId` pair, only for pairs
that cleared `MIN_SCORE` (caching every pair would grow unbounded with a champion's deck count — an
earlier version of this cache hit 347MB and made runs hang). Non-matches are cheap enough to just
recompute on a re-run.

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

## The "deck identity" convention

Used consistently across nearly every stat above and in `useDeckPopularity.ts`, `computeDeckIdentity`,
`computeDeckComposition`, and the pipeline's `canonicalSignature`: **main + material** define what a
deck "is" for grouping/signature/classification purposes; **sideboard is excluded** as situational
tech rather than part of the deck's identity. This is why, e.g., Popular Decks groups by
main+material only, and why damage/keyword/memory-curve stats on a deck page don't include sideboard
cards. The one deliberate exception is the TCGplayer export button, which includes sideboard too —
that's a purchasing action ("buy everything shown"), not a classification one.
