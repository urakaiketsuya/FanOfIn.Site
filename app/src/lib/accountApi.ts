import type { AccountSession, DeckImportPreview, OmnidexDecklist, SavedDeck } from "@gatcg/shared";

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
  logout: () => accountRequest<{ success: true }>("/v1/auth/logout", { method: "POST" }),
  logoutAll: () => accountRequest<{ success: true }>("/v1/auth/logout-all", { method: "POST" }),
  exportAccount: () => accountRequest<Record<string, unknown>>("/v1/me/export"),
  deleteAccount: () => accountRequest<{ success: true }>("/v1/me", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" }) }),
  decks: () => accountRequest<{ decks: SavedDeck[] }>("/v1/me/decks"),
  saveDeck: (input: { title: string; format: "STANDARD" | "PANTHEON" | "UNKNOWN"; championName?: string | null; decklist: OmnidexDecklist; source: { provider: "manual"; externalDeckId: string; label: string } }) =>
    accountRequest<{ id: string; created: boolean }>("/v1/me/decks", { method: "POST", body: JSON.stringify(input) }),
  renameDeck: (id: string, title: string) => accountRequest<{ success: true }>(`/v1/me/decks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteDeck: (id: string) => accountRequest<{ success: true }>(`/v1/me/decks/${encodeURIComponent(id)}`, { method: "DELETE" }),
  previewImport: (provider: "omnidex" | "shoutatyourdecks", identifier: string) => accountRequest<DeckImportPreview>("/v1/me/imports/preview", { method: "POST", body: JSON.stringify({ provider, identifier }) }),
  importDecks: (provider: "omnidex" | "shoutatyourdecks", identifier: string) => accountRequest<{ created: number; linked: number }>("/v1/me/imports", { method: "POST", body: JSON.stringify({ provider, identifier }) }),
};

export { AccountApiError };
