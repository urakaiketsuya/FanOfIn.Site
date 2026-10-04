import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import handler from "../api/index.ts";

test("profile saves pass credentialed PUT preflight only for the allowed origin", async () => {
  const server = createServer((request, response) => { void handler(request, response); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api?_path=v1/me/showcase`;
  const origin = process.env.ALLOWED_ORIGIN ?? "https://fanofin.site";
  try {
    const headers = { Origin: origin, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" };
    const allowed = await fetch(url, { method: "OPTIONS", headers });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(allowed.headers.get("Access-Control-Allow-Credentials"), "true");
    assert.ok(allowed.headers.get("Access-Control-Allow-Methods")?.split(/,\s*/).includes("PUT"));
    assert.match(allowed.headers.get("Access-Control-Allow-Headers") ?? "", /content-type/i);
    const rejected = await fetch(url, { method: "OPTIONS", headers: { ...headers, Origin: "https://untrusted.example" } });
    assert.equal(rejected.status, 403);
    assert.notEqual(rejected.headers.get("Access-Control-Allow-Origin"), "https://untrusted.example");
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
