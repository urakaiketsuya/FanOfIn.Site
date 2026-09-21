export function formatUsd(value: number | null): string {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}

export function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Omnidex's `country` field is an ISO-3166-1 alpha-2 code, or "??" when unknown. */
export function formatCountry(code: string): string | null {
  if (!code || code === "??") return null;
  try {
    return countryNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
