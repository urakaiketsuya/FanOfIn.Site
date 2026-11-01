/** Explicit catalog aliases: product identities and exact printing IDs remain untouched. */
const families = [
  ["DOA", "Dawn of Ashes", "DOA 1st", "DOA Alter"],
  ["ALC", "Alchemical Revolution", "ALC 1st", "ALC Alter"],
  ["MRC", "Mercurial Heart", "MRC 1st", "MRC Alter"],
  ["AMB", "Mortal Ambition", "AMB 1st", "AMB Alter"],
  ["DTR", "Distorted Reflections", "DTR 1st", "DTR Alter"],
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

/** Expansion families available for profile favorites. */
export const profileSetOptions = families.map(([id, name]) => ({ id, name }));

/** Search groups related products without changing collection or printing identities. */
const searchProducts: Record<string, readonly string[]> = {
  DOA: ['DOASD', 'DOAp'], ALC: ['ALCSD'], AMB: ['AMBSD', 'AMBDP'], DTR: ['DTRSD'],
  FTC: ['FTCA'], PTM: ['PTMEVP', 'PTMLGS'],
  RDO: ['RDOA', 'RDOEVP', 'RDOP', 'RDOPD'],
  PRD: ['PRDDP', 'PRDEVP', 'PRDG', 'PRDP', 'PRDSD'],
  CBL: ['CBLP', 'CBLDS', 'CBL 1st', 'CBL Alter', 'Re:C-SKY', 'Re:C-MST'],
};
const searchAliases = new Map<string, { prefix: string; name: string }>();
for (const [prefix, products] of Object.entries(searchProducts)) {
  const family = setFamily({ prefix, name: prefix === 'FTC' ? 'Fractured Crown' : prefix === 'CBL' ? 'Asphodel/Cantabile' : prefix });
  for (const product of [prefix, ...products]) searchAliases.set(product.toLowerCase(), family);
}
for (const [prefix, name, ...editions] of families) {
  for (const alias of [prefix, ...editions]) searchAliases.set(alias.toLowerCase(), { prefix, name });
}
export function searchSetFamily(set: { prefix: string; name: string }) {
  const family = setFamily(set);
  return searchAliases.get(family.prefix.toLowerCase()) ?? searchAliases.get(set.prefix.toLowerCase()) ?? family;
}
export function searchSetPrefix(prefix: string): string {
  return searchSetFamily({ prefix, name: prefix }).prefix;
}
