# Deck and collection experience roadmap

Updated October 2, 2026. This records the implementation baseline and verification scope. Existing working features are retained rather than reimplemented.

## Active expressive design queue

Work through these six areas in order. This queue prioritizes the existing page checklist below;
it does not replace its unfinished acceptance checks. Inspect the current implementation first,
retain completed improvements, and implement each area in reviewable slices. Commit each verified
slice and report the next item. Push only when requested. All six areas are authorized for implementation.

1. [ ] **Deck discovery.** Start here. Give tournament, community, and official product browsing
   a cohesive visual hierarchy through the shared DeckPreviewCard. Lead with champion and material
   art, readable identity and source context, one clear list action, and useful empty or failed
   result recovery. Keep event evidence and product details distinct and progressively disclosed.
2. [ ] **Core workflows.** Refine My Decks folder navigation, draft and save feedback, collection
   quantity editing, and card detail ownership handoffs. Use selected cover art and contextual
   progress to communicate identity and state. Preserve drafts, visible failures, retry and Undo.
3. [ ] **Analysis and Deck Review.** Extend the result hierarchy into advanced models and review
   suggestions. Present the answer and relevant cards before optional inputs or evidence; retain
   calculators where automatic results would be misleading. Keep proposed changes distinct from
   selected cards and require explicit acceptance. Preserve formulas unless separately validated.
4. [ ] **Goldfish.** Strengthen active turn and zone hierarchy, readable card state and restrained
   action feedback. Keep common controls reachable on mobile, preserve session state, and ensure
   reduced motion and keyboard users receive equivalent feedback. Build on existing zone artwork.
5. [ ] **Related discovery and competition pages.** Apply the same expressive language to champion,
   package, archetype, comparison, event and player surfaces. Show cards and the main takeaway before
   evidence. Distinguish package pools from exact variants and keep comparison labels explicit.
6. [ ] **Supporting pages and shared shell.** Finish navigation, supporting pages, and shared
   loading, error and empty states. Provide clear next actions, consistent emphasis and accessible
   focus and status feedback. Audit shared changes across the earlier five areas for regressions.

For every slice, verify 360–390px and desktop layouts, relevant empty/loading/error/expanded states,
48px controls, keyboard access, focus restoration, overflow and reduced motion. Record evidence
and unresolved checks here. Track text zoom, screen reader, physical mobile keyboard and real
authenticated journeys explicitly; do not mark an area complete based on visual styling alone.
External verification blockers should remain visible while independent work proceeds in queue order.

Queue status: deck discovery presentation and empty search recovery implemented October 2, with
verification gaps recorded below. The first core workflow slice now covers My Decks folder navigation
and pasted draft/save feedback. Collection quantity editing and card detail ownership handoffs now
have their first pass too. Next is Analysis and Deck Review, beginning with review suggestion identity
and explicit acceptance. Core workflow acceptance gaps remain recorded below.
Discovery remains open for source failure recovery and acceptance checks. Earlier
implementation notes below remain the source of truth for completed work and verification limits.

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

### Builder editing hierarchy, October 1

The active shared deck editor now uses larger section headings and labeled copy counts. Compact cards show larger artwork, with quantity and move actions before optional evidence. Move and Remove use shared buttons with keyboard focus styling. Builder card statistics open in one disclosure, including the existing detailed evidence without a nested disclosure; catalog browsing retains its existing statistics presentation. Quantity controls stay within a readable width on desktop.

Verified at 360 × 800 and 1280 × 900 with a local Abnegation draft: compact and card art layouts, expanded statistics by keyboard, quantity changes, split move from Main to Sideboard with copy conservation, keyboard dismissal with focus restoration, and removal back to an empty draft. Measured mobile editing controls met 48px heights; the smaller checkbox uses its existing 48px label. No page overflow in measured mobile and desktop views. Ten deck editing and destination eligibility tests passed. Typecheck and lint passed with six existing warnings.

Remaining: authenticated My Decks editing and failed-save recovery, missing catalog and long-name fixtures, text zoom and screen reader checks, and the broader Builder identity/recommendation pass. The Builder checklist stays open. Included in the Builder editing hierarchy commit.

### Builder identity, October 2

The workbench header now presents a compact material preview using shared card art, prioritizing champion cards and keeping readable names and detail links visible. The preview shows at most three distinct names and explicitly labels additional material cards. Empty drafts explain how to begin. Mobile deck naming occupies its own row above Save and More, and draft copy explains the difference between this tab and My Decks. Save uses the shared Button.

Verified at 360 × 800 and 1280 × 900 with a pasted Lorraine draft: real material artwork, preview truncation, empty draft, loading save, failed save with deck and name retained, and keyboard expansion of More. Measured preview links and header controls met 48px targets, with no horizontal overflow. Typecheck and lint passed with six existing warnings.

Remaining: successful authenticated saves, browser recovery failure, missing artwork/catalog fixtures, screen reader and physical mobile keyboard checks. Recommendations already remain opt in with explicit card additions; broader recommendation presentation and connected workflow verification remain open. The Builder checklist remains open.

### Builder suggestion presentation, October 2

Optional suggestions now have an identity surface with the selected champion and Spirit, evidence source, collection preference, and explicit selection/add instructions. Suggested card statistics start collapsed so names and artwork remain prominent. The browser preserves recommendation order by default, including owned-card priority supplied by the controller, while retaining manual sorting. All-card browsing still defaults to alphabetical order.

Verified with a real catalog Lorraine draft at 360 × 800 and 1280 × 900: missing identity guidance, loading, ranked results, alphabetical sort and restoration, empty search, keyboard expansion of statistics and settings, and explicit addition. Selecting a card left the deck at seven copies; Add 1 each changed it to eight. No measured page overflow; suggestion settings controls met 48px targets. Typecheck and lint passed with six existing warnings; seven recommendation ordering and eligibility tests passed.

Remaining: authenticated ownership priority and collection error handling, broader recommendation source/error fixtures, screen reader and physical mobile keyboard checks. Collection was unavailable in the local session. No ranking formulas or persistence changed. The Builder checklist remains open.

### Builder collection recovery, October 2

Ownership dependent suggestions now wait for a successfully loaded collection instead of treating
unavailable inventory as empty or claiming owned priority without data. A visible status within the
suggestion context offers Retry collection and an explicit Show all cards fallback. Retry retains
the ownership preference; fallback focuses the card source control. The shared collection hook
supports retry while retaining its stale response protection and collection change subscription.

Verified real collection failure, retry loading, both ownership modes, expanded settings, keyboard
retry and fallback focus at 360 × 800 and 1280 × 900. Measured recovery buttons were 48px tall and
neither viewport overflowed. App typecheck passed; seven persistence, recommendation order and
collection event tests passed. Lint retained six existing Fast Refresh warnings.

Successful authenticated collection recovery and saves, populated ownership ordering, empty saved
inventory, recommendation evidence failures, physical mobile keyboard and screen reader checks
remain open. The local account service was unavailable. Save behavior was inspected but unchanged.

### Deck discovery identity and recovery, October 2

Shared immutable previews now use the existing identity surface, place the deck title before source
badges, and give main and sideboard counts explicit labeled emphasis. Unknown counts remain unknown.
Inline list actions use the shared Button and include the deck title in their accessible name.
Official, community and tournament build empty results offer a direct filter reset. Tournament
sorting uses 48px controls and the shared disclosure indicator. Product comparison guidance avoids
dashes. Source specific metadata, full lists and mutation behavior remain unchanged.

Verified real official, community and tournament build data at 360 × 800 and 1280 × 900: expanded
lists, keyboard expansion, empty search recovery, tournament reset from an unmatched champion,
and expanded sorting. Community detail loading and subsequent resolved sideboard count were observed.
Measured preview actions and tournament sorting controls were 48px tall; measured expanded views
had no horizontal page overflow. Typecheck and lint passed with six existing Fast Refresh warnings.
No formulas or persistence changed, and no new motion was introduced.

Remaining: source failure/retry fixtures, empty archive distinction, missing art fixtures, text zoom,
reduced motion browser verification, screen reader and physical mobile keyboard checks, plus
authenticated action handoffs. Tournament result filters and broader shared preview consumers need
their own regression pass. The discovery area remains open; this completes its first queued slice.

### My Decks folders and pasted drafts, October 2

Folder covers can be searched by folder or cover card name, with direct empty search recovery.
Opening a folder moves focus to the persistent folder selector. All builds provides a direct return.
Folder selection and deck search take a full row on mobile. Empty folders and filtered out builds
have distinct guidance; clearing a search restores focus. Library tabs use the shared pill emphasis.

Pasted decks show an identity preview with named card art and links that open separately. Save and
failure feedback now live in the sheet's persistent footer. Pending saves disable editable fields.
Closing retains the parent owned draft on this page, and Resume pasted deck reopens it. Other ways
to add keeps import available without clearing that draft. Old action error toasts are dismissed
when reopening or switching add methods. Existing save requests and persistence are unchanged.

Verified real components with a temporary isolated account fixture at 360 × 800 and 1280 × 900:
long folder names, cover art, plain cover, folder search/reset, empty folder, selected folder return,
deck search recovery, and keyboard focus after folder navigation and search reset. Pasted deck
loading, simulated save failure, retry success, close/resume, and switching add methods retained
the draft. The mobile save footer stayed within the viewport with a 48px action. Measured views
had no horizontal overflow. The temporary fixture was removed. Typecheck and lint passed with
six existing Fast Refresh warnings; four folder and edit session regression tests passed.

Remaining: real authenticated writes, folder loading/failure and pagination fixtures, screen reader,
text zoom, reduced motion browser checks and physical mobile keyboard behavior. Draft retention here
is limited to this mounted page; it is not durable storage across reloads or navigation. Existing saved
deck editing recovery remains separate. The core workflow queue item stays open.

### Card ownership and collection quantity handoff, October 2

Card details now show saved physical ownership and separate proxy counts across printings, using
shared collection aggregation. Loading and failed reads never show zero ownership. The panel offers
retry, an edit link scoped to the card, and its locations and loans link. Ownership remains distinct
from availability, with the shared explanation visible.

The collection accepts the card UUID handoff, selects all ownership states, filters to the card name
and opens its quantity sheet once that card resolves. The sheet has larger artwork, a labeled draft
quantity, and a persistent Review quantities action into the existing batch review/save flow.
Review remains available when an unconfirmed save locks editing. Card details and location links
from the sheet open separately so the collection draft stays mounted. Existing quantity staging,
request identifiers, retry behavior and persistence are unchanged.

Verified real components with isolated account data at 360 × 800 and 1280 × 900: two unspecified
copies plus one printing showed three owned and one separate proxy; completing the playset staged
one unspecified copy and preserved the printing/proxy quantities. The targeted editor, review,
save rejection, retained draft and subsequent successful retry worked. Loading, unavailable counts,
retry and recovery were observed. Sheet fields, disclosure and footer actions measured 48px; measured
mobile and desktop views had no horizontal overflow. Real card detail also showed the unavailable
account recovery controls at 360px. Temporary fixture files were removed. Typecheck and lint passed
with six existing Fast Refresh warnings; 14 collection regression tests passed.

Remaining: real authenticated writes and cross-tab refresh, signed-out sign-in round trip, invalid
card handoff guidance, missing artwork fixtures, text zoom, reduced motion browser verification,
screen reader and physical mobile keyboard checks. The broader core workflow item remains open.

### Deck Review expressive swap proposals (2026-10-02)

- Shared review swap presentation now uses CardArtTile, readable full names, prominent copy counts and explicit removal/set labels. Mobile stacks the proposal; desktop compares cards side by side.
- Accept and keep actions use shared 48px Buttons. Evidence uses the shared disclosure indicator, with source limitations visible. Unequal copy counts are flagged without claiming a predicted improvement or changing ranking/mutations.
- Verified isolated component at 360px and 1280px: missing catalog/long names, expanded evidence, keyboard disclosure, action callbacks, touch targets and no horizontal overflow. App typecheck and lint passed (six existing warnings); five builder engine/mutation tests passed.
- Not verified: real data artwork, full review controller acceptance/save journey, loading/error/empty integration states, screen reader, zoom and physical device. No new asynchronous state or persistence was introduced.
- Next: carry this hierarchy through unpaired additions/cuts and automatic Analysis result summaries. Existing calculation outputs and advanced drafts remain unchanged.

### Individual review proposals (2026-10-02)

- Unpaired additions and cuts now use a local proposal component with shared CardResult identity, prominent quantities, explicit accept/keep actions and expandable source evidence. List/grid preference and field visibility are retained; ranking and controller mutations are unchanged.
- Champion cut proposals explain the existing higher-level removal cascade. Unlocked exclusions are labeled separately from selected-card removal.
- Verified isolated missing-catalog/long-name proposals at 360px and 1280px, keyboard disclosure, add/remove/keep callbacks, 48px controls and no horizontal overflow. Full account/save integration, actual artwork, loading/error/empty integration states, screen reader and device checks remain unverified.
- Next: automatic Analysis result summaries with named cards and answer-first hierarchy.

### Automatic Analysis card summaries (2026-10-02)

- Opening access now leads each card with expressive result typography and identity surfaces. Turn checkpoints and advanced card exploration sit behind a labeled disclosure; duplicate odds and model limitations remain visible.
- Alphabetical order and visible/total counts clarify the initial four-card preview. Champion progression uses named shared card artwork. Card detail links open separately to preserve the analysis workspace.
- Verified isolated missing-catalog fixture at 360px and 1280px: keyboard expansion, 48px disclosures, show all cards and no horizontal overflow. Typecheck and lint passed with six existing warnings.
- Actual artwork, empty main deck, loading/error integration, advanced handoff, screen reader and device checks remain unverified. Calculation functions and draft ownership are unchanged.
- Next: saved plan results with visible setup/payoff cards and clearer automatic draw summaries; then continue the Goldfish queue area.

### Saved plan identity and automatic draw totals (2026-10-02)

- Saved plan results lead with named setup and payoff card pools and copy counts, then emphasize opening access. Copy distinguishes one card from each pool from an exact required recipe. Existing review gating and calculation outputs are unchanged.
- Natural and modeled cumulative cards seen appear together at each fixed checkpoint. Assumptions remain visible; source evidence stays in the existing disclosure with visible keyboard focus.
- Verified isolated fixtures at 360px and 1280px: missing art/catalog fallbacks, long card names, plan pools, modeled totals, empty deck/no plan/no draw guidance, keyboard disclosure, advanced callback, 48px controls and no horizontal overflow. Typecheck and lint passed with six existing warnings.
- Actual artwork, full workspace navigation, loading/error integration, screen reader, zoom and physical device checks remain unverified. No asynchronous state or persistence was added.
- Next: Goldfish expressive design, emphasizing the active turn, visible game zones and reachable frequent actions.

### Goldfish turn and hand emphasis, October 2

The fixed controls now emphasize turn and phase, with a separate latest action surface using the existing reduced motion aware transition. The hand has an identity surface, visible copy count and phase guidance. Empty library guidance no longer suggests drawing; an empty hand and library point to Memory and a new hand in Tools. Session rules, card order and persistence are unchanged.

Verified at 360 × 800 and 1280 × 900 with real Abnegation art: keyboard draw, exhausted library, Recollection guidance, disabled play controls, Memory sheet dismissal and focus restoration. A long unknown card fixture verified name fallback, wrapped action feedback, and empty hand/library guidance. No horizontal overflow in measured views; mobile footer buttons were 48–58px high and measured footer clearance updated as feedback wrapped. Loading and account library failure were observed with the paste alternative available. Typecheck, lint (six existing warnings), and all 14 simulator tests passed.

Remaining: physical device keyboard, text zoom, screen reader announcements, and broader saved session recovery verification. Next in the expressive queue: related discovery and competition surfaces. The Goldfish page checklist remains open for these broader checks.

### Event preview identity, October 2

Event previews now emphasize full event names on the shared identity surface, with readable dates,
host/location and season context. Attendance has a larger numeric hierarchy with a text label.
Category badges retain their labels and tier accents. Event and deck list navigation now have
48px targets and explicit keyboard focus. Existing destinations, coverage flags, filters and ordering
are unchanged.

Verified real event results at 360 × 800 and 1280 × 900: long names wrap, events with and without
submitted lists retain their respective actions, keyboard focus is visible, all measured preview
links are at least 48px high, and there is no horizontal page overflow. Loading was observed;
empty search and clearing it back to 50 displayed results worked. Typecheck and lint passed with
six existing Fast Refresh warnings. No new asynchronous state, calculations or persistence.

Remaining: source failure/retry, screen reader, text zoom and physical device verification.
Next: event detail identity and results hierarchy, carrying this emphasis into standings and deck
navigation. The related discovery and competition queue area remains open.

### Event detail identity and standings navigation, October 2

Event headers now use the shared identity surface with a larger wrapping title, labeled category,
format and status, readable venue/date/season context, and prominent player and available list counts.
Available lists remain distinct from the submission rate shown with standings. Desktop standings now
link directly to each available player deck, matching mobile. Player links, mobile deck links, optional
event navigation and the details disclosure have 48px targets. Secondary navigation uses shared Button.

Verified real events with and without available lists at 360 × 800 and 1280 × 900, including loading,
keyboard disclosure expansion, visible header link focus, wrapped venue text, selected player deck
navigation and no horizontal page overflow. All measured standings deck links were 48px high.
Typecheck and lint passed with six existing Fast Refresh warnings. Ranking and statistics are unchanged.

Remaining: empty event fixture, source failure/retry, text zoom, screen reader and physical device checks.
Next: top event deck previews, replacing truncated identities and the mobile horizontal strip with
shared card previews and wrapping layouts. The competition area remains open.

### Shared top event deck previews, October 2

Top event decks now use DeckPreviewCard with champion art, visible full card names, featured
material cards, player identity, placement, format, main and sideboard counts, and a distinct
View list action. A single column on mobile replaces the horizontal strip; desktop shows three
columns. Card links open card details independently of list navigation. Event formats are
normalized from lowercase source values. Ranking, selection and list destinations are unchanged.

Verified at 360 × 800 and 1280 × 900 with real event data: resolved champion artwork, wrapping
names, Standard labels, keyboard focus and Enter navigation to the selected player list, minimum
48px card/list links on mobile, and no horizontal page overflow. Loading and name fallbacks were
observed before catalog resolution. An event without available lists omitted previews.
Typecheck and lint passed with six existing Fast Refresh warnings.

Remaining verification: simulated catalog failure/retry, long player name fixture, text zoom,
screen reader and physical device checks. No new expanded state or persistence was introduced.
Next: season discovery and season detail hierarchy within the competition queue.

### Season discovery and detail hierarchy, October 2

Season discovery now uses responsive identity surfaces with full season names, prominent event
counts and an explicit Explore season cue. Detail headers carry the same identity, readable dates,
recorded event counts and guidance into results or meta. Return links have 48px targets and visible
focus. Product banners respect reduced motion and distinguish exact season sets from fallback sets.
Ordering, event selection, statistics and existing tab URLs are unchanged.

Verified real data at 360 × 800 and 1280 × 900: single column and two column discovery layouts,
detail headers, keyboard link navigation and visible focus, tab keyboard access, 48px return links,
148px mobile season targets and no horizontal overflow. Loading and missing season recovery were
observed. App typecheck and lint passed with six existing Fast Refresh warnings.

Remaining verification: empty season/index fixtures, source failure/retry, text zoom, screen reader
and physical device checks. The existing index hook does not expose a separate failure state.
Next: season meta champion and build summaries, adding card identity and clearer metric labels.

### Season meta identity and metric clarity, October 2

Champion and build summaries now use named, linked CardArtTile artwork, wrapping titles,
prominent statistics and explicit exploration links. Weighted season share is labeled and explained
using the published performance score definition. Recorded deck ordering and calculations remain
unchanged. Build artwork is explicitly representative, not an exact list. Champions and Builds
use shared tabs with selected states, arrow key navigation and 48px controls.

Verified real data at 360 × 800 and 1280 × 900: single and two column layouts, long build titles,
card artwork, no horizontal overflow, keyboard tab switching and build navigation, and 48px
exploration links. Initial loading was observed. Typecheck and lint passed with six existing
Fast Refresh warnings. Empty/error fixtures, missing catalog art, text zoom, screen reader and
physical device checks remain unverified. Existing meta hooks do not expose failure/retry.
Next: season meta failure recovery and independent loading for champion and build sources,
then the remaining supporting pages and shared shell expressive design queue.

Deployment: pushed through 6b5d0da9; GitHub Pages run 37070055258 succeeded and production
release smoke checks confirmed that revision, assets, analysis manifest and account health.

### Season meta loading and recovery, October 2

Champion and build tabs now track their own published dataset status. A failed or slow build
source no longer blocks champion results. Each failed source has a named retry action and a
visible explanation; cached results stay available when refresh fails. Empty results are only
shown after that source has loaded, with season scope stated explicitly.

Verified with a temporary local server fixture at 360 × 800 and 1280 × 900: build HTTP 503
without cached data, champion results while builds fail, keyboard retry through loading to real
build results, cached refresh failure retaining all 20 build previews, and a successful empty
build response. Mobile retry measured 48px high; both viewports had no horizontal overflow.
Keyboard tab switching and empty panel focus were checked. App typecheck and lint passed with
six existing Fast Refresh warnings. No expanded state was added. Champion-specific failure
fixtures, text zoom, screen reader and physical device checks remain unverified.
Next: season index failure recovery, then supporting pages and the shared shell expressive queue.

### Season index recovery, October 2

Season discovery and detail now share visible source status and a 48px retry action. Saved
seasons and events remain usable during refresh failures. Missing season views also retain
refresh feedback and retry, and explicitly scope absence to saved data.

Verified at 360 × 800 and 1280 × 900 using temporary HTTP 503 and empty index fixtures:
cached season cards remain visible on failure, keyboard retry announces refreshing, an empty
saved index produces the missing season view with recovery, and retry restores the real season.
The mobile retry target is 48px high and both checked layouts have no horizontal overflow.
App typecheck and lint passed with six existing Fast Refresh warnings. No expanded state was
added. Initial failure without seeded data, empty discovery rendering, screen reader, text zoom
and physical device checks remain unverified.
Next: supporting pages and shared shell expressive design, starting with navigation accessibility
and the mobile menu target (currently 44px).
