// Stable ownership IDs. Never rename or recycle IDs when catalog labels change.
// Bundle components and explicitly reviewed catalog designs. See docs/research/official-merchandise-promotions.json.
// Overview images depict the whole bundle. Catalog designs do not imply event exclusivity.
export interface MerchandiseGroup {
  id: string;
  releaseId: string;
  releaseName: string;
  champion: string;
  sourceUrl: string;
  overviewImageUrl?: string;
  title?: string;
  sourceKind?: "catalog";
  items: { id: string; type: string; name: string }[];
}

export const merchandiseBundles: MerchandiseGroup[] = [
  {
    "id": "seaside-splash-2026-merlin",
    "releaseId": "seaside-splash-2026",
    "releaseName": "Seaside Splash",
    "champion": "Merlin",
    "sourceUrl": "https://www.gatcg.com/article/seaside-splash-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Summer_Merch_Set_Merlin_b91425562e.png?updated_at=2026-08-26T16:12:34.176Z",
    "items": [
      {
        "id": "merch-seaside-splash-2026-merlin-playmat",
        "type": "playmat",
        "name": "Playmat with Tube"
      },
      {
        "id": "merch-seaside-splash-2026-merlin-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-seaside-splash-2026-merlin-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-seaside-splash-2026-merlin-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-seaside-splash-2026-merlin-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-seaside-splash-2026-merlin-sticker-sheet",
        "type": "sticker-sheet",
        "name": "Sticker Sheet"
      },
      {
        "id": "merch-seaside-splash-2026-merlin-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
  {
    "id": "seaside-splash-2026-nico",
    "releaseId": "seaside-splash-2026",
    "releaseName": "Seaside Splash",
    "champion": "Nico",
    "sourceUrl": "https://www.gatcg.com/article/seaside-splash-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Summer_Merch_Set_Nico_4ea88485ef.png?updated_at=2026-08-26T16:12:34.800Z",
    "items": [
      {
        "id": "merch-seaside-splash-2026-nico-playmat",
        "type": "playmat",
        "name": "Playmat with Tube"
      },
      {
        "id": "merch-seaside-splash-2026-nico-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-seaside-splash-2026-nico-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-seaside-splash-2026-nico-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-seaside-splash-2026-nico-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-seaside-splash-2026-nico-sticker-sheet",
        "type": "sticker-sheet",
        "name": "Sticker Sheet"
      },
      {
        "id": "merch-seaside-splash-2026-nico-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
  {
    "id": "seaside-splash-2026-tonoris",
    "releaseId": "seaside-splash-2026",
    "releaseName": "Seaside Splash",
    "champion": "Tonoris",
    "sourceUrl": "https://www.gatcg.com/article/seaside-splash-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Summer_Merch_Set_Tony_7972ba98d1.png?updated_at=2026-08-26T16:12:34.192Z",
    "items": [
      {
        "id": "merch-seaside-splash-2026-tonoris-playmat",
        "type": "playmat",
        "name": "Playmat with Tube"
      },
      {
        "id": "merch-seaside-splash-2026-tonoris-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-seaside-splash-2026-tonoris-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-seaside-splash-2026-tonoris-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-seaside-splash-2026-tonoris-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-seaside-splash-2026-tonoris-sticker-sheet",
        "type": "sticker-sheet",
        "name": "Sticker Sheet"
      },
      {
        "id": "merch-seaside-splash-2026-tonoris-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
  {
    "id": "lunar-blessings-2026-lorraine",
    "releaseId": "lunar-blessings-2026",
    "releaseName": "Lunar Blessings",
    "champion": "Lorraine",
    "sourceUrl": "https://www.gatcg.com/article/lunar-blessings-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Lorraine_Lunar_1_cc5bec611e.png?updated_at=2026-01-16T22:31:56.375Z",
    "items": [
      {
        "id": "merch-lunar-blessings-2026-lorraine-playmat",
        "type": "playmat",
        "name": "Playmat with Tube"
      },
      {
        "id": "merch-lunar-blessings-2026-lorraine-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-lunar-blessings-2026-lorraine-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-lunar-blessings-2026-lorraine-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-lunar-blessings-2026-lorraine-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-lunar-blessings-2026-lorraine-sticker-sheet",
        "type": "sticker-sheet",
        "name": "Sticker Sheet"
      },
      {
        "id": "merch-lunar-blessings-2026-lorraine-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
  {
    "id": "lunar-blessings-2026-rai",
    "releaseId": "lunar-blessings-2026",
    "releaseName": "Lunar Blessings",
    "champion": "Rai",
    "sourceUrl": "https://www.gatcg.com/article/lunar-blessings-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Rai_Lunar_1_16329b265f.png?updated_at=2026-01-16T22:31:57.332Z",
    "items": [
      {
        "id": "merch-lunar-blessings-2026-rai-playmat",
        "type": "playmat",
        "name": "Playmat with Tube"
      },
      {
        "id": "merch-lunar-blessings-2026-rai-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-lunar-blessings-2026-rai-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-lunar-blessings-2026-rai-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-lunar-blessings-2026-rai-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-lunar-blessings-2026-rai-sticker-sheet",
        "type": "sticker-sheet",
        "name": "Sticker Sheet"
      },
      {
        "id": "merch-lunar-blessings-2026-rai-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
  {
    "id": "lunar-blessings-2026-tristan",
    "releaseId": "lunar-blessings-2026",
    "releaseName": "Lunar Blessings",
    "champion": "Tristan",
    "sourceUrl": "https://www.gatcg.com/article/lunar-blessings-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Tristan_Lunar_1_2f2eaab500.png?updated_at=2026-01-16T22:31:56.545Z",
    "items": [
      {
        "id": "merch-lunar-blessings-2026-tristan-playmat",
        "type": "playmat",
        "name": "Playmat with Tube"
      },
      {
        "id": "merch-lunar-blessings-2026-tristan-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-lunar-blessings-2026-tristan-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-lunar-blessings-2026-tristan-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-lunar-blessings-2026-tristan-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-lunar-blessings-2026-tristan-sticker-sheet",
        "type": "sticker-sheet",
        "name": "Sticker Sheet"
      },
      {
        "id": "merch-lunar-blessings-2026-tristan-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
  {
    "id": "lunar-blessings-2026-arisanna",
    "releaseId": "lunar-blessings-2026",
    "releaseName": "Lunar Blessings",
    "champion": "Arisanna",
    "sourceUrl": "https://www.gatcg.com/article/lunar-blessings-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ari_Lunar_1_00114c73e7.png?updated_at=2026-01-16T22:31:54.646Z",
    "items": [
      {
        "id": "merch-lunar-blessings-2026-arisanna-playmat",
        "type": "playmat",
        "name": "Playmat with Tube"
      },
      {
        "id": "merch-lunar-blessings-2026-arisanna-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-lunar-blessings-2026-arisanna-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-lunar-blessings-2026-arisanna-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-lunar-blessings-2026-arisanna-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-lunar-blessings-2026-arisanna-sticker-sheet",
        "type": "sticker-sheet",
        "name": "Sticker Sheet"
      },
      {
        "id": "merch-lunar-blessings-2026-arisanna-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
  {
    "id": "yuletide-cheer-2024-kongming",
    "releaseId": "yuletide-cheer-2024",
    "releaseName": "Kongming, Yuletide Cheer",
    "champion": "Kongming",
    "sourceUrl": "https://www.gatcg.com/article/kongming-yuletide-cheer-merchandise-set",
    "overviewImageUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/1211_02_0730788569.jpg?updated_at=2024-12-23T23:06:30.792Z",
    "items": [
      {
        "id": "merch-yuletide-cheer-2024-kongming-playmat",
        "type": "playmat",
        "name": "Playmat"
      },
      {
        "id": "merch-yuletide-cheer-2024-kongming-compact-deck-box",
        "type": "compact-deck-box",
        "name": "Compact Deck Box"
      },
      {
        "id": "merch-yuletide-cheer-2024-kongming-acrylic-standee",
        "type": "acrylic-standee",
        "name": "Acrylic Standee"
      },
      {
        "id": "merch-yuletide-cheer-2024-kongming-keychain",
        "type": "keychain",
        "name": "Acrylic Keychain"
      },
      {
        "id": "merch-yuletide-cheer-2024-kongming-tapestry",
        "type": "tapestry",
        "name": "B2 Tapestry"
      },
      {
        "id": "merch-yuletide-cheer-2024-kongming-sticker",
        "type": "sticker",
        "name": "Waterproof Sticker"
      },
      {
        "id": "merch-yuletide-cheer-2024-kongming-storage-box",
        "type": "storage-box",
        "name": "Storage box"
      }
    ]
  },
{
  "id": "ascent-design-acrylic-art-alice-golden-queen",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Golden Queen \u00b7 Acrylic art",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-acrylic-art-alice-golden-queen",
      "type": "acrylic-art",
      "name": "Alice, Golden Queen"
    }
  ]
},
{
  "id": "ascent-design-acrylic-art-the-looking-glass",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "The Looking Glass \u00b7 Acrylic art",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-acrylic-art-the-looking-glass",
      "type": "acrylic-art",
      "name": "The Looking Glass"
    }
  ]
},
{
  "id": "ascent-design-acrylic-art-cheshire-cat",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Cheshire Cat \u00b7 Acrylic art",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-acrylic-art-cheshire-cat",
      "type": "acrylic-art",
      "name": "Cheshire Cat"
    }
  ]
},
{
  "id": "ascent-design-acrylic-art-fractured-memories",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Fractured Memories \u00b7 Acrylic art",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-acrylic-art-fractured-memories",
      "type": "acrylic-art",
      "name": "Fractured Memories"
    }
  ]
},
{
  "id": "ascent-design-tote-bag-merlin",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Merlin",
  "title": "Merlin \u00b7 Tote bag",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-tote-bag-merlin",
      "type": "tote-bag",
      "name": "Merlin"
    }
  ]
},
{
  "id": "ascent-design-metal-counters-silver",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Silver Metal Counters \u00b7 Boxed set",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-metal-counters-silver",
      "type": "metal-counters",
      "name": "Silver Metal Counters"
    }
  ]
},
{
  "id": "ascent-design-t-shirt-alice",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice \u00b7 T-shirt",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-t-shirt-alice",
      "type": "t-shirt",
      "name": "Alice"
    }
  ]
},
{
  "id": "ascent-design-t-shirt-diana",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Diana",
  "title": "Diana \u00b7 T-shirt",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-t-shirt-diana",
      "type": "t-shirt",
      "name": "Diana"
    }
  ]
},
{
  "id": "ascent-design-plush-silvie",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Silvie",
  "title": "Silvie · Plush",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=17",
  "items": [
    {
      "id": "merch-ascent-plush-silvie",
      "type": "plush",
      "name": "Silvie"
    }
  ]
},
{
  "id": "ascent-design-figurine-arisanna-chibi",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Arisanna",
  "title": "Arisanna · Chibi figure",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=17",
  "items": [
    {
      "id": "merch-ascent-figurine-arisanna-chibi",
      "type": "figurine",
      "name": "Arisanna"
    }
  ]
},
{
  "id": "ascent-design-wall-scroll-horizon-s-reprise-key-visual-wall-scroll",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Horizon's Reprise Key Visual Wall Scroll · Wall scroll",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=17",
  "items": [
    {
      "id": "merch-ascent-wall-scroll-horizon-s-reprise-key-visual-wall-scroll",
      "type": "wall-scroll",
      "name": "Horizon's Reprise Key Visual Wall Scroll"
    }
  ]
},
{
  "id": "ascent-design-plush-guo-jia",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Guo Jia · Plush",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=17",
  "items": [
    {
      "id": "merch-ascent-plush-guo-jia",
      "type": "plush",
      "name": "Guo Jia"
    }
  ]
},
{
  "id": "ascent-design-plush-tristan",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Tristan",
  "title": "Tristan · Plush",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=17",
  "items": [
    {
      "id": "merch-ascent-plush-tristan",
      "type": "plush",
      "name": "Tristan"
    }
  ]
},
{
  "id": "ascent-design-figurine-merlin-amethyst-s-glow",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Merlin",
  "title": "Merlin, Amethyst's Glow · Figure",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=17",
  "items": [
    {
      "id": "merch-ascent-figurine-merlin-amethyst-s-glow",
      "type": "figurine",
      "name": "Merlin, Amethyst's Glow"
    }
  ]
},
{
  "id": "ascent-design-figurine-silvie-chibi",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Silvie",
  "title": "Silvie · Chibi figure",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=17",
  "items": [
    {
      "id": "merch-ascent-figurine-silvie-chibi",
      "type": "figurine",
      "name": "Silvie"
    }
  ]
},
{
  "id": "ascent-design-playmat-sp4-cosmic-bolt",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "SP4 Cosmic Bolt · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-sp4-cosmic-bolt",
      "type": "playmat",
      "name": "SP4 Cosmic Bolt"
    }
  ]
},
{
  "id": "ascent-design-playmat-divine-comedy-inferno",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Divine Comedy, Inferno · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-divine-comedy-inferno",
      "type": "playmat",
      "name": "Divine Comedy, Inferno"
    }
  ]
},
{
  "id": "ascent-design-playmat-dungeon-guide-pr",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Dungeon Guide PR · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-dungeon-guide-pr",
      "type": "playmat",
      "name": "Dungeon Guide PR"
    }
  ]
},
{
  "id": "ascent-design-playmat-enfeebling-orb-pr",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Enfeebling Orb PR · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-enfeebling-orb-pr",
      "type": "playmat",
      "name": "Enfeebling Orb PR"
    }
  ]
},
{
  "id": "ascent-design-compact-deck-box-avatar-of-byakko",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Avatar of Byakko · Compact deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-compact-deck-box-avatar-of-byakko",
      "type": "compact-deck-box",
      "name": "Avatar of Byakko"
    }
  ]
},
{
  "id": "ascent-design-compact-deck-box-avatar-of-suzaku",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Avatar of Suzaku · Compact deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-compact-deck-box-avatar-of-suzaku",
      "type": "compact-deck-box",
      "name": "Avatar of Suzaku"
    }
  ]
},
{
  "id": "ascent-design-double-deck-box-alice-trifle-s-royalty",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Trifle's Royalty · Double deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-double-deck-box-alice-trifle-s-royalty",
      "type": "double-deck-box",
      "name": "Alice, Trifle's Royalty"
    }
  ]
},
{
  "id": "ascent-design-playmat-sp4-expel-the-departed",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "SP4 Expel the Departed · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-sp4-expel-the-departed",
      "type": "playmat",
      "name": "SP4 Expel the Departed"
    }
  ]
},
{
  "id": "ascent-design-playmat-sp4-lily-marine-castellan",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Lily",
  "title": "SP4 Lily, Marine Castellan · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-sp4-lily-marine-castellan",
      "type": "playmat",
      "name": "SP4 Lily, Marine Castellan"
    }
  ]
},
{
  "id": "ascent-design-compact-deck-box-avatar-of-genbu",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Avatar of Genbu · Compact deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-compact-deck-box-avatar-of-genbu",
      "type": "compact-deck-box",
      "name": "Avatar of Genbu"
    }
  ]
},
{
  "id": "ascent-design-playmat-lorraine-honed-operative",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Lorraine",
  "title": "Lorraine, Honed Operative · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-lorraine-honed-operative",
      "type": "playmat",
      "name": "Lorraine, Honed Operative"
    }
  ]
},
{
  "id": "ascent-design-playmat-fluffy-shopkeep-pr",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Fluffy Shopkeep PR · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-fluffy-shopkeep-pr",
      "type": "playmat",
      "name": "Fluffy Shopkeep PR"
    }
  ]
},
{
  "id": "ascent-design-playmat-dante-aenean-initiate",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Dante",
  "title": "Dante, Aenean Initiate · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Melbourne_Event_Guide_9a45ea3f96.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-playmat-dante-aenean-initiate",
      "type": "playmat",
      "name": "Dante, Aenean Initiate"
    }
  ]
},
{
  "id": "ascent-design-playmat-ciel-loyal-valet",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Ciel",
  "title": "Ciel, Loyal Valet · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-ciel-loyal-valet",
      "type": "playmat",
      "name": "Ciel, Loyal Valet"
    }
  ]
},
{
  "id": "ascent-design-playmat-cheshire-cat",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Cheshire Cat · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-cheshire-cat",
      "type": "playmat",
      "name": "Cheshire Cat"
    }
  ]
},
{
  "id": "ascent-design-playmat-the-looking-glass",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "The Looking Glass · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-the-looking-glass",
      "type": "playmat",
      "name": "The Looking Glass"
    }
  ]
},
{
  "id": "ascent-design-playmat-ciel-mirage-s-grave",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Ciel",
  "title": "Ciel, Mirage's Grave · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-ciel-mirage-s-grave",
      "type": "playmat",
      "name": "Ciel, Mirage's Grave"
    }
  ]
},
{
  "id": "ascent-design-playmat-diana-moonpiercer",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Diana",
  "title": "Diana, Moonpiercer · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-diana-moonpiercer",
      "type": "playmat",
      "name": "Diana, Moonpiercer"
    }
  ]
},
{
  "id": "ascent-design-playmat-malevolent-vow",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Malevolent Vow · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-malevolent-vow",
      "type": "playmat",
      "name": "Malevolent Vow"
    }
  ]
},
{
  "id": "ascent-design-playmat-chamber-of-reflections",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Chamber of Reflections · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-chamber-of-reflections",
      "type": "playmat",
      "name": "Chamber of Reflections"
    }
  ]
},
{
  "id": "ascent-design-playmat-diana-judgment-s-arrow",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Diana",
  "title": "Diana, Judgment's Arrow · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-diana-judgment-s-arrow",
      "type": "playmat",
      "name": "Diana, Judgment's Arrow"
    }
  ]
},
{
  "id": "ascent-design-playmat-alice-golden-queen",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Golden Queen · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-alice-golden-queen",
      "type": "playmat",
      "name": "Alice, Golden Queen"
    }
  ]
},
{
  "id": "ascent-design-playmat-diana-aether-dilettante",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Diana",
  "title": "Diana, Aether Dilettante · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-diana-aether-dilettante",
      "type": "playmat",
      "name": "Diana, Aether Dilettante"
    }
  ]
},
{
  "id": "ascent-design-playmat-profane-bindings",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Profane Bindings · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-profane-bindings",
      "type": "playmat",
      "name": "Profane Bindings"
    }
  ]
},
{
  "id": "ascent-design-playmat-excalibur-reflected-glass",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Excalibur, Reflected Glass · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-excalibur-reflected-glass",
      "type": "playmat",
      "name": "Excalibur, Reflected Glass"
    }
  ]
},
{
  "id": "ascent-design-playmat-ashen-riffle",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Ashen Riffle · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-ashen-riffle",
      "type": "playmat",
      "name": "Ashen Riffle"
    }
  ]
},
{
  "id": "ascent-design-playmat-ciel-omenbringer",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Ciel",
  "title": "Ciel, Omenbringer · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-ciel-omenbringer",
      "type": "playmat",
      "name": "Ciel, Omenbringer"
    }
  ]
},
{
  "id": "ascent-design-playmat-chronowarp",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Chronowarp · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=23",
  "items": [
    {
      "id": "merch-ascent-playmat-chronowarp",
      "type": "playmat",
      "name": "Chronowarp"
    }
  ]
},
{
  "id": "ascent-design-playmat-mordred-aurelian-regent",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Mordred, Aurelian Regent · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-mordred-aurelian-regent",
      "type": "playmat",
      "name": "Mordred, Aurelian Regent"
    }
  ]
},
{
  "id": "ascent-design-playmat-nuriel-seraphic-paladin",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Nuriel, Seraphic Paladin · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-nuriel-seraphic-paladin",
      "type": "playmat",
      "name": "Nuriel, Seraphic Paladin"
    }
  ]
},
{
  "id": "ascent-design-playmat-auspicious-manifestation",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Auspicious Manifestation · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-auspicious-manifestation",
      "type": "playmat",
      "name": "Auspicious Manifestation"
    }
  ]
},
{
  "id": "ascent-design-playmat-lu-bu-wrath-incarnate",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Lu Bu, Wrath Incarnate · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-lu-bu-wrath-incarnate",
      "type": "playmat",
      "name": "Lu Bu, Wrath Incarnate"
    }
  ]
},
{
  "id": "ascent-design-playmat-angelic-channeling",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Angelic Channeling · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-angelic-channeling",
      "type": "playmat",
      "name": "Angelic Channeling"
    }
  ]
},
{
  "id": "ascent-design-playmat-celestial-navigation",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Celestial Navigation · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-celestial-navigation",
      "type": "playmat",
      "name": "Celestial Navigation"
    }
  ]
},
{
  "id": "ascent-design-playmat-iridescent-resurgence",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Iridescent Resurgence · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-iridescent-resurgence",
      "type": "playmat",
      "name": "Iridescent Resurgence"
    }
  ]
},
{
  "id": "ascent-design-playmat-nox-final-release",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Nox, Final Release · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-nox-final-release",
      "type": "playmat",
      "name": "Nox, Final Release"
    }
  ]
},
{
  "id": "ascent-design-playmat-alice-trifle-s-royalty-cur",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Trifle's Royalty CUR · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-alice-trifle-s-royalty-cur",
      "type": "playmat",
      "name": "Alice, Trifle's Royalty CUR"
    }
  ]
},
{
  "id": "ascent-design-playmat-diao-chan-dreaming-wish",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Diao Chan, Dreaming Wish · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-diao-chan-dreaming-wish",
      "type": "playmat",
      "name": "Diao Chan, Dreaming Wish"
    }
  ]
},
{
  "id": "ascent-design-playmat-merlin-amethyst-s-glow",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Merlin",
  "title": "Merlin, Amethyst's Glow · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=15",
  "items": [
    {
      "id": "merch-ascent-playmat-merlin-amethyst-s-glow",
      "type": "playmat",
      "name": "Merlin, Amethyst's Glow"
    }
  ]
},
{
  "id": "ascent-design-t-shirt-tristan",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Tristan",
  "title": "Tristan · T-shirt",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-t-shirt-tristan",
      "type": "t-shirt",
      "name": "Tristan"
    }
  ]
},
{
  "id": "ascent-design-double-deck-box-alice-phantom-monarch",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Phantom Monarch · Double deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-double-deck-box-alice-phantom-monarch",
      "type": "double-deck-box",
      "name": "Alice, Phantom Monarch"
    }
  ]
},
{
  "id": "ascent-design-compact-deck-box-snow-white-weiss-queen",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Snow White, Weiss Queen · Compact deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-compact-deck-box-snow-white-weiss-queen",
      "type": "compact-deck-box",
      "name": "Snow White, Weiss Queen"
    }
  ]
},
{
  "id": "ascent-design-t-shirt-merlin",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Merlin",
  "title": "Merlin · T-shirt",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-t-shirt-merlin",
      "type": "t-shirt",
      "name": "Merlin"
    }
  ]
},
{
  "id": "ascent-design-figurine-kongming",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Kongming",
  "title": "Kongming · Figure",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-figurine-kongming",
      "type": "figurine",
      "name": "Kongming"
    }
  ]
},
{
  "id": "ascent-design-t-shirt-ciel",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Ciel",
  "title": "Ciel · T-shirt",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-t-shirt-ciel",
      "type": "t-shirt",
      "name": "Ciel"
    }
  ]
},
{
  "id": "ascent-design-t-shirt-nico",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Nico",
  "title": "Nico · T-shirt",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-t-shirt-nico",
      "type": "t-shirt",
      "name": "Nico"
    }
  ]
},
{
  "id": "ascent-design-t-shirt-silvie",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Silvie",
  "title": "Silvie · T-shirt",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-t-shirt-silvie",
      "type": "t-shirt",
      "name": "Silvie"
    }
  ]
},
{
  "id": "ascent-design-compact-deck-box-spirelle-schwartz-queen",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Spirelle, Schwartz Queen · Compact deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Akihabara_Checklist_1db5e11780.pdf#page=24",
  "items": [
    {
      "id": "merch-ascent-compact-deck-box-spirelle-schwartz-queen",
      "type": "compact-deck-box",
      "name": "Spirelle, Schwartz Queen"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-kongming",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Kongming",
  "title": "Kong Ming · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-kongming",
      "type": "acrylic-standee",
      "name": "Kong Ming"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-tristan",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Tristan",
  "title": "Tristan · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-tristan",
      "type": "acrylic-standee",
      "name": "Tristan"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-diana",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Diana",
  "title": "Diana · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-diana",
      "type": "acrylic-standee",
      "name": "Diana"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-jin",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Jin",
  "title": "Jin · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-jin",
      "type": "acrylic-standee",
      "name": "Jin"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-arisanna",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Arisanna",
  "title": "Arisanna · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-arisanna",
      "type": "acrylic-standee",
      "name": "Arisanna"
    }
  ]
},
{
  "id": "ascent-design-coaster-lorraine",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Lorraine",
  "title": "Lorraine · Coaster",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-coaster-lorraine",
      "type": "coaster",
      "name": "Lorraine"
    }
  ]
},
{
  "id": "ascent-design-coaster-arisanna",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Arisanna",
  "title": "Arisanna · Coaster",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-coaster-arisanna",
      "type": "coaster",
      "name": "Arisanna"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-silvie",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Silvie",
  "title": "Silvie · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-silvie",
      "type": "acrylic-standee",
      "name": "Silvie"
    }
  ]
},
{
  "id": "ascent-design-coaster-kongming",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Kongming",
  "title": "Kong Ming · Coaster",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-coaster-kongming",
      "type": "coaster",
      "name": "Kong Ming"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-lorraine",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Lorraine",
  "title": "Lorraine · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-lorraine",
      "type": "acrylic-standee",
      "name": "Lorraine"
    }
  ]
},
{
  "id": "ascent-design-double-deck-box-lu-bu",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Lu Bu · Double deck box",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-double-deck-box-lu-bu",
      "type": "double-deck-box",
      "name": "Lu Bu"
    }
  ]
},
{
  "id": "ascent-design-acrylic-standee-merlin",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Merlin",
  "title": "Merlin · Acrylic standee",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Las_Vegas_f7061f5a2c.pdf#page=16",
  "items": [
    {
      "id": "merch-ascent-acrylic-standee-merlin",
      "type": "acrylic-standee",
      "name": "Merlin"
    }
  ]
},
{
  "id": "ascent-design-playmat-zander-corhazi-s-chosen",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Zander",
  "title": "Zander, Corhazi's Chosen · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=22",
  "items": [
    {
      "id": "merch-ascent-playmat-zander-corhazi-s-chosen",
      "type": "playmat",
      "name": "Zander, Corhazi's Chosen"
    }
  ]
},
{
  "id": "ascent-design-playmat-arisanna-lucent-arbiter",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Arisanna",
  "title": "Arisanna, Lucent Arbiter · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=22",
  "items": [
    {
      "id": "merch-ascent-playmat-arisanna-lucent-arbiter",
      "type": "playmat",
      "name": "Arisanna, Lucent Arbiter"
    }
  ]
},
{
  "id": "ascent-design-playmat-arcane-blast",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Arcane Blast · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-arcane-blast",
      "type": "playmat",
      "name": "Arcane Blast"
    }
  ]
},
{
  "id": "ascent-design-playmat-alice-trifle-s-royalty",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Trifle's Royalty · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-alice-trifle-s-royalty",
      "type": "playmat",
      "name": "Alice, Trifle's Royalty"
    }
  ]
},
{
  "id": "ascent-design-playmat-alice-phantom-monarch-csr",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Phantom Monarch CSR · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-alice-phantom-monarch-csr",
      "type": "playmat",
      "name": "Alice, Phantom Monarch CSR"
    }
  ]
},
{
  "id": "ascent-design-playmat-spirit-blade-terminus",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Spirit Blade: Terminus · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-spirit-blade-terminus",
      "type": "playmat",
      "name": "Spirit Blade: Terminus"
    }
  ]
},
{
  "id": "ascent-design-playmat-alice-phantom-monarch-cur",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Phantom Monarch CUR · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-alice-phantom-monarch-cur",
      "type": "playmat",
      "name": "Alice, Phantom Monarch CUR"
    }
  ]
},
{
  "id": "ascent-design-playmat-merlin-memorite-vassal",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Merlin",
  "title": "Merlin, Memorite Vassal · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-merlin-memorite-vassal",
      "type": "playmat",
      "name": "Merlin, Memorite Vassal"
    }
  ]
},
{
  "id": "ascent-design-playmat-peer-into-mana",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Peer Into Mana · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-peer-into-mana",
      "type": "playmat",
      "name": "Peer Into Mana"
    }
  ]
},
{
  "id": "ascent-design-playmat-diana-haunt-reminiscence",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Diana",
  "title": "Diana, Haunt Reminiscence · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-diana-haunt-reminiscence",
      "type": "playmat",
      "name": "Diana, Haunt Reminiscence"
    }
  ]
},
{
  "id": "ascent-design-playmat-alice-distorted-queen",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Distorted Queen · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-alice-distorted-queen",
      "type": "playmat",
      "name": "Alice, Distorted Queen"
    }
  ]
},
{
  "id": "ascent-design-playmat-merlin-brilliant-vestige",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Merlin",
  "title": "Merlin, Brilliant Vestige · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-merlin-brilliant-vestige",
      "type": "playmat",
      "name": "Merlin, Brilliant Vestige"
    }
  ]
},
{
  "id": "ascent-design-playmat-embrace-noir",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Embrace Noir · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-embrace-noir",
      "type": "playmat",
      "name": "Embrace Noir"
    }
  ]
},
{
  "id": "ascent-design-playmat-kongming-fei-eidolon",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Kongming",
  "title": "Kongming, Fei Eidolon · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=22",
  "items": [
    {
      "id": "merch-ascent-playmat-kongming-fei-eidolon",
      "type": "playmat",
      "name": "Kongming, Fei Eidolon"
    }
  ]
},
{
  "id": "ascent-design-playmat-alice-whim-s-monarch",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Alice",
  "title": "Alice, Whim's Monarch · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-alice-whim-s-monarch",
      "type": "playmat",
      "name": "Alice, Whim's Monarch"
    }
  ]
},
{
  "id": "ascent-design-playmat-lorraine-wandering-warrior",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Lorraine",
  "title": "Lorraine, Wandering Warrior · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=22",
  "items": [
    {
      "id": "merch-ascent-playmat-lorraine-wandering-warrior",
      "type": "playmat",
      "name": "Lorraine, Wandering Warrior"
    }
  ]
},
{
  "id": "ascent-design-playmat-arisanna-master-alchemist",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "Arisanna",
  "title": "Arisanna, Master Alchemist · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=22",
  "items": [
    {
      "id": "merch-ascent-playmat-arisanna-master-alchemist",
      "type": "playmat",
      "name": "Arisanna, Master Alchemist"
    }
  ]
},
{
  "id": "ascent-design-playmat-flickering-afterglow",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Flickering Afterglow · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-flickering-afterglow",
      "type": "playmat",
      "name": "Flickering Afterglow"
    }
  ]
},
{
  "id": "ascent-design-playmat-labyrinth-jeweled-opus",
  "releaseId": "ascent-catalog-designs",
  "releaseName": "Ascent catalog designs",
  "champion": "",
  "title": "Labyrinth Jeweled Opus · Playmat",
  "sourceKind": "catalog",
  "sourceUrl": "https://ga-mainsite-common.s3.us-west-2.amazonaws.com/media/Ascent_Los_Angeles_2025_Event_Guide_ad759e2e53.pdf#page=21",
  "items": [
    {
      "id": "merch-ascent-playmat-labyrinth-jeweled-opus",
      "type": "playmat",
      "name": "Labyrinth Jeweled Opus"
    }
  ]
}
];
