export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Some hosts (e.g. TCGCSV, behind CloudFront) reject requests with no/blank User-Agent — identify ourselves honestly. */
const USER_AGENT = "gatcg-explorer-pipeline/0.1 (+https://github.com/)";

/** Polite fetch: retries transient failures with backoff, throws on repeated or non-retryable failure. */
export async function fetchJson<T>(url: string, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        if (res.status >= 500 && attempt < attempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(`${res.status} ${res.statusText} for ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

/** Like fetchJson, but returns null on 404 instead of throwing — for probing whether an ID exists. */
export async function fetchJsonOrNull<T>(url: string, attempts = 3): Promise<T | null> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 404) return null;
      if (!res.ok) {
        if (res.status >= 500 && attempt < attempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(`${res.status} ${res.statusText} for ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

/**
 * Some Omnidex sub-resources respond with a 4xx and a `{ error }` body when not applicable to
 * a given event (e.g. 400 for a non-team event's /teams, 404 "Event has no standings" for an
 * event whose standings were never computed) — expected, not a failure.
 */
export async function fetchJsonMaybe<T>(url: string): Promise<T | { error: string }> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const body: unknown = await res.json();
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500 && typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string") {
      return body as { error: string };
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return body as T;
}
