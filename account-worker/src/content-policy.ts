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
]);

function canonicalToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[013457@$]/g, (character) => ({
      "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
    })[character] ?? character)
    .replace(/[^a-z]/g, "");
}

export function containsBlockedLanguage(value: string): boolean {
  // Check words independently after removing punctuation so common evasion such
  // as punctuation and leetspeak is caught without substring false positives.
  return value.split(/\s+/u).some((word) => BLOCKED_TERMS.has(canonicalToken(word)));
}

export function validUserFacingName(value: string): boolean {
  return !containsBlockedLanguage(value);
}
