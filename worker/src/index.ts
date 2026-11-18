import { matchSubmissionV1Schema } from "./match-schema";
import { ingestMatch } from "./match-storage";
import { gameSubmissionV1Schema } from "./schema";
import { buildSimulatorSummary } from "./analytics";
import { ingestSubmission, purgeExpiredRawPayloads, sha256Hex, type Env } from "./storage";

const MAX_BODY_BYTES = 1_048_576;

type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "payload_too_large"
  | "validation_failed"
  | "submission_conflict"
  | "internal_error";

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(requestId: string, status: number, code: ErrorCode, message: string, details?: unknown): Response {
  return jsonResponse({ success: false, requestId, error: { code, message, ...(details === undefined ? {} : { details }) } }, status);
}

async function secretsEqual(provided: string, expected: string): Promise<boolean> {
  const [providedHash, expectedHash] = await Promise.all([sha256Hex(provided), sha256Hex(expected)]);
  let difference = providedHash.length ^ expectedHash.length;
  for (let index = 0; index < Math.max(providedHash.length, expectedHash.length); index++) {
    difference |= (providedHash.charCodeAt(index) || 0) ^ (expectedHash.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function handleSubmission(request: Request, env: Env, requestId: string): Promise<Response> {
  const isMatch = new URL(request.url).pathname === "/v1/grand-archive/matches";
  const authorization = request.headers.get("Authorization") ?? "";
  const providedSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  let sourceId: string | undefined;
  if (isMatch) {
    // Dedicated secret JSON map: stable source ID -> independent bearer credential.
    // Fail closed on malformed configuration; never print keys or request payloads.
    let credentials: unknown;
    try { credentials = JSON.parse(env.MATCH_INGESTION_KEYS ?? "{}"); } catch { credentials = null; }
    if (credentials && typeof credentials === "object" && !Array.isArray(credentials)) {
      const entries = Object.entries(credentials);
      const valid = entries.length > 0 && entries.every(([id, key]) => /^[a-z0-9][a-z0-9_-]{0,63}$/.test(id) && typeof key === "string" && key.length >= 32)
        && new Set(entries.map(([, key]) => key)).size === entries.length;
      if (valid && providedSecret) for (const [id, key] of entries) {
        if (await secretsEqual(providedSecret, key as string)) sourceId = id;
      }
    }
    if (!sourceId) return errorResponse(requestId, 401, "unauthorized", "Invalid ingestion credential");
  } else if (!env.INGESTION_API_KEY || !providedSecret || !(await secretsEqual(providedSecret, env.INGESTION_API_KEY))) {
    return errorResponse(requestId, 401, "unauthorized", "Invalid ingestion credential");
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return errorResponse(requestId, 400, "bad_request", "Content-Type must be application/json");
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(requestId, 413, "payload_too_large", "Request body exceeds 1 MiB");
  }

  // Enforce the cap while reading, including requests without Content-Length.
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return errorResponse(requestId, 413, "payload_too_large", "Request body exceeds 1 MiB");
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }

  let unknownPayload: unknown;
  try {
    unknownPayload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return errorResponse(requestId, 400, "bad_request", "Request body is not valid JSON");
  }

  if (isMatch) {
    const parsed = matchSubmissionV1Schema.safeParse(unknownPayload);
    if (!parsed.success) return errorResponse(requestId, 422, "validation_failed", "Payload does not satisfy match schema version 1",
      parsed.error.issues.slice(0, 20).map(issue => ({ path: issue.path.join("."), message: issue.message })));
    if (parsed.data.source.id !== undefined && parsed.data.source.id !== sourceId)
      return errorResponse(requestId, 422, "validation_failed", "Source does not match ingestion credential",
        [{ path: "source.id", message: "Must match the source assigned to your bearer key" }]);
    const result = await ingestMatch(env, sourceId!, parsed.data);
    if (result.outcome === "conflict") return errorResponse(requestId, 409, "submission_conflict", "Submission or source match ID already exists with different content");
    return jsonResponse({ success: true, requestId, sourceId, submissionId: parsed.data.submissionId, outcome: result.outcome }, result.outcome === "created" ? 201 : 200);
  }
  const parsed = gameSubmissionV1Schema.safeParse(unknownPayload);
  if (!parsed.success) {
    const details = parsed.error.issues.slice(0, 20).map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return errorResponse(requestId, 422, "validation_failed", "Payload does not satisfy schema version 1", details);
  }

  const canonicalJson = JSON.stringify(parsed.data);
  const result = await ingestSubmission(env, parsed.data, canonicalJson, new Date().toISOString());
  if (result.outcome === "conflict") {
    return errorResponse(requestId, 409, "submission_conflict", "Submission ID already exists with different content");
  }

  return jsonResponse({
    success: true,
    requestId,
    submissionId: parsed.data.submissionId,
    outcome: result.outcome,
  }, result.outcome === "created" ? 201 : 200);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ success: true, requestId, service: "fanofin-match-ingestion" }, 200);
    }

    if (request.method === "GET" && url.pathname === "/v1/grand-archive/analytics/summary") {
      try {
        return Response.json(await buildSimulatorSummary(env), {
          headers: { "Cache-Control": "public, max-age=300" },
        });
      } catch (error) {
        console.error(JSON.stringify({
          level: "error",
          requestId,
          event: "simulator_summary_failed",
          message: error instanceof Error ? error.message : "Unknown analytics error",
        }));
        return errorResponse(requestId, 500, "internal_error", "Simulator summary could not be generated");
      }
    }

    if (request.method !== "POST" || !["/v1/grand-archive/games", "/v1/grand-archive/matches"].includes(url.pathname)) {
      return errorResponse(requestId, 404, "bad_request", "Route not found");
    }

    try {
      return await handleSubmission(request, env, requestId);
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        requestId,
        event: "game_submission_failed",
        message: error instanceof Error ? error.message : "Unknown ingestion error",
      }));
      return errorResponse(requestId, 500, "internal_error", "Submission could not be persisted; retry is safe");
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const purged = await purgeExpiredRawPayloads(env.MATCH_DB);
    console.log(JSON.stringify({ level: "info", event: "raw_payload_retention_complete", purged }));
  },
} satisfies ExportedHandler<Env>;
