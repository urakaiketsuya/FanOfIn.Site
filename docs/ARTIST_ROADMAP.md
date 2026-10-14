# Artist pages roadmap

Make Grand Archive illustrators discoverable through dedicated artist pages, credited card artwork, and verified links to their official accounts. Complete discovery for every catalog credit one at a time, preserving evidence and unresolved identities in the [artist discovery tracker](ARTIST_DISCOVERY.md).

## Scope and current progress

The public-web discovery pass covers all 76 entries and 84 exact catalog credit strings. Twelve credit entries have verified links (eleven supported artist/studio identities; A031/A034 share TaroTarou), 25 have no verified links found, and 39 need identity review with explicit next actions. There are 25 unique verified URLs, including twelve social-network profiles. These totals describe research coverage, not full identity resolution or account coverage.

The first implementation is ready locally: `/artists` provides searchable artwork previews, and `/artists/:slug` provides verified accounts, card search, counts, and exact credited-printing galleries. The 76 discovery entries resolve to 75 pages because the supported TaroTarou credits share one identity. Artist Pages is approximately 95% complete for the first release: the core pages, initial account and portrait discovery, local UI checks, and account-destination review are complete; deployment and production verification remain. Deferred identity research continues separately. Research scope remains uncertain because it depends on public evidence and account access.

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
- [x] Verify the main flow at 360–390px and desktop, keyboard access, 48px controls, focus, text enlargement, and overflow.
- [x] Exercise loading, empty, error/retry, long/non-Latin names, missing artwork, unknown slugs, and no-social-link states.
- [x] Run checks appropriate to changed app/shared/pipeline boundaries and record any verification limitations.
- [x] Recheck published links before release; remove or withhold accounts whose ownership remains unresolved.
- [x] Record implementation completion separately from deployment and production verification.

**Acceptance:** the integrated site meets the UI and data criteria, only verified accounts are published, and deployment plus the production artist-to-card-to-account journey are verified. Unresolved identities and unavailable accounts remain explicit research follow-ups and do not become invented official links.

## Ongoing upkeep

Catalog refreshes should surface new credits without overwriting curated research. When an account changes, record fresh evidence and the review date; broken or uncertain links are withheld until reverified. Keep redirect history for renamed or merged artists. Future recurring checks or notifications require a separate scheduling request.

## Local implementation and verification — 2026-10-14

The curated source is `shared/src/artistDirectory.ts` (mapping version 1), separate from refreshed card data. Surrounding credit whitespace is normalized; case, punctuation, studio/member distinctions, and non-Latin spellings remain exact. Only A031/A034 merge. The directory includes all 25 verified URLs with evidence and review dates. Candidates, blocked accounts, and uncertain aliases remain withheld in the discovery tracker. New credits receive stable fallback pages without inherited accounts; the catalog coverage regression check flags missing curated mappings for discovery. Published slugs must be preserved; add explicit redirects before any future rename or merge. No previously published artist URL needs migration in this initial release.

Shared gallery logic groups each card once per artist and retains every credited printing. The printing selector updates both artwork and card link. Card details now accept `?edition=<uuid>` and preserve that selection while changing tabs; absent/unknown edition values fall back to the first printing. Card credits and Cards navigation lead to the artist pages. The sitemap source and future pipeline generation include artist URLs.

Validation: the production build passes, including generated deck entry pages. All three focused artist regression tests pass; app/shared/pipeline TypeScript checks pass; app lint reports only its seven existing Fast Refresh warnings. Curated URLs exactly match the discovery tracker’s verified URL set, and all 75 artist routes plus the directory are included in the sitemap.

Verified locally: directory search, card search and empty results; social and no-social pages; 390px/360px and 1280px layouts; no horizontal overflow; 48px search, printing and account controls; keyboard focus from search to artwork; printing change → exact card edition → artist link. Loading was observed during navigation. Unknown slugs retain a directory recovery link. Catalog regression fixtures verify every credited edition, counts, whitespace, non-Latin credits, supported merges, unmerged ambiguous names, and new-credit fallback behavior. Full network failure/retry, an entirely empty catalog, forced missing-art failures, and enlarged text have not been browser-tested; these remain release checks. Existing shared CardImage handles unavailable artwork with a named fallback.

## Next work

Deploy when requested and verify the production directory → artist → printing journey. The pre-release account-destination review is complete, with Facebook viewing limits recorded below. Local failure-state checks are complete; full offline transport recovery remains a production/integration check. Keep identity research deferred as requested: 白霜茶/白霜搽, Primea/Parhelion, and malformed A072/A075 credits remain separate follow-ups. Uncertain identities do not block pages, and their candidate accounts remain unpublished. Artist Pages is approximately 95% complete for the first release: core pages, initial discovery, local UI verification, and account review are finished; deployment and production verification remain. Further identity research depends on public evidence.

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

### Remaining portrait pass complete 2026-10-14

Reviewed every remaining identity and recorded the full 75-identity outcome table in the [discovery tracker](ARTIST_DISCOVERY.md#complete-portrait-discovery-pass-2026-10-14). Added Pinakes' official X logo, 坊橋夜泊's X avatar, and Dragonart 白霜搽's Instagram avatar. Portrait coverage is now 9/75 (12%); 65 identities still need an account-to-credit connection and Dragonart has no selected profile avatar. Every page retains a useful initials fallback. This completes the initial portrait pass; no identities remain unreviewed in this snapshot.

坊橋夜泊's original Topsy Decree commission post resolves the earlier identity blocker. Their portfolio, X, and Patreon links are now published with that primary evidence, bringing verified links to 24 across ten identities. No unsupported aliases or studio-member merges were introduced. Further discovery requires new primary evidence for the remaining identities; it is a follow-up backlog rather than an unfinished first pass.

Artist Pages is approximately 85% complete: the core pages and initial account/portrait passes are complete, while integrated release checks, deployment, and production verification remain. Full portrait coverage remains uncertain and is not required for useful artist pages.

Verification: app typecheck, all three artist regression tests, and diff checks pass. All three new avatars load on 360px artist pages and in 1280px directory results without horizontal overflow. New official links measure 48px high; keyboard tabbing reaches the X link with a visible focus outline. Directory search, no-match results, loading, and initials for unresolved artists were checked. Forced image failure, text enlargement, network-error/retry, and production behavior were not rechecked in this data-and-asset pass. Local browser counts use its cached catalog and can differ from the committed discovery snapshot; no catalog refresh was included.


### Local release checks 2026-10-14

Artist headings now wrap beside the portrait when space is insufficient, fixing a 3px horizontal overflow at 360px with the root text size doubled. The artist page and directory fit at 360px and 1280px with 200% root text size. Account links, search, and printing controls retain their minimum touch size, and keyboard navigation from search to artwork shows a visible focus outline.

An isolated Vite preview rendered the actual artist page and shared card components against two real catalog cards. It substituted catalog/loading hooks and the sync result, and deliberately served missing image URLs. Checks passed for portrait-to-initials recovery, named missing-art fallback, loading, an empty directory, an initial catalog error, a failed retry, and a subsequent successful retry that restores artwork and clears the error. These checks cover the page's response to sync outcomes; they do not exercise the real network transport or IndexedDB recovery. Temporary preview files were removed.

App typecheck and all three artist regression tests pass. Deployment, production journeys, and a complete pre-release account-destination review remain outstanding. Artist Pages is approximately 90% complete based on the implemented features, completed initial discovery, and local acceptance checks; continuing identity research has uncertain duration.

### Account destination review 2026-10-14

All 24 published URLs were reviewed against the curated ownership records. Eleven destinations returned readable content through web retrieval; the remaining thirteen were inspected in the browser. No conflicting identity or confirmed broken destination was found, so the verified URL set remains unchanged. The two Facebook destinations show the expected artist names behind login prompts; their contents remain limited to the public identity surface and official incoming links.

| Artist | URLs | Result |
| --- | ---: | --- |
| Dragonart | 1 | Studio website identifies Dragonart and its artists. |
| Hanh Chu | 4 | Website, ArtStation, X, and Carrd identify Hanh Chu; Carrd links to the portfolio, ArtStation, and X. |
| Gyool | 3 | Website identifies Grand Archive work; X links to Linktree, which links back to the website and Twitter. |
| Pinakes | 2 | Portfolio links to Twitter; X links back to pinakes.me. |
| Rachel Liu | 1 | Portfolio identifies Rachel Liu and retains its TCG Work section. |
| 坊橋夜泊 | 3 | Bahamut redirects to the matching owner profile; X and Patreon retain the artist name and account relationship. |
| TaroTarou | 4 | Link hub retains the exact X, Instagram, and Facebook destinations. X and Instagram link back; Facebook shows 芋太郎TaroTarou behind a login prompt. |
| fuzichoco | 2 | Official website retains the Facebook link; Facebook shows 藤ちょこ(fuzichoco) behind a login prompt. |
| Dragonart Antilous | 3 | Studio gallery identifies Antilous; X links to Dragonart course work and Instagram identifies Antilous with DragonArt in the biography. |
| Dragonart 白霜搽 | 1 | Instagram identifies 白霜搽, matching the exact name and destination on the studio roster. |

Key ownership sources remain the [Hanh Chu account hub](https://hanhchu.carrd.co/), [Gyool account hub](https://linktr.ee/gyool), [Pinakes portfolio](https://www.pinakes.me/), [TaroTarou account hub](https://lit.link/en/TaroTarou), [fuzichoco official website](https://www.fuzichoco.com/), and [Dragonart roster](https://www.dragon-art.tw/7th). Existing commission-to-credit evidence remains in the discovery tracker. Login restrictions do not establish that an account is unavailable or has changed ownership.

Artist Pages is approximately 95% complete for the first release: implementation, initial discovery, local acceptance checks, and account-destination review are complete. Next is deployment when requested, followed by the production directory → artist → exact printing → artist/account journey and real transport recovery checks. Broader identity resolution remains a separate backlog with uncertain duration.

Release validation: the app production build passes, including TypeScript compilation and 1,895 generated deck entry pages. The reviewed directory still contains 24 unique account URLs across ten identities. No application code or curated account data changed in this review.


### Primea studio account 2026-10-14

Added [Primea Studio’s X account](https://x.com/primeastudio), identified by the user and explicitly linked from [Zeklewa’s Art Director biography](https://x.com/Zeklewaaa). Zeklewa’s personal account remains evidence rather than a studio link or portrait. The studio’s zero-post profile has no selected custom avatar, so its page retains initials. The separate A068 credit remains unmerged. Coverage is now 25 verified URLs across eleven identities; portrait coverage remains 9/75.

The user reports deployment complete. Production journey verification remains outstanding, and this follow-up requires the next release to appear publicly. Artist Pages remains approximately 95% complete for the first release; further identity discovery is an open-ended backlog. Next research priority is Parhelion, followed by specific portfolio candidates.

Verification: app typecheck and all three artist regression tests pass. The studio link is present at 360px and 1280px with no horizontal page overflow; its mobile target is 48px high. Keyboard tabbing from the link reaches card search with visible focus. No interaction code changed; loading, empty, and failure states retain the preceding release-check coverage. Browser counts use the local cached catalog, so printing totals can differ from the committed research snapshot.


### Remaining artist discovery follow up 2026-10-14

Completed representative-artwork searches for all 64 remaining credit entries and inspected the strongest portfolio leads. Added Faicha’s [official X account](https://x.com/faicha2010) and its illustrated profile avatar after the commissioning client explicitly connected the account to Corhazi Courier; original Grand Archive posts corroborate that relationship. Patreon remains withheld without a verified cross-link.

Current coverage: 26 verified URLs across 12 identities, 10 portraits across 75 pages, and 63 credit entries still without verified accounts. Parhelion/Ge-B, Deeya Chaturvedi, Siriuf Long, and KHΩA have preserved primary leads but still need a specific Grand Archive commission connection. The discovery tracker records all 64 artwork queries and outcomes.

Artist Pages remains approximately 95% complete for the first release: implementation and local acceptance work are complete, while production journey and real transport recovery verification remain. This follow-up search pass is complete; full identity coverage remains open-ended, with only 12/75 identities (16%) having verified accounts. Next is an artwork match for the preserved portfolio leads, or additional publisher/user attribution evidence.

Verification: app typecheck, all three artist regression tests, and diff checks pass. Faicha’s avatar loads at 360px and 1280px without horizontal overflow; the official account link is 48px high, and keyboard tabbing reaches card search with visible focus. Loading was observed during initial page load; empty, image-failure, and retry states retain the prior release-check coverage and were not forced again for this data-only change. Production behavior remains unverified.


### YOHAKU candidate 2026-10-14

Saved the user-supplied [@YH_0w0](https://x.com/YH_0w0) lead under A047. The readable profile and its reciprocal [POTOFU hub](https://potofu.me/yohaku0w0) establish an illustrator named YOHAKU / 여백, but inspected material does not establish the Grand Archive credit connection. No public account or portrait was added. Next is an exact match against one of the four credited cards or a publisher cross-link. Current totals remain 26 verified URLs across 12 identities and 10 portraits; research statuses are 13 verified credit entries, 24 no-link outcomes, and 39 needing identity review. Artist Pages remains approximately 95% complete for its first release, pending production journey and real transport recovery checks; broader identity resolution has uncertain duration. Documentation-only change; verified the original profile and hub in the browser and checked the diff.


### Roro Wu identity 2026-10-14

Added the user-supplied X and Pixiv accounts for 阿清Roro and the X profile avatar. The original profile combines 阿清 and Roro Wu, while an original Bahamut artwork post by 阿清 explicitly lists both supplied accounts as personal links. The catalog identity is a strong inference from this name/account evidence and the user lead; an exact card match is no longer mandatory. Pixiv ownership is supported by the original post, but destination content remains uninspected because retrieval failed and the prior browser restriction was respected.

Coverage is now 28 official URLs across 13 identities and 11 portraits across 75 pages. Next recommended work is applying the same broader standard to the preserved YOHAKU lead. Artist Pages remains approximately 95% complete for the first release, pending production journey and real transport recovery checks; further identity coverage remains uncertain.

Verification: app typecheck, all three artist regression tests, and diff checks pass. At 360px and 1280px the avatar loads and the page has no horizontal overflow; both mobile account links are 48px high, and keyboard navigation reaches Pixiv with visible focus. Initial loading was observed. Empty and failure/retry states were not forced again for this data-only update and retain the prior release-check coverage. Pixiv destination content and production behavior remain unverified.


### 砂木烟 user attribution 2026-10-14

Added the user-supplied [Pixiv profile 62728045](https://www.pixiv.net/en/users/62728045) to 砂木烟’s page using the agreed allowance for direct user identification. This account is user-attributed, not independently verified: web retrieval failed, searches supplied no corroboration, and browser inspection was rejected by the site-safety policy. No workaround was attempted. The page retains initials because no profile image was inspected.

Published coverage is 29 URLs across 14 identities: 28 independently supported URLs plus this user-attributed destination. Portrait coverage remains 11/75. Next is the preserved YOHAKU account update under the broader identity standard. Artist Pages remains approximately 95% complete for the first release, pending production journey and real transport recovery verification; full identity coverage remains uncertain.

Verification: app typecheck and all three artist regression tests pass. The exact Pixiv link appears at 360px and 1280px without horizontal overflow; its mobile target is 48px high, and keyboard tabbing reaches card search with visible focus. Initial loading was observed; empty and failure states were not forced again for this data-only update. Pixiv inspection and production behavior remain unverified.


### 砂木烟 supplied portrait 2026-10-14

Added the user-supplied cat-in-witch-costume profile image to 砂木烟’s page. The second, unobscured screenshot was cleaned with the built-in image editor to remove the surrounding screenshot border, then resized for the avatar. The unedited screenshot is preserved beside the derived asset for provenance. No additional Pixiv access was attempted. Portrait coverage is now 12/75 (16%).

Artist Pages remains approximately 95% complete for the first release: local implementation is complete, with production journey and real transport recovery checks outstanding. Next is the preserved YOHAKU account update; further identity coverage remains open-ended.

Verification: app typecheck, all three artist regression tests, and diff checks pass. The 400px avatar loads on 360px and 1280px artist pages with no horizontal overflow. This asset-only change does not alter controls; keyboard/touch and empty/error/retry behavior retain the preceding account-update checks and earlier release checks. Production behavior remains unverified.

### YOHAKU and KHΩA identities 2026-10-14

Published YOHAKU’s six artist-owned hub/account links and KHΩA’s X and linked VGen, using the user identifications plus matching professional profiles. Added both original profile portraits. Catalog mapping is inferred from these signals, without an exact artwork-match claim. Coverage is 37 URLs across 16 identities and 14/75 portraits.

Verification: app typecheck, three artist regression tests, and diff checks pass. Both artist pages show loaded portraits at 360px and 1280px without horizontal overflow. All eight account targets are 48px high on mobile; keyboard navigation reaches VGen with visible focus. Loading was observed. Empty/error/retry states retain earlier release checks and were not forced for this data-only update. Production and real transport recovery remain unverified.

Next: reassess SiriufLong’s linked artist account cluster under the broader identity standard. Artist Pages is approximately 95% complete for the first release, with local implementation complete and production journey/recovery checks remaining. Identity discovery is open-ended; 16/75 identities now have published links.

### Sineia Facebook 2026-10-14

Added the user-identified Facebook imstupidegg account. The original destination shows Sineia Yu, but a login overlay limits independent inspection; attribution is recorded as user-supplied. Retained initials. Coverage: 38 URLs across 17 identities; 14 portraits.

Verification: three artist regression tests and diff checks pass. At 360px and 1280px, the exact Facebook link appears without horizontal overflow. Mobile link height is 48px; keyboard navigation reaches search with visible focus. Loading was observed. Empty/error/retry states were not repeated for this data-only change; prior checks apply. Production remains unverified.

Next: reassess SiriufLong’s artist-owned account cluster. Artist Pages remains approximately 95% complete for the first release, with local implementation complete and production journey/recovery checks outstanding. Full identity discovery has no fixed completion scope; 17/75 identities have published links.

Sineia portrait follow-up: closing the login overlay revealed the public digital creator profile and original illustrated avatar. Added the unmodified downloaded avatar and individual kind. Portrait coverage is 15/75 (20%). The catalog match remains user-attributed. App typecheck and artist tests pass; the 480px avatar loads at 360px and 1280px without horizontal overflow.

### SalmonTea account lead 2026-10-14

Added the user-supplied likely X match, its directly linked Pixiv account 98907368, and original profile portrait. Matching name and illustration posts support an inferred catalog connection; an independent Grand Archive commission was not established. Research records retain user-attributed status. Pixiv was not navigated. Coverage is 40 URLs across 18 identities, including four URLs across three user-attributed identities; portraits 16/75.

Next: reassess SiriufLong’s artist-owned account cluster. Artist Pages remains approximately 95% complete for first release, pending production journey and real transport recovery checks. Full identity discovery remains open-ended; 18/75 identities have links.

Verification: app typecheck, all three artist regression tests, and diff checks pass. The 400px portrait loads at 360px and 1280px, with no horizontal overflow. Both mobile account targets are 48px high; keyboard focus reaches Pixiv with a visible outline. Initial loading was observed. Empty/error/retry states retain previous release checks and were not repeated for this data-only update. Production and Pixiv destination content remain unverified.


## Artist spelling consolidation 2026-10-14

The user confirmed that DragonArt 白霜茶, 白霜茶, and Dragonart 白霜搽 refer to the same artist and that Dragonart Tris / DragonArt Tris are one person. Consolidated those credits into a063 and a043 respectively. The shared 白霜搽 page retains its verified Instagram account and original portrait. Also consolidated case-only Primea Studio / Primea studio (a001), case-only DragonArt Chu / Dragonart Chu (a030), and spacing-only Dragonart / Dragon Art (a004). These are explicit curated aliases; no automatic fuzzy matching is applied to new credits.

All original catalog credit strings remain intact. Removed directory entries are represented by slug aliases, so former artist URLs resolve to the combined gallery. Generic Chu remains separate from Hanh Chu and Dragonart Chu; Parhelion Studio / Parhelion Studio Co., 十尾 / 十尾t, and 道漫 / 道漫? remain unresolved. This supersedes earlier instructions to keep the five confirmed groups separate. Coverage is 69 identities, 40 account URLs across 18 identities, and 16 portraits.

Verification: all three artist tests pass, including exact printing preservation, merged identities, retained URL aliases, and distinct uncertain credits. Mobile 360px and desktop 1280px checks show the old 白霜茶 URL with Instagram, portrait, and 23 cards / 30 printings; the old Tris URL shows 8 cards / 9 printings. No horizontal overflow; the Instagram target is 48px high and keyboard search focus is visible. Loading was observed. Error/retry coverage remains from prior release checks; it was not repeated for this consolidation. Production remains unverified.

Next: resolve the remaining ambiguous spellings before continuing SiriufLong discovery. Artist Pages remains approximately 95% complete for the first release, with production journey and real transport recovery checks outstanding. Identity discovery remains open-ended.

App typecheck passed. Directory search returns one Tris entry, and an unmatched query shows the empty state.
