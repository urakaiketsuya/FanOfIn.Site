import type { PublicApiMetadata } from "@gatcg/shared";
import specification from "./openapi.json";

interface Env { PUBLIC_DB: D1Database }
interface Cursor { version: string; kind: string; after: string }
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "If-None-Match",
  "Access-Control-Expose-Headers": "ETag, Retry-After",
  "X-Content-Type-Options": "nosniff",
};
function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...headers, "Cache-Control": "no-store", ...extra } });
}
function error(status: number, code: string, message: string) { return json({ error: { code, message } }, status); }
function encodeCursor(cursor: Cursor) { return btoa(unescape(encodeURIComponent(JSON.stringify(cursor)))); }
function decodeCursor(value: string, kind: string): Cursor {
  if (value.length > 2048) throw new Error("Cursor too long");
  const cursor = JSON.parse(decodeURIComponent(escape(atob(value)))) as Cursor;
  if (!/^[a-f0-9]{64}$/.test(cursor.version) || cursor.kind !== kind || typeof cursor.after !== "string" || !cursor.after || cursor.after.length > 256) throw new Error("Invalid cursor");
  return cursor;
}
function conditional(response: Response, request: Request): Response {
  const etag = response.headers.get("ETag");
  const matches = request.headers.get("If-None-Match")?.split(",").map(v => v.trim().replace(/^W\//, ""));
  if (etag && (matches?.includes(etag) || matches?.includes("*"))) return new Response(null, { status: 304, headers: response.headers });
  return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (!["GET", "HEAD"].includes(request.method)) return json({ error: { code: "method_not_allowed", message: "This API is read-only" } }, 405, { Allow: "GET, HEAD, OPTIONS" });
    const url = new URL(request.url);
    if (url.pathname === "/health") return conditional(json({ service: "fanofin-public-api", status: "ok" }), request);
    if (url.pathname === "/openapi.json") return conditional(json(specification), request);
    const detail = /^\/v1\/cards\/([^/]+)\/stats$/.exec(url.pathname);
    const kind = url.pathname === "/v1/archetypes" ? "archetypes" : url.pathname === "/v1/cards" || detail ? "cards" : null;
    const isMeta = url.pathname === "/v1/meta";
    if (!kind && !isMeta) return conditional(error(404, "not_found", "Unknown endpoint"), request);
    const isList = !!kind && !detail;
    let limit = 50;
    let cursor: Cursor | undefined;
    let id: string | undefined;
    try {
      for (const key of url.searchParams.keys()) {
        if (!isList || !["limit", "cursor"].includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error("Unsupported or repeated query parameter");
      }
      if (isList) {
        const rawLimit = url.searchParams.get("limit") ?? "50";
        if (!/^[1-9]\d{0,2}$/.test(rawLimit) || Number(rawLimit) > 100) throw new Error("limit must be an integer from 1 to 100");
        limit = Number(rawLimit);
        if (url.searchParams.has("cursor")) cursor = decodeCursor(url.searchParams.get("cursor")!, kind!);
      }
      if (detail) {
        id = decodeURIComponent(detail[1]!);
        if (!id || id.length > 256) throw new Error("Invalid card slug");
      }
    } catch {
      return conditional(error(400, "invalid_query", "Use limit=1..100 and a cursor returned by this endpoint; other filters are unsupported"), request);
    }
    // Canonical URLs avoid separate cache entries for equivalent limits/parameter order.
    const cacheUrl = new URL(url.origin + url.pathname);
    if (isList) {
      cacheUrl.searchParams.set("limit", String(limit));
      if (cursor) cacheUrl.searchParams.set("cursor", encodeCursor(cursor));
    }
    const key = new Request(cacheUrl, { method: "GET" });
    try {
      const cached = await caches.default.match(key);
      if (cached) return conditional(cached, request);
      const statements = [env.PUBLIC_DB.prepare("SELECT s.metadata FROM api_active a JOIN api_snapshots s ON s.version=a.version WHERE a.singleton=1")];
      if (kind) {
        statements.push(env.PUBLIC_DB.prepare(`SELECT e.id, p.body FROM api_entries e JOIN api_payloads p ON p.hash=e.hash
WHERE e.version=(SELECT version FROM api_active WHERE singleton=1) AND e.kind=? AND e.id ${detail ? "=" : ">"} ? ORDER BY e.id LIMIT ?`)
          .bind(kind, id ?? cursor?.after ?? "", detail ? 1 : limit + 1));
      }
      // D1 batch gives metadata and rows from the same transaction during publication.
      const results = await env.PUBLIC_DB.batch(statements);
      const metadata = results[0]!.results[0] as { metadata: string } | undefined;
      if (!metadata) return conditional(json({ error: { code: "not_ready", message: "No dataset has been published" } }, 503, { "Retry-After": "60" }), request);
      const meta = JSON.parse(metadata.metadata) as PublicApiMetadata;
      if (cursor && cursor.version !== meta.datasetVersion) return conditional(error(409, "dataset_changed", "The dataset changed; restart pagination without a cursor"), request);
      const rows = (results[1]?.results ?? []) as { id: string; body: string }[];
      if (detail && !rows.length) return conditional(error(404, "not_found", "Card stats not found"), request);
      const page = rows.slice(0, limit);
      const body = isMeta ? { data: meta } : detail ? { data: JSON.parse(rows[0]!.body), meta } : {
        data: page.map(row => JSON.parse(row.body)), meta,
        nextCursor: rows.length > limit ? encodeCursor({ version: meta.datasetVersion, kind: kind!, after: page.at(-1)!.id }) : null,
      };
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body)));
      const etag = `"${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")}"`;
      const response = json(body, 200, { "Cache-Control": "public, max-age=60", ETag: etag });
      ctx.waitUntil(caches.default.put(key, response.clone()).catch(() => {}));
      return conditional(response, request);
    } catch {
      // Includes exhausted free-tier quotas. Never expose SQL or database error details.
      return conditional(json({ error: { code: "unavailable", message: "API temporarily unavailable" } }, 503, { "Retry-After": "60" }), request);
    }
  },
};
