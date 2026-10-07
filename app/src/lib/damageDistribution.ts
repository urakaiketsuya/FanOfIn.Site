/** One group per kind of physical Main card, even when the card has several combo roles. */
export interface DamageGroup {
  copies: number;
  damage: number;
  unlockSeen?: number;
  bloom?: number;
  flowerbuds?: number;
  scepter?: number;
  burst?: number;
  reproach?: number;
  volatility?: number;
  fractals?: number;
  phantasias?: number;
  potions?: number;
  wither?: number;
  missile?: number;
  refraction?: number;
  levelDamage?: number;
  /** Unique objects contribute once per distinct name, not once per drawn copy. */
  uniqueObject?: string;
}

const FEATURES = ["damage", "bloom", "flowerbuds", "scepter", "burst", "reproach", "volatility", "fractals", "phantasias", "potions", "wither", "missile", "refraction", "levelDamage"] as const;
const OBJECT_FEATURES = new Set(["bloom", "flowerbuds", "scepter", "fractals", "phantasias", "potions", "wither"]);

export type DamageDistribution = Map<number, number> & { sampleSize?: number };
const EXACT_STATE_LIMIT = 40_000;
const SAMPLE_SIZE = 32_768;

export interface DamageContext {
  /** Natural material-lineage ceiling at this checkpoint; not a probability of leveling up. */
  level?: number;
  scepterAvailable?: boolean;
  materialWither?: number;
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) result = result * (n - i + 1) / i;
  return result;
}

/** Joint draw distribution, exact unless its state budget requires reported sampling.
 * Optimistic object access means drawn and deployable,
 * not a claim that those objects actually survive or that the player pays every cost. */
export function damageDistribution(groups: DamageGroup[], deckSize: number, seen: number, context: DamageContext = {}): DamageDistribution {
  const activeGroups = groups.map((group) => seen >= (group.unlockSeen ?? 0) ? { ...group } : { copies: group.copies, damage: 0 });
  const has = (key: typeof FEATURES[number]) => activeGroups.some((group) => (group[key] ?? 0) > 0);
  const needsFractals = has("burst") || has("missile");
  const hasRefraction = has("refraction");
  const needsPhantasias = hasRefraction || has("scepter");
  const needsWither = has("reproach");
  const needsPotions = has("volatility");
  const needsFlowers = has("bloom");
  const merged = new Map<string, DamageGroup>();
  for (const group of activeGroups) {
    if (!needsFractals) group.fractals = 0;
    if (!needsPhantasias) group.phantasias = 0;
    if (!needsWither) group.wither = 0;
    if (!needsPotions) group.potions = 0;
    if (!needsFlowers) group.flowerbuds = 0;
    const key = [...FEATURES.map((feature) => group[feature] ?? 0), group.uniqueObject ?? ""].join(",");
    const previous = merged.get(key);
    if (previous) previous.copies += group.copies;
    else merged.set(key, group);
  }
  const all = [...merged.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group]) => group);
  const accounted = all.reduce((sum, group) => sum + group.copies, 0);
  if (accounted < deckSize) all.push({ copies: deckSize - accounted, damage: 0 });
  const draws = Math.min(seen, deckSize);
  const maxPotions = Math.min(draws, all.reduce((sum, group) => sum + group.copies * (group.potions ?? 0), 0));
  const maxVolatility = Math.min(draws, all.reduce((sum, group) => sum + group.copies * (group.volatility ?? 0), 0));
  const maxWither = (context.materialWither ?? 0) + all.reduce((sum, group) => sum + group.copies * (group.wither ?? 0), 0);
  const maxRemoval = all.reduce((sum, group) => sum + group.copies * (group.reproach ?? 0), 0);
  const advance = (state: number[], group: DamageGroup, count: number) => FEATURES.map((feature, i) => {
    const copies = group.uniqueObject && OBJECT_FEATURES.has(feature) ? Math.min(1, count) : count;
    if (feature === "bloom" || feature === "scepter" || feature === "burst") return Math.max(state[i], count ? group[feature] ?? 0 : 0);
    const value = state[i] + copies * (group[feature] ?? 0);
    if (feature === "reproach") return Math.min(maxWither, value);
    if (feature === "wither") return Math.min(maxRemoval, value);
    if (feature === "volatility") return Math.min(maxPotions, value);
    if (feature === "potions") return Math.min(maxVolatility, value);
    if (feature === "phantasias" && !hasRefraction) return Math.min(4, value);
    return value;
  });
  let states = Array.from({ length: draws + 1 }, () => new Map<string, number>());
  states[0].set(FEATURES.map(() => 0).join(","), 1);
  let processed = 0;
  let sampled = false;
  exact: for (const group of all) {
    let stateCount = 0;
    const combinations = Array.from({ length: Math.min(group.copies, draws) + 1 }, (_, count) => choose(group.copies, count));
    const next = Array.from({ length: draws + 1 }, () => new Map<string, number>());
    for (let drawn = 0; drawn <= Math.min(draws, processed); drawn++) {
      for (const [key, ways] of states[drawn]) {
        const state = key.split(",").map(Number);
        for (let count = 0; count <= Math.min(group.copies, draws - drawn); count++) {
          const result = advance(state, group, count);
          const nextKey = result.join(",");
          const previous = next[drawn + count].get(nextKey);
          if (previous === undefined && ++stateCount > EXACT_STATE_LIMIT) {
            sampled = true;
            break exact;
          }
          next[drawn + count].set(nextKey, (previous ?? 0) + ways * combinations[count]);
        }
      }
    }
    states = next;
    processed += group.copies;
  }
  // Rare mixed-engine decks can have an exponential joint state space. Keep the UI bounded
  // using repeatable physical-card draws; this method is explicitly reported to the caller.
  let outcomes = states[draws];
  if (sampled) {
    outcomes = new Map<string, number>();
    const physical = all.flatMap((group, index) => Array.from({ length: group.copies }, () => index));
    let seed = 0x6d2b79f5;
    const random = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let trial = 0; trial < SAMPLE_SIZE; trial++) {
      const pool = physical.slice();
      const counts = all.map(() => 0);
      for (let draw = 0; draw < draws; draw++) {
        const index = draw + Math.floor(random() * (pool.length - draw));
        [pool[draw], pool[index]] = [pool[index], pool[draw]];
        counts[pool[draw]]++;
      }
      let state = FEATURES.map(() => 0);
      for (let group = 0; group < all.length; group++) if (counts[group]) state = advance(state, all[group], counts[group]);
      const key = state.join(",");
      outcomes.set(key, (outcomes.get(key) ?? 0) + 1);
    }
  }
  const dice = [new Map([[0, 1]])];
  for (let count = 1; count <= Math.min(maxPotions, maxVolatility); count++) {
    const distribution = new Map<number, number>();
    for (const [total, probability] of dice[count - 1]) {
      for (let roll = 5; roll <= 10; roll++) distribution.set(total + roll, (distribution.get(total + roll) ?? 0) + probability / 6);
    }
    dice.push(distribution);
  }
  const totalWays = sampled ? SAMPLE_SIZE : choose(deckSize, draws);
  const distribution: DamageDistribution = new Map<number, number>();
  if (sampled) distribution.sampleSize = SAMPLE_SIZE;
  for (const [key, ways] of outcomes) {
    const [base, bloom, flowers, scepter, burst, removal, volatility, fractals, phantasias, potions, wither, missile, refraction, levelDamage] = key.split(",").map(Number);
    const damage = base + (bloom ? 8 + flowers * 2 : 0) + (context.scepterAvailable && phantasias >= 4 ? scepter : 0)
      + burst * fractals + 2 * Math.min(removal, wither + (context.materialWither ?? 0))
      + missile * fractals + refraction * phantasias + levelDamage * (context.level ?? 0);
    for (const [rolled, probability] of dice[Math.min(volatility, potions)]) {
      distribution.set(damage + rolled, (distribution.get(damage + rolled) ?? 0) + ways / totalWays * probability);
    }
  }
  return distribution;
}
