import { matchesPackageRule, type PackageReviewRule } from "@gatcg/shared";
import { useCallback, useEffect, useState } from "react";
import { readPackageStore, savePackageRule, writePackageStore, PACKAGE_CHANGE_EVENT } from "./savedPackages";
import type { LocalPackageApproval } from "./legacyPackageApprovals";
export { localPackageApprovalId, parseLocalPackageApprovals, type LocalPackageApproval } from "./legacyPackageApprovals";

export function getLocalPackageApprovals(): LocalPackageApproval[] {
  return readPackageStore().packages.flatMap((pkg) => pkg.rules.flatMap((rule): LocalPackageApproval[] => rule.conditions && (rule.status === "manual" || rule.status === "auto") ? [{ id: rule.legacyId ?? rule.id, packageId: pkg.id, label: pkg.name, memberCards: rule.cards, requiredCards: rule.conditions.requiredCards, optionCards: [], minOptions: 0, groups: rule.conditions.groups, approvedAt: rule.approvedAt ?? "", scope: rule.scope }] : []));
}
export function evaluateLocalPackageApproval(approval: LocalPackageApproval, presentCards: ReadonlySet<string>): string[] {
  const groups = approval.groups ?? (approval.optionCards.length ? [{ cards: approval.optionCards, minimum: approval.minOptions }] : []);
  return matchesPackageRule(presentCards, { requiredCards: approval.requiredCards, groups }) ? approval.memberCards.filter((card) => presentCards.has(card)) : [];
}
export function approveLocalPackage(label: string, memberCards: string[]) {
  if (typeof window === "undefined" || new Set(memberCards).size < 2) return;
  savePackageRule(label, { requiredCards: [...new Set(memberCards)].sort(), groups: [] });
}
export function approveLocalPackageFamily(label: string, anchorCard: string, coreCards: string[], optionCards: string[], minOptions: number) {
  if (typeof window === "undefined") return;
  const requiredCards = [...new Set([anchorCard, ...coreCards])].sort();
  const options = [...new Set(optionCards)].filter((card) => !requiredCards.includes(card)).sort();
  if (!options.length) return;
  savePackageRule(label, { requiredCards, groups: [{ cards: options, minimum: Math.max(1, Math.min(options.length, Math.floor(minOptions))) }] });
}
export function revokeLocalPackage(id: string) {
  const store = readPackageStore();
  writePackageStore({ ...store, packages: store.packages.map((pkg) => ({ ...pkg, rules: pkg.rules.map((rule) => rule.id === id || rule.legacyId === id || pkg.id === id ? { ...rule, status: "suggested" as const, autoBlocked: true } : rule) })) });
}
export function useLocalPackageApprovals() {
  const [approvals, setApprovals] = useState(getLocalPackageApprovals);
  useEffect(() => { const refresh = () => setApprovals(getLocalPackageApprovals()); window.addEventListener(PACKAGE_CHANGE_EVENT, refresh); window.addEventListener("storage", refresh); return () => { window.removeEventListener(PACKAGE_CHANGE_EVENT, refresh); window.removeEventListener("storage", refresh); }; }, []);
  return { approvals, approve: useCallback(approveLocalPackage, []), approveFamily: useCallback(approveLocalPackageFamily, []), revoke: useCallback(revokeLocalPackage, []) };
}
export function approveReviewedPackage(label: string, rule: PackageReviewRule, packageId?: string) { savePackageRule(label, rule, packageId); }
