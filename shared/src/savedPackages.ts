import { matchesPackageRule, type PackageReviewRule } from "./packageConfidence.js";

export const PACKAGE_AUTO_POLICY = { version: 1, matches: 30, events: 3, confidence: 0.8, lift: 2 } as const;
export interface PackageApprovalCohort {
  championName: string;
  championCards: string[];
  matchingDecks: number;
  matchingEvents: number;
  anchorDecks: number;
  confidence: number;
  lift: number;
}
export interface PackageApprovalEvidence {
  ruleKey: string;
  generatedAt: string;
  mechanicsVerified: boolean;
  verification: string;
  ambiguities: string[];
  requiredMaterialCards: string[];
  cohorts: PackageApprovalCohort[];
}
export interface SavedPackageRule {
  id: string;
  label: string;
  conditions?: PackageReviewRule;
  activation: string;
  cards: string[];
  status: "suggested" | "manual" | "auto" | "registered";
  source: string;
  sourceIds: string[];
  evidence?: PackageApprovalEvidence;
  approvedAt?: string;
  scope?: "main-material" | "legacy-any-section";
  autoChampionCards?: string[];
  autoMaterialCards?: string[];
  legacyId?: string;
  supporting?: boolean;
  autoBlocked?: boolean;
}
export interface SavedCardPackage {
  id: string;
  name: string;
  cards: string[];
  rules: SavedPackageRule[];
  subpackageIds: string[];
  sourcePackageIds: string[];
}
export const packageCardNames = (rule: PackageReviewRule) => [...new Set([...rule.requiredCards, ...rule.groups.flatMap((group) => group.cards)])].sort();
export const packagePoolId = (cards: readonly string[]) => `package:${JSON.stringify([...new Set(cards)].sort())}`;
export function packageRuleKey(rule: PackageReviewRule) {
  return JSON.stringify({ requiredCards: [...new Set(rule.requiredCards)].sort(), groups: rule.groups.map((group) => ({ cards: [...new Set(group.cards)].sort(), minimum: group.minimum })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });
}
export function packageAutoEligibility(rule: SavedPackageRule) {
  const evidence = rule.evidence;
  const reasons: string[] = [];
  if (!rule.conditions || !evidence || evidence.ruleKey !== packageRuleKey(rule.conditions)) reasons.push("Exact-rule evidence is missing or no longer matches these conditions.");
  if (!evidence?.mechanicsVerified) reasons.push("Mechanical relationship has not been verified.");
  if (evidence?.ambiguities.length) reasons.push(...evidence.ambiguities);
  if (rule.autoBlocked) reasons.push("Automatic approval was revoked for this rule.");
  const cohorts = (evidence?.cohorts ?? []).filter((cohort) => cohort.matchingDecks >= PACKAGE_AUTO_POLICY.matches && cohort.matchingEvents >= PACKAGE_AUTO_POLICY.events && cohort.confidence >= PACKAGE_AUTO_POLICY.confidence && cohort.lift >= PACKAGE_AUTO_POLICY.lift && cohort.championCards.length > 0);
  if (!cohorts.length) reasons.push("No champion cohort meets all thresholds: 30 matches, 3 events, 80% confidence and 2× lift.");
  return { eligible: reasons.length === 0, reasons, cohorts };
}
export function applyPackageAutoPolicy(packages: SavedCardPackage[], enabled: boolean): SavedCardPackage[] {
  return packages.map((pkg) => ({ ...pkg, rules: pkg.rules.map((rule) => {
    if (rule.status === "manual" || rule.status === "registered") return rule;
    const eligibility = packageAutoEligibility(rule);
    if (enabled && eligibility.eligible) return { ...rule, status: "auto" as const, scope: "main-material" as const,
      approvedAt: rule.approvedAt ?? new Date().toISOString(), autoChampionCards: [...new Set(eligibility.cohorts.flatMap((cohort) => cohort.championCards))], autoMaterialCards: rule.evidence!.requiredMaterialCards };
    return { ...rule, status: "suggested" as const, autoChampionCards: undefined, autoMaterialCards: undefined, approvedAt: undefined };
  }) }));
}
export function evaluateSavedPackage(pkg: SavedCardPackage, mainMaterial: ReadonlySet<string>, material: ReadonlySet<string>, all: ReadonlySet<string>): string[] {
  const protectedCards = new Set<string>();
  for (const rule of pkg.rules) {
    if (!rule.conditions || (rule.status !== "manual" && rule.status !== "auto")) continue;
    const present = rule.scope === "legacy-any-section" ? all : mainMaterial;
    if (rule.status === "auto" && (!rule.autoChampionCards?.some((card) => material.has(card)) || !rule.autoMaterialCards?.every((card) => material.has(card)))) continue;
    if (matchesPackageRule(present, rule.conditions)) {
      // Protect only members of satisfied rules, never unrelated members of the package pool.
      for (const card of rule.cards) if (present.has(card)) protectedCards.add(card);
    }
  }
  return [...protectedCards].sort();
}
