# Deck and collection experience roadmap

Updated October 1, 2026. This records the implementation baseline and verification scope. Existing working features are retained rather than reimplemented.

| Phase | Existing baseline | Changes in this implementation |
| --- | --- | --- |
| Shared foundations | Button, Panel, Tabs, DialogSheet, 48px control token, reduced motion and collection vocabulary | Stronger selected pill state, restrained feedback animation, button refs for focus restoration, explicit expressive guidance in UX_PATTERNS |
| Deck previews and details | DeckPreviewCard adapters for official products, event lists, tournament favorites, public/community decks and popular results; main card sorting; persistent legality warnings | Larger lead art and titles, quieter footer surface, champion first in saved deck strips, explicit primary action and accessible inline secondary actions on saved builds |
| Collection readiness | Quantity filters, ownership editing, missing card shopping/acquisition, Undo, locations, loans, reservations and explicit transfer review | Shared deckLocationSummary, separate owned/available progress, blockers and direct card location links, visible refresh failures, one location controller per deck panel |
| Organization and importing | Private flexible folders, official products separated from favorites, optimistic revision checks, import parsing and canonicalization | Shared importer sheet and keyboard tabs, card previews in selection and review, draft protection, confirmation footer, focus restoration, optional favorites failure notice and distinct empty search state |
| Mobile Goldfish | Card play area, turn controls and tool sheets | Direct Memory/Material controls, latest action feedback, measured footer clearance and focus scrolling space |
| Notifications and homepage | Toast queue with Undo/retry, dialog host, persistent legality warnings, collection homepage section and draw adjusted consistency example | Restore focus after toast actions, restrained toast entry, homepage copy distinguishes ownership from availability |

## Acceptance evidence

App and shared typechecks passed. App lint passed with six existing Fast Refresh warnings. All 45 focused regression tests passed.

Follow-up release verification passed the production build (`npm run build`, including the app typecheck) and 32 additional tests: 15 account persistence tests for collection tracking, collection updates and folders, plus 17 app tests for collection notifications, save queues, batch calculations and quantity drafts. Account tests use in-memory SQLite with real migrations and transactional batches. They cover rollback, duplicate retries, concurrent revision conflicts, loan returns and assignment conservation. Notification tests simulate local and peer events; these do not replace signed-in browser or deployed D1 verification.

Automated checks cover preview counts and unknown lists, import identity preservation, collection completion and shopping quantities, location transfers and loan returns, simulator replay and payments. New coverage tests distinguish purchases, unavailable owned copies, transfers, sideboard scope, unresolved catalog names, reconciliation, normalized names, multiple printings and proxies.

Browser checks at 360px, 390px and 1280px used a temporary local fixture rendering real components with mocked account reads. Verified narrow mobile and desktop layouts, no horizontal overflow, minimum control heights, card name fallbacks, expanded source details, saved deck secondary actions, importer keyboard tabs and draft dismissal, import confirmation, collection refresh failure/recovery, and Goldfish draw feedback and tool sheets. The fixture was removed after verification.

## Release verification still required

* Signed-in end-to-end acquisition, Undo, quantity edits, loan return and transfer writes against the deployed account service.
* Cross-tab updates with real accounts and concurrent revision conflicts.
* Physical mobile keyboard behavior and assistive technology announcements. Browser geometry and keyboard checks do not replace device or screen-reader testing.
* Production deployment smoke checks after an explicitly requested commit and push.

The original consistency pass did not change game formulas, legality rules, recommendation acceptance behavior or persistence schema.

## Expressive design follow-up

The first expressive implementation focuses on My Decks, saved deck details and collection progress:

* Champion artwork, readable card names and consistent decorative accents in saved deck cards and prominent headers. Saved deck details resolve their actual material Champion before falling back to representative art.
* Private folder cover cards and four theme accents, with a live preview, searchable card choices, a plain cover option and a progressively disclosed folder gallery. Preferences save atomically with membership; omitted preferences preserve existing appearance for older membership clients.
* Larger ownership and availability counts, restrained progress transitions and an explicit completion message that still explains loans, reservations and transfers. Unknown data and reconciliation issues suppress completion. Reduced motion remains supported.
* Save errors stay in the folder editor footer, alongside retry, so an expanded card picker cannot hide them. Existing folder success toasts remain in use.

Verification: 14 focused tests passed, including appearance rollback, create/update retries, competing creates, stale edits, duplicate names, input validation and completion-state accuracy. App, shared and account-worker typechecks passed; lint retained its six existing Fast Refresh warnings. Real components were checked with a temporary mocked-write fixture at 360px, 390px and 1280px: card artwork and name fallbacks, long titles, expanded editor, empty library/search, save pending/failure, draft protection, saved preview, keyboard color choice, focus restoration, touch targets and horizontal overflow. Temporary fixtures were removed. Physical keyboard/screen-reader and deployed account verification remain outstanding.

Deployment order: apply account-worker migration `0030_deck_folder_appearance.sql`, then deploy the account service and frontend. This follow-up is not deployed. Later expressive work can address Goldfish card/zone motion, analysis result hierarchy, and broader empty-state compositions.

### Automatic analysis results

Implemented a default Results report without required card selection: opening size, both play orders
at fixed checkpoints, individual and duplicate access, printed costs, detected lineage, separate draw
estimates, and reviewed plan access. Card previews link to details and prefill the advanced odds tool.
The previous conditional and highest duplicate headline cards are removed. Scenario tools remain in
Advanced calculators; Matchups retains its own evidence surface.

Remaining deeper work: consolidate overlapping detailed scenario interfaces, validate broader engine
mechanics before automatic strategic inference, and connect next draw scenarios to Goldfish state.
These do not block the automatic report. No overall consistency grade is introduced.

### Analysis workspace consolidation

Advanced analysis now uses one question selector organized into Draws, Game plan, Timing, and
Changes. Related detailed models sit alongside their matching quick estimate instead of repeating
as a second stack of calculators. Resource and sideboard models have their own questions. The
separate Analysis play sequence panel is consolidated into the persistent quick tool, including
its delayed comparison, per-turn pressure, Floating Memory disclosure, and Combo Lab link.

Selected cards lead the result surface using shared artwork tiles. Pool selection uses CardResult,
search, selection labels, and progressive card browsing. Prominent results use the expressive
surface style without assigning a strategic grade. Methodology is specific to the current question.
Quick selections retain the existing storage key. Detailed models mount on first use and retain
local drafts when changing topics, Results tabs, or following a card from the report. Detailed
scenario settings remain distinct from quick estimates and are labeled accordingly.

Verification: 34 calculation regressions passed. Local component fixtures checked narrow mobile
and desktop layout, keyboard topic navigation, empty search and sideboard, retained selected cards,
detailed recipe draft retention, report handoff, and expanded sequence resources. Card image delivery
was unavailable in the local fixture; readable fallbacks were verified. Device keyboard and screen
reader checks remain part of release verification.

### Draw pattern review follow-up

The Analysis unwanted-draw detail view now separates repeated copies and printed conditions into
peer tabs with retained checkpoint state. Both use shared card art, readable names, neutral enlarged
probabilities, and consistent disclosures. Printed conditions no longer receive an unsupported
Low/Moderate/High pressure verdict. Missing catalog records and empty results are explicit.
Duplicate results retain their exact table and CSV export with visible clipboard failure recovery.
Calculation formulas are unchanged.

Verification: app typecheck and lint passed (six existing Fast Refresh warnings); nine Analysis
regression tests passed. Temporary component fixtures checked 360px and 1280px layout, 48px targets,
keyboard tabs, retained checkpoint selection, expanded exact values, empty results and missing
catalog notices. No page overflow was observed. Real card image delivery, clipboard failure UI,
physical mobile keyboard and screen-reader behavior were not verified. Fixtures were removed.

## Page by page expressive design checklist

Planning inventory dated October 1, 2026, based on `app/src/routes.tsx`, the shared interaction
patterns, and the implementation evidence above. Unchecked items are proposed work, not confirmed
visual defects. This is not a completed browser audit of every page. Existing foundations should be
extended, not rebuilt. Redirect routes inherit the checklist for their destination.

### Acceptance criteria for every page

* [ ] Establish one clear focal point with useful art, a meaningful result, or the immediate task.
* [ ] Use the shared type hierarchy, rounded surfaces, spacing and controlled accents. Decorative
  accents must remain distinct from status, legality, game elements and statistical confidence.
* [ ] Keep card names visible and known cards linked. Use shared card tiles and a readable fallback.
* [ ] Use motion only to explain a user action or state change, with a reduced motion equivalent.
  Avoid perpetual movement, delayed actions, layout shifts and animation on every result update.
* [ ] Preserve drafts, filters, URL state, scroll context and focus across view changes.
* [ ] Provide relevant loading, empty, partial-data, failure and recovery states. Success emphasis
  must reflect confirmed state, never an optimistic save or incomplete catalog coverage.
* [ ] Verify 360px, 390px and desktop layouts, 48px targets, keyboard navigation, text zoom,
  long names, image fallbacks and no page overflow. Verify image delivery separately from fallback.
* [ ] Check reduced motion, contrast, screen reader announcements and physical mobile keyboard
  behavior where relevant. Record unavailable checks explicitly.

### Wave 1: Core player workflows

Existing baseline: saved deck identity, folder covers and accents, shared immutable deck previews,
collection coverage, automatic Analysis results, question navigation and draw pattern review.
The following are additional tasks or explicit verification of remaining surfaces.

| Done | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| [ ] | Homepage `/` | Give collection tracking equal visual importance to deck tools; show concrete examples of loans and shared copies; establish a clear hierarchy among collection, building and analysis entry points. Retain the draw adjusted example. |
| [ ] | My Collection `/collection` | Lead with a useful collection overview and recognizable cards; give quantity edits clear local feedback; distinguish owned, available and missing states with labels; give first import and empty search distinct next actions. |
| [ ] | Card locations `/card-locations` | Make the selected card the visual anchor; group binder, deck, loan and trade locations clearly; emphasize the next useful action and show transfer/return outcomes without obscuring quantities. |
| [ ] | My Decks `/decks/edit` | Refine folder gallery rhythm, selected folder state and empty folders; verify existing covers/accents across long names, missing art and official product tabs; keep creation and import easy to find. |
| [ ] | Saved deck `/decks/:id` (owned UUID) | Carry deck identity through editing, collection and tool handoffs; distinguish saved, draft and failed-save states; improve section counts and local edit feedback without hiding legality warnings. |
| [ ] | Deck Builder `/deck-builder` | Keep champion and current deck visible before recommendations; clarify selected cards versus suggestions; add restrained add/move/remove feedback and an obvious next action; preserve drafts and copy conservation. |
| [ ] | Analysis `/deck-analysis` | Extend card-led result hierarchy to custom hand, plan, level, pressure, recovery, resource and sideboard models; evaluate redundant setup; preserve assumptions near results and evidence on demand. No unsupported quality grade. |
| [ ] | Deck Review `/deck-review` | Organize findings by actionable question; lead each proposed change with affected cards and rationale; distinguish advice from accepted edits and retain an explicit accept action. |
| [ ] | Goldfish `/goldfish` | Make active turn, hand and zones visually distinct; add brief draw/play/move feedback with a reduced motion alternative; keep frequent controls reachable and preserve actual game state during tool use. |
| [ ] | Card browser `/cards` including By Set | Strengthen art and selected-filter hierarchy; make browsing, selection and empty search states recognizable; preserve search and position when returning from details. |
| [ ] | Card detail `/cards/:slug` | Verify prominent mobile art and simplify image inspection; organize printing choice, legality, ownership and statistics around the card; keep data gaps visible. |
| [ ] | Compare `/compare` | Give each deck equal identity and stable comparison order; emphasize shared cards and differences using named card groups; use labels alongside color and preserve meaningful mobile comparisons. |

### Wave 2: Discovery and deck sources

| Done | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| [ ] | Tournament decks `/decks` | Refine shared preview spacing across sightings and builds; make source, date and filter scope clear; give empty filters a direct recovery action. |
| [ ] | Tournament deck `/decks/:id` (hash) | Anchor with champion and source; emphasize event context and deck identity before dense evidence; keep collection, compare and analysis handoffs consistent. |
| [ ] | Shared decks `/decks/shared` | Use shared previews with clear author context; balance browsing density and art; distinguish no published decks from no matching results. |
| [ ] | Public deck `/decks/:id` (public slug) | Preserve author and version identity alongside art; distinguish public viewing from personal copies; make copy and collection actions discoverable. |
| [ ] | Community overview `/community-decks` | Show source and format with card-led entries; separate coverage summaries from individual deck previews; retain evidence limitations. |
| [ ] | Community search `/community-decks/search` | Keep query context visible with compact results; emphasize relevant card matches; make pagination, loading and no matches consistent with other searches. |
| [ ] | Pantheon community `/pantheon` | Carry the community patterns into the format-specific page with a visible format label and appropriate source context. |
| [ ] | Pantheon decks `/pantheon/decks` | Apply shared preview hierarchy and readable format context; check filter and empty states. |
| [ ] | Pantheon deck `/pantheon/decks/:id` | Match immutable deck detail hierarchy while retaining format-specific evidence and valid actions. |
| [ ] | Official decks `/official-decks` | Refine product identity within shared previews; keep product codes, release detail and full printed lists in details; save to the dedicated My Decks product tab. |
| [ ] | New card discovery `/card-discovery` | Lead with suggested cards and a concise reason; make relevance and evidence inspectable; preserve opt-in selection and distinguish new suggestions from current cards. |
| [ ] | Card packages `/cards/packages` | Make package identity recognizable through cards; label full pools, required cores and tested variants distinctly; keep package application explicit. |
| [ ] | Top cards `/cards/stats` | Emphasize card identity beside the primary metric; keep denominator, period and sample size visible; disclose secondary statistics progressively. |
| [ ] | Champions `/champions` | Use champion artwork as navigation identity; align ranking metrics and scope; support compact mobile browsing without hiding names. |
| [ ] | Champion synergy `/champions/:name` | Carry champion identity into card and package groups; separate observed relationships from recommendations and show evidence strength. |
| [ ] | Champion stats `/champions/:name/stats` | Establish a clear statistical overview with date/format context; prioritize meaningful trends and disclose detailed breakdowns. |
| [ ] | Trading binder `/looking-for` | Make wanted and offered cards unmistakable; show availability and reservation state; clarify the next action without equating ownership with availability. |

### Wave 3: Playtesting, plans and competition

| Done | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| [ ] | Combo Lab `/combo-lab` | Present participating cards and ordered actions as the focal point; distinguish configured assumptions from validated outcomes; keep editing and testing states clear. |
| [ ] | Public combo `/combos/:publicSlug` | Lead with cards, purpose and sequence; preserve author context and limitations; make copying into a workspace explicit. |
| [ ] | Match log `/match-log` | Make recording a result the primary task; retain deck/opponent identity; distinguish pending entry, confirmed save and aggregate results. |
| [ ] | Simulator `/simulator` | Differentiate setup, running, completion and failure; present results with sample size and model limits; make cancellation and retained inputs clear. |
| [ ] | Match timelines `/timelines` | Use clear match identity and preview landmarks; show source and available coverage before opening a timeline. |
| [ ] | Timeline detail `/timelines/:id` | Strengthen turn and action hierarchy, active selection and linked cards; preserve reading position during evidence inspection. |
| [ ] | Timeline combos `/timelines/combos` | Lead with involved cards and observed sequence; distinguish examples from generalized claims and link the source timeline. |
| [ ] | Diao review `/diao-review` | Clarify the review question, selected cards and supporting evidence; keep uncertainty and manual review decisions explicit. |
| [ ] | Archetypes `/archetypes` | Use representative cards to identify groups; emphasize membership and coverage; make filter scope and naming clear. |
| [ ] | Archetype detail `/archetypes/:id` | Lead with representative cards and identity; distinguish core from variable slots; disclose membership and statistical evidence. |
| [ ] | Archetype comparison `/archetypes/compare` | Align compared identities and metric definitions; keep small samples visible and differences readable on mobile. |
| [ ] | My archetypes `/archetypes/mine` | Give saved groups recognizable covers and clear draft/save states; preserve membership editing and recovery. |
| [ ] | Reference strategies `/archetypes/mine/reference` | Show the strategy's cards and purpose before configuration; distinguish user choices from reference evidence. |
| [ ] | Published strategies `/archetypes/strategies` | Use readable strategy previews with provenance; distinguish viewing from copying or editing. |
| [ ] | Battle chart `/battle-chart` | Strengthen selection and comparison focus; keep cells readable and keyboard reachable; pair color with values and sample size. |
| [ ] | Events `/events` | Improve date, location and event identity hierarchy; separate upcoming or historical context where supported by data; make filters and no matches clear. |
| [ ] | Event detail `/events/:id` | Lead with event identity and meaningful results; bring player/deck previews into standings; keep source and incomplete coverage visible. |
| [ ] | Seasons `/seasons` | Give each season a clear period and visual summary; distinguish active filters and available coverage. |
| [ ] | Season detail `/seasons/:slug` | Prioritize season context and major results; progressively disclose dense standings and trends. |
| [ ] | Players and judges `/players` | Make role, identity and search state legible; use consistent result cards without inventing portraits or status. |
| [ ] | Player profile `/players/:id` | Prioritize identity, achievements and recent decks; keep rankings tied to their source and period. |
| [ ] | Teams `/teams` | Emphasize team identity and membership grouping; improve mobile comparison and missing-data states. |
| [ ] | Regions `/regions` | Pair geographic context with clear coverage and sample sizes; provide readable alternatives to map-only interaction. |
| [ ] | Achievements `/achievements` | Use consistent badge hierarchy and meaningful categories; make earned or eligibility states explicit only where supported. |
| [ ] | Achievement detail `/achievements/:id` | Emphasize the achievement identity and criteria; keep recipient/evidence details accessible without celebratory noise. |

### Wave 4: Supporting pages and shared shell

| Done | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| [ ] | Thema leaderboard `/thema` | Pair printing/card identity with ranking context; use restrained emphasis and clear period/source labels. |
| [ ] | Thema history `/thema/:editionUuid` | Lead with the exact printing; give the trend a readable hierarchy and expose missing history or coverage gaps. |
| [ ] | Tags `/cards/tags`, `/cards/tags/:tag` | Give categories distinct readable identity; lead tagged results with cards and preserve navigation context. |
| [ ] | Card tagging `/cards/tagging` | Keep the card prominent beside the tagging task; clearly distinguish selected, suggested, saved and failed states. |
| [ ] | Pack opener `/packs/:prefix` | Use restrained reveal sequencing with immediate/reduced-motion access; show complete results and distinguish simulated contents from owned cards. |
| [ ] | Products `/products` | Strengthen product artwork and release hierarchy; make available detail and destination actions clear. |
| [ ] | Media kit `/media-kit` | Provide recognizable asset previews, readable usage information and clear download actions. |
| [ ] | Public user `/users/:profileSlug` | Highlight user-authored identity and published decks while preserving content policy and privacy boundaries. |
| [ ] | Account `/account` | Keep sign-in and account management calm and task focused; emphasize field errors and confirmed outcomes over decoration. |
| [ ] | Verify email `/account/verify-email` | Give pending, successful, expired and failed verification distinct messages and one relevant next action. |
| [ ] | Reset password `/account/reset-password` | Make form progress and validation clear; retain accessible errors and explicit completion. |
| [ ] | Settings `/settings` | Group preferences by purpose; use clear selected states and save feedback; avoid decorative hierarchy competing with controls. |
| [ ] | Changelog `/changelog` | Improve release/date rhythm and scannable feature summaries; use visuals only when they explain a change. |
| [ ] | API docs `/docs/api` | Improve reading hierarchy, code readability and navigation; keep technical reference content easy to scan and copy. |
| [ ] | Methodology `/methodology` | Organize around questions and calculation scope; distinguish examples, assumptions and limitations clearly. |
| [ ] | Not found `*` | Offer a concise explanation and useful recovery links with restrained visual identity. |
| [ ] | Shared navigation and route loading | Align active location, menu/disclosure affordances and 48px targets; check header/toast stacking, loading stability and mobile reachability. |
| [ ] | Shared dialogs, notifications and errors | Apply consistent shape, hierarchy and brief feedback; preserve focus, retry, Undo and dirty-draft protection; keep persistent problems inline. |

### Execution order and completion record

Start with My Collection and Card locations, then Card browser/detail, Builder and Goldfish. Continue
Analysis model simplification alongside that work. Follow with deck discovery and competition pages.
Supporting account and reference pages should receive restrained improvements proportionate to their
task. Shared component changes should be verified in representative consumers before broad rollout.

For each completed row, record the changed surfaces, verified states/viewports, accessibility checks,
remaining limitations and commit. A row is complete only after relevant verification, not after adding
art or changing colors. Formula changes, broader game-mechanic modeling and new cross-feature data
integrations remain separate work with their own validation; expressive styling does not validate them.

### Collection expressive design implementation, October 1

First implementation pass for My Collection and Card locations:
* Added a collection identity surface with readable owned totals, an explicit unsaved overview
  label, and direct import and location entry points.
* Added actionable empty search recovery in the collection and location browsers.
* Added shared pill tabs and associated panels to locations, preserving loan view state.
* Enlarged the selected card anchor in the location sheet while retaining shared quantity
  definitions, draft protection and the persistent save/error footer.
* Made import controls at least 48px tall and named the import text and quantity mode fields.

Verification: app typecheck passed; lint passed with six existing Fast Refresh warnings.
An isolated temporary account fixture verified 360px and 1280px layouts, long card names and
missing art, empty location search/reset, empty loan state, keyboard arrow navigation, modal
focus restoration, visible simulated save failure and the import handoff. Mobile overview
and location sheet had no horizontal page overflow; inspected action targets were at least
48px (the checkbox uses its enclosing touch label). Catalog loading and the live account
load failure were also observed. Fixture files were removed.

Remaining before checking off these two rows: live signed-in save/transfer/return journeys,
real card art in the revised sheet, physical mobile keyboard, screen reader and text zoom
checks, and broader local quantity feedback. This is the first roadmap slice, not completion
of every page. Included in the collection expressive design commit.

### Card browsing expressive design implementation, October 1

First card browser/detail pass:
* CardGrid now uses shared CardArtTile presentation, framed surfaces and wrapping card names.
  Card links and flip controls have 48px targets. Removed the hover scale movement.
* Browse uses pill selection, a single result summary with filter count and reset, and one
  actionable empty result message. Advanced filter loading failures expose retry.
* Set navigation wraps on narrow screens. Related browsing links have 48px targets.
* CardHero uses the identity surface and shows the selected printing's set, collector number
  and rarity without expansion. Edition names wrap in a larger two-column gallery.
  Price disclosure uses DisclosureChevron and its external action has a 48px target.

Verification: app typecheck and lint passed (six existing Fast Refresh warnings).
Real catalog browser checks covered 360px and 1280px layouts, empty search/reset, loaded artwork,
long card names, By Set layout and keyboard tab switching. Card detail checks covered Abnegation
and Dungeon Guide, the eight-edition expanded gallery, selection of Mortal Ambition, and keyboard
collapse. Inspected mobile grid actions met 48px height; inspected mobile browser, set view and
expanded detail had no page overflow. Local contribution failure remained visible.

Remaining: filter and scroll restoration after leaving the browser, full tab/panel association,
reverse-face and missing-art fixtures, advanced-filter retry simulation, text zoom, physical
mobile keyboard and screen reader checks. Ownership handoffs on detail remain a separate pass.
These rows remain open. Included in the card browsing expressive design commit.

### Goldfish zone presentation, October 1

Memory, banished cards, and materialized cards now show wrapping card artwork with visible names and links to card details. Each physical copy remains visible in session order. Empty Memory and Materialized zones explain their state. The hand heading, turn label, and zone counts have stronger visual hierarchy using existing theme surfaces.

Verified with a pasted test deck and real catalog art at 360 × 800 and 1280 × 900: empty Memory, reserve payment into Memory, random banishment, and materialization. Mobile zone controls and links met the 48px target, with no horizontal page overflow in the measured Memory view. Escape restored focus to the Memory button. Typecheck and lint passed with six existing warnings. The unavailable account library retained its visible error and paste alternative.

Remaining: full Builder expressive pass, physical keyboard and screen reader checks, text zoom, missing catalog fixtures, and broader session recovery verification. These page checklist rows remain open. No simulation rules or persistence were changed.
