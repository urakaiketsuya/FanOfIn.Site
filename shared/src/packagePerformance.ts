import { packagePoolId, packageRuleKey, type SavedCardPackage, type SavedPackageRule } from "./savedPackages.js";
import type { WinRatePackageFinding, WinRatePackagesData } from "./winRatePackages.js";

export const winRateRuleKey = (cards: readonly string[]) => packageRuleKey({ requiredCards: [...cards], groups: [] });
export type PackagePerformanceIndex = ReadonlyMap<string, WinRatePackageFinding[]>;
export function indexPackagePerformance(data?: WinRatePackagesData): PackagePerformanceIndex {
  const index = new Map<string, WinRatePackageFinding[]>();
  for (const finding of data?.results ?? []) {
    const key = winRateRuleKey(finding.cards);
    const values = index.get(key) ?? [];
    values.push(finding);
    index.set(key, values);
  }
  return index;
}
/** Resolve from current conditions on every read; ids/names/pools cannot transfer evidence. */
export function packageRulePerformance(rule: SavedPackageRule, index: PackagePerformanceIndex): WinRatePackageFinding[] {
  if (!rule.conditions || rule.scope !== "main-material" || rule.evidence?.requiredMaterialCards.length ||
      rule.autoMaterialCards?.length || rule.autoChampionCards?.length) return [];
  return index.get(packageRuleKey(rule.conditions)) ?? [];
}

/** Outcome findings become ordinary suggested rules; performance is joined, never persisted as approval evidence. */
export function includeWinRatePackages(packages: SavedCardPackage[], data?: WinRatePackagesData): SavedCardPackage[] {
  if (!data) return packages;
  const index = indexPackagePerformance(data);
  const covered = new Set(packages.flatMap((pkg) => pkg.rules.flatMap((rule) =>
    packageRulePerformance(rule, index).length ? [packageRuleKey(rule.conditions!)] : [])));
  const remaining = [...index].filter(([key]) => !covered.has(key)).map(([key, findings]) => ({
    key, cards: [...findings[0].cards].sort(), findings,
    cohorts: new Set(findings.map((f) => f.cohort)),
    score: Math.max(...findings.map((f) => f.discovery.weakestMemberLift ?? -Infinity)),
  })).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const output = packages.map((pkg) => ({ ...pkg, rules: [...pkg.rules] }));
  while (remaining.length) {
    const first = remaining.shift()!;
    const members = [first];
    let core = first.cards;
    let cohorts = first.cohorts;
    let maxSize = core.length;
    // Every member must preserve a common core and a common cohort. No transitive chaining.
    for (let i = 0; i < remaining.length && members.length < 8;) {
      const candidate = remaining[i];
      const nextCore = core.filter((card) => candidate.cards.includes(card));
      const nextCohorts = new Set([...cohorts].filter((cohort) => candidate.cohorts.has(cohort)));
      const nextSize = Math.max(maxSize, candidate.cards.length);
      if (nextCore.length >= nextSize - 1 && nextCohorts.size) {
        members.push(candidate); remaining.splice(i, 1);
        core = nextCore; cohorts = nextCohorts; maxSize = nextSize;
      } else i++;
    }
    const cards = [...new Set(members.flatMap((m) => m.cards))].sort();
    const id = packagePoolId(cards);
    const rules: SavedPackageRule[] = members.map((m) => ({
      id: `win-rate:${m.key}`, label: m.cards.join(" + "), conditions: { requiredCards: m.cards, groups: [] },
      activation: "Every named card is required in Main or Material.", cards: m.cards,
      status: "suggested", source: "Win-rate discovery", sourceIds: [`win-rate:${m.key}`], scope: "main-material",
    }));
    const existing = output.find((pkg) => pkg.id === id);
    if (existing) existing.rules.push(...rules.filter((rule) => !existing.rules.some((r) => r.id === rule.id)));
    else output.push({ id, name: members.length > 1 ? `${core.join(" + ")} variants` : `${cards.join(" + ")} package`, cards, rules, subpackageIds: [], sourcePackageIds: [id] });
  }
  return output;
}

/** A finding has one deterministic display owner even if users saved the same rule in several packages. */
export function packagePerformanceOwners(packages: SavedCardPackage[], index: PackagePerformanceIndex) {
  const owners = new Map<string, { pkg: SavedCardPackage; rule: SavedPackageRule }>();
  for (const pkg of [...packages].sort((a, b) => a.cards.length - b.cards.length || a.id.localeCompare(b.id))) {
    for (const rule of pkg.rules) {
      if (!packageRulePerformance(rule, index).length) continue;
      const key = packageRuleKey(rule.conditions!);
      if (!owners.has(key)) owners.set(key, { pkg, rule });
    }
  }
  return owners;
}
