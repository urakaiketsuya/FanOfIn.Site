import type { Env } from "./auth";

const ASSET_FETCH_TIMEOUT_MS = 10_000;
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

export async function assetJson<T>(env: Env, path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
  try {
    // Workers supports manual redirects; the non-2xx check below rejects redirects.
    const response = await fetch(new URL(path, env.ASSET_BASE_URL), { signal: controller.signal, redirect: "manual" });
    if (!response.ok) throw new Error(`Published data is unavailable (${response.status})`);
    const declaredSize = Number(response.headers.get("Content-Length") ?? 0);
    if (declaredSize > MAX_ASSET_BYTES) throw new Error("Published data response is too large");
    if (!response.body) throw new Error("Published data response is empty");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ASSET_BYTES) {
        await reader.cancel();
        throw new Error("Published data response is too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } finally {
    clearTimeout(timeout);
  }
}

