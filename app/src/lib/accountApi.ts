import type { AccountSession, AccountUser, AuthIdentity, AuthProvider, BookmarkedDeck, CollectionEntry, CollectionTransaction, CollectionUpdateLine, CollectionUpdateMode, DeckImportPreview, DeckImportResult, DeckReportReason, DeckSocialState, DeckVisibility, OmnidexDecklist, PublicDeck, PublicDeckSummary, PublicProfile, SavedDeck, SavedDeckDetail, SharedCardWatch } from "@gatcg/shared";

const ACCOUNT_API_URL = (import.meta.env.VITE_ACCOUNT_API_URL as string | undefined)?.replace(/\/$/, "")
  ?? (import.meta.env.PROD ? "https://accounts.fanofin.site/api" : "http://localhost:8788");

class AccountApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function accountRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ACCOUNT_API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new AccountApiError(response.status, body.error ?? `Account request failed (${response.status})`);
  return body;
}

export const accountApi = {
  session: () => accountRequest<AccountSession>("/v1/auth/session"),
  googleNonce: () => accountRequest<{ nonce: string }>("/v1/auth/google/nonce", { method: "POST" }),
  googleSignIn: (credential: string, nonce: string) => accountRequest<AccountSession>("/v1/auth/google", { method: "POST", body: JSON.stringify({ credential, nonce }) }),
  discordStart: (purpose: "sign-in" | "link") => accountRequest<{ url: string }>("/v1/auth/discord/start", { method: "POST", body: JSON.stringify({ purpose }) }),
  passwordRegister: (email: string, password: string, turnstileToken: string) => accountRequest<{ success: true; message: string }>("/v1/auth/password/register", { method: "POST", body: JSON.stringify({ email, password, turnstileToken }) }),
  passwordLogin: (email: string, password: string, turnstileToken: string) => accountRequest<AccountSession>("/v1/auth/password/login", { method: "POST", body: JSON.stringify({ email, password, turnstileToken }) }),
  verifyEmail: (token: string) => accountRequest<AccountSession>("/v1/auth/password/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  forgotPassword: (email: string, turnstileToken: string) => accountRequest<{ success: true; message: string }>("/v1/auth/password/forgot", { method: "POST", body: JSON.stringify({ email, turnstileToken }) }),
  resetPassword: (token: string, password: string, turnstileToken: string) => accountRequest<{ success: true }>("/v1/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password, turnstileToken }) }),
  changePassword: (currentPassword: string, newPassword: string) => accountRequest<AccountSession>("/v1/me/auth/password/change", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  devSignIn: () => accountRequest<AccountSession>("/v1/auth/dev", { method: "POST", body: "{}" }),
  logout: () => accountRequest<{ success: true }>("/v1/auth/logout", { method: "POST" }),
  logoutAll: () => accountRequest<{ success: true }>("/v1/auth/logout-all", { method: "POST" }),
  authIdentities: () => accountRequest<{ identities: AuthIdentity[] }>("/v1/me/auth/identities"),
  removeAuthIdentity: (provider: AuthProvider) => accountRequest<{ success: true }>(`/v1/me/auth/identities/${provider}`, { method: "DELETE" }),
  exportAccount: () => accountRequest<Record<string, unknown>>("/v1/me/export"),
  updateUsername: (displayName: string) => accountRequest<{ user: AccountUser }>("/v1/me", { method: "PATCH", body: JSON.stringify({ displayName }) }),
  updateProfileDiscoverability: (profileDiscoverable: boolean) => accountRequest<{ user: AccountUser }>("/v1/me", { method: "PATCH", body: JSON.stringify({ profileDiscoverable }) }),
  updateAccountPreferences: (preferences: { deckChecklistDismissed?: boolean; displayNameReviewed?: boolean }) => accountRequest<{ user: AccountUser }>("/v1/me", { method: "PATCH", body: JSON.stringify(preferences) }),
  deleteAccount: () => accountRequest<{ success: true }>("/v1/me", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" }) }),
  decks: () => accountRequest<{ decks: SavedDeck[] }>("/v1/me/decks"),
  deck: (id: string) => accountRequest<{ deck: SavedDeckDetail }>(`/v1/me/decks/${encodeURIComponent(id)}`),
  publicDeck: (slug: string) => accountRequest<{ deck: PublicDeck }>(`/v1/decklists/${encodeURIComponent(slug)}`),
  discoverDecks: (params: URLSearchParams) => accountRequest<{ decks: PublicDeckSummary[]; nextPage: number | null }>(`/v1/discover/decklists?${params.toString()}`),
  discoverProfiles: (query: string) => accountRequest<{ profiles: { displayName: string; profileSlug: string }[] }>(`/v1/discover/profiles?q=${encodeURIComponent(query)}`),
  publicProfile: (slug: string) => accountRequest<{ profile: PublicProfile }>(`/v1/profiles/${encodeURIComponent(slug)}`),
  deckSocial: (slug: string) => accountRequest<DeckSocialState>(`/v1/me/decklists/${encodeURIComponent(slug)}/social`),
  likeDeck: (slug: string, liked: boolean) => accountRequest<{ liked: boolean; likeCount: number }>(`/v1/me/decklists/${encodeURIComponent(slug)}/like`, { method: "POST", body: JSON.stringify({ liked }) }),
  bookmarkDeck: (slug: string, bookmarked: boolean) => accountRequest<{ bookmarked: boolean; versionNumber: number | null }>(`/v1/me/decklists/${encodeURIComponent(slug)}/bookmark`, { method: "POST", body: JSON.stringify({ bookmarked }) }),
  copyDeck: (slug: string) => accountRequest<{ id: string; created: boolean }>(`/v1/me/decklists/${encodeURIComponent(slug)}/copy`, { method: "POST", body: "{}" }),
  reportDeck: (slug: string, reason: DeckReportReason, details: string) => accountRequest<{ reported: true }>(`/v1/me/decklists/${encodeURIComponent(slug)}/report`, { method: "POST", body: JSON.stringify({ reason, details }) }),
  bookmarks: () => accountRequest<{ decks: BookmarkedDeck[] }>("/v1/me/bookmarks"),
  collection: () => accountRequest<{ entries: CollectionEntry[]; transactions: CollectionTransaction[] }>("/v1/me/collection"),
  updateCollection: (input: { mode: CollectionUpdateMode; source: string; lines: CollectionUpdateLine[] }) => accountRequest<{ transactionId: string; changed: number }>("/v1/me/collection", { method: "POST", body: JSON.stringify(input) }),
  undoCollectionTransaction: (id: string) => accountRequest<{ success: true }>(`/v1/me/collection/transactions/${encodeURIComponent(id)}/undo`, { method: "POST", body: "{}" }),
  sharedCardWatches: () => accountRequest<{ cards: SharedCardWatch[] }>("/v1/me/collection/shared-cards"),
  setSharedCardWatch: (cardUuid: string, input: { cardName?: string; watched: boolean }) => accountRequest<{ success: true }>(`/v1/me/collection/shared-cards/${encodeURIComponent(cardUuid)}`, { method: "PATCH", body: JSON.stringify(input) }),
  createDeckVersion: (id: string, input: { decklist: OmnidexDecklist; format: "STANDARD" | "PANTHEON" | "UNKNOWN"; championName?: string | null; changeNote?: string }) =>
    accountRequest<{ id: string; versionNumber: number }>(`/v1/me/decks/${encodeURIComponent(id)}/versions`, { method: "POST", body: JSON.stringify(input) }),
  /** Updates the deck's current decklist content in place — no new entry in version history, unlike `createDeckVersion`. */
  updateDeckDecklist: (id: string, input: { decklist: OmnidexDecklist; format: "STANDARD" | "PANTHEON" | "UNKNOWN"; championName?: string | null }) =>
    accountRequest<{ id: string; versionNumber: number }>(`/v1/me/decks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  restoreDeckVersion: (id: string, versionId: string) => accountRequest<{ id: string; versionNumber: number }>(`/v1/me/decks/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/restore`, { method: "POST" }),
  saveDeck: (input: { title: string; format: "STANDARD" | "PANTHEON" | "UNKNOWN"; championName?: string | null; decklist: OmnidexDecklist; maybeboard?: { card: string; quantity: number }[]; source: { provider: "manual"; externalDeckId: string; label: string } }) =>
    accountRequest<{ id: string; created: boolean }>("/v1/me/decks", { method: "POST", body: JSON.stringify(input) }),
  updateDeckMetadata: (id: string, input: { title?: string; description?: string; primerMarkdown?: string; tags?: string[]; maybeboard?: { card: string; quantity: number }[] }) => accountRequest<{ success: true }>(`/v1/me/decks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  renameDeck: (id: string, title: string) => accountRequest<{ success: true }>(`/v1/me/decks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  publishDeck: (id: string, visibility: DeckVisibility) => accountRequest<{ publicSlug: string | null; visibility: DeckVisibility }>(`/v1/me/decks/${encodeURIComponent(id)}/publish`, { method: "POST", body: JSON.stringify({ visibility }) }),
  deleteDeck: (id: string) => accountRequest<{ success: true }>(`/v1/me/decks/${encodeURIComponent(id)}`, { method: "DELETE" }),
  previewImport: (provider: "omnidex" | "shoutatyourdecks", identifier: string) => accountRequest<DeckImportPreview>("/v1/me/imports/preview", { method: "POST", body: JSON.stringify({ provider, identifier }) }),
  importDecks: (provider: "omnidex" | "shoutatyourdecks", identifier: string, externalDeckIds: string[]) => accountRequest<DeckImportResult>("/v1/me/imports", { method: "POST", body: JSON.stringify({ provider, identifier, externalDeckIds }) }),
};

export { AccountApiError };
