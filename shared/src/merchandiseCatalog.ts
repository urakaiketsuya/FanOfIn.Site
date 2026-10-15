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
}
];
