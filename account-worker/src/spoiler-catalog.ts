import { previewCardId } from "@gatcg/shared";
import type { Env } from "./auth";
import { assetJson } from "./assets";

/** Only editorially published spoilers are valid card targets; they have no printings. */
export async function publishedSpoilerTargets(env: Env) {
  const catalog = await assetJson<{ cards: { name: string }[] }>(env, "/data/reference/card-spoilers-2026-11-01.json");
  return catalog.cards.map(card => ({ uuid: previewCardId(card.name), editions: [] as { uuid: string }[] }));
}
