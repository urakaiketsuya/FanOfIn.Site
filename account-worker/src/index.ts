import { authenticatedUser, bffAllowed, createUserSession, destroySession, originAllowed, verifyGoogleCredential, type Env } from "./auth";
import { listDecks, parseSaveInput, performImport, previewImport, saveDeck } from "./decks";

function response(env: Env, request: Request, body: unknown, status = 200, extra: HeadersInit = {}): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json", ...extra });
  if (origin && env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function jsonBody(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > 1_048_576) throw new Error("Request is too large");
  return request.json();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/health" && !bffAllowed(request, env)) {
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
      if (request.method === "POST" && url.pathname === "/v1/auth/google") {
        const body = await jsonBody(request) as { credential?: unknown };
        if (typeof body.credential !== "string") return response(env, request, { error: "Google credential is required" }, 400);
        const session = await createUserSession(env, await verifyGoogleCredential(body.credential, env.GOOGLE_CLIENT_ID));
        return response(env, request, { user: session.user }, 200, { "Set-Cookie": session.cookie });
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/logout") return response(env, request, { success: true }, 200, { "Set-Cookie": await destroySession(request, env) });

      const user = await authenticatedUser(request, env);
      if (!user) return response(env, request, { error: "Sign in is required" }, 401);

      if (request.method === "GET" && url.pathname === "/v1/me/decks") return response(env, request, { decks: await listDecks(env, user) });
      if (request.method === "POST" && url.pathname === "/v1/me/decks") {
        const result = await saveDeck(env, user, parseSaveInput(await jsonBody(request)));
        return response(env, request, result, result.created ? 201 : 200);
      }
      const deckMatch = url.pathname.match(/^\/v1\/me\/decks\/([^/]+)$/);
      if (deckMatch && request.method === "PATCH") {
        const body = await jsonBody(request) as { title?: unknown };
        if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 160) return response(env, request, { error: "A valid title is required" }, 400);
        const result = await env.ACCOUNT_DB.prepare("UPDATE saved_decks SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?")
          .bind(body.title.trim(), new Date().toISOString(), deckMatch[1], user.id).run();
        return result.meta.changes ? response(env, request, { success: true }) : response(env, request, { error: "Deck not found" }, 404);
      }
      if (deckMatch && request.method === "DELETE") {
        const result = await env.ACCOUNT_DB.prepare("DELETE FROM saved_decks WHERE id = ? AND user_id = ?").bind(deckMatch[1], user.id).run();
        return result.meta.changes ? response(env, request, { success: true }) : response(env, request, { error: "Deck not found" }, 404);
      }
      if (request.method === "POST" && url.pathname === "/v1/me/imports/preview") {
        const body = await jsonBody(request) as { provider?: unknown; identifier?: unknown };
        if (typeof body.provider !== "string" || typeof body.identifier !== "string") return response(env, request, { error: "Provider and identifier are required" }, 400);
        return response(env, request, await previewImport(env, body.provider, body.identifier));
      }
      if (request.method === "POST" && url.pathname === "/v1/me/imports") {
        const body = await jsonBody(request) as { provider?: unknown; identifier?: unknown };
        if (typeof body.provider !== "string" || typeof body.identifier !== "string") return response(env, request, { error: "Provider and identifier are required" }, 400);
        return response(env, request, await performImport(env, user, body.provider, body.identifier));
      }
      return response(env, request, { error: "Route not found" }, 404);
    } catch (error) {
      console.error(error);
      return response(env, request, { error: error instanceof Error ? error.message : "Unexpected account service error" }, 400);
    }
  },
} satisfies ExportedHandler<Env>;
