import type { IncomingMessage, ServerResponse } from "node:http";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://fanofin.site";
const WORKER_URL = process.env.ACCOUNT_WORKER_URL?.replace(/\/$/, "");
const SHARED_SECRET = process.env.BFF_SHARED_SECRET;

function applyCors(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Vary", "Origin");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

async function requestBody(request: VercelRequest): Promise<BodyInit | undefined> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  if (request.body !== undefined) {
    if (typeof request.body === "string") return request.body;
    if (request.body instanceof Uint8Array) return new Blob([new Uint8Array(request.body)]);
    return JSON.stringify(request.body);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  applyCors(response);
  const origin = request.headers.origin;
  if (origin !== ALLOWED_ORIGIN) {
    sendJson(response, 403, { error: "Origin is not allowed" });
    return;
  }
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }
  if (!WORKER_URL || !SHARED_SECRET) {
    sendJson(response, 503, { error: "Account gateway is not configured" });
    return;
  }

  const incomingUrl = new URL(request.url ?? "/", "https://accounts.fanofin.site");
  const routedPath = incomingUrl.searchParams.get("_path") ?? "";
  incomingUrl.searchParams.delete("_path");
  const workerPath = `/${routedPath}`.replace(/\/{2,}/g, "/");
  const headers = new Headers({
    "Accept": "application/json",
    "X-Fanofin-BFF-Secret": SHARED_SECRET,
  });
  if (request.headers["content-type"]) headers.set("Content-Type", request.headers["content-type"]);
  if (request.headers.cookie) headers.set("Cookie", request.headers.cookie);

  try {
    const upstream = await fetch(`${WORKER_URL}${workerPath}${incomingUrl.search}`, {
      method: request.method,
      headers,
      body: await requestBody(request),
      redirect: "manual",
    });
    response.statusCode = upstream.status;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
    const setCookie = upstream.headers.get("Set-Cookie");
    if (setCookie) response.setHeader("Set-Cookie", setCookie);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("Account Worker proxy failed", error);
    sendJson(response, 502, { error: "Account service is unavailable" });
  }
}
