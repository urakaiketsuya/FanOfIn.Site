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
  {
    id: "concoction-stamina",
    label: "Invigorating Concoction + Draught of Stamina",
    title: "attack again with a counter-buffed ally",
    preset: {
      name: "Invigorating Concoction + Draught of Stamina · card availability",
      requirements: ["Invigorating Concoction", "Draught of Stamina"].map((name): ComboRecipeRequirement => ({ kind: "cards", cards: [name], value: "", required: 1 })),
      damage: 0,
    },
    // Evidence: official-rules-review.json, fractal-wakeup-combo-combo-4.
    setup: [
      { phase: "Before starting", requirements: [
        { label: "Potions already on your field", detail: "Have an awake Invigorating Concoction and a Draught of Stamina on your field. The draw odds cover finding the two cards, not deploying them or having them ready." },
        { label: "Concoction must be awake", detail: "Hindered makes Invigorating Concoction enter rested. Prepare it on an earlier turn or use a separately verified wake effect before paying its rest cost. Draught wakes an ally, so it cannot wake the Potion." },
        { label: "Ally on your field", detail: "Choose an awake ally you control that can legally attack. This ally and its legal attack targets are additional setup outside the pictured pair and its draw odds." },
        { label: "Element access and deployment", detail: "Both Potions need Wind access. Pay their deployment separately: seven reserve for Concoction and four for Draught before modifiers, or their respective Brew costs. Concoction needs one Flower and one Herb; Draught needs one Springleaf and two Herbs. Sacrificed objects cannot pay twice." },
      ] },
      { phase: "Between attacks", requirements: [
        { label: "Surviving ally", detail: "Finish the first combat with the buffed ally surviving. Another legal attack must still be possible after Draught wakes it." },
      ] },
    ],
    slugs: ["invigorating-concoction", "draught-of-stamina"],
    sequence: [
      "Rest and sacrifice the awake Concoction, targeting your ally. Resolve its effect to put two buff counters on that ally and draw a card.",
      "Attack with the buffed ally and finish combat with it surviving.",
      "Sacrifice Draught of Stamina to wake the same ally, then make another legal attack. Its two buff counters remain.",
    ],
    note: "This needs prepared board state; it is not an immediate loop. Opponents can respond, block, or remove the ally. Counters and a second attack do not guarantee champion damage. The effect’s extra draw is not modeled by this availability preset.",
    ruleLabel: "Activated ability rules",
    ruleUrl: "https://rules.gatcg.com/game-mechanics/game-mechanics-abilities/abilities-activated-abilities",
  },
];

export type ReviewedAvailabilityRecipe = typeof floralPotionPreset;
