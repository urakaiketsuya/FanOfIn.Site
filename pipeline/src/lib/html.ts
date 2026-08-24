import { sleep } from "./http.js";

/** Same honest identification as lib/http.ts's fetchJson — kept separate since that helper is JSON-only. */
const USER_AGENT = "gatcg-explorer-pipeline/0.1 (+https://github.com/)";

/** Polite raw-HTML fetch: same retry/backoff shape as fetchJson, but returns text instead of parsing JSON. */
export async function fetchHtml(url: string, attempts = 3): Promise<string> {
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
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await sleep(500 * attempt);
    }
  }
  throw lastErr;
}
