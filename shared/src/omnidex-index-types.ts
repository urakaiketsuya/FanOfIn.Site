/** Published by the pipeline (data/omnidex/*.json) — a pure local transform of the crawled raw cache. */

export interface OmnidexEventSummary {
  id: number;
  name: string;
  date: string;
  format: string;
  status: string;
  structure: string;
  type: string;
  /** Omnidex's own event tier — "worlds" | "nationals" | "ascent" | "regionals" | "store-championships" | "regular" (verified against live data; treat as open-ended). */
  category: string;
  ranked: boolean;
  /** Whether the event has decklist submission enabled at all — individual players may still not have submitted/published theirs. */
  decklists: boolean;
  playerCount: number;
  seasonId: number | null;
  seasonName: string | null;
  seasonSlug: string | null;
  hostName: string;
  /** Omnidex's own venue/store id — stable across every event hosted there, so it's the join key for "other events at this venue" (a store's name alone isn't reliable — some rename over time). 0 when the event has no host record at all. */
  hostId: number;
  /** Full street address string as Omnidex has it (e.g. "1 Expo Drive, Tampines, 486150, Singapore"), or "" when unknown. */
  hostAddress: string;
  /** ISO-3166-1 alpha-2 code from the venue's address, or "??" when Omnidex doesn't have one — same convention as OmnidexPlayerSummary.country. */
  hostCountry: string;
  /** "physical" | "online" (verified against live data; treat as open-ended like `category`). */
  setting: string;
  url: string;
}

/** Human-readable labels for Omnidex's event `category` values, in tier order (highest first). */
export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  worlds: "Worlds",
  nationals: "Nationals",
  ascent: "Ascent",
  regionals: "Regionals",
  "store-championships": "Store Championships",
  regular: "Regular",
};

export const EVENT_CATEGORY_ORDER: string[] = ["worlds", "nationals", "ascent", "regionals", "store-championships", "regular"];

/** Relative prestige weight per event tier — used to rank deck finishes across events of different tiers (an Ascent top finish should outrank the same percentile at a Regional). */
export const EVENT_CATEGORY_WEIGHTS: Record<string, number> = {
  worlds: 3.0,
  nationals: 2.5,
  ascent: 2.0,
  regionals: 1.5,
  "store-championships": 1.0,
  regular: 0.5,
};

export interface OmnidexSeasonSummary {
  id: number;
  name: string;
  slug: string;
  dateStart: string;
  dateEnd: string;
}

export interface OmnidexIndexData {
  generatedAt: string;
  events: OmnidexEventSummary[];
  seasons: OmnidexSeasonSummary[];
}

export interface OmnidexPlayerSummary {
  id: number;
  username: string;
  country: string;
  emblem: string;
  eventIds: number[];
}

export interface OmnidexPlayersData {
  generatedAt: string;
  players: OmnidexPlayerSummary[];
}

export interface OmnidexJudgeSummary {
  id: number;
  username: string;
  country: string;
  emblem: string;
  /** Highest judge level seen across events — judges can level up over time, so take the max rather than the latest. */
  judgeLevel: number;
  judgeExperience: number;
  eventIds: number[];
}

export interface OmnidexJudgesData {
  generatedAt: string;
  judges: OmnidexJudgeSummary[];
}

/**
 * One team registration at one event — deliberately NOT deduplicated into a global "team roster"
 * the way Players/Judges are. Verified against real data: team names are not a reliable identity
 * — e.g. "Checkers Club" appears at two different events with zero overlapping players, and
 * generic names like "Team 1" get reused across unrelated small local events. A real team can also
 * legitimately reuse its name across events (same roster). So each entry here is just one
 * event's registration; player IDs (a genuine stable identity) are the only safe way to notice
 * "this looks like the same team again."
 */
export interface OmnidexTeamSighting {
  eventId: number;
  eventName: string;
  eventDate: string;
  eventCategory: string;
  seasonId: number | null;
  seasonName: string | null;
  teamName: string;
  finalPlacement: number | null;
  players: { id: number; slot: string }[];
}

export interface OmnidexTeamsData {
  generatedAt: string;
  teams: OmnidexTeamSighting[];
}

export interface VodLink {
  label: string;
  url: string;
}

/** Hand-curated (pipeline/curated/vods.json) — no API source for this, so it's maintained by hand rather than crawled. Keyed by event id (as a string, since it round-trips through JSON). */
export interface VodsData {
  generatedAt: string;
  vods: Record<string, VodLink[]>;
}
