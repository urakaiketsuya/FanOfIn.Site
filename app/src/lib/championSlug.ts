/** Builds a `/champions/:name` path segment from a champion name, hyphenating spaces
 * instead of leaving them as `%20` (e.g. "Guo Jia" -> "Guo-Jia"). Assumes champion names
 * don't themselves contain literal hyphens, which holds for the current roster.
 */
export function championNameToSlug(name: string): string {
  return encodeURIComponent(name.trim().replace(/\s+/g, "-"));
}

/** Inverse of championNameToSlug: recovers the champion name from a `:name` route param. */
export function slugToChampionName(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

/** Converts lower-case external champion keys such as `diao-chan` into display names. */
export function championKeyToDisplayName(key: string): string {
  return slugToChampionName(key)
    .split(" ")
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join(" ");
}
