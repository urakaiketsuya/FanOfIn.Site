import type { IncomingMessage, ServerResponse } from "node:http";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "https://fanofin.site";
const WORKER_URL = process.env.ACCOUNT_WORKER_URL?.replace(/\/$/, "");
const SHARED_SECRET = process.env.BFF_SHARED_SECRET;
const MAX_BODY_BYTES = 1_048_576;

class PayloadTooLargeError extends Error {}

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
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (declaredLength > MAX_BODY_BYTES) throw new PayloadTooLargeError();
  if (request.body !== undefined) {
    const body = typeof request.body === "string"
      ? request.body
      : request.body instanceof Uint8Array
        ? new Uint8Array(request.body)
        : JSON.stringify(request.body);
    const size = typeof body === "string" ? Buffer.byteLength(body) : body.byteLength;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLargeError();
    return body;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLargeError();
    chunks.push(buffer);
  }
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
  const clientIp = request.headers["x-vercel-forwarded-for"] ?? request.headers["x-forwarded-for"] ?? request.socket.remoteAddress;
  if (clientIp) headers.set("X-Fanofin-Client-IP", (Array.isArray(clientIp) ? clientIp[0] : clientIp).split(",")[0].trim().slice(0, 128));
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
    if (error instanceof PayloadTooLargeError) {
      sendJson(response, 413, { error: "Request is too large" });
      return;
    }
    console.error("Account Worker proxy failed", error);
    sendJson(response, 502, { error: "Account service is unavailable" });
  }
}
