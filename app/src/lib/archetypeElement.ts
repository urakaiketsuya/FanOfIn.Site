const ELEMENT_NAMES = new Set(["ARCANE", "ASTRA", "CRUX", "EXALTED", "EXIA", "FIRE", "LUXEM", "NEOS", "TERA", "UMBRA", "WATER", "WIND"]);

export function archetypeElement(name: string): string | null {
  const firstWord = name.split(/\s+/, 1)[0].toUpperCase();
  return ELEMENT_NAMES.has(firstWord) ? firstWord : null;
}
