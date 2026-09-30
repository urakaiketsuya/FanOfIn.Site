// Keep this list deliberately small and high-confidence. Automated filtering is
// only a first-line guard; reports handle context, evasion, and false negatives.
const BLOCKED_TERMS = new Set([
  "bitch",
  "cunt",
  "dick",
  "fuck",
  "motherfucker",
  "nigger",
  "nigga",
  "pussy",
  "shit",
  "slut",
  "whore",
  "fucks", "fucked", "fucking", "fucker", "fuckers",
  "motherfuckers", "motherfucking", "bullshit", "shitty",
  "bitches", "asshole", "assholes", "cunts",
]);

/**
 * Deliberately loose English filter: whole words and a few explicit variants.
 * Mild language and substrings (e.g. assassin, Scunthorpe) remain allowed.
 * Normalize common obfuscation without rewriting the user's submitted text.
 */
export function containsBlockedLanguage(value: string): boolean {
  const normalized = value.normalize("NFKD").replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US").replace(/\p{Cf}/gu, "")
    .replace(/[013457@$]/g, character => ({
      "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
    })[character] ?? character);
  // Unicode boundaries avoid interpreting parts of non-English words as English.
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.some(word => BLOCKED_TERMS.has(word))) return true;
  // Also catch punctuation-separated spellings such as f.u.c.k, without
  // joining separate prose words or stripping non-Latin letters.
  return normalized.split(/\s+/u).some(word =>
    BLOCKED_TERMS.has(word.replace(/[^\p{L}\p{N}]/gu, "")));
}

export function validUserFacingName(value: string): boolean {
  return !containsBlockedLanguage(value);
}
