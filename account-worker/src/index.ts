import { authenticatedUser, bffAllowed, consumeOAuthNonce, createOAuthNonce, createUserSession, destroyAllSessions, destroySession, originAllowed, rotateCurrentSession, verifyGoogleCredential, type Env } from "./auth";
import { deleteDeck, listDecks, parseSaveInput, performImport, previewImport, renameDeck, saveDeck } from "./decks";
import { ApiError, badRequest } from "./errors";

function response(env: Env, request: Request, body: unknown, status = 200, extra: HeadersInit = {}): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json", ...extra });
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  if (origin && env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function rateLimited(limiter: RateLimit, key: string): Promise<boolean> {
  return !(await limiter.limit({ key })).success;
}

function tooManyRequests(env: Env, request: Request): Response {
  return response(env, request, { error: "Too many requests. Try again in a minute." }, 429, { "Retry-After": "60" });
}

async function jsonBody(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > 1_048_576) throw new ApiError("Request is too large", 413, "request_too_large");
  try {
    return await request.json();
  } catch (error) {
    throw badRequest("Request body must be valid JSON", "invalid_json");
  }
}

function logError(request: Request, requestId: string, error: unknown, status: number, code: string): void {
  console.error(JSON.stringify({
    level: "error",
    service: "fanofin-accounts",
    requestId,
    method: request.method,
    path: new URL(request.url).pathname,
    status,
    code,
    cfRay: request.headers.get("CF-Ray") ?? undefined,
    error: error instanceof Error ? error.message : "Non-error value thrown",
  }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = request.headers.get("CF-Ray") ?? crypto.randomUUID();
    if (url.pathname !== "/health" && !await bffAllowed(request, env)) {
      return response(env, request, { error: "Account service gateway is required" }, 403);
    }
    if (request.method === "OPTIONS") {
      if (!originAllowed(request, env)) return response(env, request, { error: "Origin is not allowed" }, 403);
      return response(env, request, {}, 200, { "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
    }
    if (!originAllowed(request, env)) return response(env, request, { error: "Origin is not allowed" }, 403);

    try {
      if (request.method === "GET" && url.pathname === "/health") return response(env, request, { success: true, service: "fanofin-accounts" });
      if (request.method === "GET" && url.pathname === "/v1/auth/session") return response(env, request, { user: await authenticatedUser(request, env) });
      if (request.method === "POST" && url.pathname === "/v1/auth/google/nonce") {
        const clientIp = request.headers.get("X-Fanofin-Client-IP") ?? "unknown";
        if (await rateLimited(env.LOGIN_RATE_LIMITER, clientIp)) return tooManyRequests(env, request);
        return response(env, request, { nonce: await createOAuthNonce(env) });
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/google") {
        const clientIp = request.headers.get("X-Fanofin-Client-IP") ?? "unknown";
        if (await rateLimited(env.LOGIN_RATE_LIMITER, clientIp)) return tooManyRequests(env, request);
        const body = await jsonBody(request) as { credential?: unknown; nonce?: unknown };
        if (typeof body.credential !== "string" || typeof body.nonce !== "string") return response(env, request, { error: "Google credential and nonce are required" }, 400);
        let claims;
        try {
          claims = await verifyGoogleCredential(body.credential, env.GOOGLE_CLIENT_ID, body.nonce);
        } catch (error) {
          throw new ApiError("Google sign-in failed", 401, "google_sign_in_failed", { cause: error });
        }
        if (!await consumeOAuthNonce(env, body.nonce)) return response(env, request, { error: "Google sign-in nonce is expired or already used" }, 400);
        await rotateCurrentSession(request, env);
        const session = await createUserSession(env, claims);
        return response(env, request, { user: session.user }, 200, { "Set-Cookie": session.cookie });
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/logout") return response(env, request, { success: true }, 200, { "Set-Cookie": await destroySession(request, env) });
      if (request.method === "POST" && url.pathname === "/v1/auth/logout-all") return response(env, request, { success: true }, 200, { "Set-Cookie": await destroyAllSessions(request, env) });

      const user = await authenticatedUser(request, env);
      if (!user) return response(env, request, { error: "Sign in is required" }, 401);

      if (request.method === "GET" && url.pathname === "/v1/me/decks") return response(env, request, { decks: await listDecks(env, user) });
      if (request.method === "GET" && url.pathname === "/v1/me/export") {
        const profiles = await env.ACCOUNT_DB.prepare("SELECT provider, external_identifier, display_name, last_imported_at, created_at FROM external_profiles WHERE user_id = ? ORDER BY created_at").bind(user.id).all();
        return response(env, request, { exportedAt: new Date().toISOString(), user, profiles: profiles.results, decks: await listDecks(env, user) });
      }
      if (request.method === "DELETE" && url.pathname === "/v1/me") {
        if (await rateLimited(env.WRITE_RATE_LIMITER, user.id)) return tooManyRequests(env, request);
        const body = await jsonBody(request) as { confirmation?: unknown };
        if (body.confirmation !== "DELETE") return response(env, request, { error: "Type DELETE to confirm account deletion" }, 400);
        await env.ACCOUNT_DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
        return response(env, request, { success: true }, 200, { "Set-Cookie": await destroySession(request, env) });
      }
      if (request.method === "POST" && url.pathname === "/v1/me/decks") {
        if (await rateLimited(env.WRITE_RATE_LIMITER, user.id)) return tooManyRequests(env, request);
        const result = await saveDeck(env, user, parseSaveInput(await jsonBody(request)));
        return response(env, request, result, result.created ? 201 : 200);
      }
      const deckMatch = url.pathname.match(/^\/v1\/me\/decks\/([^/]+)$/);
      if (deckMatch && request.method === "PATCH") {
        if (await rateLimited(env.WRITE_RATE_LIMITER, user.id)) return tooManyRequests(env, request);
        const body = await jsonBody(request) as { title?: unknown };
        if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 160) return response(env, request, { error: "A valid title is required" }, 400);
        return await renameDeck(env, user, deckMatch[1], body.title.trim()) ? response(env, request, { success: true }) : response(env, request, { error: "Deck not found" }, 404);
      }
      if (deckMatch && request.method === "DELETE") {
        if (await rateLimited(env.WRITE_RATE_LIMITER, user.id)) return tooManyRequests(env, request);
        return await deleteDeck(env, user, deckMatch[1]) ? response(env, request, { success: true }) : response(env, request, { error: "Deck not found" }, 404);
      }
      if (request.method === "POST" && url.pathname === "/v1/me/imports/preview") {
        if (await rateLimited(env.IMPORT_RATE_LIMITER, user.id)) return tooManyRequests(env, request);
        const body = await jsonBody(request) as { provider?: unknown; identifier?: unknown };
        if (typeof body.provider !== "string" || typeof body.identifier !== "string") return response(env, request, { error: "Provider and identifier are required" }, 400);
        return response(env, request, await previewImport(env, body.provider, body.identifier));
      }
      if (request.method === "POST" && url.pathname === "/v1/me/imports") {
        if (await rateLimited(env.IMPORT_RATE_LIMITER, user.id)) return tooManyRequests(env, request);
        const body = await jsonBody(request) as { provider?: unknown; identifier?: unknown };
        if (typeof body.provider !== "string" || typeof body.identifier !== "string") return response(env, request, { error: "Provider and identifier are required" }, 400);
        return response(env, request, await performImport(env, user, body.provider, body.identifier));
      }
      return response(env, request, { error: "Route not found" }, 404);
    } catch (error) {
      const known = error instanceof ApiError;
      const status = known ? error.status : 500;
      const code = known ? error.code : "internal_error";
      logError(request, requestId, known && error.cause ? error.cause : error, status, code);
      return response(env, request, { error: known ? error.publicMessage : "Unexpected account service error", requestId }, status, { "X-Request-ID": requestId });
    }
  },
} satisfies ExportedHandler<Env>;
