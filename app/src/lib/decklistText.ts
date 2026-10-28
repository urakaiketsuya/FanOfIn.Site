import { printingCardLine, type OmnidexDecklist, type OmnidexDecklistCardLine } from "@gatcg/shared";

/** Plain-text export with "# Section" headers and "4 Card Name" lines – round-trips with the Compare tool's paste parser. */
export function buildDecklistText(decklist: OmnidexDecklist, extraSections: { title: string; lines: OmnidexDecklistCardLine[] }[] = [], includePrintings = false): string {
  const sections: [string, OmnidexDecklistCardLine[]][] = [
    ...extraSections.map((section) => [section.title, section.lines] as [string, OmnidexDecklistCardLine[]]),
    ["Main", decklist.main],
    ["Material", decklist.material],
    ["Sideboard", decklist.sideboard],
  ];
  return sections
    .filter(([, lines]) => lines.length > 0)
    .map(([title, lines]) => `# ${title}\n${lines.map((l) => includePrintings ? printingCardLine(l) : `${l.quantity} ${l.card}`).join("\n")}`)
    .join("\n\n");
}

export const buildEditableDeckText = (deck: OmnidexDecklist) => buildDecklistText(deck, [], true);

