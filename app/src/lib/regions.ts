import { formatCountry } from "./format";

export type RegionGroupMode = "country" | "region";

/**
 * Hand-authored grouping of every host country seen in the real data (41 distinct codes as of
 * this writing) into broader competitive-scene regions. Any code not listed here (a country that
 * shows up in a future pipeline run) falls back to "unknown" rather than being silently dropped.
 */
export const COUNTRY_TO_REGION: Record<string, string> = {
  US: "north-america",
  CA: "north-america",
  PR: "north-america",
  CR: "latin-america",
  CL: "latin-america",
  TW: "east-asia",
  HK: "east-asia",
  JP: "east-asia",
  KR: "east-asia",
  SG: "southeast-asia",
  MY: "southeast-asia",
  PH: "southeast-asia",
  ID: "southeast-asia",
  BN: "southeast-asia",
  TH: "southeast-asia",
  VN: "southeast-asia",
  NZ: "oceania",
  AU: "oceania",
  PL: "europe",
  DE: "europe",
  GB: "europe",
  HU: "europe",
  HR: "europe",
  SI: "europe",
  NL: "europe",
  BE: "europe",
  GR: "europe",
  ES: "europe",
  IT: "europe",
  LV: "europe",
  PT: "europe",
  CZ: "europe",
  FR: "europe",
  DK: "europe",
  IE: "europe",
  AT: "europe",
  NO: "europe",
  AE: "middle-east",
  KW: "middle-east",
  LB: "middle-east",
};

export const REGION_LABELS: Record<string, string> = {
  "north-america": "North America",
  "latin-america": "Latin America",
  "east-asia": "East Asia",
  "southeast-asia": "Southeast Asia",
  oceania: "Oceania",
  europe: "Europe",
  "middle-east": "Middle East",
  unknown: "Unknown",
};

/** Normalizes a raw `hostCountry` (an ISO-2 code, "", or "??") into a stable grouping key for the given mode — never returns "" so it's always safe to use as a select value. */
export function regionKeyForCountry(hostCountry: string, mode: RegionGroupMode): string {
  const normalized = hostCountry && hostCountry !== "??" ? hostCountry.toUpperCase() : "unknown";
  if (mode === "country") return normalized;
  if (normalized === "unknown") return "unknown";
  return COUNTRY_TO_REGION[normalized] ?? "unknown";
}

export function regionLabelForKey(key: string, mode: RegionGroupMode): string {
  if (key === "unknown") return "Unknown";
  if (mode === "region") return REGION_LABELS[key] ?? key;
  return formatCountry(key) ?? key;
}
