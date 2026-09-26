/** Outcome mining is exploratory: these are deck-inclusion associations, not causal combos. */
export interface PackageOutcomeRow {
  cards: ReadonlySet<string>;
  player: number;
  eventId: number;
  eventDate: string;
  outcome: number;
}
export interface PackageOutcomeBucket {
  decks: number;
  players: number;
  events: number;
  /** Average of each player's mean deck-event win rate; frequent players have equal weight. */
  winRate: number | null;
}
export interface PackageOutcomeComparison {
  complete: PackageOutcomeBucket;
  incomplete: PackageOutcomeBucket;
  lift: number | null;
  missingOne: { card: string; bucket: PackageOutcomeBucket; lift: number | null }[];
  weakestMemberLift: number | null;
  sufficient: boolean;
}
export const WIN_RATE_PACKAGE_DEFAULTS = {
  minDecks: 10, minPlayers: 5, minEvents: 3, priorPlayers: 10,
  minLift: 0.02, maxCards: 60, beamWidth: 40, maxSize: 4, resultsPerCohort: 10,
};

export type WinRatePackageStatus = "positive-in-later-events" | "not-repeated" | "insufficient-later-data";
export interface WinRatePackageFinding {
  /** Optional for older published snapshots; absence means interaction is untested. */
  interactions?: import("./packageSynergy.js").PackageInteraction[];
  cohort: string;
  champion: string;
  format: string;
  season: string;
  validationStarts: string | null;
  cards: string[];
  discovery: PackageOutcomeComparison;
  validation: PackageOutcomeComparison;
  status: WinRatePackageStatus;
  existingCandidateOverlap: "exact" | "subset-or-superset" | "none";
}
export interface WinRatePackagesData {
  generatedAt: string;
  sourceGeneratedAt: string;
  settings: typeof WIN_RATE_PACKAGE_DEFAULTS;
  cohortsTested: number;
  totalTested: number;
  results: WinRatePackageFinding[];
}

export function packageOutcomeBucket(rows: PackageOutcomeRow[]): PackageOutcomeBucket {
  const players = new Map<number, { sum: number; count: number }>();
  for (const row of rows) {
    const p = players.get(row.player) ?? { sum: 0, count: 0 };
    p.sum += row.outcome;
    p.count++;
    players.set(row.player, p);
  }
  return { decks: rows.length, players: players.size, events: new Set(rows.map((r) => r.eventId)).size,
    winRate: players.size ? [...players.values()].reduce((sum, p) => sum + p.sum / p.count, 0) / players.size : null };
}

export function compareWinRatePackage(rows: PackageOutcomeRow[], cards: string[]): PackageOutcomeComparison {
  const names = [...new Set(cards)];
  if (names.length < 2) throw new Error("A package needs at least two distinct cards");
  const completeRows: PackageOutcomeRow[] = [];
  const incompleteRows: PackageOutcomeRow[] = [];
  const missing = new Map(names.map((name) => [name, [] as PackageOutcomeRow[]]));
  for (const row of rows) {
    const absent = names.filter((name) => !row.cards.has(name));
    if (!absent.length) completeRows.push(row);
    else {
      incompleteRows.push(row);
      if (absent.length === 1) missing.get(absent[0])!.push(row);
    }
  }
  const baseline = packageOutcomeBucket(rows).winRate ?? 0.5;
  const complete = packageOutcomeBucket(completeRows);
  const incomplete = packageOutcomeBucket(incompleteRows);
  const adjusted = (b: PackageOutcomeBucket) => b.winRate === null ? null :
    (b.winRate * b.players + WIN_RATE_PACKAGE_DEFAULTS.priorPlayers * baseline) / (b.players + WIN_RATE_PACKAGE_DEFAULTS.priorPlayers);
  const difference = (b: PackageOutcomeBucket) => {
    const a = adjusted(complete), other = adjusted(b);
    return a === null || other === null ? null : a - other;
  };
  const enough = (b: PackageOutcomeBucket) => b.decks >= WIN_RATE_PACKAGE_DEFAULTS.minDecks &&
    b.players >= WIN_RATE_PACKAGE_DEFAULTS.minPlayers && b.events >= WIN_RATE_PACKAGE_DEFAULTS.minEvents;
  const missingOne = names.map((card) => {
    const bucket = packageOutcomeBucket(missing.get(card)!);
    return { card, bucket, lift: difference(bucket) };
  });
  return { complete, incomplete, lift: difference(incomplete), missingOne,
    weakestMemberLift: missingOne.every((m) => m.lift !== null) ? Math.min(...missingOne.map((m) => m.lift!)) : null,
    sufficient: enough(complete) && enough(incomplete) && missingOne.every((m) => enough(m.bucket)) };
}

/** Split on whole dates so neither events nor same-day rounds leak across discovery/validation. */
export function splitPackageOutcomes(rows: PackageOutcomeRow[]) {
  const dates = [...new Set(rows.map((r) => r.eventDate.slice(0, 10)))].sort();
  const cutoff = dates[Math.floor(dates.length * 0.7)];
  return {
    cutoff: cutoff ?? null,
    discovery: rows.filter((r) => r.eventDate.slice(0, 10) < cutoff),
    validation: rows.filter((r) => r.eventDate.slice(0, 10) >= cutoff),
  };
}

/** Bounded beam search; nominations depend on discovery outcomes only, never validation. */
export function discoverWinRatePackages(rows: PackageOutcomeRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) for (const name of row.cards) counts.set(name, (counts.get(name) ?? 0) + 1);
  const pool = [...counts].filter(([, n]) => n >= WIN_RATE_PACKAGE_DEFAULTS.minDecks && rows.length - n >= WIN_RATE_PACKAGE_DEFAULTS.minDecks)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, WIN_RATE_PACKAGE_DEFAULTS.maxCards).map(([name]) => name).sort();
  const findings: { cards: string[]; discovery: PackageOutcomeComparison }[] = [];
  let beam = pool.map((card) => [card]);
  let tested = 0;
  for (let size = 2; size <= WIN_RATE_PACKAGE_DEFAULTS.maxSize; size++) {
    const seen = new Set<string>();
    const scored: typeof findings = [];
    for (const base of beam) for (const card of pool) {
      if (base.includes(card)) continue;
      const cards = [...base, card].sort();
      const key = JSON.stringify(cards);
      if (seen.has(key)) continue;
      seen.add(key);
      tested++;
      const discovery = compareWinRatePackage(rows, cards);
      if (!discovery.sufficient) continue;
      scored.push({ cards, discovery });
    }
    scored.sort((a, b) => b.discovery.weakestMemberLift! - a.discovery.weakestMemberLift! || b.discovery.lift! - a.discovery.lift! || JSON.stringify(a.cards).localeCompare(JSON.stringify(b.cards)));
    findings.push(...scored.filter((r) => r.discovery.weakestMemberLift! >= WIN_RATE_PACKAGE_DEFAULTS.minLift && r.discovery.lift! >= WIN_RATE_PACKAGE_DEFAULTS.minLift));
    // Keep the best supported subsets even when their effects are negative: a third card may matter.
    beam = scored.slice(0, WIN_RATE_PACKAGE_DEFAULTS.beamWidth).map((r) => r.cards);
  }
  return { tested, poolSize: pool.length, findings: findings.sort((a, b) => b.discovery.weakestMemberLift! - a.discovery.weakestMemberLift!).slice(0, WIN_RATE_PACKAGE_DEFAULTS.resultsPerCohort) };
}
