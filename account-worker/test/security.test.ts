import assert from "node:assert/strict";
import test from "node:test";
import { bffAllowed, type Env } from "../src/auth";
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
