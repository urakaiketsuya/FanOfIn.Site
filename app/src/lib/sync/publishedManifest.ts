/** Share concurrent checks, but never keep a manifest for the lifetime of a tab. */
export function createManifestLoader(fetcher: typeof fetch = fetch, now = Date.now, maxAge = 60_000) {
  let cached: Record<string, string> | undefined;
  let checkedAt = 0;
  let pending: Promise<Record<string, string>> | undefined;
  return function load(force = false): Promise<Record<string, string>> {
    if (pending) return pending;
    if (!force && cached && now() - checkedAt < maxAge) return Promise.resolve(cached);
    pending = fetcher('/data/manifest.json', { cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) throw new Error('Manifest unavailable');
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(v => typeof v !== 'string')) throw new Error('Invalid manifest');
        cached = value as Record<string, string>;
        checkedAt = now();
        return cached;
      })
      .catch(() => { cached = undefined; return {}; })
      .finally(() => { pending = undefined; });
    return pending;
  };
}
