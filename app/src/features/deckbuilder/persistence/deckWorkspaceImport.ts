import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import type { DeckWorkspace } from "./deckWorkspace";

type WorkspaceSource = Extract<DeckWorkspace["source"], "analysis" | "review" | "combo">;

export function decklistToWorkspace(
  decklist: OmnidexDecklist,
  catalogByName: Map<string, Card>,
  source: WorkspaceSource,
  format: DeckFormat = "STANDARD",
  suppliedChampionName: string | null = null,
  title: string | null = null,
  sourceLabel: string | null = null,
  deckIdentity: string | null = null,
): Omit<DeckWorkspace, "version" | "updatedAt"> {
  // Archive imports can outlive small capitalization or whitespace corrections in the catalog.
  // Canonicalize their labels here because all downstream tools deliberately use exact names.
  const canonicalByLooseName = new Map(
    [...catalogByName.values()].map((card) => [looseCardName(card.name), card.name]),
  );
  const canonicalName = (name: string) => catalogByName.has(name)
    ? name
    : canonicalByLooseName.get(looseCardName(name)) ?? name.trim().replace(/\s+/g, " ");
  let championName = suppliedChampionName;
  let spiritName: string | null = null;
  let highestLevelChampion: Card | null = null;
  for (const line of decklist.material) {
    const card = catalogByName.get(canonicalName(line.card));
    if (!card?.types.includes("CHAMPION")) continue;
    if (card.subtypes.includes("SPIRIT")) spiritName = card.name;
    else if (!highestLevelChampion || (card.level ?? 0) > (highestLevelChampion.level ?? 0)) highestLevelChampion = card;
  }
  if (!championName && highestLevelChampion) championName = highestLevelChampion.name.split(",")[0].trim();
  const lines = (section: keyof OmnidexDecklist) => decklist[section].map(({ card, quantity }) => ({ name: canonicalName(card), quantity }));
  return {
    source,
    title,
    sourceLabel,
    deckIdentity,
    format: format === "PANTHEON" ? "PANTHEON" : "STANDARD",
    championName,
    spiritName,
    main: lines("main"),
    material: lines("material"),
    sideboard: lines("sideboard"),
    maybeboard: [],
  };
}

function looseCardName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
