import test from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@gatcg/shared";
import { promoteMaybeboardCard, removeLockedCard } from "../src/features/deckbuilder/controller/builderCardMutations";

function card(name: string, types: string[], level: number | null = null, subtypes: string[] = []): Card {
  return { name, types, level, subtypes } as Card;
}

test("removing an earlier Champion level also removes later locked levels", () => {
  const catalog = new Map<string, Card>([
    ["Arisanna, Level 1", card("Arisanna, Level 1", ["CHAMPION"], 1)],
    ["Arisanna, Level 2", card("Arisanna, Level 2", ["CHAMPION"], 2)],
    ["Arisanna, Level 3", card("Arisanna, Level 3", ["CHAMPION"], 3)],
    ["Other card", card("Other card", ["ACTION"])],
  ]);
  const cards = new Map([["Arisanna, Level 1", 1], ["Arisanna, Level 2", 1], ["Arisanna, Level 3", 1], ["Other card", 4]]);
  const sections = new Map([...cards.keys()].map((name) => [name, name === "Other card" ? "main" as const : "material" as const]));

  const next = removeLockedCard(cards, sections, "Arisanna, Level 2", catalog);

  assert.deepEqual([...next.cards.keys()], ["Arisanna, Level 1", "Other card"]);
  assert.deepEqual([...next.sections.keys()], ["Arisanna, Level 1", "Other card"]);
});

test("promoting maybeboard cards assigns Material-only cards to Material", () => {
  const catalog = new Map<string, Card>([["Test Regalia", card("Test Regalia", ["REGALIA"])]]);
  const next = promoteMaybeboardCard(new Map(), new Map(), new Map([["Test Regalia", 1]]), "Test Regalia", catalog);

  assert.equal(next?.cards.get("Test Regalia"), 1);
  assert.equal(next?.sections.get("Test Regalia"), "material");
  assert.equal(next?.maybeboard.has("Test Regalia"), false);
});
