import { matchesPackageRule, type PackageConditionGroup, type PackageReviewRule } from "@gatcg/shared";
import { useCallback, useEffect, useState } from "react";

export interface LocalPackageApproval {
  id: string;
  label: string;
  memberCards: string[];
  requiredCards: string[];
  optionCards: string[];
  minOptions: number;
  approvedAt: string;
  groups?: PackageConditionGroup[];
}

const STORAGE_KEY = "fan-of-insight-approved-packages-v1";
const CHANGE_EVENT = "fan-of-insight-package-approvals-changed";

function normalizeMemberCards(memberCards: string[]): string[] {
  return [...new Set(memberCards.map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function localPackageApprovalId(memberCards: string[]): string {
  return `local:${normalizeMemberCards(memberCards).map((name) => encodeURIComponent(name.toLowerCase())).join("+")}`;
}

export function parseLocalPackageApprovals(raw: string | null): LocalPackageApproval[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry): LocalPackageApproval[] => {
      if (!entry || typeof entry !== "object") return [];
      const candidate = entry as Partial<LocalPackageApproval>;
      if (typeof candidate.id !== "string" || typeof candidate.label !== "string" || !Array.isArray(candidate.memberCards)) return [];
      const memberCards = normalizeMemberCards(candidate.memberCards.filter((name): name is string => typeof name === "string"));
      if (memberCards.length < 2) return [];
      const optionCards = normalizeMemberCards(Array.isArray(candidate.optionCards) ? candidate.optionCards.filter((name): name is string => typeof name === "string") : []);
      const requiredCards = normalizeMemberCards(Array.isArray(candidate.requiredCards)
        ? candidate.requiredCards.filter((name): name is string => typeof name === "string")
        : memberCards.filter((name) => !optionCards.includes(name)));
      const requestedMinimum = typeof candidate.minOptions === "number" ? candidate.minOptions : 0;
      const minOptions = Math.max(0, Math.min(optionCards.length, Math.floor(requestedMinimum)));
      const groups = Array.isArray(candidate.groups) ? candidate.groups.filter((g) => g && Array.isArray(g.cards) && g.cards.every((c) => typeof c === "string") && Number.isInteger(g.minimum) && g.minimum >= 1 && g.minimum <= new Set(g.cards).size) : undefined;
      if (candidate.groups && groups?.length !== candidate.groups.length) return [];
      return [{ ...(groups ? { groups } : {}), id: candidate.id, label: candidate.label, memberCards, requiredCards, optionCards, minOptions, approvedAt: typeof candidate.approvedAt === "string" ? candidate.approvedAt : "" }];
    });
  } catch {
    return [];
  }
}

export function getLocalPackageApprovals(): LocalPackageApproval[] {
  if (typeof window === "undefined") return [];
  return parseLocalPackageApprovals(window.localStorage.getItem(STORAGE_KEY));
}

export function evaluateLocalPackageApproval(approval: LocalPackageApproval, presentCards: ReadonlySet<string>): string[] {
  const presentOptions = approval.optionCards.filter((name) => presentCards.has(name));
  const active = approval.groups ? matchesPackageRule(presentCards, { requiredCards: approval.requiredCards, groups: approval.groups }) : approval.requiredCards.every((name) => presentCards.has(name)) && presentOptions.length >= approval.minOptions;
  return active ? approval.memberCards.filter((name) => presentCards.has(name)) : [];
}

function saveLocalPackageApprovals(approvals: LocalPackageApproval[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(approvals));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function approveLocalPackage(label: string, memberCards: string[]) {
  if (typeof window === "undefined") return;
  const normalized = normalizeMemberCards(memberCards);
  if (normalized.length < 2) return;
  const id = localPackageApprovalId(normalized);
  const next = getLocalPackageApprovals().filter((entry) => entry.id !== id);
  next.push({ id, label, memberCards: normalized, requiredCards: normalized, optionCards: [], minOptions: 0, approvedAt: new Date().toISOString() });
  saveLocalPackageApprovals(next);
}

export function approveLocalPackageFamily(label: string, anchorCard: string, coreCards: string[], optionCards: string[], minOptions: number) {
  if (typeof window === "undefined") return;
  const requiredCards = normalizeMemberCards([anchorCard, ...coreCards]);
  const options = normalizeMemberCards(optionCards).filter((name) => !requiredCards.includes(name));
  if (requiredCards.length === 0 || options.length === 0) return;
  approveReviewedPackage(label, { requiredCards, groups: [{ cards: options, minimum: Math.max(1, Math.min(options.length, Math.floor(minOptions))) }] });
}

export function revokeLocalPackage(id: string) {
  if (typeof window === "undefined") return;
  saveLocalPackageApprovals(getLocalPackageApprovals().filter((entry) => entry.id !== id));
}

export function useLocalPackageApprovals() {
  const [approvals, setApprovals] = useState(getLocalPackageApprovals);
  useEffect(() => {
    const refresh = () => setApprovals(getLocalPackageApprovals());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return {
    approvals,
    approve: useCallback((label: string, memberCards: string[]) => approveLocalPackage(label, memberCards), []),
    approveFamily: useCallback((label: string, anchorCard: string, coreCards: string[], optionCards: string[], minOptions: number) => approveLocalPackageFamily(label, anchorCard, coreCards, optionCards, minOptions), []),
    revoke: useCallback((id: string) => revokeLocalPackage(id), []),
  };
}

export function approveReviewedPackage(label: string, rule: PackageReviewRule) {
  const memberCards = normalizeMemberCards([...rule.requiredCards, ...rule.groups.flatMap((group) => group.cards)]);
  const id = `review:${encodeURIComponent(JSON.stringify(rule))}`;
  const next = getLocalPackageApprovals().filter((entry) => entry.id !== id);
  next.push({ id, label, memberCards, requiredCards: rule.requiredCards, optionCards: [], minOptions: 0, groups: rule.groups, approvedAt: new Date().toISOString() });
  saveLocalPackageApprovals(next);
}
