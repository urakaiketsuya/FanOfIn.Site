import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import type { DeckWorkspace } from "./deckWorkspace";

type WorkspaceSource = Extract<DeckWorkspace["source"], "analysis" | "review">;

export function decklistToWorkspace(
  decklist: OmnidexDecklist,
  catalogByName: Map<string, Card>,
  source: WorkspaceSource,
  format: DeckFormat = "STANDARD",
  suppliedChampionName: string | null = null,
): Omit<DeckWorkspace, "version" | "updatedAt"> {
  let championName = suppliedChampionName;
  let spiritName: string | null = null;
  for (const line of decklist.material) {
    const card = catalogByName.get(line.card);
    if (!card?.types.includes("CHAMPION")) continue;
    if (card.subtypes.includes("SPIRIT")) spiritName = line.card;
    else if (!championName) championName = card.name.split(",")[0].trim();
  }
  const lines = (section: keyof OmnidexDecklist) => decklist[section].map(({ card: name, quantity }) => ({ name, quantity }));
  return {
    source,
    format: format === "PANTHEON" ? "PANTHEON" : "STANDARD",
    championName,
    spiritName,
    main: lines("main"),
    material: lines("material"),
    sideboard: lines("sideboard"),
    maybeboard: [],
  };
}
