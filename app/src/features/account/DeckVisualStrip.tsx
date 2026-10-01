import { findDeckChampionName } from "../../lib/ttsExport";
import { useMemo } from "react";
import type { OmnidexDecklist } from "@gatcg/shared";
import DeckCardPreview from "../../components/DeckCardPreview";
import { useChampionCardImages } from "../players/useChampionCardImages";
import { useCardsByNames } from "../events/useCardsByNames";

export default function DeckVisualStrip({ decklist, championName, newTab = false }: { newTab?: boolean; decklist?: OmnidexDecklist; championName: string | null }) {
  const lines = useMemo(() => [...(decklist?.material ?? []), ...(decklist?.main.slice(0, 2) ?? [])]
    .filter((line, index, all) => all.findIndex((other) => other.card === line.card) === index)
    .map((line) => ({ name: line.card, quantity: line.quantity })), [decklist]);
  const cardsByName = useCardsByNames(useMemo(() => lines.map((line) => line.name), [lines]));
  const championImages = useChampionCardImages(useMemo(() => championName ? [championName] : [], [championName]));
  const championCard = championName ? championImages.get(championName) : undefined;
  const previewCards = new Map(cardsByName);
  if (championCard) previewCards.set(championCard.name, championCard);
  const leadName = decklist ? findDeckChampionName(decklist.material, cardsByName) : null;
  const lead = lines.find(line => line.name === leadName || line.name === championName || line.name.startsWith(`${championName}, `));
  const previewLines = lines.length ? (lead ? [lead, ...lines.filter(line => line !== lead)] : lines).slice(0, 4) : [{ name: championCard?.name ?? championName ?? "Unknown champion" }];
  return <div data-component="DeckVisualStrip" className="mt-4" aria-label="Featured deck cards">
    <p className="mb-2 text-xs text-ctp-subtext0">{lines.length ? "Featured cards" : "Champion · open deck for the complete list"}</p>
    <DeckCardPreview newTab={newTab} lines={previewLines} cardsByName={previewCards} />
  </div>;
}
