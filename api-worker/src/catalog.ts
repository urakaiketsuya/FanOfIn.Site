interface CatalogEnv { PUBLIC_DB: D1Database; TRADEBINDER_CATALOG_TOKEN?: string }
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Vary": "Authorization" };
const json = (status: number, error: string) => Response.json({ error }, { status, headers: privateHeaders });
async function authorized(request: Request, secret?: string) {
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("Authorization") ?? "";
  if (supplied.length > 1024) return false;
  const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([hash(supplied), hash("Bearer " + secret)]);
  let difference = 0; for (let i = 0; i < a.length; i++) difference |= a[i]! ^ b[i]!;
  return difference === 0;
}
export async function catalogFeed(request: Request, env: CatalogEnv): Promise<Response> {
  // Authenticate before metadata, conditional requests, HEAD or database access.
  if (!await authorized(request, env.TRADEBINDER_CATALOG_TOKEN)) return json(401, "Unauthorized");
  if (!["GET", "HEAD"].includes(request.method)) return json(405, "Read-only endpoint");
  const url = new URL(request.url);
  const version = /^\/v1\/catalog\/snapshots\/([a-f0-9]{64})$/.exec(url.pathname)?.[1];
  if (url.search || url.pathname !== "/v1/catalog/meta" && !version) return json(404, "Not found");
  try {
    const row = await env.PUBLIC_DB.prepare(version
      ? "SELECT metadata FROM catalog_snapshots WHERE version=?"
      : "SELECT s.metadata FROM catalog_active a JOIN catalog_snapshots s ON s.version=a.version WHERE a.singleton=1")
      .bind(...(version ? [version] : [])).first<{ metadata: string }>();
    if (!row) return json(version ? 404 : 503, version ? "Snapshot not retained" : "Catalog not ready");
    const meta = JSON.parse(row.metadata) as { version: string; chunks: number; bytes: number; sha256: string };
    const etag = `"${meta.version}"`;
    const headers = { ...privateHeaders, ETag: etag, "Content-Type": version ? "application/gzip" : "application/json" };
    if (request.headers.get("If-None-Match")?.split(",").some(v => v.trim().replace(/^W\//, "") === etag)) return new Response(null, { status: 304, headers });
    if (!version) return new Response(request.method === "HEAD" ? null : row.metadata, { headers });
    if (request.method === "HEAD") return new Response(null, { headers });
    const result = await env.PUBLIC_DB.prepare("SELECT position,body FROM catalog_chunks WHERE version=? ORDER BY position").bind(version).all<{ position: number; body: string }>();
    if (result.results.length !== meta.chunks || meta.bytes > 16 * 1024 * 1024) throw new Error("Incomplete catalog");
    const bytes = new Uint8Array(meta.bytes); let offset = 0;
    for (const [i, chunk] of result.results.entries()) {
      if (chunk.position !== i) throw new Error("Incomplete catalog");
      const data = Uint8Array.from(atob(chunk.body), c => c.charCodeAt(0)); bytes.set(data, offset); offset += data.length;
    }
    if (offset !== meta.bytes) throw new Error("Incomplete catalog");
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
    if (hash !== meta.sha256) throw new Error("Invalid catalog");
    return new Response(bytes, { headers });
  } catch { return json(503, "Catalog temporarily unavailable"); }
}
