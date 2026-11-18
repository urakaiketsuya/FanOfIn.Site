/** Serialize browse filters, including multi-select sets, without touching account data. */
export function encodeBrowseState(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item instanceof Set ? { browseSet: [...item] } : item);
}
export function decodeBrowseState<T>(value: string): T {
  return JSON.parse(value, (_key, item) => item && typeof item === 'object' && Array.isArray(item.browseSet) ? new Set(item.browseSet) : item) as T;
}
