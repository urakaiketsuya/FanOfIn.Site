import assert from "node:assert/strict";
import test from "node:test";
import { decodePackage, encodePackage, sharedPackageFromLines, type SharedPackage } from "@gatcg/shared";

const sample: SharedPackage = { v: 1, name: "Jin package", champion: "Jin", cards: [
  { name: "Éclair of Fire", section: "main", quantity: 3 },
  { name: "Sword", section: "material", quantity: 1 },
] };

test("a package survives encode and decode, including non-ASCII names", () => {
  assert.deepEqual(decodePackage(encodePackage(sample)), sample);
});
test("bad input returns null", () => {
  for (const bad of ["", "abc", "!!!", "e30", encodePackage({ ...sample, cards: [] }), "A".repeat(5000)]) assert.equal(decodePackage(bad), null);
});
test("limits are enforced on decode", () => {
  const big = { ...sample, cards: Array.from({ length: 61 }, (_, i) => ({ name: `Card ${i}`, section: "main" as const, quantity: 1 })) };
  assert.equal(decodePackage(encodePackage(big)), null);
  assert.equal(decodePackage(encodePackage({ ...sample, cards: [{ name: "X", section: "main", quantity: 5 }] })), null);
  assert.equal(decodePackage(encodePackage({ ...sample, cards: [sample.cards[0], sample.cards[0]] })), null);
});
test("unknown fields are dropped", () => {
  const json = JSON.stringify({ v: 1, n: "P", k: ["A"], l: [[0, 0, 2]], extra: "x" });
  const text = btoa(json).replace(/=+$/, "");
  assert.deepEqual(decodePackage(text), { v: 1, name: "P", cards: [{ name: "A", section: "main", quantity: 2 }] });
});
test("sharedPackageFromLines trims the name and omits an empty champion", () => {
  assert.deepEqual(sharedPackageFromLines("  P  ", undefined, [{ name: "A", section: "main", quantity: 1 }]), { v: 1, name: "P", cards: [{ name: "A", section: "main", quantity: 1 }] });
});

test("mixed-section packages round trip without conflating the same card", () => {
  const pkg: SharedPackage = { v: 1, name: "Mixed", cards: [
    { name: "A", section: "main", quantity: 3 },
    { name: "A", section: "sideboard", quantity: 1 },
    { name: "B", section: "material", quantity: 1 },
  ] };
  assert.deepEqual(decodePackage(encodePackage(pkg)), pkg);
  const wire = btoa(JSON.stringify({ v: 1, n: "Invalid", k: ["A"], l: [[0, 3, 1]] })).replace(/=+$/, "");
  assert.equal(decodePackage(wire), null);
});
