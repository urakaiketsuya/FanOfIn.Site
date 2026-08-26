import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { DeckSimilarityEntry, SimilarDeck } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import { resolveCard } from "../cards/catalog.js";
import type { AnalysisContext } from "./context.js";
import { config } from "../config.js";

const CACHE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/similarity.json");
const TOP_K = 3;
const MIN_SCORE = 0.35;

/**
 * Bump whenever a change would make an already-cached score untrustworthy: `MIN_SCORE`,
 * `MINHASH_K`/`LSH_ROWS` (LSH only affects which pairs get *exactly* scored, but a bump here is
 * cheap insurance if that ever stops being true), `weightedJaccard`'s formula, or — the one real
 * precedent for this so far — how `cardCounts` gets derived from a deck's raw card lines (e.g. the
 * card-name canonicalization fix in commit 3d207c9c, which changed weightedJaccard's effective
 * inputs with no cache invalidation at the time). A version mismatch (including the pre-versioning
 * on-disk shape, a bare array with no `version` field at all) is treated as a full cache miss for
 * that champion — see `loadCache`.
 */
const SIMILARITY_CACHE_VERSION = 1;

/**
 * Groups at/below this size just run the exact O(n²) comparison — at ~31k pairs (250 choose 2)
 * that's already sub-second, so MinHash/LSH setup cost isn't worth paying. Above this, per-champion
 * deck counts get large enough (thousands today, likely tens of thousands once multi-year backfill
 * data is included — see Phase 12) that O(n²) genuinely dominates runtime: a real full-backfill run
 * showed one champion group alone (Guo Jia, 3611 decks) taking 49.6s of the exact comparison, and
 * multi-year data would multiply that quadratically. LSH below is the standard technique for this —
 * approximate near-duplicate detection in roughly linear time instead of quadratic.
 */
const LSH_GROUP_THRESHOLD = 250;

/**
 * MinHash signature length (number of hash functions) and LSH banding shape. With rows=3, bands=30,
 * the collision-probability curve P(candidate) = 1-(1-s^rows)^bands has its 50%-point at
 * s=(1/bands)^(1/rows)≈0.32 — deliberately a bit below the real MIN_SCORE=0.35 threshold, so
 * genuine matches near the cutoff are very likely to surface as candidates (favoring recall) and
 * only the *exact* weightedJaccard call below ever actually decides "is this really >= 0.35".
 * LSH here only decides what to bother exactly-scoring, never what counts as a match.
 */
const MINHASH_K = 90;
const LSH_ROWS = 3;
const LSH_BANDS = MINHASH_K / LSH_ROWS;
const MERSENNE_PRIME = 2147483647; // 2^31 - 1

interface DeckRef {
  deckId: string;
  eventId: number;
  eventName: string;
  player: number;
  championName: string;
  cardCounts: Map<string, number>;
}

/**
 * Weighted Jaccard (Ruzicka similarity) over each deck's card-copy multiset. Iterates the smaller
 * map and does direct lookups against the larger one, rather than building a `new Set([...a, ...b])`
 * union every call — that allocation was pure overhead paid millions of times across a champion
 * group, and this does the identical math without it.
 */
export function weightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const [key, smallValue] of small) {
    const largeValue = large.get(key);
    if (largeValue === undefined) continue;
    intersection += Math.min(smallValue, largeValue);
  }
  let aTotal = 0;
  for (const v of a.values()) aTotal += v;
  let bTotal = 0;
  for (const v of b.values()) bTotal += v;
  // union of a multiset max(a,b) summed over all keys == aTotal + bTotal - intersection (each
  // shared key's min gets double-counted once in aTotal and once in bTotal, so subtract it back out once).
  const union = aTotal + bTotal - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Deterministic (not cryptographic) hash coefficients for MinHash — same seed every run so signatures are stable across machines, which matters for the persisted score cache. */
function makeHashCoefficients(k: number): { a: number; b: number }[] {
  let seed = 1;
  function next(): number {
    seed = (seed * 48271) % MERSENNE_PRIME;
    return seed;
  }
  return Array.from({ length: k }, () => ({ a: next(), b: next() }));
}
const HASH_COEFFICIENTS = makeHashCoefficients(MINHASH_K);

/** Same djb2-style string hash used elsewhere in this codebase (see app/src/lib/hash.ts) — just needs to be a cheap, stable base hash to derive the K permutation hashes from. */
function baseHash(token: string): number {
  let h = 5381;
  for (let i = 0; i < token.length; i++) h = (h * 33) ^ token.charCodeAt(i);
  return h >>> 0;
}

/** Expands a card-copy multiset into distinct tokens ("CardName#1", "CardName#2", ...) so standard set-MinHash over the expanded set exactly corresponds to weighted (multiset) Jaccard over the original counts. */
function expandTokens(cardCounts: Map<string, number>): string[] {
  const tokens: string[] = [];
  for (const [name, qty] of cardCounts) {
    for (let copy = 1; copy <= qty; copy++) tokens.push(`${name}#${copy}`);
  }
  return tokens;
}

function computeMinHashSignature(tokens: string[]): Uint32Array {
  const signature = new Uint32Array(MINHASH_K).fill(0xffffffff);
  for (const token of tokens) {
    const base = baseHash(token);
    for (let i = 0; i < MINHASH_K; i++) {
      const { a, b } = HASH_COEFFICIENTS[i];
      const h = ((Math.imul(a, base) >>> 0) + b) % MERSENNE_PRIME;
      if (h < signature[i]) signature[i] = h;
    }
  }
  return signature;
}

/**
 * LSH candidate generation: bands decks together by chunks of their MinHash signature, then treats
 * any two decks that land in the same bucket for *any* band as worth an exact comparison. Returns
 * index pairs into `group`, deduped, so the caller only ever exactly-scores real candidates instead
 * of every possible pair.
 */
function findLshCandidatePairs(group: DeckRef[]): [number, number][] {
  const signatures = group.map((deck) => computeMinHashSignature(expandTokens(deck.cardCounts)));
  const buckets = new Map<string, number[]>();

  for (let band = 0; band < LSH_BANDS; band++) {
    const start = band * LSH_ROWS;
    for (let i = 0; i < group.length; i++) {
      const sig = signatures[i];
      let key = `${band}:`;
      for (let r = 0; r < LSH_ROWS; r++) key += `${sig[start + r]},`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(i);
      else buckets.set(key, [i]);
    }
  }

  const seen = new Set<number>();
  const pairs: [number, number][] = [];
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    for (let x = 0; x < bucket.length; x++) {
      for (let y = x + 1; y < bucket.length; y++) {
        const i = Math.min(bucket[x], bucket[y]);
        const j = Math.max(bucket[x], bucket[y]);
        const pairId = i * group.length + j;
        if (seen.has(pairId)) continue;
        seen.add(pairId);
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

/** Filesystem-safe key for a champion's own cache file — champion names are plain English words/spaces, so this is just enough sanitizing to be safe, not a general slugifier. */
function cacheFileFor(championName: string): string {
  const slug = championName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
  return path.join(path.dirname(CACHE_PATH), `similarity-cache/${slug}.json`);
}

/**
 * One cache file per Champion, not one combined cache for the whole run — a real run threw
 * `RangeError: Map maximum size exceeded` (V8's hard cap, ~16.7M entries) after combining just
 * three champion groups' worth of matches in a dataset this heavily netdecked (Tristan alone: LSH
 * found 8.7M candidates out of 12.6M possible, 69%). Since `scorePair` only ever compares two
 * decks from the *same* champion group, cache keys never collide across champions anyway — there
 * was never a reason to hold every champion's pairs in one Map simultaneously. Per-champion files
 * also keep each individual cache small enough that the `Map`/array-serialization fixes above
 * actually hold (a single champion's pair count is bounded by that champion's own deck count, not
 * the whole dataset's).
 *
 * `Map` rather than a plain object, and a JSON array of `[key, value]` pairs rather than
 * `{key: value}` on disk — both documented (with the incidents that found them) in
 * docs/CALCULATIONS.md, since the reasoning matters for not re-introducing either bug.
 */
interface SimilarityCacheFile {
  version: number;
  entries: [string, number][];
}

/** A version mismatch — including a pre-versioning file, which has no `version` field at all and so never matches — is treated as a full cache miss: an empty Map means every pair recomputes and the file gets rewritten (in the current version) by the next `writeCache`, same as a champion with no cache file yet. */
async function loadCache(championName: string): Promise<Map<string, number>> {
  try {
    const parsed = JSON.parse(await readFile(cacheFileFor(championName), "utf-8")) as Partial<SimilarityCacheFile>;
    if (parsed.version !== SIMILARITY_CACHE_VERSION || !parsed.entries) {
      console.log(`[similarity] ${championName}: cache version mismatch (had ${parsed.version ?? "none"}, want ${SIMILARITY_CACHE_VERSION}) — recomputing`);
      return new Map();
    }
    return new Map(parsed.entries);
  } catch {
    return new Map();
  }
}

async function writeCache(championName: string, cache: Map<string, number>): Promise<void> {
  const filePath = cacheFileFor(championName);
  await mkdir(path.dirname(filePath), { recursive: true });
  const file: SimilarityCacheFile = { version: SIMILARITY_CACHE_VERSION, entries: Array.from(cache.entries()) };
  await writeFile(filePath, JSON.stringify(file), "utf-8");
}

/**
 * Pairwise decklist similarity, scoped to decks sharing the same Champion — cross-champion pairs
 * are always near-zero and not worth the O(n²) cost, and within-champion is still the
 * interesting comparison ("which Alice builds are actually the same list?"). Scores are
 * persisted to a cache keyed by deck-id pair so repeat runs only price out newly-added decks.
 * Skipped entirely in fast mode, per the plan.
 */
export async function computeDeckSimilarity(
  bundles: OmnidexEventBundle[],
  ctx: AnalysisContext,
  /**
   * Called with one champion group's finished entries right after that group's scoring
   * completes — lets the caller persist `data/analysis/similarity.json` incrementally instead of
   * only at the very end. A champion's matches are only ever found within its own group (cross-
   * champion pairs are never scored), so a group's results are genuinely final the moment its
   * loop below finishes; no later champion can add to them.
   */
  onChampionComplete?: (entries: DeckSimilarityEntry[]) => Promise<void>,
): Promise<DeckSimilarityEntry[]> {
  if (config.fastMode) return [];

  const decks: DeckRef[] = [];
  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = ctx.getEventSignatures(bundle);
    for (const entry of bundle.decklists) {
      const championName = signatures.get(entry.player)?.championName;
      if (!championName) continue;
      const cardCounts = new Map<string, number>();
      for (const line of [...entry.decklist.main, ...entry.decklist.material]) {
        // Canonicalize — a mis-cased card would otherwise count as a *different* card between two
        // decks that are actually identical, understating their weighted-Jaccard similarity.
        const name = resolveCard(ctx.cardIndex, line.card)?.name ?? line.card;
        cardCounts.set(name, (cardCounts.get(name) ?? 0) + line.quantity);
      }
      decks.push({
        deckId: `${bundle.id}:${entry.player}`,
        eventId: bundle.id,
        eventName: bundle.event.name,
        player: entry.player,
        championName,
        cardCounts,
      });
    }
  }

  const byChampion = new Map<string, DeckRef[]>();
  for (const deck of decks) {
    const list = byChampion.get(deck.championName) ?? [];
    list.push(deck);
    byChampion.set(deck.championName, list);
  }

  // The O(n²) cost is entirely driven by each champion's own deck count, so log group sizes up
  // front — this is the only way to tell "grinding through a genuinely huge champion group" apart
  // from "hung" from the outside, since nothing else in this function prints until it's all done.
  const groupsBySize = Array.from(byChampion.entries()).sort((a, b) => b[1].length - a[1].length);
  const totalPairs = groupsBySize.reduce((sum, [, group]) => sum + (group.length * (group.length - 1)) / 2, 0);
  console.log(
    `[similarity] ${decks.length} decks across ${groupsBySize.length} champions, ~${totalPairs.toLocaleString()} pairs at full O(n²). Largest groups: ${groupsBySize
      .slice(0, 5)
      .map(([name, group]) => `${name} (${group.length})`)
      .join(", ")}`,
  );

  // Reloaded fresh per champion at the top of the loop below — see cacheFileFor's doc comment for
  // why this can't be one cache shared across the whole run.
  let cache = new Map<string, number>();
  let currentChampionName = "";
  const matches = new Map<string, SimilarDeck[]>(decks.map((d) => [d.deckId, []]));

  const startedAt = Date.now();
  let pairsCompared = 0;
  let matchesFound = 0;
  let lastLogAt = startedAt;
  let lastFlushAt = startedAt;
  let flushing: Promise<void> | null = null;

  // Previously the cache only ever hit disk once, at the very end — on a multi-hour run that
  // meant killing (or crashing) the process at any point lost every match found so far, cache
  // included. Flushing periodically means a restart only re-does the pairs scored since the last
  // flush, not the whole run. Guarded by `flushing` so a slow write never overlaps a concurrent one.
  function maybeFlush(): void {
    if (flushing || Date.now() - lastFlushAt < 5 * 60_000) return;
    lastFlushAt = Date.now();
    const championName = currentChampionName;
    const snapshot = cache;
    flushing = writeCache(championName, snapshot).finally(() => {
      flushing = null;
    });
  }

  function scorePair(a: DeckRef, b: DeckRef): void {
    const pairKey = a.deckId < b.deckId ? `${a.deckId}|${b.deckId}` : `${b.deckId}|${a.deckId}`;

    let score = cache.get(pairKey);
    if (score === undefined) {
      score = weightedJaccard(a.cardCounts, b.cardCounts);
      // Only cache pairs that clear the threshold — the vast majority of pairs within a
      // champion group score near zero, so caching every pair grows O(n²) with the champion's
      // deck count and balloons unbounded (this cache hit 347MB and made runs hang). Only
      // real matches are ever read back out, so non-matches are cheap to just recompute.
      if (score >= MIN_SCORE) cache.set(pairKey, score);
    }
    pairsCompared++;
    if (score < MIN_SCORE) return;

    addMatch(a.deckId, { deckId: b.deckId, eventId: b.eventId, eventName: b.eventName, player: b.player, score });
    addMatch(b.deckId, { deckId: a.deckId, eventId: a.eventId, eventName: a.eventName, player: a.player, score });
    matchesFound++;
  }

  /**
   * Keeps each deck's match list capped at TOP_K, sorted descending, instead of accumulating
   * every match found before trimming at the very end. In a heavily-netdecked champion group
   * (verified live: one Guo Jia run found ~6.8M matches on ~6.8M candidates scored, i.e. close to
   * a 100% hit rate — a handful of "the" list gets played by thousands of players) an unbounded
   * per-deck array is the actual memory blow-up, not the pair cache: a single popular list can
   * match nearly every other deck in its group, so its match array would otherwise grow to
   * thousands of entries when only the top 3 are ever read back out. This crashed a real run with
   * a heap OOM at ~4GB.
   *
   * Exact duplicates (score === 1, an identical main+material card list — weightedJaccard of two
   * equal multisets is always exactly 1, no floating-point fuzziness) are excluded from ever
   * taking a slot here. Without this, a popular deck's own TOP_K=3 slots fill up entirely with
   * other copies of itself before a genuinely different-but-similar build ever gets compared —
   * verified live on a 42-player Silvie build (/decks/1xiwetk) whose "Similar Decks" tab came back
   * completely empty because all 3 slots were other sightings of the identical list. Duplicate
   * detection already has its own feature (DeckSighting.duplicateCount); this one is specifically
   * "what's a different build that plays like this one."
   */
  function addMatch(deckId: string, candidate: SimilarDeck): void {
    if (candidate.score === 1) return;
    const list = matches.get(deckId);
    if (!list) return;
    if (list.length < TOP_K) {
      list.push(candidate);
      list.sort((x, y) => y.score - x.score);
    } else if (candidate.score > list[list.length - 1].score) {
      list[list.length - 1] = candidate;
      list.sort((x, y) => y.score - x.score);
    }
  }

  for (const [championName, group] of groupsBySize) {
    const groupStartedAt = Date.now();
    const groupFullPairs = (group.length * (group.length - 1)) / 2;

    currentChampionName = championName;
    cache = await loadCache(championName);

    if (group.length <= LSH_GROUP_THRESHOLD) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          scorePair(group[i], group[j]);
        }
        if (Date.now() - lastLogAt > 10_000) {
          lastLogAt = Date.now();
          const pct = ((pairsCompared / totalPairs) * 100).toFixed(1);
          console.log(
            `[similarity]   ${championName}: ${i + 1}/${group.length} decks compared, ${pairsCompared.toLocaleString()}/${totalPairs.toLocaleString()} total pairs (${pct}%), ${matchesFound.toLocaleString()} matches found so far`,
          );
        }
        maybeFlush();
      }
    } else {
      const candidates = findLshCandidatePairs(group);
      console.log(
        `[similarity]   ${championName}: LSH found ${candidates.length.toLocaleString()} candidate pairs out of ${groupFullPairs.toLocaleString()} possible (${((candidates.length / groupFullPairs) * 100).toFixed(1)}%) — exactly scoring candidates only`,
      );
      for (let c = 0; c < candidates.length; c++) {
        const [i, j] = candidates[c];
        scorePair(group[i], group[j]);
        if (Date.now() - lastLogAt > 10_000) {
          lastLogAt = Date.now();
          console.log(
            `[similarity]   ${championName}: ${(c + 1).toLocaleString()}/${candidates.length.toLocaleString()} candidates scored, ${matchesFound.toLocaleString()} matches found so far`,
          );
        }
        maybeFlush();
      }
    }

    if (group.length > 50) {
      console.log(`[similarity] finished ${championName} (${group.length} decks) in ${((Date.now() - groupStartedAt) / 1000).toFixed(1)}s`);
    }
    // Cheap safety net regardless of the 5-minute timer — a champion group boundary is a natural
    // checkpoint, and most groups finish well inside 5 minutes so they'd otherwise never flush.
    await flushing;
    await writeCache(championName, cache);
    lastFlushAt = Date.now();

    if (onChampionComplete) {
      const groupEntries = group
        .map((deck) => ({
          deckId: deck.deckId,
          eventId: deck.eventId,
          eventName: deck.eventName,
          player: deck.player,
          championName: deck.championName,
          // Already sorted and capped at TOP_K by addMatch as matches were found.
          topMatches: matches.get(deck.deckId) ?? [],
        }))
        .filter((d) => d.topMatches.length > 0);
      await onChampionComplete(groupEntries);
    }
  }

  console.log(
    `[similarity] done: ${pairsCompared.toLocaleString()} pairs exactly scored, ${matchesFound.toLocaleString()} matches found, in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  );

  // No final flush needed here — each champion's cache is already written at the end of its own
  // loop iteration above, and `cache`/`currentChampionName` only ever hold the *last* champion's
  // data by this point anyway.
  await flushing;

  return decks
    .map((deck) => ({
      deckId: deck.deckId,
      eventId: deck.eventId,
      eventName: deck.eventName,
      player: deck.player,
      championName: deck.championName,
      // Already sorted and capped at TOP_K by addMatch as matches were found.
      topMatches: matches.get(deck.deckId) ?? [],
    }))
    .filter((d) => d.topMatches.length > 0);
}
