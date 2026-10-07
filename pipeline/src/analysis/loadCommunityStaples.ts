import { readFile, readdir } from "node:fs/promises";
import type { ShoutAtYourDecksDeck, SleevedDeck, TcgArchitectDeck } from "@gatcg/shared";
import { shouldKeepDeck } from "../shoutatyourdecks/filter.js";
import { shouldKeepSleevedDeck } from "../sleeved/filter.js";
import { shouldKeepTcgArchitectDeck } from "../tcgarchitect/filter.js";
import type { CommunityStapleInput } from "./communityCardStaples.js";

/** Read full published lists, not the compact search index which omits quantities/sideboards. */
export async function loadCommunityStaples(root = new URL("../../../data/", import.meta.url)): Promise<CommunityStapleInput[]> {
  const groups = await Promise.all((["shoutatyourdecks", "sleeved", "tcgarchitect"] as const).map(async source => {
    const directory = new URL(`${source}/decks/`, root);
    let files: string[];
    try { files = await readdir(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    const inputs: CommunityStapleInput[] = [];
    for (const file of files.filter(file => file.endsWith(".json")).sort()) {
      const deck = JSON.parse(await readFile(new URL(file, directory), "utf8")) as ShoutAtYourDecksDeck;
      const keep = source === "shoutatyourdecks" ? shouldKeepDeck(deck) : source === "sleeved" ? shouldKeepSleevedDeck(deck as SleevedDeck) : shouldKeepTcgArchitectDeck(deck as TcgArchitectDeck);
      if (keep) inputs.push({ source, deck });
    }
    return inputs;
  }));
  return groups.flat();
}
