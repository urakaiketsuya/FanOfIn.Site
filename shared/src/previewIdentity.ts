/** Stable identity for editorial cards before an official UUID is available. */
export function previewCardSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function previewCardId(name: string): string {
  return `preview:${previewCardSlug(name)}`;
}
export const CATALOG_CARD_ID_PATTERN = /^(?:preview:)?[a-zA-Z0-9-]{1,80}$/;
