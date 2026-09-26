import { groupPackagePools, packagePoolId, packageRuleKey, type PackageCandidatesData, type SavedCardPackage, type SavedPackageRule } from "@gatcg/shared";
import { packageRelationshipEntries, type PackageRelationshipEntry } from "./packageRelationshipEntries";
import type { DeckPackageCatalogEntry } from "../deckbuilder/packageGuardrails";
import type { DeckPackageCandidate } from "../deckbuilder/packageCandidates";

export function suggestionRule(entry: PackageRelationshipEntry): SavedPackageRule {
  return { id: entry.rule ? packageRuleKey(entry.rule) : entry.id, label: entry.label, conditions: entry.rule, activation: entry.activation,
    cards: [...entry.cards], status: entry.source === "Registered" ? "registered" : "suggested", source: entry.source,
    sourceIds: [entry.id], evidence: entry.approvalEvidence, scope: "main-material", supporting: entry.source === "Mined finding" };
}
export function buildSuggestedPackages(registered: DeckPackageCatalogEntry[], curated: DeckPackageCandidate[], data?: PackageCandidatesData): SavedCardPackage[] {
  const fullData = data ? { ...data, candidates: [...data.candidates, ...data.families.flatMap((family) => family.sourceFindings ?? [])] } : undefined;
  const entries = packageRelationshipEntries(registered, curated, [], fullData);
  const primary = entries.filter((entry) => entry.source !== "Mined finding");
  const packages = groupPackagePools(primary).groups.map((group): SavedCardPackage => {
    const id = packagePoolId(group.cards);
    const mechanic = group.entries.flatMap((entry) => entry.evidenceKinds).find((kind) => /^[A-Z]+ rules-text link$/.test(kind))?.split(" ")[0];
    const name = mechanic ? `${mechanic[0]}${mechanic.slice(1).toLowerCase()} package` : `${group.entries[0].label}${group.entries[0].label.toLowerCase().includes("package") ? "" : " package"}`;
    return { id, name, cards: group.cards, rules: group.entries.map(suggestionRule), sourcePackageIds: [id], subpackageIds: [] };
  });
  for (const entry of entries.filter((item) => item.source === "Mined finding")) {
    // Source findings belong to one deterministic smallest enclosing package, not duplicate tiles.
    const parent = packages.filter((pkg) => entry.cards.every((card) => pkg.cards.includes(card))).sort((a, b) => a.cards.length - b.cards.length || a.id.localeCompare(b.id))[0];
    const rule = suggestionRule(entry);
    if (parent) parent.rules.push(rule);
    else { const id = packagePoolId(entry.cards); packages.push({ id, name: `${entry.label} package`, cards: [...entry.cards], rules: [{ ...rule, supporting: false }], sourcePackageIds: [id], subpackageIds: [] }); }
  }
  for (const pkg of packages) {
    const dedup = new Map<string, SavedPackageRule>();
    for (const rule of pkg.rules) {
      const prior = dedup.get(rule.id);
      if (prior) { prior.sourceIds = [...new Set([...prior.sourceIds, ...rule.sourceIds])]; prior.evidence ??= rule.evidence; }
      else dedup.set(rule.id, rule);
    }
    pkg.rules = [...dedup.values()];
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
