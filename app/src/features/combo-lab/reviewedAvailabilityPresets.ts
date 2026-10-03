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


export const reviewedAvailabilityExamples = [
  {
    id: "floral-potion",
    label: "Floral Arrangement + Combustible Potion",
    title: "brew a Combustible Potion",
    preset: floralPotionPreset,
    setup: floralPotionSetup,
    slugs: ["floral-arrangement", "combustible-potion"],
    sequence: [
      "Resolve Floral Arrangement to summon Silvershine and Fraysia.",
      "Sacrifice both Herbs to Brew Combustible Potion instead of paying its printed four reserve.",
      "Resolve its brewed draw-two, discard-one trigger; sacrifice the Potion for a 2-damage effect on a legal unit.",
    ],
    note: "The three reserve resources are separate from the two pieces. Brewing does not also activate the Herbs’ sacrifice abilities. Opponents can respond; damage is not guaranteed.",
    ruleLabel: "Brew rules",
    ruleUrl: "https://rules.gatcg.com/glossary/keywords-and-abilities#brew",
  },
  {
    id: "invective-second-wind",
    label: "Invective Instruction + Second Wind",
    title: "attack again with a buffed ally",
    preset: {
      name: "Invective Instruction + Second Wind · card availability",
      requirements: ["Invective Instruction", "Second Wind"].map((name): ComboRecipeRequirement => ({ kind: "cards", cards: [name], value: "", required: 1 })),
      damage: 0,
    },
    // Evidence: official-rules-review.json, fractal-wakeup-combo-combo-2.
    setup: [
      { phase: "Before starting", requirements: [
        { label: "Cards in hand", detail: "One Invective Instruction and one Second Wind. The odds cover these two action cards only; drawing them does not confirm they remain in hand." },
        { label: "Ally on your field", detail: "Choose an awake ally able to attack with a legal attack target. This ally is additional setup, outside the pictured card pair and its draw odds." },
        { label: "Element access and payment", detail: "Norm and Wind access, plus five reserve before modifiers: two for Invective Instruction and three for Second Wind, separate from the two pieces." },
      ] },
      { phase: "Between attacks", requirements: [
        { label: "Surviving ally", detail: "Finish the first combat with the same ally surviving. Second Wind targets an ally, not your champion; another legal attack must still be possible." },
      ] },
      { phase: "Optional class bonuses", requirements: [
        { label: "Separate conditions", detail: "Invective Instruction’s memory draw needs its Tamer class bonus and a non-Human ally you control. Second Wind’s extra +1 power needs its Warrior class bonus. Neither bonus is assumed." },
      ] },
    ],
    slugs: ["invective-instruction", "second-wind"],
    sequence: [
      "Resolve Invective Instruction on the ally for +3 power until end of turn.",
      "Attack with that ally and finish combat with it surviving.",
      "Resolve Second Wind on the same ally to wake it, then make another legal attack. The turn-long +3 power remains.",
    ],
    note: "Power is not guaranteed champion damage. Opponents can respond, block, or remove the ally. This guide does not choose or validate your ally and board state.",
    ruleLabel: "Combat rules",
    ruleUrl: "https://rules.gatcg.com/game-mechanics/game-mechanics-turn-order/turn-order-combat-phase/combat-phase-attacking-and-the-combat-phase",
  },
];

export type ReviewedAvailabilityRecipe = typeof floralPotionPreset;
