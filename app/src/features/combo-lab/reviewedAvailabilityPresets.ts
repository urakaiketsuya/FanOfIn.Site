import type { ComboRecipeRequirement } from "../deckbuilder/HypergeometricCalculator";

export const floralPotionPreset = {
  name: "Floral Arrangement + Combustible Potion · card availability",
  requirements: ["Floral Arrangement", "Combustible Potion"].map((name): ComboRecipeRequirement => ({ kind: "cards", cards: [name], value: "", required: 1 })),
  damage: 0,
};


// Reviewed setup, not inputs to the draw-probability or affordability models.
// Evidence: data/reference/review/official-rules-review.json, Floral Potion entry.
export const floralPotionSetup = [
  { phase: "Before starting", requirements: [
    { label: "Cards in hand", detail: "One Floral Arrangement and one Combustible Potion. Drawing the pieces does not check whether they remain in hand." },
    { label: "Element access", detail: "Fire must be available to play Combustible Potion." },
    { label: "Reserve payment", detail: "Three reserve for Floral Arrangement before modifiers, separate from the two combo pieces." },
  ] },
  { phase: "After Floral Arrangement resolves", requirements: [
    { label: "Herbs on your field", detail: "Keep both summoned Herbs—Silvershine and Fraysia—available to sacrifice for Brew. They are created during this sequence, not additional cards to draw." },
    { label: "Alternative payment", detail: "Sacrifice both Herbs to Brew the Potion instead of paying its printed four reserve. The same Herbs cannot also pay for their own sacrifice abilities." },
  ] },
  { phase: "For the damage effect", requirements: [
    { label: "Potion and target", detail: "Sacrifice Combustible Potion from your field with a legal unit target for its 2-damage effect. Opponents can respond; successful damage is not guaranteed." },
  ] },
];
