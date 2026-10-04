import type { DeckPrintings } from "@gatcg/shared";
import { assetJson } from "./assets";
import type { Env } from "./auth";
import { badRequest } from "./errors";
import { printingCardKey } from "@gatcg/shared";

export type PrintingCatalog = Record<string, [cardUuid: string, cardName: string, setPrefix: string, collectorNumber: string]>;
export async function validateDeckPrintings(env: Env, printings: DeckPrintings): Promise<void> {
  const entries = Object.values(printings).flatMap(section => Object.entries(section ?? {}));
  if (!entries.length) return;
  const catalog = await assetJson<PrintingCatalog>(env, "/data/card-printings.json");
  for (const [name, allocations] of entries) for (const allocation of allocations) {
    const edition = catalog[allocation.editionUuid];
    if (!edition || printingCardKey(edition[1]) !== name) throw badRequest("A selected printing does not belong to this card. Review its printings.");
  }
}
