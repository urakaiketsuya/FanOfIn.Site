import { packageRuleKey, type SavedCardPackage, type SavedPackageRule } from "./savedPackages.js";
import { packageRulePerformance, type PackagePerformanceIndex } from "./packagePerformance.js";
import { packageOutcomeBucket, WIN_RATE_PACKAGE_DEFAULTS, type PackageOutcomeBucket, type PackageOutcomeRow, type WinRatePackageFinding } from "./winRatePackages.js";

export type PackageSynergyStatus = "Supported" | "Mixed" | "Unproven";
export interface PackageInteraction {
  card: string;
  core: string[];
  /** Both, core only, member only, neither. Partial cores are excluded. */
  buckets: [PackageOutcomeBucket, PackageOutcomeBucket, PackageOutcomeBucket, PackageOutcomeBucket];
  difference: number | null;
  interval: [number, number] | null;
  sufficient: boolean;
}
export const hasPackageSupport = (bucket: PackageOutcomeBucket) =>
  bucket.decks >= WIN_RATE_PACKAGE_DEFAULTS.minDecks && bucket.players >= WIN_RATE_PACKAGE_DEFAULTS.minPlayers && bucket.events >= WIN_RATE_PACKAGE_DEFAULTS.minEvents;

/** Held-out additive interaction on the win-rate scale, with player-clustered uncertainty.
 * A larger rule is tested as each member versus the complete remaining core, not every pool card.
 */
export function comparePackageInteractions(rows: PackageOutcomeRow[], cards: readonly string[]): PackageInteraction[] {
  const names = [...new Set(cards)].sort();
  if (names.length < 2) return [];
  // A pair's two orientations are the same test.
  return (names.length === 2 ? names.slice(0, 1) : names).map((card) => {
    const core = names.filter((name) => name !== card);
    const groups: PackageOutcomeRow[][] = [[], [], [], []];
    for (const row of rows) {
      const present = core.filter((name) => row.cards.has(name)).length;
      if (present !== 0 && present !== core.length) continue;
      groups[present === core.length ? (row.cards.has(card) ? 0 : 1) : (row.cards.has(card) ? 2 : 3)].push(row);
    }
    const buckets = groups.map(packageOutcomeBucket) as PackageInteraction["buckets"];
    const sufficient = buckets.every(hasPackageSupport);
    if (!sufficient) return { card, core, buckets, sufficient, difference: null, interval: null };
    const signs = [1, -1, -1, 1];
    const difference = buckets.reduce((sum, bucket, i) => sum + signs[i] * bucket.winRate!, 0);
    // Cluster the influence of each player's bucket means across all four cells.
    // This preserves covariance when the same player appears in multiple cells.
    const influences = new Map<number, number>();
    groups.forEach((group, i) => {
      const players = new Map<number, { sum: number; n: number }>();
      for (const row of group) {
        const value = players.get(row.player) ?? { sum: 0, n: 0 };
        value.sum += row.outcome; value.n++;
        players.set(row.player, value);
      }
      for (const [player, value] of players) influences.set(player, (influences.get(player) ?? 0) + signs[i] * (value.sum / value.n - buckets[i].winRate!) / players.size);
    });
    const n = influences.size;
    const variance = [...influences.values()].reduce((sum, value) => sum + value * value, 0) * n / (n - 1);
    const margin = 1.96 * Math.sqrt(variance);
    return { card, core, buckets, sufficient, difference, interval: [difference - margin, difference + margin] as [number, number] };
  });
}

export function findingSynergyStatus(finding: WinRatePackageFinding): PackageSynergyStatus {
  const epsilon = 1e-9;
  const comparison = finding.validation;
  if (comparison.sufficient && (comparison.lift! <= 0 || comparison.missingOne.some((member) => member.lift !== null && member.lift <= 0))) return "Mixed";
  const interactions = finding.interactions;
  if (interactions?.some((item) => item.sufficient && item.interval && item.interval[1] < -epsilon)) return "Mixed";
  const expected = finding.cards.length === 2 ? 1 : finding.cards.length;
  if (comparison.sufficient && comparison.lift! > 0 && comparison.missingOne.length === finding.cards.length && comparison.missingOne.every((member) => member.lift !== null && member.lift > 0) && interactions?.length === expected && interactions.every((item) => item.sufficient && item.interval && item.interval[0] > epsilon)) return "Supported";
  return "Unproven";
}

/** A family summary cannot inherit a positive result from just its best variant/cohort. */
export function summarizePackageSynergy(statuses: PackageSynergyStatus[]): PackageSynergyStatus {
  if (!statuses.length) return "Unproven";
  if (statuses.every((status) => status === "Supported")) return "Supported";
  if (statuses.includes("Mixed") || statuses.includes("Supported")) return "Mixed";
  return "Unproven";
}

export function packageStatisticalStatus(pkg: SavedCardPackage, index: PackagePerformanceIndex): PackageSynergyStatus {
  return summarizePackageSynergy(pkg.rules.flatMap((rule) => {
    const findings = packageRulePerformance(rule, index);
    return findings.length ? findings.map(findingSynergyStatus) : ["Unproven" as const];
  }));
}

/** A family may contain alternatives; one verified exact rule establishes an interaction. */
export function hasVerifiedPackageInteraction(pkg: SavedCardPackage): boolean {
  return pkg.rules.some(verifiedPackageMechanics);
}

export function verifiedPackageMechanics(rule: SavedPackageRule): boolean {
  return !!(rule.conditions && rule.evidence?.ruleKey === packageRuleKey(rule.conditions) && rule.evidence.mechanicsVerified && !rule.evidence.ambiguities.length);
}
