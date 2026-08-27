import type { DeckFormat, OmnidexDecklist } from "@gatcg/shared";

export interface CustomDeckShare {
  label: string;
  decklist: OmnidexDecklist;
  format?: DeckFormat;
}

type Section = "main" | "material" | "sideboard";

/** `encodeURIComponent` on every dynamic segment (label, card name) — unlike the Deck Builder's
 * locked-cards encoding, a pasted deck's label is free-text the user typed, not a card name, so it
 * can't lean on "real names never contain this delimiter." Escaping guarantees `|`/`~`/`:`/`;`
 * inside a label or name never gets misread as a delimiter. */
function encodeDecklistLines(decklist: OmnidexDecklist): string {
  const parts: string[] = [];
  for (const section of ["main", "material", "sideboard"] as const) {
    for (const line of decklist[section]) {
      parts.push(`${section}:${line.quantity}:${encodeURIComponent(line.card)}`);
    }
  }
  return parts.join(";");
}

function decodeDecklistLines(encoded: string): OmnidexDecklist {
  const decklist: OmnidexDecklist = { main: [], material: [], sideboard: [] };
  for (const entry of encoded.split(";")) {
    if (!entry) continue;
    const [section, qtyStr, encodedName] = entry.split(":");
    const qty = Number(qtyStr);
    if (!encodedName || !Number.isFinite(qty) || qty < 1) continue;
    if (section !== "main" && section !== "material" && section !== "sideboard") continue;
    (decklist[section as Section] as { card: string; quantity: number }[]).push({ card: decodeURIComponent(encodedName), quantity: qty });
  }
  return decklist;
}

/** Packs one or more pasted ("custom") decks into a single `?custom=` param — decks joined by `~`,
 * each as `encodedLabel|encodedLines`. Combine with `?add=` (sighting decks) in the same share link
 * to cover a compare set that mixes both sources. */
export function encodeCustomDecks(decks: CustomDeckShare[]): string {
  return decks.map((d) => `${encodeURIComponent(d.label)}|${d.format ?? "UNKNOWN"}|${encodeDecklistLines(d.decklist)}`).join("~");
}

export function decodeCustomDecks(encoded: string): CustomDeckShare[] {
  const result: CustomDeckShare[] = [];
  for (const entry of encoded.split("~")) {
    if (!entry) continue;
    const parts = entry.split("|");
    if (parts.length < 2) continue;
    const label = decodeURIComponent(parts[0]);
    const hasFormat = parts.length >= 3 && ["STANDARD", "PANTHEON", "UNKNOWN"].includes(parts[1]);
    const format = hasFormat && parts[1] !== "UNKNOWN" ? parts[1] as DeckFormat : undefined;
    const decklist = decodeDecklistLines(parts.slice(hasFormat ? 2 : 1).join("|"));
    if (decklist.main.length + decklist.material.length + decklist.sideboard.length === 0) continue;
    result.push({ label, decklist, format });
  }
  return result;
}
