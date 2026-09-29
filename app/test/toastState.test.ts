import { test } from "node:test";
import assert from "node:assert/strict";
import { enqueueToast, makeToast, type Toast } from "../src/components/ui/toast/toastState.ts";
test("rapid repeated feedback replaces the same operation without duplicating it", () => {
  const first = makeToast({ message: "Copied", key: "copy" }, "1", "editor");
  const next = makeToast({ message: "Copy failed", tone: "error", key: "copy" }, "2", "editor");
  assert.deepEqual(enqueueToast([first], next), [next]);
  assert.equal(enqueueToast([first], { ...next, owner: "other" }).length, 2);
});
test("a burst stays bounded and keeps the currently visible notification", () => {
  let queue: Toast[] = [];
  for (let i = 0; i < 12; i++) queue = enqueueToast(queue, makeToast({ message: `Action ${i}` }, `${i}`, "editor"));
  assert.equal(queue.length, 5);
  assert.equal(queue[0].id, "0");
  assert.equal(queue.at(-1)?.id, "11");
});
test("errors and actions persist; ordinary confirmations have a readable timeout", () => {
  assert.equal(makeToast({ message: "Saved" }, "1", "editor").duration, 6000);
  assert.equal(makeToast({ message: "Failed", tone: "error", duration: 1 }, "1", "editor").duration, null);
  assert.equal(makeToast({ message: "Removed", action: { label: "Undo", onClick: () => {} } }, "1", "editor").duration, null);
});
