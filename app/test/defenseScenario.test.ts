import assert from "node:assert/strict";
import test from "node:test";
import { calculateDefenseScenario } from "@gatcg/shared";

test("Breeze prevents each event while Destiny prevents only the next", () => {
  const result = calculateDefenseScenario(2, 3, 3, 0, 0);
  assert.equal(result.breezeTotal, 6);
  assert.equal(result.destinyPrevented, 3);
  assert.equal(result.destinyTax, 0);
  assert.equal(calculateDefenseScenario(9, 3, 3, 0, 0).breezeTotal, 9);
});
test("Destiny threshold and absent incoming damage", () => {
  assert.equal(calculateDefenseScenario(0, 6, 2, 0, 0).destinyTax, 0);
  assert.equal(calculateDefenseScenario(0, 7, 2, 0, 0).destinyTax, 2);
  assert.equal(calculateDefenseScenario(2, 7, 0, 0, 0).destinyTax, 0);
});
test("Restoration scales to two allies and cannot recover beyond existing damage", () => {
  assert.deepEqual([0, 1, 2, 3].map(n => calculateDefenseScenario(0, 0, 0, n, 12).recovered), [3, 6, 9, 9]);
  assert.equal(calculateDefenseScenario(0, 0, 0, 2, 4).recovered, 4);
  assert.equal(calculateDefenseScenario(0, 0, 0, 2, 0).recovered, 0);
});
test("invalid and negative scenario values normalize to zero", () => {
  assert.equal(calculateDefenseScenario(NaN, -3, Infinity, -1, -4).breezeTotal, 0);
  assert.equal(calculateDefenseScenario(0, 0, 0, 2, -4).recovered, 0);
});

test("panel is absent without supported cards and keeps names when catalog is missing", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { MemoryRouter } = await import("react-router-dom");
  const { default: DefenseRecovery } = await import("../src/features/account/DefenseRecovery");
  const render = (mainLines: { name: string; quantity: number }[]) => renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(DefenseRecovery, { mainLines, cardsByName: new Map() })));
  assert.equal(render([]), "");
  const html = render([{ name: "Veiling Breeze", quantity: 2 }, { name: "Veiling Breeze", quantity: 2 }]);
  assert.match(html, /4 copies/);
  assert.match(html, /Veiling Breeze/);
  assert.match(html, /Wind cards revealed from memory/);
});
