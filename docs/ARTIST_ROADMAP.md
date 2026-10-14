# Artist pages roadmap

Make Grand Archive illustrators discoverable through dedicated artist pages, credited card artwork, and verified links to their official accounts. Complete discovery for every catalog credit one at a time, preserving evidence and unresolved identities in the [artist discovery tracker](ARTIST_DISCOVERY.md).

## Scope and current progress

The public-web discovery pass covers all 76 entries and 84 exact catalog credit strings. Ten credit entries have verified links (nine supported artist/studio identities; A031/A034 share TaroTarou), 25 have no verified links found, and 41 need identity review with explicit next actions. There are 21 unique verified URLs, including ten social-network profiles. These totals describe research coverage, not full identity resolution or account coverage.

The first implementation is ready locally: `/artists` provides searchable artwork previews, and `/artists/:slug` provides verified accounts, card search, counts, and exact credited-printing galleries. The 76 discovery entries resolve to 75 pages because the supported TaroTarou credits share one identity. Artist Pages is approximately 80% complete: planning, initial research, curated data, and the main UI are implemented; release checks, deployment, production verification, and deferred identity research remain. Research scope remains uncertain because it depends on public evidence and account access.

The first release includes a searchable artist directory, dedicated artist pages, galleries of the printings credited to each artist, and verified external links. All credited artists remain eligible for pages even when no official links are found. Biographies, social feeds, artist-managed profiles, and direct artist outreach are outside this release.

## Milestone 1 Complete artist discovery

The initial queue has a recorded outcome for every entry. Continue follow-up research one identity at a time, prioritizing the tracker’s unresolved decisions. An unresolved identity stays Needs identity review with a next action so it does not block unrelated artists.

- [x] Inventory all current credit strings and create the discovery queue.
- [x] Define research outcomes and the evidence required for official links.
- [x] Research every entry individually, including individuals, studios, and combined credits; initial public-web pass complete.
- [ ] Resolve supported aliases and studio/member relationships without assuming that similar names identify the same artist.
- [x] Record discovered official websites, portfolios, and social profiles with ownership evidence and verification dates; withheld candidates remain separate.
- [x] Record no-result searches and identity blockers explicitly.
- [ ] Reconcile the completed queue with a fresh catalog snapshot and add newly encountered credits.

**Acceptance:** every queue entry has a reviewed outcome and evidence record; no entry remains Not started or In progress. Needs identity review entries have explicit next actions and remain unresolved. Report research coverage and verified-link coverage separately: discovery does not require finding a social account for every artist.

The snapshot’s initial-pass acceptance is met. Keep this milestone open for unresolved alias decisions and reconciliation against a fresh upstream catalog. The local snapshot was rechecked for queue coverage; no upstream refresh was run. Extraction failures were sometimes resolved through browser inspection; remaining inaccessible accounts, including Pixiv profiles blocked by browser policy, remain withheld.

## Milestone 2 Establish the curated directory

Keep curated identities and account links separate from the refreshed card catalog. Research records retain candidates and rejected accounts; the public directory contains verified links only.

- [x] Define shared artist identity, alias, link, and credited-printing types.
- [x] Create a curated directory with stable IDs/slugs, display names, individual/studio/combined identity, exact credit aliases, and verified links.
- [x] Retain per-link platform, label, canonical HTTPS URL, evidence source, and verification date.
- [x] Establish a versioned mapping from exact catalog credits to artist identities; preserve unresolved credits under their own identity rather than losing their artwork.
- [x] Derive card membership and counts from edition credits using shared logic; keep unique cards distinct from printings.
- [x] Validate duplicate IDs/slugs, conflicting aliases, URLs, missing credits, and refresh behavior. Report unmapped new credits for discovery.
- [ ] Establish redirects when a supported merge changes a published artist URL.

**Acceptance:** every credited printing resolves to a curated or unresolved identity, the same credit cannot silently map to competing identities, and catalog refreshes retain curated accounts. Regression fixtures cover whitespace/case variants, non-Latin names, studio/member distinctions, missing credits, and one card illustrated by multiple artists across printings.

## Milestone 3 Build artist pages and discovery

- [x] Add `/artists` with search, artist names, representative credited artwork, and unique-card counts.
- [x] Add `/artists/:slug` with the credited name, official links, visible counts, and a responsive card gallery.
- [x] Use `CardArtTile` or `VisualCardTile`; show the exact artist-credited printing and readable card name. Group multiple credited printings of a card with explicit printing choices rather than hiding their artwork.
- [x] Link artwork to the card details with the corresponding printing selected, extending the existing selection URL contract if needed.
- [x] Replace the CardHero artist-filter link with the relevant artist page; preserve `/cards?artist=...` browsing behavior for existing links.
- [x] Add artist discovery to the Cards navigation and contextual browsing entry points.
- [x] Show named, accessible external links and omit the links region when none are verified.
- [x] Reuse shared controls and existing theme; maintain 48px touch targets, visible keyboard focus, and wrapping layouts beginning at 360–390px.
- [x] Provide loading, empty, failure/retry, unknown-artist, and missing-art states without hiding useful navigation.

**Acceptance:** a player can open an artist from a specific card printing, identify their other credited artwork, and follow a verified account on mobile and desktop. Artists without accounts still have useful pages. No gallery presents another artist's default printing as the credited artwork.

## Milestone 4 Verify and release

- [x] Add artist URLs and directory navigation to the sitemap and appropriate page metadata.
- [x] Check filtering, aliases, counts, deep links, unresolved identities, and printing-selection behavior with representative data.
- [ ] Verify the main flow at 360–390px and desktop, keyboard access, 48px controls, focus, text enlargement, and overflow.
- [ ] Exercise loading, empty, error/retry, long/non-Latin names, missing artwork, unknown slugs, and no-social-link states.
- [x] Run checks appropriate to changed app/shared/pipeline boundaries and record any verification limitations.
- [ ] Recheck published links before release; remove or withhold accounts whose ownership remains unresolved.
- [x] Record implementation completion separately from deployment and production verification.

**Acceptance:** the integrated site meets the UI and data criteria, only verified accounts are published, and deployment plus the production artist-to-card-to-account journey are verified. Unresolved identities and unavailable accounts remain explicit research follow-ups and do not become invented official links.

## Ongoing upkeep

Catalog refreshes should surface new credits without overwriting curated research. When an account changes, record fresh evidence and the review date; broken or uncertain links are withheld until reverified. Keep redirect history for renamed or merged artists. Future recurring checks or notifications require a separate scheduling request.

## Local implementation and verification — 2026-10-14

The curated source is `shared/src/artistDirectory.ts` (mapping version 1), separate from refreshed card data. Surrounding credit whitespace is normalized; case, punctuation, studio/member distinctions, and non-Latin spellings remain exact. Only A031/A034 merge. The directory includes all 21 verified URLs with evidence and review dates. Candidates, blocked accounts, and uncertain aliases remain withheld in the discovery tracker. New credits receive stable fallback pages without inherited accounts; the catalog coverage regression check flags missing curated mappings for discovery. Published slugs must be preserved; add explicit redirects before any future rename or merge. No previously published artist URL needs migration in this initial release.

Shared gallery logic groups each card once per artist and retains every credited printing. The printing selector updates both artwork and card link. Card details now accept `?edition=<uuid>` and preserve that selection while changing tabs; absent/unknown edition values fall back to the first printing. Card credits and Cards navigation lead to the artist pages. The sitemap source and future pipeline generation include artist URLs.

Validation: the production build passes, including generated deck entry pages. All three focused artist regression tests pass; app/shared/pipeline TypeScript checks pass; app lint reports only its seven existing Fast Refresh warnings. Curated URLs exactly match the discovery tracker’s verified URL set, and all 75 artist routes plus the directory are included in the sitemap.

Verified locally: directory search, card search and empty results; social and no-social pages; 390px/360px and 1280px layouts; no horizontal overflow; 48px search, printing and account controls; keyboard focus from search to artwork; printing change → exact card edition → artist link. Loading was observed during navigation. Unknown slugs retain a directory recovery link. Catalog regression fixtures verify every credited edition, counts, whitespace, non-Latin credits, supported merges, unmerged ambiguous names, and new-credit fallback behavior. Full network failure/retry, an entirely empty catalog, forced missing-art failures, and enlarged text have not been browser-tested; these remain release checks. Existing shared CardImage handles unavailable artwork with a named fallback.

## Next work

Finish the remaining release-state and enlarged-text checks, review the local pages, then deploy when requested and verify the production directory → artist → printing journey. No implementation blocker remains. Keep identity research deferred as requested: 白霜茶/白霜搽, Primea/Parhelion, and malformed A072/A075 credits remain separate follow-ups. Uncertain identities do not block pages, and their candidate accounts remain unpublished. Artist Pages is approximately 80% complete on the basis above; production verification and research duration remain uncertain.

### Profile images — 2026-10-14

Directory results and artist headers now show a circular identity image with initials when no image is verified or an image fails. Initial images are Gyool's square profile image from https://www.gyool.info/ and TaroTarou's explicitly labeled profile icon from https://lit.link/en/TaroTarou. Small local assets avoid depending on external image hosts during visits. Original image URL, source page, and verification date live with each curated identity; this records provenance, not a reuse license. No generic portfolio artwork or uncertain identities were assigned as portraits.

Verification: app typecheck and existing three artist regression tests pass. Mobile (360px) directory and profile checked; desktop (1280px) profile checked. Existing text-only fallback remains available for all other artists. Forced image failure and enlarged text remain unverified. Remaining portrait discovery covers 73 identities, alongside the previously recorded release checks; overall Artist Pages estimate remains roughly 80%, with portrait coverage now an expandable follow-up.


### Continued portrait discovery — 2026-10-14

Added Rachel Liu's portrait from her official [About page](https://www.liurachel.com/about-1), using its published 300px image variant as a local WebP asset. Verified portrait coverage is now 3 of 75 identities; 72 remain without a verified portrait. Hanh Chu's Wix landing page contains a banner and account icons, Pinakes' homepage contains portfolio artwork, and Hanh Chu's ArtStation portfolio could not be retrieved for image inspection. None supplied a sufficiently clear additional profile image in this pass.

Rachel Liu's mobile artist header (360px) and desktop directory result (1280px) display the portrait correctly without visible overflow. App typecheck and all three artist regression tests pass. This data-only addition introduces no controls; keyboard, forced image failure, and enlarged text were not rechecked. Remaining release checks above still apply. Artist Pages remains approximately 80% complete: core implementation is finished, while production verification and broader portrait discovery remain, with research scope uncertain.


### Fuzichoco profile image — 2026-10-14

Added fuzichoco's illustrated avatar from the [official FANBOX profile](https://fuzichoco.fanbox.cc/), linked directly by the [official website](https://www.fuzichoco.com/). The displayed 160px user icon is stored locally with source metadata. Portrait coverage is now 4 of 75 identities; 71 remain without a verified image. Dragonart's gallery provides artwork and a wide wordmark, while Fuzichoco's website biography is text-only; those assets were not selected as portraits.

The portrait displays correctly in the 360px artist page and 1280px directory, with no visible overflow. App typecheck and all three artist regression tests pass. No interaction code changed; keyboard, forced image failure, and enlarged text were not rechecked. Artist Pages remains approximately 80% complete: core pages work, with broader discovery and release verification remaining; discovery scope is uncertain.

### Hanh Chu profile image — 2026-10-14

Added the illustrated avatar displayed beside Hanh Chu's name on the [ArtStation profile](https://www.artstation.com/rokudo_aurora). The profile links back to the already verified Wix website and ArtStation portfolio, confirming the identity. The published 72px avatar is stored locally with source metadata. This resolves the earlier ArtStation image-inspection gap. Portrait coverage is now 5 of 75 identities; 70 remain without a verified image.

The avatar loads correctly on the artist page at 360px and 1280px without horizontal overflow. App typecheck and all three artist regression tests pass. No controls changed; keyboard, forced image failure, and enlarged text were not rechecked. Artist Pages remains approximately 80% complete: core implementation is finished, with broader discovery and release verification remaining; discovery scope is uncertain.

### Antilous profile image — 2026-10-14

Added Dragonart Antilous's blue dragon avatar from the [ArtStation profile](https://www.artstation.com/antilous). Its Instagram link matches the already verified account, and the profile also links to Dragonart. The published 72px avatar is stored locally with source metadata. Portrait coverage is now 6 of 75 identities; 69 remain without a verified image.

The avatar loads correctly at 360px and 1280px with no horizontal overflow. App typecheck and all three artist regression tests pass. No controls changed; keyboard, forced image failure, and enlarged text were not rechecked. Artist Pages remains approximately 80% complete: core pages work, with broader discovery and release verification remaining; discovery scope is uncertain.
