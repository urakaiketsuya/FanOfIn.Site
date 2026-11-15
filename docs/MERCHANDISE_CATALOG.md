# Merchandise browse catalog

`/merchandise` imports the Grand Archive Playmats Collection spreadsheet:
https://docs.google.com/spreadsheets/d/1hvE-dqVjK_-jEwCkNWmlYQd6-fjGoLmsXetnZzgpP5M/edit

Snapshot: November 14, 2026. There are 546 source entries across 16 categories:
346 playmat entries (45 artist-signed) and 200 entries from GA Merch. These are
spreadsheet entries, not a deduplicated count of physical products. Names and
variant labels remain as supplied, including spelling differences.

## Import and identity

All visible catalog tabs are imported except Need list (personal wants) and
MerchWIP (a working duplicate of GA Merch). Hidden sheets are excluded. The GA
Merch tab has no exported photos or photo links. Featured bundle artwork comes
separately from the existing verified shared catalog and depicts full sets.
The source snapshot now lives in `shared/src/merchandiseCommunityCatalog.json` and is
shared by browsing and collection tracking. Existing ownership IDs remain unchanged.
`merchandiseCatalogLinks.json` explicitly connects 73 catalog rows to original ownership
IDs and eight sets to their 56 existing component IDs. Other source IDs are now frozen
ownership keys. The importer rejects removals and name/category/detail changes rather
than reassigning quantities when spreadsheet rows move. Review an explicit stable-ID
migration before accepting any such refresh. See `MERCHANDISE_COLLECTION.md`.

To refresh, export the workbook as XLSX, then from the repository root run:

```sh
python3 pipeline/scripts/import-merchandise-sheet.py /absolute/path/source.xlsx
```

The importer maps a reviewed workbook layout explicitly and rejects changed sheet
names/order. Recheck column headings, section boundaries and counts before committing
an import. Source-cell links preserve provenance. Search, category and pagination
are URL parameters. Pages contain at most 24 entries; invalid pages are clamped.

## Inline photos

415 entries now have inline photo presentations (including the reviewed supplemental sources):

- 253 Imgur posts use lazy-loaded sandboxed host embeds. Album IDs are not image
  IDs and must never be turned into guessed image filenames.
- 77 ImgBB pages have direct images in `galleryPhotos.json`, extracted from each
  page's visible Full image HTML embed code on November 14, 2026. Exact source
  gallery URLs key the manifest, so changed source links cannot inherit old photos.
- Three eBay seller photos supplement the spreadsheet: Merlin, Memory Thief (double
  deckbox), Ariel (compact deckbox), and Nia, Mistveiled Scout (deckbox). Source row,
  name and category must all match. Nia B24 duplicates B13 by name; only B13 is mapped.
- 16 Dragon Shield sleeve product photos use the image URLs exposed by their product
  pages, with manufacturer attribution and direct product links. Mappings also require
  the source detail to match, protecting retail/event distinctions. Source spelling
  differences (Soverign, Archarngel, Archlight, trailing comma) remain in the imported
  catalog and are explicitly matched. The 192px source thumbnails may appear soft;
  full-size source validation remains outstanding. Some image fetches failed in research;
  remote rendering must still be verified.

Source attribution links remain visible beneath photos. Images use object-contain
and reserved height, with lazy loading and an unavailable-photo fallback. A failed
photo never removes the product name or source link. Unknown gallery hosts remain
external links rather than untrusted iframe sources. There are 131 entries without
photo references; no substitute artwork is invented for them.

Seller listings do not establish authenticity, release dates, stock or prices.
Five candidate listings remain pending in `docs/research/merchandise-ebay-review.json`,
including conflicting Raziel/Haniel metadata and unresolved CUR variants. Continue
photo research against both seller listings and official sources; do not merge items
by champion name alone.

Two official regional playmat images (Capacitance X Psycho finalist and Rolling
Chorus champion) are mapped from https://www.gatcg.com/article/asphodel-paradise-regionals
with Grand Archive attribution. The announcement explicitly identifies each artwork
and prize tier. Twelve playmat entries still lack photos.

## Verification and remaining work

The merchandise photo and bounty tests cover source mappings, unsupported hosts,
source identity changes, and missing-image classification. The Bounties tab shows
all 131 entries without a supported image or embed and links to Discord for photo
submissions. Temporary remote-image failures do not change bounty membership.

The catalog and Bounties flows were checked at mobile and desktop widths, including
filters, empty results, keyboard tab navigation, touch-target dimensions and overflow.
Native touchscreen behavior and availability of every remote image remain unverified.
Pagination moves keyboard focus to the results section. The importer previously
reproduced the unchanged 546-entry catalog.

## Additional photo sources

Dragon Shield collection: https://www.dragonshield.com/collections/grand-archive
All 16 currently listed products are matched in manufacturerPhotos.json (reviewed
November 14, 2026). BCW sleeves, promos and other artwork are not inferred from them.

User-suggested playmat gallery: https://ray-chen23.imgbb.com/
The profile redirects to https://imgbb.com/login in the browser (November 14,
2026); no new playmat matches have been imported from this profile. Review individual images against exact artwork, event and finish before
adding them; check overlap with the existing 77 ImgBB sources first.

## November 15 photo continuation

Added 25 exact-row photos: eight complete merchandise sets, ten sleeve designs,
four acrylic standees, the M.RAGE Merlin windbreaker, Merlin Amethyst’s Glow figure,
and 2026 Nationals Merlin water bottle. Every added image was visually inspected.
Sources and unresolved leads are recorded in
`docs/research/merchandise-remainder-2026-11-15.json`. Coverage after that pass was 406/546
entries (74.4%), with 140 photo bounties remaining. This pass searched across
categories; it does not claim an exhaustive review of every remaining item.

### Follow-up source review

Added four more verified seller photos: Lu Bu Nationals 2025 backpack, Polishing
Flourish playmat, Kongming chibi figure (boxed), and Mordred sleeves. Coverage after that pass was
410/546 (75.1%), leaving 136 bounties. The previously indexed Fast Cure Alice
playmat URL now serves Polishing Flourish; it must not be mapped to Alice.
Evidence is in `docs/research/merchandise-followup-2026-11-15.json`. The Mordred
source is a small 265×370 image; a sharper replacement remains desirable.

### Playmats and accessories review

Added five photos: Enfeebling Orb (PR Slimes) playmat, Morrigan mechanical dice,
Naia and Dungeon Guide keychains, and Arisanna water bottle. Coverage is now
415/546 (76.0%), leaving 131 bounties, including 12 playmats and 22 accessories.
Sources, identity evidence and unresolved leads are recorded in
`docs/research/merchandise-playmats-accessories-2026-11-15.json`. The Arisanna
bottle source includes phone screenshot borders; a cleaner photo remains desirable.
