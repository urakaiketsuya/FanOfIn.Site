/** A card package people can share by link. The link holds the whole package. Nothing is stored. */
export interface SharedPackageCard { name: string; section: "main" | "material"; quantity: number }
export interface SharedPackage { v: 1; name: string; champion?: string; cards: SharedPackageCard[] }

export const SHARED_PACKAGE_LIMITS = { maxCards: 60, maxQuantity: 4, maxNameLength: 80, maxEncodedLength: 4000 } as const;

// `shared` has no DOM or Node typings. These globals exist in browsers and in Node 16+.
declare const TextEncoder: new () => { encode(text: string): Uint8Array };
declare const TextDecoder: new (label: string, options: { fatal: boolean }) => { decode(bytes: Uint8Array): string };
declare function btoa(binary: string): string;
declare function atob(base64: string): string;

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (text: string): string => {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary.split(""), char => char.charCodeAt(0)));
};

/** Wire format: card names once in `k`, each line as [nameIndex, section (0 main, 1 material), quantity]. */
export function encodePackage(pkg: SharedPackage): string {
  const names = [...new Set(pkg.cards.map(card => card.name))].sort();
  const index = new Map(names.map((name, position) => [name, position]));
  const wire = { v: 1, n: pkg.name, ...(pkg.champion ? { c: pkg.champion } : {}), k: names, l: pkg.cards.map(card => [index.get(card.name), card.section === "main" ? 0 : 1, card.quantity]) };
  return toBase64Url(JSON.stringify(wire));
}

const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

/** Returns null for anything that is not a valid package. A link is never trusted. */
export function decodePackage(text: string): SharedPackage | null {
  const { maxCards, maxQuantity, maxNameLength, maxEncodedLength } = SHARED_PACKAGE_LIMITS;
  if (!text || text.length > maxEncodedLength || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const wire: unknown = JSON.parse(fromBase64Url(text));
    if (typeof wire !== "object" || wire === null) return null;
    const { v, n, c, k, l } = wire as Record<string, unknown>;
    if (v !== 1 || !isText(n, maxNameLength) || !Array.isArray(k) || !Array.isArray(l)) return null;
    if (c !== undefined && !isText(c, maxNameLength)) return null;
    if (l.length === 0 || l.length > maxCards || k.length > maxCards || !k.every(name => isText(name, maxNameLength))) return null;
    const seen = new Set<string>();
    const cards: SharedPackageCard[] = [];
    for (const line of l) {
      if (!Array.isArray(line) || line.length !== 3) return null;
      const [position, sectionBit, quantity] = line as unknown[];
      if (!Number.isInteger(position) || (position as number) < 0 || (position as number) >= k.length) return null;
      if (sectionBit !== 0 && sectionBit !== 1) return null;
      if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > maxQuantity) return null;
      const name = k[position as number] as string;
      const section = sectionBit === 0 ? "main" : "material";
      if (seen.has(`${section}:${name}`)) return null;
      seen.add(`${section}:${name}`);
      cards.push({ name, section, quantity: quantity as number });
    }
    return { v: 1, name: n, ...(c ? { champion: c as string } : {}), cards };
  } catch { return null; }
}

/** Turns one mined champion package choice into a shareable package. */
export function sharedPackageFromLines(name: string, champion: string | undefined, lines: SharedPackageCard[]): SharedPackage {
  return { v: 1, name: name.trim().slice(0, SHARED_PACKAGE_LIMITS.maxNameLength), ...(champion ? { champion } : {}), cards: lines.slice(0, SHARED_PACKAGE_LIMITS.maxCards).map(({ name: card, section, quantity }) => ({ name: card, section, quantity })) };
}
