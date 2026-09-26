import type { PackageCandidateEvidence, PackageCandidateFamily, PackageCandidatesData, PackagePoolEntry, PackageReviewRule } from "@gatcg/shared";
import type { DeckPackageCatalogEntry } from "../deckbuilder/packageGuardrails";
import type { DeckPackageCandidate } from "../deckbuilder/packageCandidates";
import type { LocalPackageApproval } from "../deckbuilder/localPackageApprovals";

export interface PackageRelationshipEntry extends PackagePoolEntry {
  label: string;
  source: "Registered" | "Approved" | "Curated" | "Mined family" | "Mined finding";
  activation: string;
  evidenceKinds: string[];
  champions: string[];
  builds: string[];
  matches?: number;
  rule?: PackageReviewRule;
  family?: PackageCandidateFamily;
}

export function describePackageRule(rule: PackageReviewRule) {
  return [...rule.requiredCards, ...rule.groups.map((group) => `${group.minimum} of (${group.cards.join(", ")})`)].join(" AND ");
}

function context(findings: PackageCandidateEvidence[]) {
  return {
    evidenceKinds: [...new Set(findings.flatMap((entry) => entry.evidenceKinds))],
    champions: [...new Set(findings.flatMap((entry) => entry.strongestChampions.map((cohort) => cohort.championName)))],
    builds: [...new Set(findings.flatMap((entry) => entry.archetypeSources?.map((build) => build.buildName) ?? []))],
  };
}

export function packageRelationshipEntries(registered: DeckPackageCatalogEntry[], curated: DeckPackageCandidate[], approvals: LocalPackageApproval[], mined?: PackageCandidatesData): PackageRelationshipEntry[] {
  return [
    ...registered.map((entry): PackageRelationshipEntry => ({ id: `registered:${entry.id}`, label: entry.label, source: "Registered", cards: entry.memberCards, activation: entry.activation, evidenceKinds: [], champions: [], builds: [], matches: entry.observedSupport?.matchingDecks })),
    ...curated.map((entry): PackageRelationshipEntry => ({ id: `curated:${entry.id}`, label: entry.label, source: "Curated", cards: entry.memberCards, activation: entry.proposedActivation, evidenceKinds: [entry.evidence.kind], champions: [], builds: [], matches: entry.evidence.matchingDecks })),
    ...approvals.map((entry): PackageRelationshipEntry => {
      const rule = { requiredCards: entry.requiredCards, groups: entry.groups ?? (entry.optionCards.length ? [{ cards: entry.optionCards, minimum: entry.minOptions }] : []) };
      return { id: `approved:${entry.id}`, label: entry.label, source: "Approved", cards: entry.memberCards, activation: describePackageRule(rule), evidenceKinds: [], champions: [], builds: [], rule };
    }),
    ...(mined?.families ?? []).map((family): PackageRelationshipEntry => {
      const rule = { requiredCards: [family.anchorCard, ...family.coreCards], groups: [{ cards: family.optionCards, minimum: family.minOptions }] };
      return { id: `family:${JSON.stringify(rule)}`, label: family.anchorCard, source: "Mined family", cards: [...rule.requiredCards, ...family.optionCards], activation: describePackageRule(rule), ...context(family.sourceFindings ?? []), matches: family.ruleEvidence?.matchingDecks, rule, family };
    }),
    ...(mined?.candidates ?? []).filter((entry) => entry.confidenceScore >= 40).map((entry): PackageRelationshipEntry => {
      const rule = { requiredCards: [entry.anchorCard, ...entry.memberCards], groups: [] };
      return { id: `finding:${JSON.stringify(rule)}`, label: entry.anchorCard, source: "Mined finding", cards: rule.requiredCards, activation: describePackageRule(rule), ...context([entry]), matches: entry.matchingDecks, rule };
    }),
  ];
}
