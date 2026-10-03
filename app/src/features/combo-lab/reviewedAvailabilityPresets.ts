import type { ComboRecipeRequirement } from "../deckbuilder/HypergeometricCalculator";

export const floralPotionPreset = {
  name: "Floral Arrangement + Combustible Potion · card availability",
  requirements: ["Floral Arrangement", "Combustible Potion"].map((name): ComboRecipeRequirement => ({ kind: "cards", cards: [name], value: "", required: 1 })),
  damage: 0,
};

