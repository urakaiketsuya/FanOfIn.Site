import type { DeckFormat } from "./shoutatyourdecks-types.js";
import type { OmnidexDecklist, OmnidexDecklistCardLine } from "./omnidex-types.js";

export type SavedDeckSourceProvider = "manual" | "omnidex" | "shoutatyourdecks";

export interface SavedDeckSource {
  id: string;
  provider: SavedDeckSourceProvider;
  externalDeckId: string;
  sourceUrl: string | null;
  label: string;
  metadata: Record<string, unknown>;
  sideboard: OmnidexDecklistCardLine[];
  importedAt: string;
}

export interface SavedDeck {
  id: string;
  identityHash: string;
  title: string;
  format: DeckFormat;
  championName: string | null;
  decklist: OmnidexDecklist;
  sources: SavedDeckSource[];
  createdAt: string;
  updatedAt: string;
}

export type DeckVisibility = "private" | "unlisted" | "public";

export interface SavedDeckVersion {
  id: string;
  versionNumber: number;
  decklist: OmnidexDecklist;
  format: DeckFormat;
  championName: string | null;
  changeNote: string;
  changeSummary: Record<string, unknown>;
  createdAt: string;
}

export interface SavedDeckDetail extends SavedDeck {
  description: string;
  visibility: DeckVisibility;
  publicSlug: string | null;
  currentVersionId: string;
  publishedVersionId: string | null;
  versions: SavedDeckVersion[];
}

export interface PublicDeck {
  publicSlug: string;
  title: string;
  description: string;
  visibility: Exclude<DeckVisibility, "private">;
  format: DeckFormat;
  championName: string | null;
  decklist: OmnidexDecklist;
  versionNumber: number;
  publishedAt: string;
  updatedAt: string;
  owner: { displayName: string; profileSlug: string };
  likeCount: number;
}

export interface PublicDeckSummary extends Omit<PublicDeck, "decklist" | "visibility" | "updatedAt"> {}

export interface PublicProfile {
  displayName: string;
  profileSlug: string;
  decks: PublicDeckSummary[];
}

export interface DeckSocialState {
  liked: boolean;
  bookmarked: boolean;
  bookmarkedVersionNumber: number | null;
}

export interface BookmarkedDeck extends PublicDeck {
  bookmarkedAt: string;
}

export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  profileSlug: string;
  profileDiscoverable: boolean;
}

export type DeckReportReason = "spam" | "abuse" | "copyright" | "other";

export interface AccountSession {
  user: AccountUser | null;
}

export interface DeckImportCandidate {
  provider: Exclude<SavedDeckSourceProvider, "manual">;
  externalDeckId: string;
  title: string;
  championName: string | null;
  format: DeckFormat;
  label: string;
  sourceUrl: string | null;
  available: boolean;
}

export interface DeckImportPreview {
  provider: Exclude<SavedDeckSourceProvider, "manual">;
  identifier: string;
  displayName: string;
  candidates: DeckImportCandidate[];
}

function normalizeLines(lines: OmnidexDecklistCardLine[]): OmnidexDecklistCardLine[] {
  const quantities = new Map<string, { card: string; quantity: number }>();
  for (const line of lines) {
    const card = line.card.trim().replace(/\s+/g, " ");
    if (!card || !Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    const key = card.toLocaleLowerCase("en-US");
    const existing = quantities.get(key);
    if (existing) existing.quantity += line.quantity;
    else quantities.set(key, { card, quantity: line.quantity });
  }
  return Array.from(quantities.values()).sort((a, b) =>
    a.card.localeCompare(b.card, "en-US", { sensitivity: "base" }) || a.quantity - b.quantity,
  );
}

/** Canonical saved-list representation. Sideboard is retained but deliberately excluded from identity. */
export function canonicalizeSavedDecklist(decklist: OmnidexDecklist): OmnidexDecklist {
  return {
    main: normalizeLines(decklist.main),
    material: normalizeLines(decklist.material),
    sideboard: normalizeLines(decklist.sideboard),
  };
}

/** Stable input for a cryptographic identity hash; matches the site's main+material identity convention. */
export function savedDeckIdentityInput(decklist: OmnidexDecklist): string {
  const canonical = canonicalizeSavedDecklist(decklist);
  const identityLines = (lines: OmnidexDecklistCardLine[]) => lines.map((line) => ({
    card: line.card.toLocaleLowerCase("en-US"),
    quantity: line.quantity,
  }));
  return JSON.stringify({ main: identityLines(canonical.main), material: identityLines(canonical.material) });
}
