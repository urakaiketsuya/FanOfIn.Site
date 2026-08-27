import type { OmnidexDecklist } from "@gatcg/shared";

const CLARENT_MAIN_MENU_URL = "https://www.clarent.net/TCGEngine/SharedUI/MainMenu.php";

function decklistText(decklist: OmnidexDecklist): string {
  const sections = [
    ["Main", decklist.main],
    ["Material", decklist.material],
    ["Sideboard", decklist.sideboard],
  ] as const;

  return sections
    .filter(([, lines]) => lines.length > 0)
    .map(([name, lines]) => `# ${name}\n${lines.map((line) => `${line.quantity} ${line.card}`).join("\n")}`)
    .join("\n\n");
}

/** Build Clarent's backward-compatible menu-prefill URL for solo or two-deck local playtesting. */
export function buildClarentPlaytestUrl(deck1: OmnidexDecklist, deck2?: OmnidexDecklist, extraSections: { title: string; lines: OmnidexDecklist["main"] }[] = []): string {
  const url = new URL(CLARENT_MAIN_MENU_URL);
  const extraText = extraSections.filter((section) => section.lines.length > 0).map((section) => `# ${section.title}\n${section.lines.map((line) => `${line.quantity} ${line.card}`).join("\n")}`).join("\n\n");
  url.searchParams.set("deckText", [extraText, decklistText(deck1)].filter(Boolean).join("\n\n"));
  url.searchParams.set("format", deck2 ? "hotseat" : "goldfish");
  url.searchParams.set("queueType", "bo1");
  if (deck2) url.searchParams.set("deckText2", decklistText(deck2));
  return url.toString();
}
