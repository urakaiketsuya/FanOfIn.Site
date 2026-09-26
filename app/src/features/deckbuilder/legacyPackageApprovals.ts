import { type PackageConditionGroup } from "@gatcg/shared";

export interface LocalPackageApproval {
  id: string;
  label: string;
  memberCards: string[];
  requiredCards: string[];
  optionCards: string[];
  minOptions: number;
  approvedAt: string;
  groups?: PackageConditionGroup[];
  packageId?: string;
  scope?: "main-material" | "legacy-any-section";
}


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

