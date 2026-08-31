import assert from "node:assert/strict";
import test from "node:test";
import { bffAllowed, clearGoogleKeyCacheForTest, consumeOAuthNonce, createOAuthNonce, verifyGoogleCredential, type Env } from "../src/auth";
import { parseSaveInput } from "../src/decks";

function envWithSecret(secret: string): Env {
  return { BFF_SHARED_SECRET: secret } as Env;
}

test("gateway authentication fails closed when its secret is missing", () => {
  const request = new Request("https://worker.example/v1/auth/session");
  assert.equal(bffAllowed(request, envWithSecret("")), false);
});

test("gateway authentication requires the exact shared secret", () => {
  const rejected = new Request("https://worker.example/v1/auth/session", {
    headers: { "X-Fanofin-BFF-Secret": "wrong" },
  });
  const accepted = new Request("https://worker.example/v1/auth/session", {
    headers: { "X-Fanofin-BFF-Secret": "correct" },
  });
  assert.equal(bffAllowed(rejected, envWithSecret("correct")), false);
  assert.equal(bffAllowed(accepted, envWithSecret("correct")), true);
});

test("manual saves reject oversized decklists", () => {
  const lines = Array.from({ length: 251 }, (_, index) => ({ card: `Card ${index}`, quantity: 1 }));
  assert.throws(() => parseSaveInput({
    title: "Oversized",
    decklist: { main: lines, material: [], sideboard: [] },
    source: { provider: "manual", externalDeckId: "local", label: "Manual" },
  }), /Invalid saved deck/);
});

test("the public save endpoint cannot forge imported sources", () => {
  assert.throws(() => parseSaveInput({
    title: "Forged import",
    decklist: { main: [{ card: "Test Card", quantity: 1 }], material: [], sideboard: [] },
    source: { provider: "omnidex", externalDeckId: "123", label: "Forged" },
  }), /Invalid deck source/);
});

test("OAuth nonces are random and can only be consumed once", async () => {
  const nonceHashes = new Set<string>();
  const database = {
    prepare(query: string) {
      let values: unknown[] = [];
      return {
        bind(...bound: unknown[]) { values = bound; return this; },
        async run() {
          const hash = String(values[0]);
          if (query.startsWith("INSERT")) { nonceHashes.add(hash); return { meta: { changes: 1 } }; }
          if (query.includes("nonce_hash")) {
            const existed = nonceHashes.delete(hash);
            return { meta: { changes: existed ? 1 : 0 } };
          }
          return { meta: { changes: 0 } };
        },
      };
    },
  } as unknown as D1Database;
  const env = { ACCOUNT_DB: database } as Env;
  const first = await createOAuthNonce(env);
  const second = await createOAuthNonce(env);
  assert.notEqual(first, second);
  assert.equal(await consumeOAuthNonce(env, first), true);
  assert.equal(await consumeOAuthNonce(env, first), false);
});

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

test("Google verification refreshes cached keys once when a new key ID appears", async () => {
  clearGoogleKeyCacheForTest();
  const firstPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const rotatedPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const firstJwk = { ...await crypto.subtle.exportKey("jwk", firstPair.publicKey), kid: "old-key" };
  const rotatedJwk = { ...await crypto.subtle.exportKey("jwk", rotatedPair.publicKey), kid: "new-key" };
  const originalFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches++;
    return Response.json({ keys: fetches === 1 ? [firstJwk] : [rotatedJwk] }, { headers: { "Cache-Control": "public, max-age=3600" } });
  };
  try {
    const header = base64Url(JSON.stringify({ alg: "RS256", kid: "new-key" }));
    const claims = base64Url(JSON.stringify({
      iss: "https://accounts.google.com",
      aud: "client-id",
      sub: "google-user",
      email: "player@example.com",
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: "one-time-nonce",
    }));
    const signingInput = `${header}.${claims}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", rotatedPair.privateKey, new TextEncoder().encode(signingInput));
    const result = await verifyGoogleCredential(`${signingInput}.${base64Url(new Uint8Array(signature))}`, "client-id", "one-time-nonce");
    assert.equal(result.sub, "google-user");
    assert.equal(fetches, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearGoogleKeyCacheForTest();
  }
});
