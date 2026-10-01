import type { DrawEngineSource } from "../features/deckbuilder/drawEffects";

// Verified against xenbr4 (10777:276) and the card catalog. The level-zero
// Spirit of Slime opening draw is already included in the seven-card starting hand.
export const HOME_DECK_DRAW_SOURCES: DrawEngineSource[] = [
  {
    "name": "Baby Gray Slime",
    "quantity": 4,
    "perCopy": 1,
    "reserveCost": 2,
    "section": "main",
    "conditional": true
  },
  {
    "name": "Escape the Wreckage",
    "quantity": 3,
    "perCopy": 1,
    "reserveCost": 3,
    "section": "main",
    "conditional": true
  },
  {
    "name": "Forest Cake",
    "quantity": 4,
    "perCopy": 1,
    "reserveCost": 2,
    "section": "main",
    "conditional": true
  },
  {
    "name": "Baby Red Slime",
    "quantity": 4,
    "perCopy": 1,
    "reserveCost": 2,
    "section": "main",
    "conditional": true
  },
  {
    "name": "Storm Slime",
    "quantity": 4,
    "perCopy": 2,
    "reserveCost": 2,
    "section": "main",
    "conditional": true
  },
  {
    "name": "Ethereal Slime",
    "quantity": 4,
    "perCopy": 1,
    "reserveCost": 2,
    "section": "main",
    "conditional": true
  },
  {
    "name": "Hymn of Gaia's Grace",
    "quantity": 2,
    "perCopy": 1,
    "reserveCost": 3,
    "section": "main",
    "conditional": true
  },
  {
    "name": "Silvie, With the Pack",
    "quantity": 1,
    "perCopy": 2,
    "reserveCost": null,
    "section": "material",
    "conditional": true
  },
  {
    "name": "Backup Charger",
    "quantity": 1,
    "perCopy": 1,
    "reserveCost": null,
    "section": "material",
    "conditional": false
  },
  {
    "name": "Horn of Beastcalling",
    "quantity": 1,
    "perCopy": 1,
    "reserveCost": null,
    "section": "material",
    "conditional": true
  },
  {
    "name": "Verdant Scepter",
    "quantity": 1,
    "perCopy": 1,
    "reserveCost": null,
    "section": "material",
    "conditional": true
  }
];
