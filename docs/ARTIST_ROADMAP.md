# Artist pages roadmap

Make Grand Archive illustrators discoverable through dedicated artist pages, credited card artwork, and verified links to their official accounts. Complete discovery for every catalog credit one at a time, preserving evidence and unresolved identities in the [artist discovery tracker](ARTIST_DISCOVERY.md).

## Scope and current progress

Planning and the discovery queue are established. Discovery has been attempted for 1/76 entries, with A001 awaiting identity review and 0/76 resolved, covering 84 exact catalog credit strings after consolidating surrounding whitespace. Page implementation has not started. Artist Pages is approximately 10% complete: the existing foundation and delivery plan are ready; identity discovery, directory data, UI, and launch verification remain. Discovery effort depends on account visibility and ambiguous credits.

The first release includes a searchable artist directory, dedicated artist pages, galleries of the printings credited to each artist, and verified external links. All credited artists remain eligible for pages even when no official links are found. Biographies, social feeds, artist-managed profiles, and direct artist outreach are outside this release.

## Milestone 1 Complete artist discovery

Work sequentially through the tracker. Begin with A001, Primea Studio, then continue in queue order. Finish and record each entry's outcome before starting the next; an unresolved identity can be recorded as Needs identity review so it does not block unrelated artists.

- [x] Inventory all current credit strings and create the discovery queue.
- [x] Define research outcomes and the evidence required for official links.
- [ ] Research every entry individually, including individuals, studios, and combined credits.
- [ ] Resolve supported aliases and studio/member relationships without assuming that similar names identify the same artist.
- [ ] Record official websites, portfolios, and social profiles with ownership evidence and verification dates.
- [ ] Record no-result searches and identity blockers explicitly.
- [ ] Reconcile the completed queue with a fresh catalog snapshot and add newly encountered credits.

**Acceptance:** every queue entry has a reviewed outcome and evidence record; no entry remains Not started or In progress. Needs identity review entries have explicit next actions and remain unresolved. Report research coverage and verified-link coverage separately: discovery does not require finding a social account for every artist.

## Milestone 2 Establish the curated directory

Keep curated identities and account links separate from the refreshed card catalog. Research records retain candidates and rejected accounts; the public directory contains verified links only.

- [ ] Define shared artist identity, alias, link, and credited-printing types.
- [ ] Create a curated directory with stable IDs/slugs, display names, individual/studio/combined identity, exact credit aliases, and verified links.
- [ ] Retain per-link platform, label, canonical HTTPS URL, evidence source, and verification date.
- [ ] Establish a versioned mapping from exact catalog credits to artist identities; preserve unresolved credits under their own identity rather than losing their artwork.
- [ ] Derive card membership and counts from edition credits using shared logic; keep unique cards distinct from printings.
- [ ] Validate duplicate IDs/slugs, conflicting aliases, URLs, missing credits, and refresh behavior. Report unmapped new credits for discovery.
- [ ] Establish redirects when a supported merge changes a published artist URL.

**Acceptance:** every credited printing resolves to a curated or unresolved identity, the same credit cannot silently map to competing identities, and catalog refreshes retain curated accounts. Regression fixtures cover whitespace/case variants, non-Latin names, studio/member distinctions, missing credits, and one card illustrated by multiple artists across printings.

## Milestone 3 Build artist pages and discovery

- [ ] Add `/artists` with search, artist names, representative credited artwork, and unique-card counts.
- [ ] Add `/artists/:slug` with the credited name, official links, visible counts, and a responsive card gallery.
- [ ] Use `CardArtTile` or `VisualCardTile`; show the exact artist-credited printing and readable card name. Group multiple credited printings of a card with explicit printing choices rather than hiding their artwork.
- [ ] Link artwork to the card details with the corresponding printing selected, extending the existing selection URL contract if needed.
- [ ] Replace the CardHero artist-filter link with the relevant artist page; preserve `/cards?artist=...` browsing behavior for existing links.
- [ ] Add artist discovery to the Cards navigation and contextual browsing entry points.
- [ ] Show named, accessible external links and omit the links region when none are verified.
- [ ] Reuse shared controls and existing theme; maintain 48px touch targets, visible keyboard focus, and wrapping layouts beginning at 360–390px.
- [ ] Provide loading, empty, failure/retry, unknown-artist, and missing-art states without hiding useful navigation.

**Acceptance:** a player can open an artist from a specific card printing, identify their other credited artwork, and follow a verified account on mobile and desktop. Artists without accounts still have useful pages. No gallery presents another artist's default printing as the credited artwork.

## Milestone 4 Verify and release

- [ ] Add artist URLs and directory navigation to the sitemap and appropriate page metadata.
- [ ] Check filtering, aliases, counts, deep links, unresolved identities, and printing-selection behavior with representative data.
- [ ] Verify the main flow at 360–390px and desktop, keyboard access, 48px controls, focus, text enlargement, and overflow.
- [ ] Exercise loading, empty, error/retry, long/non-Latin names, missing artwork, unknown slugs, and no-social-link states.
- [ ] Run checks appropriate to changed app/shared/pipeline boundaries and record any verification limitations.
- [ ] Recheck published links before release; remove or withhold accounts whose ownership remains unresolved.
- [ ] Record implementation completion separately from deployment and production verification.

**Acceptance:** the integrated site meets the UI and data criteria, only verified accounts are published, and deployment plus the production artist-to-card-to-account journey are verified. Unresolved identities and unavailable accounts remain explicit research follow-ups and do not become invented official links.

## Ongoing upkeep

Catalog refreshes should surface new credits without overwriting curated research. When an account changes, record fresh evidence and the review date; broken or uncertain links are withheld until reverified. Keep redirect history for renamed or merged artists. Future recurring checks or notifications require a separate scheduling request.

## Next work

Research A002, 木叶, next. A001, Primea Studio, has an evidence record but needs primary evidence connecting its credited identity to official accounts; no links are verified. This does not block other entries. The main uncertainty is whether each credit can be connected to a publicly verifiable identity and official accounts.
