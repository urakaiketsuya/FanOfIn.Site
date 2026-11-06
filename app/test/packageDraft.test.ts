import assert from "node:assert/strict";
import test from "node:test";
import { mergePackageIntoDraft } from "../src/features/account/packageDraft";
import { parseDecklist } from "../src/features/compare/parseDecklist";

const lines = [{ name: "Mend Flesh", section: "main" as const, quantity: 4 }, { name: "Berserker Plate", section: "material" as const, quantity: 1 }];
test("a package starts a standard draft with its main and material cards", () => {
  const draft = mergePackageIntoDraft(null, lines, "Jin package", "source");
  assert.equal(draft.title, "Jin package"); assert.equal(draft.format, "STANDARD"); assert.equal(draft.sourceId, "source");
  const list = parseDecklist(draft.deckText).decklist;
  assert.deepEqual(list.main, [{ card: "Mend Flesh", quantity: 4 }]); assert.deepEqual(list.material, [{ card: "Berserker Plate", quantity: 1 }]);
});
test("adding onto a draft keeps its identity and never stacks copies", () => {
  const first = mergePackageIntoDraft(null, [{ name: "Mend Flesh", section: "main", quantity: 2 }, { name: "Other", section: "main", quantity: 3 }], "Mine", "source");
  const merged = mergePackageIntoDraft({ ...first, maybeboardText: "1 Maybe" }, lines, "Ignored", "new-source");
  assert.equal(merged.title, "Mine"); assert.equal(merged.sourceId, "source"); assert.equal(merged.maybeboardText, "1 Maybe");
  const list = parseDecklist(merged.deckText).decklist;
  assert.equal(list.main.find(l => l.card === "Mend Flesh")!.quantity, 4); assert.equal(list.main.find(l => l.card === "Other")!.quantity, 3);
  assert.deepEqual(parseDecklist(mergePackageIntoDraft(merged, lines, "x", "y").deckText).decklist, list);
});
