import { useCallback, useEffect, useState } from "react";
import { applyPackageAutoPolicy, packageCardNames, packagePoolId, packageRuleKey, type PackageReviewRule, type SavedCardPackage, type SavedPackageRule } from "@gatcg/shared";
import { parseLocalPackageApprovals } from "./legacyPackageApprovals";

export const PACKAGE_STORE_KEY = "fan-of-insight-packages-v2";
export const PACKAGE_CHANGE_EVENT = "fan-of-insight-package-approvals-changed";
export interface PackageStore { version: 2; packages: SavedCardPackage[]; autoEnabled: boolean; undo?: SavedCardPackage[]; error?: string }
export const emptyPackageStore = (): PackageStore => ({ version: 2, packages: [], autoEnabled: false });
export function migratePackageApprovals(raw: string | null): PackageStore {
  const groups = new Map<string, SavedCardPackage>();
  for (const approval of parseLocalPackageApprovals(raw)) {
    const conditions = { requiredCards: approval.requiredCards, groups: approval.groups ?? (approval.optionCards.length ? [{ cards: approval.optionCards, minimum: approval.minOptions }] : []) };
    const id = packagePoolId(approval.memberCards);
    const pkg = groups.get(id) ?? { id, name: approval.label, cards: approval.memberCards, rules: [], subpackageIds: [], sourcePackageIds: [id] };
    pkg.rules.push({ id: `legacy:${approval.id}`, legacyId: approval.id, label: approval.label, conditions, activation: "Migrated activation rule", cards: approval.memberCards,
      status: "manual", source: "Previous local approval", sourceIds: [approval.id], approvedAt: approval.approvedAt, scope: "legacy-any-section" });
    groups.set(id, pkg);
  }
  return { version: 2, autoEnabled: false, packages: [...groups.values()] };
}
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
function validRule(value: unknown): value is SavedPackageRule {
  if (!value || typeof value !== "object") return false;
  const r = value as SavedPackageRule;
  if (r.autoChampionCards !== undefined && !stringArray(r.autoChampionCards)) return false;
  if (r.autoMaterialCards !== undefined && !stringArray(r.autoMaterialCards)) return false;
  if (r.evidence !== undefined && (!r.evidence || typeof r.evidence.ruleKey !== "string" || typeof r.evidence.generatedAt !== "string" || typeof r.evidence.mechanicsVerified !== "boolean" || typeof r.evidence.verification !== "string" || !stringArray(r.evidence.ambiguities) || !stringArray(r.evidence.requiredMaterialCards) || !Array.isArray(r.evidence.cohorts) || !r.evidence.cohorts.every((c) => c && typeof c.championName === "string" && stringArray(c.championCards) && [c.matchingDecks, c.matchingEvents, c.anchorDecks, c.confidence, c.lift].every((n) => Number.isFinite(n) && n >= 0)))) return false;
  if (typeof r.id !== "string" || typeof r.label !== "string" || !stringArray(r.cards) || !stringArray(r.sourceIds) || !["suggested", "manual", "auto", "registered"].includes(r.status)) return false;
  if (!r.conditions) return r.status === "suggested" || r.status === "registered";
  return stringArray(r.conditions.requiredCards) && Array.isArray(r.conditions.groups) && r.conditions.groups.every((group) => group && stringArray(group.cards) && Number.isInteger(group.minimum) && group.minimum >= 0 && group.minimum <= new Set(group.cards).size);
}
function validPackages(value: unknown): value is SavedCardPackage[] {
  return Array.isArray(value) && value.every((pkg) => pkg && typeof pkg.id === "string" && typeof pkg.name === "string" && stringArray(pkg.cards) && stringArray(pkg.sourcePackageIds) && stringArray(pkg.subpackageIds) && Array.isArray(pkg.rules) && pkg.rules.every(validRule));
}
export function readPackageStore(): PackageStore {
  if (typeof window === "undefined") return emptyPackageStore();
  try {
    const raw = window.localStorage.getItem(PACKAGE_STORE_KEY);
    if (raw === null) return migratePackageApprovals(window.localStorage.getItem("fan-of-insight-approved-packages-v1"));
    const value = JSON.parse(raw);
    if (value?.version !== 2 || typeof value.autoEnabled !== "boolean" || !validPackages(value.packages) || (value.undo && !validPackages(value.undo))) throw new Error("Invalid package storage");
    return value;
  } catch { return { ...emptyPackageStore(), error: "Saved packages could not be read. Existing storage has been left untouched." }; }
}
export function writePackageStore(store: PackageStore) {
  if (readPackageStore().error) throw new Error("Existing package storage is unreadable; refusing to overwrite it.");
  if (!validPackages(store.packages)) throw new Error("Invalid package rules; nothing was saved.");
  window.localStorage.setItem(PACKAGE_STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(PACKAGE_CHANGE_EVENT));
}
export function useSavedPackages() {
  const [store, setStore] = useState(readPackageStore);
  useEffect(() => {
    try {
      const initial = readPackageStore();
      if (!initial.error && initial.packages.length && window.localStorage.getItem(PACKAGE_STORE_KEY) === null) writePackageStore(initial);
    } catch { setStore((current) => ({ ...current, error: "Existing approvals are available, but migration could not be saved. Original storage is untouched." })); }
    const refresh = () => setStore(readPackageStore()); window.addEventListener(PACKAGE_CHANGE_EVENT, refresh); window.addEventListener("storage", refresh); return () => { window.removeEventListener(PACKAGE_CHANGE_EVENT, refresh); window.removeEventListener("storage", refresh); }; }, []);
  return { store, save: useCallback((next: PackageStore) => writePackageStore(next), []) };
}
export function savePackageRule(label: string, conditions: PackageReviewRule, packageId?: string) {
  const store = readPackageStore();
  const cards = packageCardNames(conditions);
  const id = packageId ?? packagePoolId(cards);
  const prior = store.packages.find((pkg) => pkg.id === id);
  const rule: SavedPackageRule = { id: packageRuleKey(conditions), label, conditions, activation: "", cards, source: "Manual review", sourceIds: [], status: "manual", scope: "main-material", approvedAt: new Date().toISOString() };
  const pkg: SavedCardPackage = { id, name: prior?.name ?? label, cards: [...new Set([...(prior?.cards ?? []), ...cards])].sort(), rules: [...(prior?.rules ?? []).filter((item) => item.id !== rule.id), rule], subpackageIds: prior?.subpackageIds ?? [], sourcePackageIds: prior?.sourcePackageIds ?? [id] };
  writePackageStore({ ...store, undo: undefined, packages: [...store.packages.filter((item) => item.id !== id), pkg] });
}
export function overlaySavedPackages(suggested: SavedCardPackage[], store: PackageStore): SavedCardPackage[] {
  const consumed = new Set(store.packages.flatMap((pkg) => [pkg.id, ...pkg.sourcePackageIds]));
  const saved = store.packages.map((pkg) => {
    const sources = suggested.filter((source) => source.id === pkg.id || pkg.sourcePackageIds.includes(source.id));
    const latestRules = new Map(sources.flatMap((source) => source.rules).map((rule) => [rule.id, rule]));
    const rules = pkg.rules.map((rule) => {
      const fresh = latestRules.get(rule.id); latestRules.delete(rule.id);
      return fresh ? { ...fresh, ...rule, evidence: fresh.evidence } : rule.status === "auto" ? { ...rule, evidence: undefined } : rule;
    });
    return { ...pkg, cards: [...new Set([...pkg.cards, ...sources.flatMap((source) => source.cards), ...rules.flatMap((rule) => rule.cards)])].sort(), rules: [...rules, ...latestRules.values()] };
  });
  return [...saved, ...suggested.filter((pkg) => !consumed.has(pkg.id))];
}
export function reconcilePackagePolicy(packages: SavedCardPackage[], enabled: boolean) { return applyPackageAutoPolicy(packages, enabled); }
export function mergeSavedPackages(left: SavedCardPackage, right: SavedCardPackage): SavedCardPackage {
  const rules = new Map(left.rules.map((rule) => [rule.id, rule]));
  const priority = { suggested: 0, auto: 1, manual: 2, registered: 3 };
  for (const rule of right.rules) {
    const prior = rules.get(rule.id);
    if (!prior) rules.set(rule.id, rule);
    else {
      const selected = priority[rule.status] > priority[prior.status] ? rule : prior;
      const autoBlocked = !!(prior.autoBlocked || rule.autoBlocked);
      rules.set(rule.id, { ...selected, sourceIds: [...new Set([...prior.sourceIds, ...rule.sourceIds])], autoBlocked, status: selected.status === "auto" && autoBlocked ? "suggested" : selected.status });
    }
  }
  return { ...left, cards: [...new Set([...left.cards, ...right.cards])].sort(), rules: [...rules.values()], sourcePackageIds: [...new Set([...left.sourcePackageIds, ...right.sourcePackageIds, right.id])], subpackageIds: [...new Set([...left.subpackageIds, ...right.subpackageIds])].filter((id) => id !== left.id && id !== right.id) };
}
