import type { SavedDeckVersion } from "@gatcg/shared";
import type { TagOverride, TagProposal, TagProposalInput, TagProposalList } from "@gatcg/shared";
import { publishCollectionChange } from "./collectionEvents";
import type { DeckFolder, DeckFolderInput, AccountSession, AccountUser, AnalysisProfileSyncRecord, AuthIdentity, AuthProvider, BinderItem, BinderSettings, BookmarkedCombo, BookmarkedDeck, CollectionCardTracking, CollectionCardTrackingUpdate, CollectionEntry, CollectionTransaction, CollectionUpdateLine, CollectionUpdateMode, CommentReportReason, ComboDefinition, ComboVisibility, DeckCommentTarget, DeckCommentThread, DeckFormat, DeckImportPreview, DeckImportResult, DeckReportReason, DeckSocialState, DeckVisibility, MatchLogRecord, OfficialProductDeckFavorite, OmnidexDecklist, PublicBinder, PublicCombo, PublicDeck, PublicDeckSummary, PublicProfile, SavedCombo, SavedDeck, SavedDeckDetail, SharedCardWatch, SyncedAnalysisProfile, Trade, TradeLine, TradeStatus, TournamentDeckFavorite } from "@gatcg/shared";

const ACCOUNT_API_URL = (import.meta.env.VITE_ACCOUNT_API_URL as string | undefined)?.replace(/\/$/, "")
  ?? (import.meta.env.PROD ? "https://accounts.fanofin.site/api" : "http://localhost:8788");

class AccountApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const collectionReads = new Map<string, {promise: Promise<unknown>; expires: number}>();
// Only bridge closely spaced consumers; never persist account data across sessions.
if (typeof window !== "undefined") {
  window.addEventListener("focus",()=>collectionReads.clear());
  window.addEventListener("storage",()=>collectionReads.clear());
}

async function accountRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const cacheable = !init?.method && path === "/v1/me/collection";
  if ((init?.method && init.method !== "GET") || path.startsWith("/v1/auth/")) collectionReads.clear();
  const existing = cacheable ? collectionReads.get(path) : undefined;
  if (existing && existing.expires > Date.now()) return existing.promise as Promise<T>;
  const pending = performAccountRequest<T>(path, init);
  if (cacheable) {
    collectionReads.set(path,{promise:pending,expires:Date.now()+3_000});
    void pending.catch(() => {if (collectionReads.get(path)?.promise === pending) collectionReads.delete(path);});
  }
  return pending;
}

async function performAccountRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ACCOUNT_API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (init?.method && init.method !== "GET") collectionReads.clear();
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new AccountApiError(response.status, body.error ?? `Account request failed (${response.status})`);
  return body;
}

async function inventoryRequest<T>(path: string, init: RequestInit): Promise<T> {
  const result = await accountRequest<T>(path, init);
  publishCollectionChange();
  return result;
}

export const accountApi = {
  cardTagOverrides: () => accountRequest<{ overrides: TagOverride[] }>("/v1/card-tags"),
  tagProposals: (review = false, offset = 0) => accountRequest<TagProposalList>(`/v1/me/card-tag-proposals?review=${review ? 1 : 0}&offset=${offset}`),
  submitTagProposal: (input: TagProposalInput) => accountRequest<{ proposal: TagProposal }>("/v1/me/card-tag-proposals", { method: "POST", body: JSON.stringify(input) }),
  reviewTagProposal: (id: string, decision: "approved" | "rejected") => accountRequest<{ success: true }>(`/v1/me/card-tag-proposals/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ decision }) }),
  deckFolders: () => accountRequest<{ folders: DeckFolder[] }>("/v1/me/deck-folders"),
  createDeckFolder: (id: string, input: DeckFolderInput) => accountRequest<{ folder: DeckFolder }>("/v1/me/deck-folders", { method: "POST", body: JSON.stringify({ id, ...input }) }),
  updateDeckFolder: (id: string, revision: number, input: DeckFolderInput) => accountRequest<{ folder: DeckFolder }>(`/v1/me/deck-folders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ revision, ...input }) }),
  deleteDeckFolder: (id: string, revision: number) => accountRequest<{ success: true }>(`/v1/me/deck-folders/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ revision }) }),
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
  analysisProfile: (fingerprint: string, identity?: string | null) => accountRequest<{ profile: AnalysisProfileSyncRecord | null }>(`/v1/me/analysis-profiles/${encodeURIComponent(fingerprint)}${identity ? `?identity=${encodeURIComponent(identity)}` : ""}`),
  saveAnalysisProfile: (profile: SyncedAnalysisProfile, identity?: string | null) => accountRequest<AnalysisProfileSyncRecord>("/v1/me/analysis-profiles", { method: "PUT", body: JSON.stringify({ identity, profile }) }),
  matchLog: (savedDeckId?: string) => accountRequest<{ records: MatchLogRecord[] }>(`/v1/me/match-log${savedDeckId ? `?savedDeckId=${encodeURIComponent(savedDeckId)}` : ""}`),
  saveMatchLog: async (records: MatchLogRecord[]) => {
    let saved = 0;
    for (let offset = 0; offset < records.length; offset += 500) saved += (await accountRequest<{ saved: number }>("/v1/me/match-log", { method: "PUT", body: JSON.stringify({ records: records.slice(offset, offset + 500) }) })).saved;
    return { saved };
  },
  deleteMatchLogRecord: (id: string) => accountRequest<{ success: true }>(`/v1/me/match-log/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deck: (id: string) => accountRequest<{ deck: SavedDeckDetail }>(`/v1/me/decks/${encodeURIComponent(id)}?history=summary`),
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
  tournamentFavorites: () => accountRequest<{ decks: TournamentDeckFavorite[] }>("/v1/me/tournament-favorites"),
  officialProductFavorites: () => accountRequest<{ decks: OfficialProductDeckFavorite[] }>("/v1/me/official-product-favorites"),
  favoriteOfficialProductDeck: (productDeckId: string, input: { favorited: boolean; title?: string; championName?: string | null; format?: DeckFormat; decklist?: OmnidexDecklist }) => accountRequest<{ favorited: boolean; locationId: string }>(`/v1/me/official-product-decks/${encodeURIComponent(productDeckId)}/favorite`, { method: "POST", body: JSON.stringify(input) }),
  tournamentFavoriteState: (deckHash: string) => accountRequest<{ favorited: boolean }>(`/v1/me/tournament-decks/${encodeURIComponent(deckHash)}/favorite`),
  favoriteTournamentDeck: (deckHash: string, input: { favorited: boolean; title?: string; championName?: string | null; decklist?: OmnidexDecklist; sourceEventId?: number | null; sourceEventName?: string | null; sourcePlayerId?: number | null; sourcePlayerName?: string | null }) => accountRequest<{ favorited: boolean }>(`/v1/me/tournament-decks/${encodeURIComponent(deckHash)}/favorite`, { method: "POST", body: JSON.stringify(input) }),
  combos: () => accountRequest<{ combos: SavedCombo[] }>("/v1/me/combos"),
  saveCombo: (input: { name: string; description?: string; tags?: string[]; visibility?: ComboVisibility; definition: ComboDefinition; format?: DeckFormat; championName?: string | null; exampleDeckId?: string | null; deduplicate?: boolean }) => accountRequest<{ combo: SavedCombo; created: boolean }>("/v1/me/combos", { method: "POST", body: JSON.stringify(input) }),
  updateCombo: (id: string, input: Partial<{ name: string; description: string; tags: string[]; visibility: ComboVisibility; definition: ComboDefinition }>) => accountRequest<{ combo: SavedCombo }>(`/v1/me/combos/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteCombo: (id: string) => accountRequest<{ success: true }>(`/v1/me/combos/${encodeURIComponent(id)}`, { method: "DELETE" }),
  publicCombo: (slug: string) => accountRequest<{ combo: PublicCombo }>(`/v1/combos/${encodeURIComponent(slug)}`),
  discoverCombos: (query = "") => accountRequest<{ combos: PublicCombo[] }>(`/v1/discover/combos?q=${encodeURIComponent(query)}`),
  comboBookmarks: () => accountRequest<{ combos: BookmarkedCombo[] }>("/v1/me/combo-bookmarks"),
  bookmarkCombo: (slug: string, bookmarked: boolean) => accountRequest<{ bookmarked: boolean }>(`/v1/me/combos/${encodeURIComponent(slug)}/bookmark`, { method: "POST", body: JSON.stringify({ bookmarked }) }),
  saveCollectionTrackingBatch: (cards: (CollectionCardTrackingUpdate & {cardUuid: string})[]) => inventoryRequest<{cards: CollectionCardTracking[]}>("/v1/me/collection/tracking", {method: "PATCH", body: JSON.stringify({cards}), signal: AbortSignal.timeout(30_000)}),
  collectionTracking: () => accountRequest<{cards: CollectionCardTracking[]}>("/v1/me/collection/tracking"),
  saveCollectionTracking: (cardUuid: string, input: CollectionCardTrackingUpdate) => inventoryRequest<{card: CollectionCardTracking}>(`/v1/me/collection/tracking/${encodeURIComponent(cardUuid)}`, {method: "PATCH", body: JSON.stringify(input)}),
  collection: () => accountRequest<{ entries: CollectionEntry[]; transactions: CollectionTransaction[] }>("/v1/me/collection"),
  updateCollection: (input: { mode: CollectionUpdateMode; source: string; lines: CollectionUpdateLine[]; requestId?: string }) => inventoryRequest<{ transactionId: string; changed: number }>("/v1/me/collection", { method: "POST", body: JSON.stringify(input), signal: AbortSignal.timeout(30_000) }),
  undoCollectionTransaction: (id: string) => inventoryRequest<{ success: true }>(`/v1/me/collection/transactions/${encodeURIComponent(id)}/undo`, { method: "POST", body: "{}" }),
  sharedCardWatches: () => accountRequest<{ cards: SharedCardWatch[] }>("/v1/me/collection/shared-cards"),
  setSharedCardWatch: (cardUuid: string, input: { cardName?: string; watched: boolean }) => accountRequest<{ success: true }>(`/v1/me/collection/shared-cards/${encodeURIComponent(cardUuid)}`, { method: "PATCH", body: JSON.stringify(input) }),
  deckComments: (target: DeckCommentTarget, sort: "oldest" | "newest" = "oldest") => accountRequest<DeckCommentThread>(`/v1/deck-comments/${target.kind}/${encodeURIComponent(target.id)}?sort=${sort}`),
  addDeckComment: (target: DeckCommentTarget, body: string, parentId?: string) => accountRequest<{ id: string }>(`/v1/deck-comments/${target.kind}/${encodeURIComponent(target.id)}`, { method: "POST", body: JSON.stringify({ body, parentId }) }),
  editComment: (id: string, body: string) => accountRequest<{ success: true }>(`/v1/me/comments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ body }) }),
  deleteComment: (id: string) => accountRequest<{ success: true }>(`/v1/me/comments/${encodeURIComponent(id)}`, { method: "DELETE" }),
  reportComment: (id: string, reason: CommentReportReason, details = "") => accountRequest<{ reported: true }>(`/v1/me/comments/${encodeURIComponent(id)}/report`, { method: "POST", body: JSON.stringify({ reason, details }) }),
  lockDeckComments: (target: DeckCommentTarget, locked: boolean) => accountRequest<{ success: true }>(`/v1/deck-comments/${target.kind}/${encodeURIComponent(target.id)}`, { method: "PATCH", body: JSON.stringify({ locked }) }),
  setBlock: (profileSlug: string, blocked: boolean) => accountRequest<{ success: true }>(`/v1/me/blocks/${encodeURIComponent(profileSlug)}`, { method: "PUT", body: JSON.stringify({ blocked }) }),
  binder: () => accountRequest<{ settings: BinderSettings; items: BinderItem[] }>("/v1/me/binder"),
  publicBinder: (profileSlug: string) => accountRequest<{ binder: PublicBinder }>(`/v1/binders/${encodeURIComponent(profileSlug)}`),
  saveBinderSettings: (settings: BinderSettings) => accountRequest<{ settings: BinderSettings }>("/v1/me/binder/settings", { method: "PUT", body: JSON.stringify(settings) }),
  addBinderItem: (item: Omit<BinderItem, "id" | "reservedQuantity" | "updatedAt">) => accountRequest<{ id: string }>("/v1/me/binder/items", { method: "POST", body: JSON.stringify(item) }),
  updateBinderItem: (id: string, item: Omit<BinderItem, "id" | "reservedQuantity" | "updatedAt">) => accountRequest<{ success: true }>(`/v1/me/binder/items/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(item) }),
  deleteBinderItem: (id: string) => accountRequest<{ success: true }>(`/v1/me/binder/items/${encodeURIComponent(id)}`, { method: "DELETE" }),
  binderMatches: () => accountRequest<{ binders: PublicBinder[] }>("/v1/me/binder/matches"),
  trades: () => accountRequest<{ trades: Trade[] }>("/v1/me/trades"),
  createTrade: (recipientProfileSlug: string, lines: Pick<TradeLine, "binderItemId" | "quantity">[], message = "") => accountRequest<{ id: string }>("/v1/me/trades", { method: "POST", body: JSON.stringify({ recipientProfileSlug, lines, message }) }),
  counterTrade: (id: string, lines: Pick<TradeLine, "binderItemId" | "quantity">[], message = "") => accountRequest<{ success: true }>(`/v1/me/trades/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ lines, message }) }),
  updateTradeStatus: (id: string, status: TradeStatus | "sent" | "received") => inventoryRequest<{ success: true }>(`/v1/me/trades/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deckVersion: (id: string, versionId: string) => accountRequest<{ version: SavedDeckVersion }>(`/v1/me/decks/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`),
  deckHistory: (id: string, before: number) => accountRequest<{ versions: SavedDeckVersion[]; nextBefore: number | null }>(`/v1/me/decks/${encodeURIComponent(id)}/versions?before=${before}`),
  createDeckVersion: (id: string, input: { decklist: OmnidexDecklist; format: "STANDARD" | "PANTHEON" | "UNKNOWN"; championName?: string | null; changeNote?: string; maybeboard?: { card: string; quantity: number }[]; expectedRevision?: number; requestId?: string }) =>
    accountRequest<{ id: string; versionNumber: number }>(`/v1/me/decks/${encodeURIComponent(id)}/versions`, { method: "POST", body: JSON.stringify(input) }),
  /** Updates the deck's current decklist content in place – no new entry in version history, unlike `createDeckVersion`. */
  updateDeckDecklist: (id: string, input: { decklist: OmnidexDecklist; format: "STANDARD" | "PANTHEON" | "UNKNOWN"; championName?: string | null; maybeboard?: { card: string; quantity: number }[]; expectedRevision?: number; requestId?: string }) =>
    accountRequest<{ id: string; versionNumber: number }>(`/v1/me/decks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  restoreDeckVersion: (id: string, versionId: string, options?: { requestId: string; expectedRevision: number }) => accountRequest<{ id: string; versionNumber: number }>(`/v1/me/decks/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/restore`, { method: "POST", body: JSON.stringify(options ?? {}) }),
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
