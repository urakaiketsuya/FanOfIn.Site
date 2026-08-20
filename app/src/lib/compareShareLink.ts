import type { OmnidexDecklist } from "@gatcg/shared";

export interface CustomDeckShare {
  label: string;
  decklist: OmnidexDecklist;
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
  return decks.map((d) => `${encodeURIComponent(d.label)}|${encodeDecklistLines(d.decklist)}`).join("~");
}

export function decodeCustomDecks(encoded: string): CustomDeckShare[] {
  const result: CustomDeckShare[] = [];
  for (const entry of encoded.split("~")) {
    if (!entry) continue;
    const sep = entry.indexOf("|");
    if (sep === -1) continue;
    const label = decodeURIComponent(entry.slice(0, sep));
    const decklist = decodeDecklistLines(entry.slice(sep + 1));
    if (decklist.main.length + decklist.material.length + decklist.sideboard.length === 0) continue;
    result.push({ label, decklist });
  }
  return result;
}
