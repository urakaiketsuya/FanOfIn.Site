import assert from "node:assert/strict";
import test from "node:test";
import { probabilityOfRecipe, probabilityOfTimedRecipe } from "../src/lib/comboOdds";

test("timed recipe matches the ordinary recipe when all deadlines match", () => {
  const groups = [{ copies: 4, required: 1 }, { copies: 8, required: 2 }];
  assert.ok(Math.abs(probabilityOfTimedRecipe(60, groups.map((group) => ({ ...group, seen: 10 }))) - probabilityOfRecipe(60, groups, 10)) < 1e-12);
});

test("an earlier requirement deadline lowers joint access odds", () => {
  const untimed = probabilityOfTimedRecipe(60, [{ copies: 4, required: 1, seen: 10 }, { copies: 4, required: 1, seen: 10 }]);
  const timed = probabilityOfTimedRecipe(60, [{ copies: 4, required: 1, seen: 7 }, { copies: 4, required: 1, seen: 10 }]);
  assert.ok(timed < untimed);
});

test("a requirement cannot be met before enough cards are seen", () => {
  assert.equal(probabilityOfTimedRecipe(60, [{ copies: 4, required: 2, seen: 1 }]), 0);
});

test("an avoid condition is evaluated jointly with wanted cards", () => {
  const wantedOnly = probabilityOfTimedRecipe(60, [{ copies: 4, required: 1, seen: 10 }]);
  const wantedWithoutAvoided = probabilityOfTimedRecipe(60, [
    { copies: 4, required: 1, seen: 10 },
    { copies: 4, required: 0, maximum: 0, seen: 10 },
  ]);
  assert.ok(wantedWithoutAvoided > 0);
  assert.ok(wantedWithoutAvoided < wantedOnly);
});

test("avoid conditions allow a configurable maximum", () => {
  const noneAllowed = probabilityOfTimedRecipe(60, [{ copies: 4, required: 0, maximum: 0, seen: 10 }]);
  const oneAllowed = probabilityOfTimedRecipe(60, [{ copies: 4, required: 0, maximum: 1, seen: 10 }]);
  assert.ok(oneAllowed > noneAllowed);
});
