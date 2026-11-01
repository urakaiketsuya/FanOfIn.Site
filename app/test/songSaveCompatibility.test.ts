import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

test("Song saves fail before writing to an old service, and pass through intact to a compatible service", async () => {
  let compatible = false;
  const calls: { url: string; body?: string }[] = [];
  const exports: Record<string, any> = {};
  const source = readFileSync(new URL("../src/lib/accountApi.ts", import.meta.url), "utf8")
    .replaceAll("import.meta.env.VITE_ACCOUNT_API_URL", '"http://accounts.test"')
    .replaceAll("import.meta.env.PROD", "false");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: () => ({ publishCollectionChange() {} }),
    fetch: async (url: string, init: RequestInit) => {
      calls.push({ url, body: init.body as string });
      return { ok: true, json: async () => url.endsWith("/health") ? { capabilities: compatible ? { songDeck: true } : undefined } : { id: "saved" } };
    },
  });
  const input = { title: "Songs", format: "STANDARD", decklist: { main: [], material: [], sideboard: [], song: [{ card: "Chromatic", quantity: 1 }] }, source: { provider: "manual", externalDeckId: "test", label: "Test" } };
  await assert.rejects(exports.accountApi.saveDeck(input), /Song deck saving is not available/);
  assert.equal(calls.length, 1);
  compatible = true;
  await exports.accountApi.saveDeck(input);
  assert.deepEqual(JSON.parse(calls.at(-1)!.body!).decklist.song, input.decklist.song);
});
