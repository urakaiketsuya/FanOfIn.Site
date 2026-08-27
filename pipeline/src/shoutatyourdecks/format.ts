import type { DeckFormat, DeckFormatConfidence, ShoutAtYourDecksDeck, ShoutAtYourDecksDeckSummary } from "@gatcg/shared";

export interface ClassifiedFormat {
  format: DeckFormat;
  formatConfidence: DeckFormatConfidence;
}

/** Prefer source metadata. A singleton list is a deliberately conservative legacy-cache fallback. */
export function classifyDeckFormat(summary: ShoutAtYourDecksDeckSummary, deck?: ShoutAtYourDecksDeck | null): ClassifiedFormat {
  if (summary.format && summary.format !== "UNKNOWN") {
    return { format: summary.format, formatConfidence: summary.formatConfidence ?? "declared" };
  }
  if (deck) {
    const identity = [...deck.mainDeck, ...deck.materialDeck];
    if (deck.mainCount !== null && deck.mainCount >= 60 && identity.length > 0 && identity.every((line) => line.quantity === 1)) {
      return { format: "PANTHEON", formatConfidence: "inferred" };
    }
    if (identity.some((line) => line.quantity > 1)) return { format: "STANDARD", formatConfidence: "inferred" };
  }
  return { format: "UNKNOWN", formatConfidence: "unknown" };
}

export function withClassifiedFormat<T extends ShoutAtYourDecksDeckSummary>(summary: T, deck?: ShoutAtYourDecksDeck | null): T & ClassifiedFormat {
  return { ...summary, ...classifyDeckFormat(summary, deck) };
}
