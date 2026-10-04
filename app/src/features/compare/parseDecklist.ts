import { validPrintingAllocations, type OmnidexDecklist } from "@gatcg/shared";

export interface ParsedDecklist {
  decklist: OmnidexDecklist;
  /** Card names that didn't match any recognized section header or quantity-prefixed line – likely a stray blank/comment line, not necessarily an error. */
  skippedLines: string[];
}

const SECTION_HEADERS: Record<string, keyof OmnidexDecklist> = {
  main: "main",
  maindeck: "main",
  material: "material",
  materials: "material",
  sideboard: "sideboard",
  side: "sideboard",
};

/** Matches "4x Card Name", "4 Card Name", or "4X Card Name". */
const LINE_PATTERN = /^(\d+)\s*x?\s+(.+)$/i;

/**
 * Parses a pasted decklist into the same `OmnidexDecklist` shape used everywhere else in the
 * app. Deliberately forgiving: unrecognized lines are skipped rather than rejecting the whole
 * paste, and card names aren't validated against the catalog here – that happens downstream
 * (unmatched names are still kept and just render without an image/link, same tolerance the
 * pipeline already has for `unmatchedCardNames`).
 */
export function parseDecklist(text: string): ParsedDecklist {
  const decklist: OmnidexDecklist = { main: [], material: [], sideboard: [] };
  const skippedLines: string[] = [];
  let section: keyof OmnidexDecklist = "main";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // Strips a trailing "Deck" too ("Material Deck", "Main Deck") – a real export format
    // (confirmed live: unrecognized headers silently left every line in the default "main"
    // section, so a pasted "# Material Deck" list showed its whole material section as main).
    const headerKey =
      SECTION_HEADERS[
        line
          .toLowerCase()
          .replace(/^#\s*/, "")
          .replace(/[:：]$/, "")
          .replace(/\s*\(\d+\)\s*$/, "")
          .replace(/\s*deck$/, "")
      ];
    if (headerKey) {
      section = headerKey;
      continue;
    }

    const match = line.match(LINE_PATTERN);
    if (!match) {
      skippedLines.push(line);
      continue;
    }

    const [, quantityStr, name] = match;
    const annotated = name.match(/^(.*?) \[printings:([^\]]+)\]$/);
    const printings = annotated?.[2].split(",").map(value => { const [editionUuid, count] = value.split("="); return { editionUuid, quantity: Number(count) }; });
    // Keep invalid annotations visible to validation; never silently discard a choice.
    if (annotated && !validPrintingAllocations(printings, Number(quantityStr))) skippedLines.push(line);
    decklist[section].push({ card: annotated ? annotated[1].trim() : name.trim(), quantity: Number(quantityStr), ...(printings ? { printings } : {}) });
  }

  return { decklist, skippedLines };
}
