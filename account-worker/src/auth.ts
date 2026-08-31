export interface Env {
  ACCOUNT_DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  ASSET_BASE_URL: string;
  ALLOWED_ORIGINS: string;
  BFF_SHARED_SECRET: string;
  LOGIN_RATE_LIMITER: RateLimit;
  WRITE_RATE_LIMITER: RateLimit;
  IMPORT_RATE_LIMITER: RateLimit;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface GoogleClaims {
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

async function googleKeys(): Promise<GoogleJsonWebKey[]> {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) throw new Error("Google signing keys are unavailable");
  const body = await response.json<{ keys: GoogleJsonWebKey[] }>();
  cachedKeys = { keys: body.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return body.keys;
}

export async function verifyGoogleCredential(credential: string, clientId: string, expectedNonce: string): Promise<GoogleClaims> {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Malformed Google credential");
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google credential");
  const jwk = (await googleKeys()).find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Google signing key was not found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new Error("Invalid Google credential signature");
  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as GoogleClaims;
  if (!(["https://accounts.google.com", "accounts.google.com"].includes(claims.iss))) throw new Error("Invalid Google issuer");
  if (claims.aud !== clientId || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("Expired or misdirected Google credential");
  if (!claims.sub || !claims.email || claims.email_verified === false) throw new Error("Google account email is not verified");
  if (!claims.nonce || claims.nonce !== expectedNonce) throw new Error("Invalid Google sign-in nonce");
  return claims;
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request, name: string): string | null {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export async function createUserSession(env: Env, claims: GoogleClaims): Promise<{ user: AuthUser; cookie: string }> {
  const now = new Date().toISOString();
  const existing = await env.ACCOUNT_DB.prepare("SELECT id FROM users WHERE google_subject = ?").bind(claims.sub).first<{ id: string }>();
  const userId = existing?.id ?? crypto.randomUUID();
  const displayName = claims.name?.trim() || claims.email.split("@")[0];
  await env.ACCOUNT_DB.prepare(`INSERT INTO users (id, google_subject, email, display_name, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(google_subject) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
      avatar_url = excluded.avatar_url, updated_at = excluded.updated_at`)
    .bind(userId, claims.sub, claims.email, displayName, claims.picture ?? null, now, now).run();
  const rawToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await env.ACCOUNT_DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, await sha256(rawToken), expires, now, now).run();
  return {
    user: { id: userId, email: claims.email, displayName, avatarUrl: claims.picture ?? null },
    cookie: `${SESSION_COOKIE}=${rawToken}; Path=/; HttpOnly; ${env.ALLOWED_ORIGINS.includes("https://") ? "Secure; " : ""}SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
  };
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
  const row = await env.ACCOUNT_DB.prepare(`SELECT users.id, users.email, users.display_name, users.avatar_url, sessions.last_seen_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND sessions.last_seen_at > ?`)
    .bind(tokenHash, now.toISOString(), new Date(now.getTime() - SESSION_IDLE_SECONDS * 1000).toISOString())
    .first<{ id: string; email: string; display_name: string; avatar_url: string | null; last_seen_at: string }>();
  if (!row) {
    await env.ACCOUNT_DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  if (now.getTime() - new Date(row.last_seen_at).getTime() >= SESSION_TOUCH_SECONDS * 1000) {
    await env.ACCOUNT_DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now.toISOString(), tokenHash).run();
  }
  return { id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url };
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

export function bffAllowed(request: Request, env: Env): boolean {
  return Boolean(env.BFF_SHARED_SECRET) && request.headers.get("X-Fanofin-BFF-Secret") === env.BFF_SHARED_SECRET;
}
