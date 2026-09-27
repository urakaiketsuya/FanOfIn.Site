/** Explicit catalog aliases: product identities and exact printing IDs remain untouched. */
const families = [
  ["DOA", "Dawn of Ashes", "DOA 1st", "DOA Alter"],
  ["ALC", "Alchemical Revolution", "ALC 1st", "ALC Alter"],
  ["MRC", "Mercurial Heart", "MRC 1st", "MRC Alter"],
  ["AMB", "Mortal Ambition", "AMB 1st", "AMB Alter"],
  ["DTR", "Distorted Reflections", "DTR 1st"],
  ["HVN", "Abyssal Heaven", "HVN 1st"],
  ["PTM", "Phantom Monarchs", "PTM 1st"],
  ["RDO", "Radiant Origins", "RDO 1st"],
  ["PRD", ".asphodel/paradise", "PRD 1st"],
] as const;
const aliases = new Map<string, { prefix: string; name: string }>();
for (const [prefix, name, ...editions] of families) {
  for (const alias of [prefix, ...editions]) aliases.set(alias, { prefix, name });
}
export function setFamily(set: { prefix: string; name: string }) {
  return aliases.get(set.prefix) ?? { prefix: set.prefix, name: set.name };
}
export function setFamilyPrefix(prefix: string): string {
  return aliases.get(prefix)?.prefix ?? prefix;
}
