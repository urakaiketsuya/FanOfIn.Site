export interface LookingForEntry {
  name: string;
  quantity: number;
  /** A missing UUID means any printing is acceptable. */
  editionUuid?: string;
}
export interface LookingForShare {
  title?: string;
  entries: LookingForEntry[];
}

const MAX_QUANTITY = 999;

function safelyDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Compact, version-independent payload used inside `/looking-for?v=1&list=...`.
 * URLSearchParams escapes the payload as a whole; dynamic strings are escaped here as well so
 * punctuation in card names can never be confused with the entry delimiters.
 */
export function encodeLookingForShare(share: LookingForShare): string {
  const title = encodeURIComponent(share.title?.trim() ?? "");
  const entries = share.entries
    .filter((entry) => Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= MAX_QUANTITY)
    .map((entry) => `${entry.quantity}:${encodeURIComponent(entry.name)}:${encodeURIComponent(entry.editionUuid ?? "")}`)
    .join(";");
  return `${title}|${entries}`;
}

export function decodeLookingForShare(encoded: string): LookingForShare | null {
  const separator = encoded.indexOf("|");
  if (separator < 0) return null;

  const decodedTitle = safelyDecode(encoded.slice(0, separator));
  if (decodedTitle === null) return null;

  const entries: LookingForEntry[] = [];
  for (const value of encoded.slice(separator + 1).split(";")) {
    if (!value) continue;
    const [quantityText, encodedName, encodedEdition = ""] = value.split(":");
    const quantity = Number(quantityText);
    const name = encodedName ? safelyDecode(encodedName) : null;
    const editionUuid = safelyDecode(encodedEdition);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY || !name?.trim() || editionUuid === null) continue;
    entries.push({ name: name.trim(), quantity, ...(editionUuid ? { editionUuid } : {}) });
  }

  if (entries.length === 0) return null;
  return { ...(decodedTitle.trim() ? { title: decodedTitle.trim() } : {}), entries };
}
