/** Social crawlers need the server-rendered preview on our existing account host. */
export function deckShareUrl(publicSlug: string): string {
  const origin = (import.meta.env.VITE_DECK_SHARE_ORIGIN as string | undefined) ?? "https://accounts.fanofin.site";
  return `${origin.replace(/\/$/, "")}/share/decks/${encodeURIComponent(publicSlug)}`;
}
