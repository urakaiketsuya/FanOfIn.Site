import assert from "node:assert/strict";
import test from "node:test";
import type { Card } from "@gatcg/shared";
import { forecastComboByTurn } from "../src/lib/comboTurnForecast";

const card = (name: string, overrides: Partial<Card> = {}): Card => ({ name, types: ["ACTION"], subtypes: [], effect: null, cost_reserve: 1, ...overrides } as Card);

test("combo turn forecasts automatically include Fragmented Spirit selection", () => {
  const cards = new Map<string, Card>([
    ["A", card("A")], ["B", card("B")],
    ["Fragmented", card("Fragmented", { types: ["CHAMPION"], level: 0, effect: "On Enter: Glimpse 6. Draw six cards." })],
  ]);
  const recipe = [{ kind: "cards" as const, cards: ["A"], value: "", required: 1 }, { kind: "cards" as const, cards: ["B"], value: "", required: 1 }];
  const normal = forecastComboByTurn([{ name: "A", quantity: 4 }, { name: "B", quantity: 4 }], [], cards, recipe, "first", 2);
  const fragmented = forecastComboByTurn([{ name: "A", quantity: 4 }, { name: "B", quantity: 4 }], [{ name: "Fragmented", quantity: 1 }], cards, recipe, "first", 2);
  assert.ok((fragmented[1].probability ?? 0) > (normal[1].probability ?? 0));
  assert.equal(fragmented[1].cardsSeen, normal[1].cardsSeen + 5);
});

test("a per-requirement turn deadline cannot be rescued by later natural draws", () => {
  const cards = new Map<string, Card>([["A", card("A")], ["B", card("B")]]);
  const main = [{ name: "A", quantity: 4 }, { name: "B", quantity: 4 }];
  const untimed = forecastComboByTurn(main, [], cards, [{ kind: "cards", cards: ["A"], value: "", required: 1 }, { kind: "cards", cards: ["B"], value: "", required: 1 }], "first", 4);
  const timed = forecastComboByTurn(main, [], cards, [{ kind: "cards", cards: ["A"], value: "", required: 1, byTurn: 1 }, { kind: "cards", cards: ["B"], value: "", required: 1 }], "first", 4);
  assert.ok((timed[3].probability ?? 0) < (untimed[3].probability ?? 0));
});

test("turn forecasts evaluate an avoid condition in the same timed block", () => {
  const cards = new Map<string, Card>([["A", card("A")], ["B", card("B")], ["C", card("C")]]);
  const main = [{ name: "A", quantity: 4 }, { name: "B", quantity: 4 }, { name: "C", quantity: 4 }];
  const ordinary = forecastComboByTurn(main, [], cards, [{ kind: "cards", cards: ["A"], value: "", required: 1 }, { kind: "cards", cards: ["B"], value: "", required: 1 }], "first", 3);
  const restricted = forecastComboByTurn(main, [], cards, [{ kind: "cards", cards: ["A"], value: "", required: 1, avoid: { kind: "cards", cards: ["C"], value: "", maximum: 0 } }, { kind: "cards", cards: ["B"], value: "", required: 1 }], "first", 3);
  assert.ok((restricted[2].probability ?? 0) < (ordinary[2].probability ?? 0));
});
