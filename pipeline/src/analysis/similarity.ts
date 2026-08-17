import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { DeckSimilarityEntry, SimilarDeck } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures } from "./decklists.js";
import { config } from "../config.js";

const CACHE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/similarity.json");
const TOP_K = 3;
const MIN_SCORE = 0.35;

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
function weightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
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

async function loadCache(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf-8")) as Record<string, number>;
  } catch {
    return {};
  }
}

async function writeCache(cache: Record<string, number>): Promise<void> {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache), "utf-8");
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
  cardIndex: Map<string, CardSignature>,
): Promise<DeckSimilarityEntry[]> {
  if (config.fastMode) return [];

  const decks: DeckRef[] = [];
  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);
    for (const entry of bundle.decklists) {
      const championName = signatures.get(entry.player)?.championName;
      if (!championName) continue;
      const cardCounts = new Map<string, number>();
      for (const line of [...entry.decklist.main, ...entry.decklist.material]) {
        cardCounts.set(line.card, (cardCounts.get(line.card) ?? 0) + line.quantity);
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

  const cache = await loadCache();
  const matches = new Map<string, SimilarDeck[]>(decks.map((d) => [d.deckId, []]));

  const startedAt = Date.now();
  let pairsCompared = 0;
  let matchesFound = 0;
  let lastLogAt = startedAt;

  function scorePair(a: DeckRef, b: DeckRef): void {
    const pairKey = a.deckId < b.deckId ? `${a.deckId}|${b.deckId}` : `${b.deckId}|${a.deckId}`;

    let score = cache[pairKey];
    if (score === undefined) {
      score = weightedJaccard(a.cardCounts, b.cardCounts);
      // Only cache pairs that clear the threshold — the vast majority of pairs within a
      // champion group score near zero, so caching every pair grows O(n²) with the champion's
      // deck count and balloons unbounded (this cache hit 347MB and made runs hang). Only
      // real matches are ever read back out, so non-matches are cheap to just recompute.
      if (score >= MIN_SCORE) cache[pairKey] = score;
    }
    pairsCompared++;
    if (score < MIN_SCORE) return;

    matches.get(a.deckId)?.push({ deckId: b.deckId, eventId: b.eventId, eventName: b.eventName, player: b.player, score });
    matches.get(b.deckId)?.push({ deckId: a.deckId, eventId: a.eventId, eventName: a.eventName, player: a.player, score });
    matchesFound++;
  }

  for (const [championName, group] of groupsBySize) {
    const groupStartedAt = Date.now();
    const groupFullPairs = (group.length * (group.length - 1)) / 2;

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
      }
    }

    if (group.length > 50) {
      console.log(`[similarity] finished ${championName} (${group.length} decks) in ${((Date.now() - groupStartedAt) / 1000).toFixed(1)}s`);
    }
  }

  console.log(
    `[similarity] done: ${pairsCompared.toLocaleString()} pairs exactly scored, ${matchesFound.toLocaleString()} matches found, in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  );

  await writeCache(cache);

  return decks
    .map((deck) => ({
      deckId: deck.deckId,
      eventId: deck.eventId,
      eventName: deck.eventName,
      player: deck.player,
      championName: deck.championName,
      topMatches: (matches.get(deck.deckId) ?? []).sort((x, y) => y.score - x.score).slice(0, TOP_K),
    }))
    .filter((d) => d.topMatches.length > 0);
}
