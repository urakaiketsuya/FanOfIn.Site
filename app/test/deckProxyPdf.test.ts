import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import type { Card } from "@gatcg/shared";
import { MM, PROXY_HEIGHT, PROXY_WIDTH, proxyLayout, proxySections, renderDeckProxyPdf } from "../src/lib/deckProxyPdf";

const cards = new Map([["Example", { name: "Example", editions: [{ uuid: "default", image: "default" }, { uuid: "alt", image: "alt" }] } as Card]]);
const sections = [{ title: "Material Deck", lines: [{ card: "Example", quantity: 1 }] }, { title: "Main Deck", lines: [{ card: "Example", quantity: 9, printings: [{ editionUuid: "alt", quantity: 2 }] }] }, { title: "Sideboard", lines: [{ card: "Example", quantity: 2 }] }, { title: "Maybeboard", lines: [{ card: "Example", quantity: 7 }] }];
// Minimal JPEG containing a valid size header; embedding does not require a browser decoder.
const jpeg = new Uint8Array([255,216,255,192,0,17,8,0,88,0,63,3,1,17,0,2,17,0,3,17,0,255,217]);

test("scope excludes sideboard by default and never includes maybeboard", () => {
  assert.deepEqual(proxySections(sections, false).map(s => s.title), ["Material Deck", "Main Deck"]);
  assert.deepEqual(proxySections(sections, true).map(s => s.title), ["Material Deck", "Main Deck", "Sideboard"]);
});
for (const paper of ["letter", "a4"] as const) test(`${paper}: exact physical size, page breaks, quantities, and reused printing images`, async () => {
  const fetched: string[] = [];
  const blob = await renderDeckProxyPdf("Test", proxySections(sections, false), cards, paper, new AbortController().signal, () => {}, async source => { fetched.push(source); return jpeg; });
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  assert.equal(doc.getPageCount(), 2);
  assert.deepEqual(fetched, ["default", "alt"]);
  const expected = paper === "letter" ? [612,792] : [210 * MM,297 * MM];
  assert.deepEqual([doc.getPage(0).getWidth(), doc.getPage(0).getHeight()], expected);
  const positions = proxyLayout(paper, 10);
  assert.equal(positions[8].page, 0); assert.equal(positions[9].page, 1);
  for (const position of positions) {
    assert.ok(position.x > 0 && position.x + PROXY_WIDTH < expected[0]);
    assert.ok(position.y > 0 && position.y + PROXY_HEIGHT < expected[1]);
  }
  const streams = doc.getPages().map(page => {
    const contents = page.node.Contents()!;
    const stream = doc.context.lookup(contents.asArray()[0]) as PDFRawStream;
    return new TextDecoder().decode(decodePDFRawStream(stream).decode());
  });
  assert.equal((streams[0].match(/ Do\n/g) ?? []).length, 9);
  assert.equal((streams[1].match(/ Do\n/g) ?? []).length, 1);
  assert.ok(streams[0].includes(`${PROXY_WIDTH} 0 0 ${PROXY_HEIGHT}`));
  const xobjects = doc.getPage(0).node.Resources()!.lookup(PDFName.of("XObject"));
  assert.ok(xobjects);
});
test("missing or failed artwork blocks incomplete PDF, and retry can recover", async () => {
  const run = (loader: (source: string, signal: AbortSignal) => Promise<Uint8Array>) => renderDeckProxyPdf("Test", proxySections(sections, false), cards, "letter", new AbortController().signal, () => {}, loader);
  await assert.rejects(run(async () => { throw new Error("offline"); }), /Artwork unavailable for Example/);
  assert.equal((await run(async () => jpeg)).type, "application/pdf");
  await assert.rejects(renderDeckProxyPdf("Test", [{ title: "Main", lines: [{ card: "Unknown", quantity: 1 }] }], cards, "a4", new AbortController().signal, () => {}, async () => jpeg), /Unknown/);
});
test("empty, oversized and aborted exports fail explicitly", async () => {
  const render = (quantity: number, signal = new AbortController().signal) => renderDeckProxyPdf("Test", [{ title: "Main", lines: [{ card: "Example", quantity }] }], cards, "letter", signal, () => {}, async () => jpeg);
  await assert.rejects(render(0), /Add cards/);
  await assert.rejects(render(541), /540/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(render(1, controller.signal), { name: "AbortError" });
});
