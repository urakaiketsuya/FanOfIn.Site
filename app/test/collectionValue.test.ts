import assert from "node:assert/strict";
import { test } from "node:test";
import { computeCollectionValue, type CollectionEntry, type CardPriceEntry, type Card } from "@gatcg/shared";
const entry = (ownedQuantity: number, extra = {}) => ({ cardUuid: "a", cardName: "A", ownedQuantity, proxyQuantity: 5, updatedAt: "", ...extra }) as CollectionEntry;
const price = (normal: number | null, foil: number | null = null, cardName = "A") => ({ cardName, normal: { market: normal }, foil: { market: foil } }) as CardPriceEntry;
const prices = new Map([["SET-1", price(1.25)], ["RARE-1", price(null, 10)]]);
test("counts physical copies once across canonical and exact pools, ignoring proxies", () => {
  const entries = [entry(4), entry(2, { editionUuid: "rare", setPrefix: "RARE", collectorNumber: "1" })];
  assert.deepEqual(computeCollectionValue(entries, [], prices), { total: 25, ownedCopies: 6, pricedCopies: 6, missingCopies: 0, unspecifiedCopies: 4 });
});
test("unpriced exact editions are excluded rather than substituted; unknown is not zero", () => {
  const unknown = entry(2, { editionUuid: "unknown" });
  assert.equal(computeCollectionValue([unknown], [], prices).total, null);
  assert.equal(computeCollectionValue([unknown, entry(1)], [], prices).missingCopies, 2);
  assert.equal(computeCollectionValue([unknown, entry(1)], [], prices).total, 1.25);
  assert.equal(computeCollectionValue([], [], prices).total, 0);
  assert.equal(computeCollectionValue([entry(0)], [], prices).total, 0);
});
test("resolves catalog edition keys, validates prices, supports zero and rounds cents", () => {
  const cards = [{ uuid: "a", name: "A", editions: [{ uuid: "rare", set: { prefix: "RARE" }, collector_number: "1" }] }] as Card[];
  assert.equal(computeCollectionValue([entry(2, { editionUuid: "rare" })], cards, prices).total, 20);
  assert.equal(computeCollectionValue([entry(3)], [], new Map([["x", price(0.1)]] )).total, 0.3);
  assert.equal(computeCollectionValue([entry(3)], [], new Map([["x", price(0)]] )).total, 0);
  assert.equal(computeCollectionValue([entry(3)], [], new Map([["x", price(NaN, -1)]] )).total, null);
});

test("catalog joins recognize marketplace names with printing suffixes", () => {
  const cards = [{ uuid: "a", name: "A", editions: [{ uuid: "x", set: { prefix: "SET" }, collector_number: "1" }] }] as Card[];
  assert.equal(computeCollectionValue([entry(4)], cards, new Map([["SET-1", price(2, null, "A (001B)")]])).total, 8);
});
