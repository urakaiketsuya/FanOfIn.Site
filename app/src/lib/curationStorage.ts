/** Validate before touching storage; callers update React state only after this succeeds. */
export function saveCuration<T>(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, value: T, parse: (raw: string) => T, recover = false): void {
  const serialized = JSON.stringify(value);
  parse(serialized);
  if (!recover) {
    const existing = storage.getItem(key);
    if (existing !== null) parse(existing);
  }
  storage.setItem(key, serialized);
}

/** Preserve malformed backups verbatim so users can recover them outside the app. */
export function exportCuration(storage: Pick<Storage, 'getItem'>, key: string, fallback: unknown): string {
  return storage.getItem(key) ?? JSON.stringify(fallback);
}
