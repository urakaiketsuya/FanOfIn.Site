import assert from "node:assert/strict";
import test from "node:test";
import { COLLECTION_CHANGED_EVENT, COLLECTION_CHANGED_KEY, publishCollectionChange, subscribeCollectionChanges } from "../src/lib/collectionEvents";

test("inventory notifications refresh local and peer consumers without persisting inventory", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const stored: [string, string][] = [];
  const host = Object.assign(new EventTarget(), { localStorage: { setItem(key: string, value: string) { stored.push([key, value]); } } });
  Object.defineProperty(globalThis, "window", { value: host, configurable: true });
  try {
    let updates = 0;
    const unsubscribe = subscribeCollectionChanges(() => updates++);
    publishCollectionChange();
    assert.equal(updates, 1);
    assert.equal(stored[0][0], COLLECTION_CHANGED_KEY);
    assert.match(stored[0][1], /^[0-9a-f-]{36}$/);
    host.dispatchEvent(Object.assign(new Event("storage"), { key: "unrelated-preference" }));
    assert.equal(updates, 1);
    host.dispatchEvent(Object.assign(new Event("storage"), { key: COLLECTION_CHANGED_KEY }));
    host.dispatchEvent(new Event("focus"));
    assert.equal(updates, 3);
    host.localStorage.setItem = () => { throw new Error("Storage disabled"); };
    assert.doesNotThrow(publishCollectionChange);
    assert.equal(updates, 4);
    unsubscribe();
    host.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT));
    host.dispatchEvent(new Event("focus"));
    assert.equal(updates, 4);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
