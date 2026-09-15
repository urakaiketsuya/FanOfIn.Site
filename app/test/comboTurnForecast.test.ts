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
