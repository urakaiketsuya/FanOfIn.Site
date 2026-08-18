import type {
  ApiMeta,
  Card,
  CardSearchResponse,
  ChangelogEntry,
  FeaturedSetGroup,
  OmnidexApiError,
  OmnidexDecklistEntry,
  OmnidexEvent,
  OmnidexJudge,
  OmnidexPairingsResponse,
  OmnidexPlayer,
  OmnidexStandingsResponse,
  OmnidexTeamsResponse,
  OptionDefinitions,
  ThemaHistoryPoint,
  ThemaKind,
  ThemaRankEntry,
} from "@gatcg/shared";

const BASE_URL = "https://api.gatcg.com";

class ApiError extends Error {
  status: number;
  url: string;

  constructor(status: number, url: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

type QueryValue = string | number | boolean | string[] | undefined;

/** The API expects multi-value filters as repeated params (?class=A&class=B) — comma-joining and `class[]=` both silently no-op. */
function buildUrl(path: string, params?: Record<string, QueryValue>): URL {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

async function request<T>(path: string, params?: Record<string, QueryValue>): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(res.status, url.toString(), `${res.status} ${res.statusText} for ${url}`);
  }
  return res.json() as Promise<T>;
}

function isApiErrorBody(body: unknown): body is OmnidexApiError {
  return typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string";
}

/**
 * Some Omnidex sub-resources respond with a 4xx and a `{ error }` body when not applicable to
 * a given event (e.g. 400 "Not a team event.", 404 "Event has no standings.") — that's a
 * normal, expected response, not a failure.
 */
async function requestMaybe<T>(path: string, params?: Record<string, QueryValue>): Promise<T | OmnidexApiError> {
  const url = buildUrl(path, params);
  const res = await fetch(url);
  const body: unknown = await res.json();
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500 && isApiErrorBody(body)) return body;
    throw new ApiError(res.status, url.toString(), `${res.status} ${res.statusText} for ${url}`);
  }
  return body as T;
}

export interface CardSearchParams {
  name?: string;
  slug?: string;
  page?: number;
  page_size?: number;
  sort?: string;
  order?: "ASC" | "DESC";
  class?: string[];
  class_logic?: "AND" | "OR";
  type?: string[];
  type_logic?: "AND" | "OR";
  subtype?: string[];
  subtype_logic?: "AND" | "OR";
  element?: string[];
  element_logic?: "AND" | "OR";
  last_update?: string;
}

export const gatcgApi = {
  searchCards: (params: CardSearchParams = {}) =>
    request<CardSearchResponse>("/cards/search", params as Record<string, QueryValue>),

  getCard: (slug: string) => request<Card>(`/cards/${encodeURIComponent(slug)}`),

  autocompleteCards: (name: string) => request<Card[]>("/cards/autocomplete", { name }),

  randomCards: (amount = 8) => request<Card[]>("/cards/random", { amount }),

  getOptionDefinitions: () => request<OptionDefinitions>("/option/search"),

  getFeaturedSets: () => request<FeaturedSetGroup[]>("/featured-sets"),

  getApiMeta: () => request<ApiMeta>("/"),

  getChangelog: (limit = 50) => request<ChangelogEntry[]>("/changelog/list", { limit }),

  getThemaRanks: (kind: ThemaKind) =>
    request<ThemaRankEntry[]>("/cards/edition/dynamic-thema-ranks", { kind }),

  getThemaHistory: (editionUuid: string, kind: ThemaKind, from?: string, to?: string) =>
    request<ThemaHistoryPoint[]>(`/cards/edition/${encodeURIComponent(editionUuid)}/dynamic-thema`, {
      kind,
      from,
      to,
    }),

  getOmnidexEvent: (eventId: number) => request<OmnidexEvent>(`/omnidex/events/${eventId}`),

  getOmnidexPlayers: (eventId: number) => request<OmnidexPlayer[]>(`/omnidex/events/${eventId}/players`),

  getOmnidexStandings: (eventId: number) =>
    requestMaybe<OmnidexStandingsResponse>(`/omnidex/events/${eventId}/standings`),

  getOmnidexPairings: (eventId: number, round?: number, stage?: number) =>
    requestMaybe<OmnidexPairingsResponse>(`/omnidex/events/${eventId}/pairings`, { round, stage }),

  getOmnidexJudges: (eventId: number) => requestMaybe<OmnidexJudge[]>(`/omnidex/events/${eventId}/judges`),

  getOmnidexTeams: (eventId: number) => requestMaybe<OmnidexTeamsResponse>(`/omnidex/events/${eventId}/teams`),

  getOmnidexDecklists: (eventId: number) => requestMaybe<OmnidexDecklistEntry[]>(`/omnidex/events/${eventId}/decklists`),

  getOmnidexStatistics: (eventId: number) => requestMaybe<unknown>(`/omnidex/events/${eventId}/statistics`),

  /** Works for both an edition's `image` ("/cards/images/…") and a featured group's `image` ("/featured-sets/images/…"). */
  imageUrl: (imagePath: string, rounded = false) => `${BASE_URL}${imagePath}${rounded ? "?rounded=true" : ""}`,

  /**
   * Official element/cost badge icons — same `gatcg.com` root domain as this API, just a
   * dedicated asset host (`cdn2.gatcg.com/i/{elements,costs}/{key}.png`, lowercase key). Verified
   * live: index.gatcg.com (a card-database site built on this same API) pulls its element and
   * memory/reserve cost badges from this exact CDN rather than hosting its own copies.
   */
  iconUrl: (kind: "elements" | "costs", key: string) => `https://cdn2.gatcg.com/i/${kind}/${key.toLowerCase()}.png`,
};

export { ApiError, isApiErrorBody };
