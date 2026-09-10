import type { AuthUser, Env } from "./auth";
import { createSessionForUser, normalizeDisplayName } from "./auth";
import { ApiError, badRequest } from "./errors";

const HASH_ITERATIONS = 600_000;
const VERIFY_SECONDS = 60 * 60;
const RESET_SECONDS = 30 * 60;
const encoder = new TextEncoder();

interface PasswordCredentialRow {
  id: string;
  user_id: string;
  normalized_email: string;
  password_hash: string;
  password_salt: string;
  hash_iterations: number;
  email_verified: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function normalizeLoginEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 254 || /[\s\u0000-\u001f\u007f]/u.test(normalized)) return null;
  const at = normalized.lastIndexOf("@");
  if (at < 1 || at === normalized.length - 1 || normalized.includes("@", at + 1)) return null;
  if (!normalized.slice(at + 1).includes(".")) return null;
  return normalized;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 15 || value.length > 128) throw badRequest("Password must be 15–128 characters", "invalid_password");
  if (/\u0000/u.test(value)) throw badRequest("Password cannot contain a null character", "invalid_password");
  return value;
}

export async function ensurePasswordNotCompromised(password: string): Promise<void> {
  const digest = await crypto.subtle.digest("SHA-1", encoder.encode(password));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const response = await fetch(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`, { headers: { "Add-Padding": "true", "User-Agent": "FanOfInsight-Account-Security" } });
  if (!response.ok) throw new ApiError("Password safety check is temporarily unavailable", 503, "password_check_unavailable");
  const suffix = hex.slice(5);
  if ((await response.text()).split(/\r?\n/).some((line) => line.split(":", 1)[0] === suffix)) throw badRequest("Choose a password that has not appeared in a known data breach", "compromised_password");
}

export async function hashPassword(password: string, salt?: Uint8Array, iterations = HASH_ITERATIONS): Promise<{ hash: string; salt: string; iterations: number }> {
  const actualSalt = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: actualSalt, iterations }, key, 256);
  return { hash: bytesToBase64(new Uint8Array(bits)), salt: bytesToBase64(actualSalt), iterations };
}

export async function verifyPassword(password: string, credential: Pick<PasswordCredentialRow, "password_hash" | "password_salt" | "hash_iterations">): Promise<boolean> {
  const derived = await hashPassword(password, base64ToBytes(credential.password_salt), credential.hash_iterations);
  return constantTimeEqual(base64ToBytes(derived.hash), base64ToBytes(credential.password_hash));
}

async function sendEmail(env: Env, to: string, subject: string, text: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new ApiError("Email delivery is not configured", 503, "email_not_configured");
  const suppressed = await env.ACCOUNT_DB.prepare("SELECT reason FROM email_suppressions WHERE normalized_email = ?").bind(to.toLowerCase()).first<{ reason: string }>();
  if (suppressed) throw new ApiError("Email cannot be delivered to that address", 400, "email_suppressed");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
  });
  if (!response.ok) throw new Error(`Resend rejected email (${response.status})`);
}

function webhookSecretBytes(secret: string): Uint8Array {
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return base64ToBytes(encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "="));
}

export async function handleResendWebhook(env: Env, request: Request): Promise<boolean> {
  if (!env.RESEND_WEBHOOK_SECRET) return false;
  const id = request.headers.get("svix-id"); const timestamp = request.headers.get("svix-timestamp"); const signatures = request.headers.get("svix-signature");
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const payload = await request.text();
  const key = await crypto.subtle.importKey("raw", webhookSecretBytes(env.RESEND_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${id}.${timestamp}.${payload}`)));
  const valid = signatures.split(" ").some((entry) => { const [version, value] = entry.split(",", 2); if (version !== "v1" || !value) return false; try { return constantTimeEqual(expected, base64ToBytes(value)); } catch { return false; } });
  if (!valid) return false;
  const existing = await env.ACCOUNT_DB.prepare("SELECT 1 AS seen FROM email_webhook_events WHERE id = ?").bind(id).first<{ seen: number }>();
  if (existing) return true;
  const parsed = JSON.parse(payload) as { type?: unknown; created_at?: unknown; data?: { to?: unknown } };
  const eventType = typeof parsed.type === "string" ? parsed.type : "unknown";
  const now = typeof parsed.created_at === "string" ? parsed.created_at : new Date().toISOString();
  const statements = [env.ACCOUNT_DB.prepare("INSERT INTO email_webhook_events (id, event_type, created_at) VALUES (?, ?, ?)").bind(id, eventType, now)];
  const reason = eventType === "email.bounced" ? "bounced" : eventType === "email.complained" ? "complained" : eventType === "email.suppressed" ? "suppressed" : null;
  if (reason && Array.isArray(parsed.data?.to)) for (const address of parsed.data.to) {
    const email = normalizeLoginEmail(address);
    if (email) statements.push(env.ACCOUNT_DB.prepare(`INSERT INTO email_suppressions (normalized_email, reason, created_at) VALUES (?, ?, ?)
      ON CONFLICT(normalized_email) DO UPDATE SET reason = excluded.reason, created_at = excluded.created_at`).bind(email, reason, now));
  }
  await env.ACCOUNT_DB.batch(statements);
  return true;
}

async function issueToken(env: Env, credentialId: string, purpose: "verify-email" | "reset-password"): Promise<string> {
  const token = randomToken();
  const now = new Date();
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("DELETE FROM password_auth_tokens WHERE credential_id = ? AND purpose = ?").bind(credentialId, purpose),
    env.ACCOUNT_DB.prepare("DELETE FROM password_auth_tokens WHERE expires_at <= ?").bind(now.toISOString()),
    env.ACCOUNT_DB.prepare("INSERT INTO password_auth_tokens (token_hash, credential_id, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(await sha256(token), credentialId, purpose, new Date(now.getTime() + (purpose === "verify-email" ? VERIFY_SECONDS : RESET_SECONDS) * 1000).toISOString(), now.toISOString()),
  ]);
  return token;
}

async function event(env: Env, eventType: string, userId: string | null, email: string, requestId: string): Promise<void> {
  await env.ACCOUNT_DB.prepare("INSERT INTO auth_security_events (id, user_id, event_type, identifier_hash, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, eventType, await sha256(email), requestId, new Date().toISOString()).run();
}

export async function recordPrivateResourceMiss(env: Env, userId: string, path: string, requestId: string): Promise<void> {
  await event(env, "private_resource_not_found", userId, path, requestId);
}

export async function registerPassword(env: Env, rawEmail: unknown, rawPassword: unknown, currentUser: AuthUser | null, requestId: string): Promise<void> {
  const email = normalizeLoginEmail(rawEmail);
  if (!email) throw badRequest("Enter a valid email address", "invalid_email");
  const password = validatePassword(rawPassword);
  await ensurePasswordNotCompromised(password);
  const existing = await env.ACCOUNT_DB.prepare("SELECT id, user_id, email_verified FROM password_credentials WHERE normalized_email = ?")
    .bind(email).first<Pick<PasswordCredentialRow, "id" | "user_id" | "email_verified">>();
  if (existing) {
    await event(env, "password_registration_existing", existing.user_id, email, requestId);
    if (currentUser && existing.user_id !== currentUser.id) throw new ApiError("That email is already used by another password credential", 409, "password_email_in_use");
    if (currentUser && existing.email_verified) throw new ApiError("Email and password are already linked", 409, "password_already_linked");
    if (!existing.email_verified) {
      const token = await issueToken(env, existing.id, "verify-email");
      try { await sendEmail(env, email, "Verify your Fan of Insight email", `Verify your email address:\n\n${env.APP_BASE_URL.replace(/\/$/, "")}/account/verify-email#token=${encodeURIComponent(token)}\n\nThis link expires in one hour.`); }
      catch (error) { console.error("Verification resend failed", error instanceof Error ? error.message : "Unknown error"); }
    }
    return;
  }
  const userId = currentUser?.id ?? crypto.randomUUID();
  const credentialId = crypto.randomUUID();
  const now = new Date().toISOString();
  const derived = await hashPassword(password);
  const displayName = currentUser?.displayName ?? normalizeDisplayName(email.split("@")[0]) ?? "Deck Player";
  const credentialInsert = env.ACCOUNT_DB.prepare(`INSERT INTO password_credentials
    (id, user_id, normalized_email, password_hash, password_salt, hash_algorithm, hash_iterations, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pbkdf2-sha256', ?, 0, ?, ?)`)
    .bind(credentialId, userId, email, derived.hash, derived.salt, derived.iterations, now, now);
  if (!currentUser) await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare(`INSERT INTO users (id, google_subject, email, display_name, avatar_url, profile_slug, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`).bind(userId, `password:${credentialId}`, email, displayName, crypto.randomUUID().replace(/-/g, "").slice(0, 24), now, now),
    credentialInsert,
  ]);
  else await credentialInsert.run();
  const token = await issueToken(env, credentialId, "verify-email");
  try {
    await sendEmail(env, email, "Verify your Fan of Insight email", `Verify your email address:\n\n${env.APP_BASE_URL.replace(/\/$/, "")}/account/verify-email#token=${encodeURIComponent(token)}\n\nThis link expires in one hour.`);
  } catch (error) {
    if (currentUser) await env.ACCOUNT_DB.prepare("DELETE FROM password_credentials WHERE id = ?").bind(credentialId).run();
    else await env.ACCOUNT_DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    throw error;
  }
  await event(env, currentUser ? "password_credential_added" : "password_registration_created", userId, email, requestId);
}

async function consumeToken(env: Env, token: string, purpose: "verify-email" | "reset-password"): Promise<PasswordCredentialRow | null> {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const row = await env.ACCOUNT_DB.prepare(`DELETE FROM password_auth_tokens
    WHERE token_hash = ? AND purpose = ? AND expires_at > ?
    RETURNING credential_id`).bind(await sha256(token), purpose, new Date().toISOString()).first<{ credential_id: string }>();
  if (!row) return null;
  return env.ACCOUNT_DB.prepare("SELECT * FROM password_credentials WHERE id = ?").bind(row.credential_id).first<PasswordCredentialRow>();
}

export async function verifyEmailToken(env: Env, token: string, requestId: string, currentUser: AuthUser | null): Promise<{ user: AuthUser | null; cookie?: string }> {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) throw new ApiError("Verification link is invalid or expired", 400, "verification_invalid");
  const tokenHash = await sha256(token);
  const candidate = await env.ACCOUNT_DB.prepare(`SELECT pc.*,
    EXISTS (SELECT 1 FROM auth_identities ai WHERE ai.user_id = pc.user_id) AS has_oauth
    FROM password_auth_tokens pat JOIN password_credentials pc ON pc.id = pat.credential_id
    WHERE pat.token_hash = ? AND pat.purpose = 'verify-email' AND pat.expires_at > ?`)
    .bind(tokenHash, new Date().toISOString()).first<PasswordCredentialRow & { has_oauth: number }>();
  if (candidate?.has_oauth && currentUser?.id !== candidate.user_id) throw new ApiError("Sign in to the account that requested this password before verifying it", 403, "verification_owner_required");
  const consumed = await env.ACCOUNT_DB.prepare("DELETE FROM password_auth_tokens WHERE token_hash = ? AND purpose = 'verify-email' AND expires_at > ? RETURNING credential_id")
    .bind(tokenHash, new Date().toISOString()).first<{ credential_id: string }>();
  const credential = consumed && candidate?.id === consumed.credential_id ? candidate : null;
  if (!credential) throw new ApiError("Verification link is invalid or expired", 400, "verification_invalid");
  await env.ACCOUNT_DB.prepare("UPDATE password_credentials SET email_verified = 1, updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), credential.id).run();
  await event(env, "email_verified", credential.user_id, credential.normalized_email, requestId);
  return createSessionForUser(env, credential.user_id);
}

export async function loginPassword(env: Env, rawEmail: unknown, rawPassword: unknown, requestId: string): Promise<{ user: AuthUser; cookie: string }> {
  const email = normalizeLoginEmail(rawEmail);
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const credential = email ? await env.ACCOUNT_DB.prepare("SELECT * FROM password_credentials WHERE normalized_email = ?").bind(email).first<PasswordCredentialRow>() : null;
  const dummy = { password_hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", password_salt: "AAAAAAAAAAAAAAAAAAAAAA==", hash_iterations: HASH_ITERATIONS };
  const valid = await verifyPassword(password, credential ?? dummy).catch(() => false);
  if (!credential || !valid || !credential.email_verified) {
    await event(env, "password_login_failed", credential?.user_id ?? null, email ?? "invalid", requestId);
    throw new ApiError("Invalid email or password", 401, "invalid_credentials");
  }
  await event(env, "password_login_succeeded", credential.user_id, credential.normalized_email, requestId);
  return createSessionForUser(env, credential.user_id);
}

export async function requestPasswordReset(env: Env, rawEmail: unknown, requestId: string): Promise<void> {
  const email = normalizeLoginEmail(rawEmail);
  if (!email) return;
  const credential = await env.ACCOUNT_DB.prepare("SELECT * FROM password_credentials WHERE normalized_email = ? AND email_verified = 1")
    .bind(email).first<PasswordCredentialRow>();
  if (!credential) { await event(env, "password_reset_unknown", null, email, requestId); return; }
  const token = await issueToken(env, credential.id, "reset-password");
  try { await sendEmail(env, email, "Reset your Fan of Insight password", `Reset your password:\n\n${env.APP_BASE_URL.replace(/\/$/, "")}/account/reset-password#token=${encodeURIComponent(token)}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`); }
  catch (error) { console.error("Password-reset email failed", error instanceof Error ? error.message : "Unknown error"); }
  await event(env, "password_reset_requested", credential.user_id, email, requestId);
}

export async function resetPassword(env: Env, token: string, rawPassword: unknown, requestId: string): Promise<void> {
  const password = validatePassword(rawPassword);
  await ensurePasswordNotCompromised(password);
  const credential = await consumeToken(env, token, "reset-password");
  if (!credential) throw new ApiError("Reset link is invalid or expired", 400, "reset_invalid");
  const derived = await hashPassword(password);
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("UPDATE password_credentials SET password_hash = ?, password_salt = ?, hash_iterations = ?, updated_at = ? WHERE id = ?")
      .bind(derived.hash, derived.salt, derived.iterations, new Date().toISOString(), credential.id),
    env.ACCOUNT_DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(credential.user_id),
    env.ACCOUNT_DB.prepare("DELETE FROM password_auth_tokens WHERE credential_id = ?").bind(credential.id),
  ]);
  try { await sendEmail(env, credential.normalized_email, "Your Fan of Insight password changed", "Your password was changed and all existing sessions were signed out. If you did not make this change, reset your password immediately."); }
  catch (error) { console.error("Password-change notification failed", error instanceof Error ? error.message : "Unknown error"); }
  await event(env, "password_reset_completed", credential.user_id, credential.normalized_email, requestId);
}

export async function changePassword(env: Env, userId: string, rawCurrentPassword: unknown, rawNewPassword: unknown, requestId: string): Promise<{ user: AuthUser; cookie: string }> {
  const currentPassword = typeof rawCurrentPassword === "string" ? rawCurrentPassword : "";
  const newPassword = validatePassword(rawNewPassword);
  const credential = await env.ACCOUNT_DB.prepare("SELECT * FROM password_credentials WHERE user_id = ? AND email_verified = 1").bind(userId).first<PasswordCredentialRow>();
  if (!credential || !await verifyPassword(currentPassword, credential)) throw new ApiError("Current password is incorrect", 401, "current_password_invalid");
  await ensurePasswordNotCompromised(newPassword);
  const derived = await hashPassword(newPassword);
  await env.ACCOUNT_DB.batch([
    env.ACCOUNT_DB.prepare("UPDATE password_credentials SET password_hash = ?, password_salt = ?, hash_iterations = ?, updated_at = ? WHERE id = ?")
      .bind(derived.hash, derived.salt, derived.iterations, new Date().toISOString(), credential.id),
    env.ACCOUNT_DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
  ]);
  const session = await createSessionForUser(env, userId);
  try { await sendEmail(env, credential.normalized_email, "Your Fan of Insight password changed", "Your password was changed and all other sessions were signed out. If you did not make this change, reset your password immediately."); }
  catch (error) { console.error("Password-change notification failed", error instanceof Error ? error.message : "Unknown error"); }
  await event(env, "password_changed", userId, credential.normalized_email, requestId);
  return session;
}

export async function removePasswordCredential(env: Env, userId: string): Promise<void> {
  const result = await env.ACCOUNT_DB.prepare(`DELETE FROM password_credentials WHERE user_id = ?
    AND EXISTS (SELECT 1 FROM auth_identities WHERE user_id = ?)`).bind(userId, userId).run();
  if (result.meta.changes !== 1) throw new ApiError("Sign-in method is not linked", 400, "identity_not_linked");
}

export async function verifyTurnstile(env: Env, token: unknown, remoteIp?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return env.ALLOWED_ORIGINS === "http://localhost:5173";
  if (typeof token !== "string" || !token) return false;
  const body = new FormData(); body.set("secret", env.TURNSTILE_SECRET_KEY); body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return false;
  return Boolean((await response.json<{ success?: boolean }>()).success);
}
