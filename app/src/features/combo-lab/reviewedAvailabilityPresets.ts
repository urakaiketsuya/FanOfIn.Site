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


const existingAvailabilityExamples = [
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

export type ReviewedComboExample = {
  id: string;
  label: string;
  title: string;
  names: string[];
  slugs: string[];
  preset: ReviewedAvailabilityRecipe | null;
  status: string;
  setup: typeof floralPotionSetup;
  sequence: string[];
  note: string;
  ruleLabel: string;
  ruleUrl: string;
};

// Review-only entries remain visible without being offered as draw recipes.
// Source: data/reference/review/official-rules-review.json (2026-10-03).
export const reviewedAvailabilityExamples: ReviewedComboExample[] = [
  ...existingAvailabilityExamples.map((example) => ({
    ...example,
    names: example.preset.requirements.map((requirement) => requirement.cards[0]),
    status: "Conditional interaction · card availability only",
  })),

  {
    "id": "fractal-herb-burn-combo-1",
    "label": "Cinderbloom Tender + Searing Rebuke",
    "title": "Herb Burn: Cinderbloom Tender + Searing Rebuke",
    "names": [
      "Cinderbloom Tender",
      "Searing Rebuke"
    ],
    "slugs": [
      "cinderbloom-tender",
      "searing-rebuke"
    ],
    "preset": {
      "name": "Cinderbloom Tender + Searing Rebuke · card availability",
      "requirements": [
        {
          "kind": "cards",
          "cards": [
            "Cinderbloom Tender"
          ],
          "value": "",
          "required": 1
        },
        {
          "kind": "cards",
          "cards": [
            "Searing Rebuke"
          ],
          "value": "",
          "required": 1
        }
      ],
      "damage": 0
    },
    "status": "Conditional interaction · card availability only",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Cleric bonus active; Fire available; Tender on the field; an independent gather effect available; resources for Rebuke and that effect."
          },
          {
            "label": "Separate gather source",
            "detail": "Neither pictured card supplies gather. Choose and pay for an independent gather effect; its availability is outside these two-card draw odds."
          },
          {
            "label": "Deployment and payment",
            "detail": "Tender costs two reserve to deploy; Rebuke costs two reserve before modifiers. Both need Fire access. Tender must be on your field and the Cleric class bonuses must be active."
          },
          {
            "label": "Prevention must remain",
            "detail": "Resolve Rebuke before the gather-triggered damage. Its next-three-damage shield lasts this turn and may be consumed by other damage. Rebuke’s damage trigger needs damage actually prevented this way and a legal opposing champion target."
          }
        ]
      }
    ],
    "sequence": [
      "Resolve Searing Rebuke before Tender damage resolves.",
      "Gather using the separate effect.",
      "Resolve Tender and the resulting Rebuke trigger with a legal opposing champion target."
    ],
    "note": "Tender and prevention-triggered Rebuke form a conditional burn interaction. The pair supplies no gather source. This is a setup guide, not an executable simulation. Opponent interaction and successful resolution are not included in the odds.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/glossary/keywords-and-abilities.md"
  },
  {
    "id": "fractal-ravishing-mill-combo-1",
    "label": "Ravishing Finale + Nico, Whiplash Allure",
    "title": "Ravishing Mill: Ravishing Finale + Nico, Whiplash Allure",
    "names": [
      "Ravishing Finale",
      "Nico, Whiplash Allure"
    ],
    "slugs": [
      "ravishing-finale",
      "nico-whiplash-allure"
    ],
    "preset": {
      "name": "Ravishing Finale + Nico, Whiplash Allure · card availability",
      "requirements": [
        {
          "kind": "cards",
          "cards": [
            "Ravishing Finale"
          ],
          "value": "",
          "required": 1
        }
      ],
      "damage": 0
    },
    "status": "Conditional interaction · card availability only",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Awake Whiplash Allure champion; Water available; Finale in hand; two floating-memory cards in graveyard; three reserve before modifiers."
          },
          {
            "label": "Material Deck champion",
            "detail": "Nico, Whiplash Allure must already be your awake champion through a legal level-up route. Only Ravishing Finale is included in Main Deck draw odds."
          },
          {
            "label": "Separate graveyard and payment",
            "detail": "Banish two floating-memory cards from your graveyard as an additional cost; these are separate setup, not extra cards counted by this preset. Pay three reserve before modifiers with Water access."
          },
          {
            "label": "Champion hit required",
            "detail": "The banishments trigger two lash counters. Nico’s mill uses lash counters; Finale’s Nico bonus uses damage counters on the hit champion. Neither milling effect is guaranteed without a champion hit."
          }
        ]
      }
    ],
    "sequence": [
      "Activate Finale and pay its additional banishment cost.",
      "Resolve resulting lash triggers and the attack in legal stack order.",
      "If the opposing champion is hit, resolve eligible milling triggers."
    ],
    "note": "The additional cost adds two lash counters. Milling still depends on a champion hit and the relevant counter totals. This is a setup guide, not an executable simulation. Opponent interaction and successful resolution are not included in the odds.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/glossary/keywords-and-abilities.md"
  },
  {
    "id": "fractal-ravishing-mill-combo-2",
    "label": "Ravishing Finale + Nico, Rapture's Embrace",
    "title": "Ravishing Mill: Ravishing Finale + Nico, Rapture's Embrace",
    "names": [
      "Ravishing Finale",
      "Nico, Rapture's Embrace"
    ],
    "slugs": [
      "ravishing-finale",
      "nico-raptures-embrace"
    ],
    "preset": null,
    "status": "Classification or setup package · no preset",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Rapture’s Embrace is the active Nico champion; another Water card in lineage for its entry bonus."
          }
        ]
      }
    ],
    "sequence": [],
    "note": "Nico identity enables Finale, but the entry effect supplies at most one graveyard card and does not guarantee floating memory. Retain as a champion package; do not treat either Nico version as an interchangeable copy of the other engine.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/general-rules/general-rules-card-types/card-types-champion"
  },
  {
    "id": "fractal-crux-lorraine--psycho-combo-1",
    "label": "Capacitance X Psycho + Numinous Monk",
    "title": "Psycho: Capacitance X Psycho + Numinous Monk",
    "names": [
      "Capacitance X Psycho",
      "Numinous Monk"
    ],
    "slugs": [
      "capacitance-x-psycho",
      "numinous-monk"
    ],
    "preset": {
      "name": "Capacitance X Psycho + Numinous Monk · card availability",
      "requirements": [
        {
          "kind": "cards",
          "cards": [
            "Numinous Monk"
          ],
          "value": "",
          "required": 1
        }
      ],
      "damage": 0
    },
    "status": "Conditional interaction · card availability only",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Numinous Monk and awake Psycho on field; another awake regalia; legal damage target. Establish Crux/Arcane access or the explicit Psycho permission separately."
          },
          {
            "label": "Material Deck weapon",
            "detail": "Capacitance X Psycho is a Material Deck card, outside Main Deck draw odds. Only Numinous Monk is counted by this preset; it must then be deployed for three reserve with Crux access before modifiers."
          },
          {
            "label": "Psycho deployment and readiness",
            "detail": "Pay Psycho’s one-memory materialization cost with the required access, or meet its Lorraine permission with six Arcane cards in banishment. That permission makes it enter rested; prepare it before this sequence."
          },
          {
            "label": "Another awake regalia",
            "detail": "Rest a different regalia for the ability granted by Monk. Keep Psycho awake through resolution for its +1 damage replacement. Its unpreventable-damage bonus separately requires Lorraine."
          }
        ]
      }
    ],
    "sequence": [
      "Activate the granted ability on the other regalia, paying its rest cost.",
      "Keep Psycho awake through resolution.",
      "Resolve the damage effect; the Lorraine bonus additionally applies only when enabled."
    ],
    "note": "The 1-damage effect becomes 2 while Psycho’s condition holds. Resting Psycho itself turns off its boost before resolution unless another effect wakes it. This is a setup guide, not an executable simulation. Opponent interaction and successful resolution are not included in the odds.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/game-mechanics/game-mechanics-abilities/abilities-activated-abilities"
  },
  {
    "id": "fractal-crux-hybrid-combo-1",
    "label": "Lorraine, Blademaster + Merlin, Memory Thief",
    "title": "Crux Hybrid: Lorraine, Blademaster + Merlin, Memory Thief",
    "names": [
      "Lorraine, Blademaster",
      "Merlin, Memory Thief"
    ],
    "slugs": [
      "lorraine-blademaster",
      "merlin-memory-thief"
    ],
    "preset": null,
    "status": "Classification or setup package · no preset",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Both listed champions are level 2; Lorraine has a lineage restriction."
          }
        ]
      }
    ],
    "sequence": [],
    "note": "Ordinary leveling cannot go directly from either level-2 champion into the other. Material co-occurrence describes alternative routes. Keep as a hybrid classification package unless a separate legal delevel/relevel route is specified.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/general-rules/general-rules-card-types/card-types-champion"
  },
  {
    "id": "fractal-oblation-combo-1",
    "label": "Baleful Oblation + Advent of the Stormcaller",
    "title": "Oblation: Baleful Oblation + Advent of the Stormcaller",
    "names": [
      "Baleful Oblation",
      "Advent of the Stormcaller"
    ],
    "slugs": [
      "baleful-oblation",
      "advent-of-the-stormcaller"
    ],
    "preset": null,
    "status": "Historical Standard · excluded from presets",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Advent of the Stormcaller established as an omen; no lower-cost omen; Umbra available; Oblation and its activation resources."
          }
        ]
      }
    ],
    "sequence": [
      "Establish the payload in banishment with an omen counter using a separate effect.",
      "Activate and resolve Baleful Oblation in a format or historical environment that permits it."
    ],
    "note": "With a 15-cost lowest omen, the effect deals 15 to every unit except your champion, before modifiers; your allies are also affected. Baleful Oblation is seasonally banned in Standard. Preserve evidence; exclude from current Standard recipe recommendations.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/game-mechanics/game-mechanics-mastery"
  },
  {
    "id": "fractal-oblation-combo-2",
    "label": "Baleful Oblation + Golden Checkmate",
    "title": "Oblation: Baleful Oblation + Golden Checkmate",
    "names": [
      "Baleful Oblation",
      "Golden Checkmate"
    ],
    "slugs": [
      "baleful-oblation",
      "golden-checkmate"
    ],
    "preset": null,
    "status": "Historical Standard · excluded from presets",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Golden Checkmate established as an omen; no lower-cost omen; Umbra available; Oblation and its activation resources."
          }
        ]
      }
    ],
    "sequence": [
      "Establish the payload in banishment with an omen counter using a separate effect.",
      "Activate and resolve Baleful Oblation in a format or historical environment that permits it."
    ],
    "note": "With a 15-cost lowest omen, the effect deals 15 to every unit except your champion, before modifiers; your allies are also affected. Baleful Oblation is seasonally banned in Standard. Preserve evidence; exclude from current Standard recipe recommendations.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/game-mechanics/game-mechanics-mastery"
  },
  {
    "id": "fractal-oblation-combo-3",
    "label": "Baleful Oblation + Ionized Asceticism",
    "title": "Oblation: Baleful Oblation + Ionized Asceticism",
    "names": [
      "Baleful Oblation",
      "Ionized Asceticism"
    ],
    "slugs": [
      "baleful-oblation",
      "ionized-asceticism"
    ],
    "preset": null,
    "status": "Historical Standard · excluded from presets",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Ionized Asceticism established as an omen; no lower-cost omen; Umbra available; Oblation and its activation resources."
          }
        ]
      }
    ],
    "sequence": [
      "Establish the payload in banishment with an omen counter using a separate effect.",
      "Activate and resolve Baleful Oblation in a format or historical environment that permits it."
    ],
    "note": "With a 15-cost lowest omen, the effect deals 15 to every unit except your champion, before modifiers; your allies are also affected. Baleful Oblation is seasonally banned in Standard. Preserve evidence; exclude from current Standard recipe recommendations.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/game-mechanics/game-mechanics-mastery"
  },
  {
    "id": "fractal-umbra-guardian--control-combo-1",
    "label": "Grim Pastiche + Profane Bindings",
    "title": "Control: Grim Pastiche + Profane Bindings",
    "names": [
      "Grim Pastiche",
      "Profane Bindings"
    ],
    "slugs": [
      "grim-pastiche",
      "profane-bindings"
    ],
    "preset": null,
    "status": "Historical Standard · excluded from presets",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Profane Bindings is an omen; Umbra available; Grim Pastiche in hand and payable; a legal card activation to negate."
          }
        ]
      }
    ],
    "sequence": [
      "Resolve Grim Pastiche targeting the eligible omen.",
      "Activate the created card copy with a legal target under Pastiche’s permission."
    ],
    "note": "The copy is a new card activation, not a duplicate of an existing activation. Copy rules limit its persistence; the physical omen is not moved into lineage. Grim Pastiche is banned in Standard. Do not promise a lasting -5 life penalty or certify the exact transient lineage/state-check timing without a dedicated ruling review.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/game-mechanics/game-mechanics-copy"
  },
  {
    "id": "fractal-wakeup-combo-combo-1",
    "label": "Mad Hatter, Morose Heritor + Ranger Strides",
    "title": "Wakeup Combo: Mad Hatter, Morose Heritor + Ranger Strides",
    "names": [
      "Mad Hatter, Morose Heritor",
      "Ranger Strides"
    ],
    "slugs": [
      "mad-hatter-morose-heritor",
      "ranger-strides"
    ],
    "preset": null,
    "status": "Historical Standard · excluded from presets",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Hatter enters; material deck contains a card to banish and Strides survives the random choice; Astra enabled and materialization costs payable."
          }
        ]
      }
    ],
    "sequence": [
      "Resolve Hatter’s optional random banishment.",
      "If Strides remains legal and available, materialize it and resolve its entry draw."
    ],
    "note": "Hatter grants materialization permission, not a cost waiver or element exemption. This pair contains no wake-up effect. Ranger Strides is banned in Standard. Keep only as historical material-access evidence.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/game-mechanics/game-mechanics-playing-cards/playing-cards-card-materialization"
  },
  {
    "id": "fractal-wakeup-combo-combo-3",
    "label": "Ranger Strides + Second Wind",
    "title": "Wakeup Combo: Ranger Strides + Second Wind",
    "names": [
      "Ranger Strides",
      "Second Wind"
    ],
    "slugs": [
      "ranger-strides",
      "second-wind"
    ],
    "preset": null,
    "status": "Historical Standard · excluded from presets",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Strides on field; a distant Ranger ally able to attack; Wind and Second Wind resources available."
          }
        ]
      }
    ],
    "sequence": [
      "Banish Strides to grant the ally ranged 4.",
      "Finish an attack, resolve Second Wind on the surviving ally, then attack again while the conditions persist."
    ],
    "note": "Second Wind cannot target a champion; neither listed card establishes distant. Ranger Strides is banned in Standard. A historical sequence needs separate distant support.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/game-mechanics/game-mechanics-turn-order/turn-order-combat-phase/combat-phase-attacking-and-the-combat-phase"
  },
  {
    "id": "fractal-horse-and-taxes-combo-1",
    "label": "Dilu, Auspicious Charger + Red Hare, Unrivaled Stallion + Dungeon Guide",
    "title": "Horse and Taxes: Dilu, Auspicious Charger + Red Hare, Unrivaled Stallion + Dungeon Guide",
    "names": [
      "Dilu, Auspicious Charger",
      "Red Hare, Unrivaled Stallion",
      "Dungeon Guide"
    ],
    "slugs": [
      "dilu-auspicious-charger",
      "red-hare-unrivaled-stallion",
      "dungeon-guide"
    ],
    "preset": null,
    "status": "Classification or setup package · no preset",
    "setup": [
      {
        "phase": "Before starting",
        "requirements": [
          {
            "label": "Required game state",
            "detail": "Guide entry with two memory cards; compatible next champion in material; both horse elements accessible."
          }
        ]
      }
    ],
    "sequence": [
      "Resolve Guide’s optional memory payment and legal level-up.",
      "Check the resulting champion level against each horse’s obedience requirement."
    ],
    "note": "Guide can enable the level threshold. It does not itself satisfy either unique-Human alternative, grant both elements, or supply a tax effect. Keep as level-enabling package; select an actual champion route before a deck-specific recipe.",
    "ruleLabel": "Review rules source",
    "ruleUrl": "https://rules.gatcg.com/general-rules/general-rules-card-types/card-types-champion"
  },
];
