/** Notify consumers after confirmed inventory writes; never persist inventory or account data. */
export const COLLECTION_CHANGED_EVENT = "fanofin:collection-updated";
export const COLLECTION_CHANGED_KEY = "fanofin:collection-revision";

export function publishCollectionChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COLLECTION_CHANGED_EVENT));
  try { window.localStorage.setItem(COLLECTION_CHANGED_KEY, crypto.randomUUID()); } catch { /* Same-tab updates still work without storage. */ }
}

export function subscribeCollectionChanges(refresh: () => void): () => void {
  const storage = (event: StorageEvent) => { if (event.key === COLLECTION_CHANGED_KEY) refresh(); };
  window.addEventListener(COLLECTION_CHANGED_EVENT, refresh);
  window.addEventListener("focus", refresh);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(COLLECTION_CHANGED_EVENT, refresh);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("storage", storage);
  };
}
