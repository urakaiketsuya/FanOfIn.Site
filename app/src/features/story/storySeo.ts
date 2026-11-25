import { arcArtwork } from "./artwork";

export const storyIntro = "Follow the Champions through the worlds of Grand Archive, with story summaries, official reading order, and cards that illustrate each arc.";

const artworkDetails: Record<string, [number, number, "jpeg" | "png", string]> = {
  homeworld: [1300, 650, "jpeg", "The Grand Archive on Homeworld"],
  cambria: [900, 550, "jpeg", "Camelot in Cambria"],
  azoth: [1000, 500, "jpeg", "The Dorumegian throne in Azoth"],
  sanguo: [1200, 620, "jpeg", "A keep in Sanguo"],
  underland: [1000, 545, "png", "The Looking Glass in Underland"],
  "radiant-origins": [1200, 620, "jpeg", "Radiant Origins artwork"],
  asphodel: [1000, 545, "png", "The Tower of Dis in Asphodel"],
};

export function storySocialImage(id: string) {
  const [width, height, format, alt] = artworkDetails[id];
  return { src: arcArtwork[id]!, alt, width, height, type: `image/${format}` };
}
