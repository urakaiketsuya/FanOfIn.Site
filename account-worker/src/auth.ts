import { validUserFacingName } from "./content-policy";

export interface Env {
  ACCOUNT_DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  APP_BASE_URL: string;
  ASSET_BASE_URL: string;
  ALLOWED_ORIGINS: string;
  BFF_SHARED_SECRET: string;
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  EMAIL_FROM: string;
  TURNSTILE_SECRET_KEY: string;
  LOGIN_RATE_LIMITER: RateLimit;
  WRITE_RATE_LIMITER: RateLimit;
  IMPORT_RATE_LIMITER: RateLimit;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  profileSlug: string;
  profileDiscoverable: boolean;
  deckChecklistDismissed: boolean;
  displayNameReviewed: boolean;
}

interface IdentityClaims {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  exp: number;
  nonce?: string;
}

export type AuthProvider = "google" | "discord" | "password";

export interface AuthIdentity {
  provider: AuthProvider;
  email: string;
  createdAt: string;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
  verified?: boolean;
}

/** Creates the deterministic account used by the localhost-only development sign-in route. */
export async function createLocalUserSession(env: Env): Promise<{ user: AuthUser; cookie: string }> {
  return createUserSession(env, "google", {
    iss: "local-development",
    aud: env.GOOGLE_CLIENT_ID,
    sub: "fanofin-local-test-user",
    email: "local-test@fanofin.invalid",
    email_verified: true,
    name: "Local Test Player",
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  });
}

const SESSION_COOKIE = "fanofin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const SESSION_IDLE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_TOUCH_SECONDS = 60 * 5;
const OAUTH_NONCE_SECONDS = 60 * 10;
type GoogleJsonWebKey = JsonWebKey & { kid: string };
let cachedKeys: { expiresAt: number; keys: GoogleJsonWebKey[] } | null = null;

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function cacheSeconds(value: string | null): number {
  const match = value?.match(/(?:^|,)\s*max-age=(\d+)/i);
  return match ? Math.max(0, Number(match[1])) : 60 * 60;
}

async function googleKeys(forceRefresh = false): Promise<GoogleJsonWebKey[]> {
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) throw new Error("Google signing keys are unavailable");
  const body = await response.json<{ keys: GoogleJsonWebKey[] }>();
  if (!Array.isArray(body.keys)) throw new Error("Google signing keys are malformed");
  cachedKeys = { keys: body.keys, expiresAt: Date.now() + cacheSeconds(response.headers.get("Cache-Control")) * 1000 };
  return body.keys;
}

export function clearGoogleKeyCacheForTest(): void {
  cachedKeys = null;
}

export async function verifyGoogleCredential(credential: string, clientId: string, expectedNonce: string): Promise<IdentityClaims> {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Malformed Google credential");
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google credential");
  let jwk = (await googleKeys()).find((key) => key.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Google signing key was not found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new Error("Invalid Google credential signature");
  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as IdentityClaims;
  if (!(["https://accounts.google.com", "accounts.google.com"].includes(claims.iss))) throw new Error("Invalid Google issuer");
  if (claims.aud !== clientId || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("Expired or misdirected Google credential");
  if (!claims.sub || !claims.email || claims.email_verified === false) throw new Error("Google account email is not verified");
  if (!claims.nonce || claims.nonce !== expectedNonce) throw new Error("Invalid Google sign-in nonce");
  return claims;
}

async function sha256(value: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(value));
}

async function sha256Bytes(value: BufferSource): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request, name: string): string | null {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export async function createUserSession(env: Env, provider: AuthProvider, claims: IdentityClaims, linkUser?: AuthUser | null): Promise<{ user: AuthUser; cookie: string }> {
  if (provider === "password") throw new Error("Password sessions must use createSessionForUser");
  const now = new Date().toISOString();
  const existing = await env.ACCOUNT_DB.prepare(`SELECT users.id, users.display_name, users.profile_slug, users.profile_discoverable,
    users.deck_checklist_dismissed, users.display_name_reviewed
    FROM auth_identities JOIN users ON users.id = auth_identities.user_id
    WHERE auth_identities.provider = ? AND auth_identities.provider_subject = ?`).bind(provider, claims.sub)
    .first<{ id: string; display_name: string; profile_slug: string; profile_discoverable: number; deck_checklist_dismissed: number; display_name_reviewed: number }>();
  if (linkUser && existing && existing.id !== linkUser.id) throw new Error("That sign-in method is already linked to another account");
  if (linkUser) {
    const linkedProvider = await env.ACCOUNT_DB.prepare("SELECT provider_subject FROM auth_identities WHERE user_id = ? AND provider = ?")
      .bind(linkUser.id, provider).first<{ provider_subject: string }>();
    if (linkedProvider && linkedProvider.provider_subject !== claims.sub) throw new Error(`A different ${provider} account is already linked`);
  }
  const userId = linkUser?.id ?? existing?.id ?? crypto.randomUUID();
  const suggestedName = normalizeDisplayName(claims.name) ?? normalizeDisplayName(claims.email.split("@")[0]);
  const displayName = linkUser?.displayName ?? existing?.display_name ?? suggestedName ?? "Deck Player";
  const profileSlug = linkUser?.profileSlug ?? existing?.profile_slug ?? crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  // google_subject remains as a compatibility column until a future full users-table rebuild.
  // All authentication lookups use auth_identities; new non-Google users receive an inert unique value.
  await env.ACCOUNT_DB.prepare(`INSERT INTO users (id, google_subject, email, display_name, avatar_url, profile_slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`)
    .bind(userId, provider === "google" ? claims.sub : `${provider}:${claims.sub}`, claims.email, displayName, claims.picture ?? null, profileSlug, now, now).run();
  await env.ACCOUNT_DB.prepare(`INSERT INTO auth_identities (id, user_id, provider, provider_subject, provider_email, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(provider, provider_subject) DO UPDATE SET provider_email = excluded.provider_email, updated_at = excluded.updated_at`)
    .bind(crypto.randomUUID(), userId, provider, claims.sub, claims.email, now, now).run();
  const identityOwner = await env.ACCOUNT_DB.prepare("SELECT user_id FROM auth_identities WHERE provider = ? AND provider_subject = ?")
    .bind(provider, claims.sub).first<{ user_id: string }>();
  if (identityOwner?.user_id !== userId) {
    if (!linkUser && !existing) await env.ACCOUNT_DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    throw new Error("That sign-in method is already linked to another account");
  }
  return createSessionForUser(env, userId, { id: userId, email: linkUser?.email ?? claims.email, displayName, avatarUrl: linkUser?.avatarUrl ?? claims.picture ?? null, profileSlug, profileDiscoverable: linkUser?.profileDiscoverable ?? (existing ? Boolean(existing.profile_discoverable) : true),
    deckChecklistDismissed: linkUser?.deckChecklistDismissed ?? Boolean(existing?.deck_checklist_dismissed), displayNameReviewed: linkUser?.displayNameReviewed ?? Boolean(existing?.display_name_reviewed) });
}

export async function createSessionForUser(env: Env, userId: string, knownUser?: AuthUser): Promise<{ user: AuthUser; cookie: string }> {
  const user = knownUser ?? await env.ACCOUNT_DB.prepare(`SELECT id, email, display_name, avatar_url, profile_slug, profile_discoverable,
    deck_checklist_dismissed, display_name_reviewed FROM users WHERE id = ?`).bind(userId)
    .first<{ id: string; email: string; display_name: string; avatar_url: string | null; profile_slug: string; profile_discoverable: number; deck_checklist_dismissed: number; display_name_reviewed: number }>();
  if (!user) throw new Error("Session user was not found");
  const authUser: AuthUser = "displayName" in user ? user : { id: user.id, email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url,
    profileSlug: user.profile_slug, profileDiscoverable: Boolean(user.profile_discoverable), deckChecklistDismissed: Boolean(user.deck_checklist_dismissed), displayNameReviewed: Boolean(user.display_name_reviewed) };
  const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await env.ACCOUNT_DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at, authenticated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, await sha256(rawToken), expires, now, now, now).run();
  return {
    user: authUser,
    cookie: `${SESSION_COOKIE}=${rawToken}; Path=/; HttpOnly; ${env.ALLOWED_ORIGINS.includes("https://") ? "Secure; " : ""}SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
  };
}

export async function listAuthIdentities(env: Env, userId: string): Promise<AuthIdentity[]> {
  const rows = await env.ACCOUNT_DB.prepare(`SELECT provider, provider_email, created_at FROM auth_identities WHERE user_id = ?
    UNION ALL SELECT 'password' AS provider, normalized_email AS provider_email, created_at FROM password_credentials WHERE user_id = ?
    ORDER BY created_at`).bind(userId, userId).all<{ provider: AuthProvider; provider_email: string; created_at: string }>();
  return rows.results.map((row) => ({ provider: row.provider, email: row.provider_email, createdAt: row.created_at }));
}

export async function removeAuthIdentity(env: Env, userId: string, provider: Exclude<AuthProvider, "password">): Promise<void> {
  const result = await env.ACCOUNT_DB.prepare(`DELETE FROM auth_identities
    WHERE user_id = ? AND provider = ?
      AND ((SELECT COUNT(*) FROM auth_identities AS other WHERE other.user_id = ?) +
           (SELECT COUNT(*) FROM password_credentials WHERE user_id = ?)) > 1`)
    .bind(userId, provider, userId, userId).run();
  if (result.meta.changes === 1) return;
  const linked = await env.ACCOUNT_DB.prepare("SELECT 1 AS linked FROM auth_identities WHERE user_id = ? AND provider = ?")
    .bind(userId, provider).first<{ linked: number }>();
  if (!linked) throw new Error("Sign-in method is not linked");
  throw new Error("Add another sign-in method before removing this one");
}

export async function createDiscordOAuthState(env: Env, purpose: "sign-in" | "link", userId: string | null): Promise<string> {
  const state = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const now = new Date();
  await env.ACCOUNT_DB.prepare("DELETE FROM oauth_states WHERE expires_at <= ?").bind(now.toISOString()).run();
  await env.ACCOUNT_DB.prepare("INSERT INTO oauth_states (state_hash, provider, purpose, user_id, expires_at, created_at) VALUES (?, 'discord', ?, ?, ?, ?)")
    .bind(await sha256(state), purpose, userId, new Date(now.getTime() + OAUTH_NONCE_SECONDS * 1000).toISOString(), now.toISOString()).run();
  return state;
}

export async function consumeDiscordOAuthState(env: Env, state: string): Promise<{ purpose: "sign-in" | "link"; userId: string | null } | null> {
  const hash = await sha256(state);
  const row = await env.ACCOUNT_DB.prepare("DELETE FROM oauth_states WHERE state_hash = ? AND provider = 'discord' AND expires_at > ? RETURNING purpose, user_id")
    .bind(hash, new Date().toISOString()).first<{ purpose: "sign-in" | "link"; user_id: string | null }>();
  if (!row) return null;
  return { purpose: row.purpose, userId: row.user_id };
}

export function discordAuthorizeUrl(env: Env, state: string): string {
  const params = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, response_type: "code", redirect_uri: env.DISCORD_REDIRECT_URI, scope: "identify email", state, prompt: "consent" });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export async function exchangeDiscordCode(env: Env, code: string): Promise<IdentityClaims> {
  const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: env.DISCORD_REDIRECT_URI }),
  });
  if (!tokenResponse.ok) throw new Error("Discord authorization code was rejected");
  const token = await tokenResponse.json<{ access_token?: string; token_type?: string }>();
  if (!token.access_token || token.token_type?.toLowerCase() !== "bearer") throw new Error("Discord token response is malformed");
  const userResponse = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!userResponse.ok) throw new Error("Discord profile is unavailable");
  const user = await userResponse.json<DiscordUser>();
  if (!user.id || !user.email || user.verified !== true) throw new Error("Discord account must have a verified email");
  const picture = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined;
  return { iss: "https://discord.com", aud: env.DISCORD_CLIENT_ID, sub: user.id, email: user.email, email_verified: true, name: user.global_name ?? user.username, picture, exp: Math.floor(Date.now() / 1000) + 300 };
}

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 32 || /[\p{Cc}\p{Cf}]/u.test(normalized) || !validUserFacingName(normalized)) return null;
  return normalized;
}

export async function createOAuthNonce(env: Env): Promise<string> {
  const nonce = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const now = new Date();
  await env.ACCOUNT_DB.prepare("DELETE FROM oauth_nonces WHERE expires_at <= ?").bind(now.toISOString()).run();
  await env.ACCOUNT_DB.prepare("INSERT INTO oauth_nonces (nonce_hash, expires_at, created_at) VALUES (?, ?, ?)")
    .bind(await sha256(nonce), new Date(now.getTime() + OAUTH_NONCE_SECONDS * 1000).toISOString(), now.toISOString()).run();
  return nonce;
}

export async function consumeOAuthNonce(env: Env, nonce: string): Promise<boolean> {
  const result = await env.ACCOUNT_DB.prepare("DELETE FROM oauth_nonces WHERE nonce_hash = ? AND expires_at > ?")
    .bind(await sha256(nonce), new Date().toISOString()).run();
  return result.meta.changes === 1;
}

export async function rotateCurrentSession(request: Request, env: Env): Promise<void> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await env.ACCOUNT_DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export async function authenticatedUser(request: Request, env: Env): Promise<AuthUser | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const now = new Date();
  const tokenHash = await sha256(token);
  const row = await env.ACCOUNT_DB.prepare(`SELECT users.id, users.email, users.display_name, users.avatar_url, users.profile_slug, users.profile_discoverable,
    users.deck_checklist_dismissed, users.display_name_reviewed, sessions.last_seen_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND sessions.last_seen_at > ?`)
    .bind(tokenHash, now.toISOString(), new Date(now.getTime() - SESSION_IDLE_SECONDS * 1000).toISOString())
    .first<{ id: string; email: string; display_name: string; avatar_url: string | null; profile_slug: string; profile_discoverable: number; deck_checklist_dismissed: number; display_name_reviewed: number; last_seen_at: string }>();
  if (!row) {
    await env.ACCOUNT_DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  if (now.getTime() - new Date(row.last_seen_at).getTime() >= SESSION_TOUCH_SECONDS * 1000) {
    await env.ACCOUNT_DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now.toISOString(), tokenHash).run();
  }
  return { id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url, profileSlug: row.profile_slug,
    profileDiscoverable: Boolean(row.profile_discoverable), deckChecklistDismissed: Boolean(row.deck_checklist_dismissed), displayNameReviewed: Boolean(row.display_name_reviewed) };
}

export async function recentlyAuthenticated(request: Request, env: Env, seconds = 10 * 60): Promise<boolean> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return false;
  const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
  const row = await env.ACCOUNT_DB.prepare("SELECT 1 AS recent FROM sessions WHERE token_hash = ? AND authenticated_at >= ? AND expires_at > ?")
    .bind(await sha256(token), cutoff, new Date().toISOString()).first<{ recent: number }>();
  return Boolean(row);
}

export async function destroySession(request: Request, env: Env): Promise<string> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await env.ACCOUNT_DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return clearSessionCookie(env);
}

export async function destroyAllSessions(request: Request, env: Env): Promise<string> {
  const user = await authenticatedUser(request, env);
  if (user) await env.ACCOUNT_DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  return clearSessionCookie(env);
}

function clearSessionCookie(env: Env): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; ${env.ALLOWED_ORIGINS.includes("https://") ? "Secure; " : ""}SameSite=Lax; Max-Age=0`;
}

export function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).includes(origin);
}

const BFF_SIGNATURE_MAX_AGE_MS = 60_000;

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function bffAllowed(request: Request, env: Env): Promise<boolean> {
  // Local Wrangler serves the browser directly; production traffic must use the BFF.
  const origin = request.headers.get("Origin");
  if (new URL(request.url).hostname === "localhost" && origin === "http://localhost:5173" && env.ALLOWED_ORIGINS === origin) return true;
  if (!env.BFF_SHARED_SECRET || request.headers.get("X-Fanofin-BFF-Secret") !== env.BFF_SHARED_SECRET) return false;
  const timestamp = request.headers.get("X-Fanofin-BFF-Timestamp");
  const requestId = request.headers.get("X-Fanofin-BFF-Request-ID");
  const signature = request.headers.get("X-Fanofin-BFF-Signature");
  if (!timestamp || !requestId || !signature || !/^\d{13}$/.test(timestamp) || !/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > BFF_SIGNATURE_MAX_AGE_MS) return false;
  const bodyHash = await sha256Bytes(await request.clone().arrayBuffer());
  const url = new URL(request.url);
  const canonical = `${request.method}\n${url.pathname}${url.search}\n${bodyHash}\n${timestamp}\n${requestId}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.BFF_SHARED_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expectedBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical));
  const expected = Array.from(new Uint8Array(expectedBytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(signature.toLowerCase(), expected);
}
