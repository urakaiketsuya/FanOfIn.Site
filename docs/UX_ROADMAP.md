# Deck and collection experience roadmap

Updated October 3, 2026. This records the implementation baseline and verification scope. Existing working features are retained rather than reimplemented.

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

Queue status, reconciled October 3: all six areas have received implementation slices. None
is fully accepted. Completed presentation must be retained; remaining work is source recovery,
integration and accessibility verification, plus page families without a recorded dedicated pass.

| Area | Recorded implementation | Remaining work |
| --- | --- | --- |
| Deck discovery | Shared previews, identity, empty search recovery and restored deck navigation | Source failure recovery and source-specific detail journeys |
| Core workflows | Collection/location hierarchy, ownership handoff, quantity editor, folders, drafts and Builder | Authenticated writes, conflicts, cross-tab updates, sign-in return and invalid handoff guidance |
| Analysis and Deck Review | Automatic summaries, consolidated workspace, plan/draw results and explicit proposals | Full acceptance/save journey, advanced model coverage and integration states |
| Goldfish | Zone art, turn/hand hierarchy, reachable controls and action feedback | Saved session recovery and device/accessibility acceptance |
| Related discovery and competition | Event previews/details, top decks, seasons and independent source recovery | Dedicated champion, package, archetype, player, team, region and achievement passes |
| Supporting pages and shell | Navigation, methodology and changelog | Remaining supporting pages, recovery states and shared-consumer regression checks |

The page tables below now distinguish **Partial** (a dedicated implementation slice is recorded)
from **Review** (no dedicated slice is recorded in this queue; inspect existing code before proposing
changes). Neither means accepted. Shared improvements may already benefit Review pages.
Cross-cutting acceptance remains open for text zoom, screen readers, physical mobile keyboards,
real authenticated journeys and deployed release verification. Later dated evidence supersedes
earlier “Next” and deployment notes.

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

| Status | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| Review | Homepage `/` | Give collection tracking equal visual importance to deck tools; show concrete examples of loans and shared copies; establish a clear hierarchy among collection, building and analysis entry points. Retain the draw adjusted example. |
| Partial | My Collection `/collection` | Lead with a useful collection overview and recognizable cards; give quantity edits clear local feedback; distinguish owned, available and missing states with labels; give first import and empty search distinct next actions. |
| Partial | Card locations `/card-locations` | Make the selected card the visual anchor; group binder, deck, loan and trade locations clearly; emphasize the next useful action and show transfer/return outcomes without obscuring quantities. |
| Partial | My Decks `/decks/edit` | Refine folder gallery rhythm, selected folder state and empty folders; verify existing covers/accents across long names, missing art and official product tabs; keep creation and import easy to find. |
| Partial | Saved deck `/decks/:id` (owned UUID) | Carry deck identity through editing, collection and tool handoffs; distinguish saved, draft and failed-save states; improve section counts and local edit feedback without hiding legality warnings. |
| Partial | Deck Builder `/deck-builder` | Keep champion and current deck visible before recommendations; clarify selected cards versus suggestions; add restrained add/move/remove feedback and an obvious next action; preserve drafts and copy conservation. |
| Partial | Analysis `/deck-analysis` | Extend card-led result hierarchy to custom hand, plan, level, pressure, recovery, resource and sideboard models; evaluate redundant setup; preserve assumptions near results and evidence on demand. No unsupported quality grade. |
| Partial | Deck Review `/deck-review` | Organize findings by actionable question; lead each proposed change with affected cards and rationale; distinguish advice from accepted edits and retain an explicit accept action. |
| Partial | Goldfish `/goldfish` | Make active turn, hand and zones visually distinct; add brief draw/play/move feedback with a reduced motion alternative; keep frequent controls reachable and preserve actual game state during tool use. |
| Partial | Card browser `/cards` including By Set | Strengthen art and selected-filter hierarchy; make browsing, selection and empty search states recognizable; preserve search and position when returning from details. |
| Partial | Card detail `/cards/:slug` | Verify prominent mobile art and simplify image inspection; organize printing choice, legality, ownership and statistics around the card; keep data gaps visible. |
| Review | Compare `/compare` | Give each deck equal identity and stable comparison order; emphasize shared cards and differences using named card groups; use labels alongside color and preserve meaningful mobile comparisons. |

### Wave 2: Discovery and deck sources

| Status | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| Partial | Tournament decks `/decks` | Refine shared preview spacing across sightings and builds; make source, date and filter scope clear; give empty filters a direct recovery action. |
| Review | Tournament deck `/decks/:id` (hash) | Anchor with champion and source; emphasize event context and deck identity before dense evidence; keep collection, compare and analysis handoffs consistent. |
| Partial | Shared decks `/decks/shared` | Use shared previews with clear author context; balance browsing density and art; distinguish no published decks from no matching results. |
| Review | Public deck `/decks/:id` (public slug) | Preserve author and version identity alongside art; distinguish public viewing from personal copies; make copy and collection actions discoverable. |
| Review | Community overview `/community-decks` | Show source and format with card-led entries; separate coverage summaries from individual deck previews; retain evidence limitations. |
| Review | Community search `/community-decks/search` | Keep query context visible with compact results; emphasize relevant card matches; make pagination, loading and no matches consistent with other searches. |
| Review | Pantheon community `/pantheon` | Carry the community patterns into the format-specific page with a visible format label and appropriate source context. |
| Review | Pantheon decks `/pantheon/decks` | Apply shared preview hierarchy and readable format context; check filter and empty states. |
| Review | Pantheon deck `/pantheon/decks/:id` | Match immutable deck detail hierarchy while retaining format-specific evidence and valid actions. |
| Partial | Official decks `/official-decks` | Refine product identity within shared previews; keep product codes, release detail and full printed lists in details; save to the dedicated My Decks product tab. |
| Review | New card discovery `/card-discovery` | Lead with suggested cards and a concise reason; make relevance and evidence inspectable; preserve opt-in selection and distinguish new suggestions from current cards. |
| Review | Card packages `/cards/packages` | Make package identity recognizable through cards; label full pools, required cores and tested variants distinctly; keep package application explicit. |
| Review | Top cards `/cards/stats` | Emphasize card identity beside the primary metric; keep denominator, period and sample size visible; disclose secondary statistics progressively. |
| Partial | Champions `/champions` | Use champion artwork as navigation identity; align ranking metrics and scope; support compact mobile browsing without hiding names. |
| Review | Champion synergy `/champions/:name` | Carry champion identity into card and package groups; separate observed relationships from recommendations and show evidence strength. |
| Review | Champion stats `/champions/:name/stats` | Establish a clear statistical overview with date/format context; prioritize meaningful trends and disclose detailed breakdowns. |
| Review | Trading binder `/looking-for` | Make wanted and offered cards unmistakable; show availability and reservation state; clarify the next action without equating ownership with availability. |

### Wave 3: Playtesting, plans and competition

| Status | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| Review | Combo Lab `/combo-lab` | Present participating cards and ordered actions as the focal point; distinguish configured assumptions from validated outcomes; keep editing and testing states clear. |
| Review | Public combo `/combos/:publicSlug` | Lead with cards, purpose and sequence; preserve author context and limitations; make copying into a workspace explicit. |
| Review | Match log `/match-log` | Make recording a result the primary task; retain deck/opponent identity; distinguish pending entry, confirmed save and aggregate results. |
| Review | Simulator `/simulator` | Differentiate setup, running, completion and failure; present results with sample size and model limits; make cancellation and retained inputs clear. |
| Review | Match timelines `/timelines` | Use clear match identity and preview landmarks; show source and available coverage before opening a timeline. |
| Review | Timeline detail `/timelines/:id` | Strengthen turn and action hierarchy, active selection and linked cards; preserve reading position during evidence inspection. |
| Review | Timeline combos `/timelines/combos` | Lead with involved cards and observed sequence; distinguish examples from generalized claims and link the source timeline. |
| Review | Diao review `/diao-review` | Clarify the review question, selected cards and supporting evidence; keep uncertainty and manual review decisions explicit. |
| Review | Archetypes `/archetypes` | Use representative cards to identify groups; emphasize membership and coverage; make filter scope and naming clear. |
| Review | Archetype detail `/archetypes/:id` | Lead with representative cards and identity; distinguish core from variable slots; disclose membership and statistical evidence. |
| Review | Archetype comparison `/archetypes/compare` | Align compared identities and metric definitions; keep small samples visible and differences readable on mobile. |
| Review | My archetypes `/archetypes/mine` | Give saved groups recognizable covers and clear draft/save states; preserve membership editing and recovery. |
| Review | Reference strategies `/archetypes/mine/reference` | Show the strategy's cards and purpose before configuration; distinguish user choices from reference evidence. |
| Review | Published strategies `/archetypes/strategies` | Use readable strategy previews with provenance; distinguish viewing from copying or editing. |
| Review | Battle chart `/battle-chart` | Strengthen selection and comparison focus; keep cells readable and keyboard reachable; pair color with values and sample size. |
| Partial | Events `/events` | Improve date, location and event identity hierarchy; separate upcoming or historical context where supported by data; make filters and no matches clear. |
| Partial | Event detail `/events/:id` | Lead with event identity and meaningful results; bring player/deck previews into standings; keep source and incomplete coverage visible. |
| Partial | Seasons `/seasons` | Give each season a clear period and visual summary; distinguish active filters and available coverage. |
| Partial | Season detail `/seasons/:slug` | Prioritize season context and major results; progressively disclose dense standings and trends. |
| Review | Players and judges `/players` | Make role, identity and search state legible; use consistent result cards without inventing portraits or status. |
| Review | Player profile `/players/:id` | Prioritize identity, achievements and recent decks; keep rankings tied to their source and period. |
| Review | Teams `/teams` | Emphasize team identity and membership grouping; improve mobile comparison and missing-data states. |
| Review | Regions `/regions` | Pair geographic context with clear coverage and sample sizes; provide readable alternatives to map-only interaction. |
| Review | Achievements `/achievements` | Use consistent badge hierarchy and meaningful categories; make earned or eligibility states explicit only where supported. |
| Review | Achievement detail `/achievements/:id` | Emphasize the achievement identity and criteria; keep recipient/evidence details accessible without celebratory noise. |

### Wave 4: Supporting pages and shared shell

| Status | Page / route | Expressive design and interaction checklist |
| --- | --- | --- |
| Review | Thema leaderboard `/thema` | Pair printing/card identity with ranking context; use restrained emphasis and clear period/source labels. |
| Review | Thema history `/thema/:editionUuid` | Lead with the exact printing; give the trend a readable hierarchy and expose missing history or coverage gaps. |
| Review | Tags `/cards/tags`, `/cards/tags/:tag` | Give categories distinct readable identity; lead tagged results with cards and preserve navigation context. |
| Review | Card tagging `/cards/tagging` | Keep the card prominent beside the tagging task; clearly distinguish selected, suggested, saved and failed states. |
| Review | Pack opener `/packs/:prefix` | Use restrained reveal sequencing with immediate/reduced-motion access; show complete results and distinguish simulated contents from owned cards. |
| Review | Products `/products` | Strengthen product artwork and release hierarchy; make available detail and destination actions clear. |
| Review | Media kit `/media-kit` | Provide recognizable asset previews, readable usage information and clear download actions. |
| Review | Public user `/users/:profileSlug` | Highlight user-authored identity and published decks while preserving content policy and privacy boundaries. |
| Review | Account `/account` | Keep sign-in and account management calm and task focused; emphasize field errors and confirmed outcomes over decoration. |
| Review | Verify email `/account/verify-email` | Give pending, successful, expired and failed verification distinct messages and one relevant next action. |
| Review | Reset password `/account/reset-password` | Make form progress and validation clear; retain accessible errors and explicit completion. |
| Review | Settings `/settings` | Group preferences by purpose; use clear selected states and save feedback; avoid decorative hierarchy competing with controls. |
| Partial | Changelog `/changelog` | Improve release/date rhythm and scannable feature summaries; use visuals only when they explain a change. |
| Review | API docs `/docs/api` | Improve reading hierarchy, code readability and navigation; keep technical reference content easy to scan and copy. |
| Partial | Methodology `/methodology` | Organize around questions and calculation scope; distinguish examples, assumptions and limitations clearly. |
| Review | Not found `*` | Offer a concise explanation and useful recovery links with restrained visual identity. |
| Partial | Shared navigation and route loading | Align active location, menu/disclosure affordances and 48px targets; check header/toast stacking, loading stability and mobile reachability. |
| Review | Shared dialogs, notifications and errors | Apply consistent shape, hierarchy and brief feedback; preserve focus, retry, Undo and dirty-draft protection; keep persistent problems inline. |

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

### Deck result navigation regression, October 2

Restored deck hashes and event dates in the shared popularity result adapter. Top deck rows
always expose Open deck: known hashes open the deck page, while missing hashes open the exact
player's event decklist. Targets are now 48px high. This covers champion, card, archetype and
build history consumers without changing their ranking or selection.

Seven regression and event selection tests passed, along with app typecheck and lint (six
existing Fast Refresh warnings). Verified mobile champion results at 360 × 800, keyboard
navigation to the correct player's full event list, desktop card results at 1280 × 900,
hash navigation to a full deck page, and tournament search keyboard list expansion. Both
checked layouts had no horizontal overflow. No new loading/error state was introduced;
network failure, screen reader and physical device checks were not repeated.
Next: shared navigation and supporting pages, including the mobile menu target.

### Card price sorting, October 2

Card browsing and the shared deck editor picker now offer ascending and descending price
sorting using the existing card-level deck price estimates. Unknown quotes stay last in both
directions and ties sort alphabetically. Price-sorted cards show their estimates; printing
filters retain their artwork behavior and do not change the estimate. Loading and refresh
failure feedback include a retry action. Existing recommendation order is preserved.

Six sorting/catalog regression tests passed. App typecheck and lint passed with six existing
Fast Refresh warnings. Verified real ascending and descending results, initial price loading,
filtered empty results, 48px sort controls and no mobile overflow at 360 × 800; desktop browse
layout at 1280 × 900; mobile picker options, keyboard controls and price labels. Sorting makes
no deck edits. Simulated price refresh failure/retry, screen reader and physical device checks
remain unverified. Next: shared navigation and supporting page expressive design.

### Shared navigation accessibility, October 3

Navigation links and disclosure controls now use the shared 48px target size. Mobile groups
use DisclosureChevron, and the expanded navigation scrolls within the dynamic viewport,
accounting for the announcement banner. Escape closes navigation and restores trigger focus.
A keyboard skip link moves focus directly to page content.

Verified at 360 × 800 and 1280 × 900: expanded mobile Tools group, all mobile group/link
heights at 48px, viewport containment, no horizontal overflow, mobile and desktop Escape
focus restoration, visible desktop keyboard focus, and skip link focus on main content.
App typecheck and lint passed with six existing Fast Refresh warnings. No data loading,
error or empty states were introduced. Physical keyboard viewport changes, text zoom and
screen reader checks remain unverified.
Next: supporting-page hierarchy and expressive styling, starting with methodology and changelog.

### Supporting page hierarchy, October 3

Methodology leads with a prominent source, sample and claim overview. Section headings have
consistent accent markers, tool links and topic navigation have 48px targets, and native
disclosures use shared chevrons with visible keyboard focus. Changelog uses matching date
markers, grouped archive surfaces, shared buttons, live result counts, and an actionable
empty search. Published data failures expose retry and preserve a cached archive.

App typecheck and lint passed with six existing Fast Refresh warnings. Verified 360 × 800
and 1280 × 900 layouts, no horizontal overflow, 48px search/commit links/disclosures/topic
navigation, keyboard expansion, empty search and clearing, and pagination from 20 to 40.
Initial route loading was observed. Simulated network failure/retry, an empty published
archive, text zoom and screen reader checks remain unverified.
Next: supporting-page recovery states and accessibility verification, then reconcile the
remaining expressive design checklist against the completed page passes.

### Recovery verification and checklist reconciliation, October 3

Replaced ambiguous page checkboxes with Partial and Review status, based on the dated
implementation record, and replaced the stale queue summary with remaining work by area.
Partial means a recorded implementation slice, not full acceptance; Review pages require
inspection before changes. Earlier release and next-step notes are historical.

Changelog Clear search now restores focus to its search field when the empty-result action
disappears. Verified keyboard focus at 360 × 800 and 1280 × 900. Using a temporary local
HTTP fixture on a separate origin, verified uncached changelog HTTP 503, keyboard retry and
loading announcement, recovered real archive, cached refresh failure retaining 20 entries,
and an empty published archive. Empty archive desktop rendering and mobile overflow passed.
Price sorting showed uncached failure with a 48px retry at 360px, keyboard retry/loading,
real ascending quotes, and cached quotes retained after another failure at 1280px.
Measured views had no horizontal page overflow. Temporary fixture was removed.

App typecheck and lint passed with six existing Fast Refresh warnings. The editor picker
failure path was not separately exercised; screen readers, text zoom, physical devices and
authenticated journeys remain open. Next: deck discovery source failure recovery, starting
with tournament, community and official browsing, then dedicated related-discovery page passes.

### Deck discovery source recovery, October 3

Tournament results and unique builds now expose named source failures and retries instead
of leaving loading skeletons indefinitely. Build results and card lists retry independently;
active card-content filters also expose their index status. Community search exposes the
selected format's archive status. Shared PublishedSourceStatus preserves cached content and
explains availability without clearing filters. Official product lists are bundled JSON and
have no separate remote list fetch; catalog/account recovery remains a distinct follow-up.

App typecheck and lint passed with six existing Fast Refresh warnings. Temporary HTTP 503
fixtures verified uncached Standard community failure, keyboard retry/loading with query
retention, empty search recovery, 30 restored community previews and cached failure retaining
those previews. Tournament checks covered uncached result/build failures, independent build
retries restoring 30 previews, 50 recovered tournament results, and cached result failure
retaining 50 previews. Checked 360 × 800 and 1280 × 900 layouts had no page overflow; measured
retry controls were 48px. Temporary fixtures were removed.

Remaining: Pantheon-specific fixtures, active card-filter index failure, empty published
indexes, cached build failure, optional metadata/catalog failures, community trend source
recovery, screen reader, text zoom and physical device checks. Next: optional source recovery
and community trends, then dedicated champion/package/archetype page passes.

### Community trend source recovery, October 3

Card usage, popularity, price distribution, recurring builds and deck eras now expose
independent published-source status and retry. Cached sections stay available during errors;
failures remain visible outside optional disclosures. Empty datasets have explicit guidance.
Format links and the popularity disclosure have 48px targets; the disclosure uses the shared
chevron and visible keyboard focus. Existing statistics and source definitions are unchanged.

App typecheck and lint passed with six existing Fast Refresh warnings. A temporary HTTP 503
fixture verified popularity failure alongside available cards/builds, keyboard retry/loading,
restored chart, and cached chart retention during a later failure. Verified 360 × 800 and
1280 × 900 layouts without page overflow, a 48px retry, and keyboard expansion. Fixture removed.
Other source-specific failures, empty-data fixtures, Pantheon, text zoom, screen readers and
physical devices remain unverified. Next: optional catalog/metadata recovery and community
card identity refinements, followed by champion/package/archetype page passes.

### Champion directory hierarchy, October 3

Champion and named spirit navigation now uses a single column on narrow screens, wrapping
names, larger identity text and artwork beside the summary. Desktop uses three columns in
a wider page. The season map is optional through a keyboard accessible 48px disclosure;
insufficient samples explain why the chart is unavailable. Statistics and trends use shared
independent source status and retry. Existing statistics, ordering and thresholds are unchanged.

Verified at 360 × 800 and 1280 × 900: populated directory, keyboard disclosure, visible focus,
48px summary, card link targets and no horizontal page overflow. The current data exercised
the insufficient chart sample state. App typecheck and lint passed with six existing warnings.
Champion-specific network failure/retry, empty directory, populated chart, text zoom,
screen reader and physical device checks remain unverified.

Next: champion synergy and statistics hierarchy, followed by packages and archetypes.
Champion experience estimate: approximately 25% complete, based on one directory pass out of
three champion surfaces, with acceptance checks still open. This is not an overall site estimate.

### Champion deck discovery · 2026-10-03

Added actual tournament deck previews before card statistics on the main champion page, with Recent, Unique, and Top tabs. The stats page uses the same component. Each view shows three champion cover cards with player, event, date, placement, and a direct deck page link; Browse all opens champion scoped discovery. Only records with published deck hashes qualify. Recent uses event date, Unique uses existing champion novelty scores and deduplicates main/material hashes, and Top retains published weighted placement scores. The deck section explicitly covers all spirits/elements independently of card filters. Archetypes remain available separately.

Verified at 360px and 1280px: single column and three column grids, no page overflow, 48px tabs and deck actions, keyboard arrow selection, novelty loading and loaded states, all three views, and opening a real deck page. App typecheck and lint passed (six existing Fast Refresh warnings). Forced source failures, empty champion deck fixtures, screen reader, text zoom, and the stats route integration were not browser verified.

Champion expressive design is approximately 40% complete: directory and deck discovery are delivered, while the remaining synergy hierarchy, statistics presentation, and broader accessibility/source state verification remain. Next: simplify the champion card and season statistics hierarchy without obscuring actual deck discovery.

### Champion card gallery and season snapshot · 2026-10-03

Implemented the approved Card gallery first direction. Actual Recent, Unique, and Top decks remain first. Four main deck cards now show full artwork, readable names, card links, and recorded deck counts before optional configuration. Browse cards and filters retains print selection, element/spirit/type filters, and the detailed main/material/sideboard galleries. Filters remain mounted while collapsed; their scope is explicit in new release connections. The shared detailed grid now uses two mobile columns, visible card names, and 48px expansion controls. The champion header uses the existing identity surface.

The new season snapshot uses published chronological season order, including a latest season with zero appearances. It labels weighted result share accurately, shows recorded decks, and expands into wrapping season comparisons with a link to full statistics. It has independent loading, empty, and retry feedback; the main champion source now also exposes loading and retry status. No formulas or rankings changed.

Verified at 360 × 800 and 1280 × 900: populated galleries, actual artwork, no page overflow, keyboard expansion and focus, 48px summaries/filter controls, element and type filtering, retained selections through collapse/reopen, season comparison, and card navigation to Dungeon Guide. App typecheck and lint passed with six existing Fast Refresh warnings. Forced source failure/retry and empty fixtures, text zoom, screen readers, and physical devices remain unverified.

Champion expressive design is approximately 60% complete: directory, deck discovery, main card hierarchy, and a season summary are delivered. Next: simplify the full champion statistics page and review new release/archetype density, then close the remaining source-state and accessibility checks. This is a scope estimate, not an overall site percentage.

### Champion season statistics · 2026-10-03

- Full statistics now lead with the latest season's weighted result share, recorded decks, and text trend. Calculations and source ordering are unchanged.
- Season evidence expands into wrapping metric rows, newest first. The existing chart is a separate optional disclosure. Tournament wins are explicitly labeled.
- Champion and season source loading/error/retry states are visible. Fixed the existing builds grid's mobile overflow and allowed build names to wrap.
- Verified Lorraine at 360px and 1280px, keyboard disclosure activation, 48px summaries, loading, expanded history/chart, and no page overflow. Typecheck and lint pass (six existing Fast Refresh warnings). Forced empty/error/zero appearance fixtures, screen readers, and text zoom remain unverified.
- Champion expressive design is approximately 65% complete: directory, deck discovery, card gallery, and season summary hierarchy are delivered. Remaining work includes statistics card/build density, new release and archetype sections, and broader state/accessibility verification. This is a scope estimate, not a measured completion rate.

### Champion card and build density · 2026-10-03

Full champion statistics now start with four cards per section and three build families, with the remaining results available through expansion. Card filters use a keyboard accessible disclosure, shared 48px buttons, and explicit selected states. Active scope stays visible when collapsed, and the page explains that card win rates remain champion wide. Build summaries distinguish families from individual decklists; empty element icon boxes were removed.

Verified Lorraine at 360px and 1280px, keyboard filter and list expansion, filtering and resetting, visible card names and art, a 48px disclosure, and no page overflow. App typecheck and lint passed (six existing Fast Refresh warnings). Loading was observed; forced error/empty fixtures, screen readers, and text zoom remain unverified. Champion expressive design is approximately 70% complete based on delivered surfaces. Next: simplify new release and archetype sections on the main champion page, then finish broader state and accessibility verification.

### Champion release and build previews · 2026-10-03

- New releases lead with four named card artworks. Connection counts open supporting links and statistics with 48px keyboard-accessible disclosures; long names and connection labels wrap.
- Build families show two initial previews with expressive surfaces and visible naming cards. One disclosure per family contains common cards, sample sizes, cross-champion evidence, and curation. Families are explicitly distinguished from exact lists and required cores.
- Shared buttons reveal the remaining releases and families. Champion changes reset both expansions. Jump links leave headings below the sticky navigation.
- Verified Lorraine at 360px and 1280px: loading, card artwork and visible titles, keyboard disclosure and show-all controls, 48px summaries, and no horizontal overflow. App typecheck and lint passed (six existing Fast Refresh warnings).
- Limits: forced empty/error/retry fixtures, screen-reader output, text zoom, and cross-champion relationship content were not exercised this pass.
- Champion expressive design is approximately 75% complete. Next: finish remaining statistics surfaces and verify empty/error/retry and accessibility states across champion pages.

### Champion statistics identity · 2026-10-03

Replaced the statistics page's horizontal character cutout strip with a wrapping gallery using shared CardArtTile, visible printed names, known card links, and catalog name fallbacks. Moved lifetime win rate, deck count, and event count into an All recorded results disclosure with explicit scope and readable labels. Calculations and card selection are unchanged.

Verified Lorraine at 360px and 1280px, loaded card art and names, keyboard expansion, 48px summary height, visible link focus, and no horizontal page overflow. Initial loading was observed. App typecheck and lint passed with six existing Fast Refresh warnings. Forced error/empty/catalog fallback fixtures, screen readers, and text zoom remain unverified.

Champion expressive design is approximately 78% complete. Next: remaining More statistics surfaces and tab/panel accessibility, followed by broader data-state coverage. No implementation blockers.

### Champion artwork deck covers · 2026-10-03

Restored wide, zoomed champion illustrations in shared DeckPreviewCard covers through an optional CardArtTile artwork crop. Covers keep visible card names, title contrast, source and metadata, with one whole-card deck navigation link and visible Open deck label. Detailed previews retain full printed card art.

Verified tournament results at 360px and unique builds at 1280px, no horizontal overflow, large touch targets, no nested controls, and Enter navigation to a build page. Typecheck and lint pass (six existing Fast Refresh warnings). Image failure/catalog fallback fixtures, text zoom and screen reader testing remain unverified.

This focused cover refresh is complete (100% implementation and main-flow checks). Next: review the artwork treatment with the user, then resume champion statistics tab accessibility and remaining views; the broader champion expressive design initiative remains approximately 78% complete.

### Champion statistics tab accessibility · 2026-10-03

Connected Overview, Decks, and More to named shared TabPanels. Replaced the More view chips with shared keyboard tabs and associated panels for Bonus cards, Regions, and Similar decks. Existing query parameters, conditional mounting, filters, and dataset gating are preserved.

Verified at 360px and 1280px: selected panels, direct Regions URL, Home and arrow navigation, 48px tab targets, and no horizontal page overflow. App typecheck and lint passed with existing Fast Refresh warnings. Initial loading was observed. Error, empty, screen reader, and text zoom fixtures were not exercised in this focused navigation change.

Champion expressive design is approximately 80% complete: identity, deck previews, overview simplification, and tab accessibility are implemented. Next: simplify the remaining More views and verify their loading, failure, and empty states. Estimate remains scope based rather than a measured issue count.

### Champion regional summaries and composition evidence · 2026-10-03

Regional popularity now leads with three expressive summary cards ordered by recorded deck count. A keyboard accessible disclosure reveals the remaining regions. Copy explains the minimum sample and unknown country group. Existing ordering, counts, and calculations are unchanged.

Composition evidence is optional, explicitly scoped across all champions, and presented in wrapping definition lists instead of a horizontally scrolling table. Its labels distinguish adjusted win rate from regional average win rate and clarify that the evidence is not a deck recipe.

Verified Lorraine at 360px and 1280px: regional and composition disclosures open with Enter, summaries meet 48px targets, composition uses one mobile column and three desktop columns, and neither view causes page overflow. Initial loading was observed. Typecheck and lint passed with six existing Fast Refresh warnings. Forced empty/error fixtures, text zoom, and screen readers remain unverified; a later browser attempt to recapture expanded regions timed out after the earlier successful keyboard check.

Champion expressive design is approximately 84% complete, based on completed identity, overview, navigation, and regional hierarchy work. Next: simplify Similar decks and improve Bonus cards and More data loading/failure states, then finish broader accessibility verification. No implementation blockers; estimate remains scope based.

### Champion similar deck previews · 2026-10-03

Similar decks now leads with three shared artwork covers and an optional expansion to the existing ten results. Each cover opens the actual deck page. Event labels and similarity remain visible; copy distinguishes card overlap from tournament strength. Existing ranking, membership, and scores are unchanged. Independent published-source status and retry controls prevent unloaded or failed similarity/index data from appearing as an empty result.

Verified Lorraine at 360px and 1280px, three desktop columns, keyboard expansion to ten and collapse to three, 48px expansion control, and no horizontal overflow. Initial page loading was observed. Typecheck and lint passed with six existing Fast Refresh warnings. Forced source failure/retry, empty fixtures, text zoom, and screen readers remain unverified.

Champion expressive design is approximately 87% complete, based on remaining Bonus cards and other More source states plus broader accessibility verification. Next: finish those data states and verify failure/retry behavior. No implementation blockers; estimate remains scope based.

### Champion bonus card previews · 2026-10-03

Bonus cards now leads with four named card previews in an identity surface, with a count and an optional expansion to the full alphabetical list. Shared CardGrid preserves card links, art fallbacks, and alternate face controls. Expansion resets between champions. Card selection is unchanged.

Catalog sync status now distinguishes loading and failed refreshes from a completed empty result. Saved matching cards remain visible during sync or failure. A clearly labeled reload action retries the catalog through the existing sync lifecycle.

Verified Lorraine at 360px and 1280px: four initial cards, keyboard expansion to six and collapse, 48px button, four desktop columns, and no horizontal overflow. Initial page loading was observed. Typecheck and lint passed with six existing Fast Refresh warnings. Forced catalog loading/failure/retry and empty fixtures, text zoom, and screen reader output remain unverified.

Champion expressive design is approximately 90% complete, based on completed view simplification and remaining data-state and accessibility verification. Next: regional and composition source states, followed by broader failure/retry and accessibility checks. Estimate remains scope based; no implementation blockers.

### Champion expressive design wrap-up · 2026-10-03

The planned champion design implementation is complete: card identity, actual Recent/Unique/Top deck previews, compact overview summaries, accessible peer tabs, and progressively disclosed Bonus cards, Regions, Similar decks, and composition evidence.

Regional events and tournament decks now expose independent loading and failure/retry feedback. Cached regional results remain available. Composition evidence remains discoverable even when its source is unavailable or empty, with visible source status outside the disclosure and an explicit completed empty state inside. Dataset gating, ranking, membership, and calculations are preserved.

Wrap-up checks passed at 360px and 1280px: regional and composition keyboard disclosure, minimum 48px summary targets, responsive composition columns, and no horizontal overflow. App typecheck and lint passed with six existing Fast Refresh warnings. Earlier checks cover the other champion views. Forced source failure/retry and empty fixtures, text zoom, and screen reader output remain unverified; this is implementation completion, not exhaustive accessibility or resilience certification.

Champion expressive design: 100% of the agreed implementation scope. Next recommended work: push the accumulated champion commits and verify deployment when requested. No implementation blockers; the verification limitations above remain follow-up QA items.

### Champion cover accessibility follow-up · 2026-10-03

Shared artwork covers now let the title determine the cover height. Long titles and enlarged text remain inside the surface instead of being clipped by an absolute overlay. The artwork crop, whole-card navigation, and visible printed name are retained.

Verified a long-title fixture with 200% root text size at 360px and 1280px: title bounds remain inside the cover and the page has no horizontal overflow. Real Lorraine Similar decks also passed both viewport checks and keyboard expansion/collapse from three to ten results. Controlled source-status fixtures confirmed unavailable versus cached failure copy and keyboard retry transitions to loading; these exercise presentation, not network recovery. App typecheck, lint, and the three existing deck preview tests passed. Lint retains six existing Fast Refresh warnings.

Champion expressive design remains 100% implemented for the agreed scope. Next: push accumulated commits and verify deployment when requested. Actual network failure/retry, screen-reader output, and browser-native text zoom remain unverified; root font enlargement was used for this layout check.

### 2026-10-03: Event identity and profile showcases

Implemented event champion artwork from the uniquely highest recorded final player placement. Missing champion/list data and tied or missing placements use Nameless Champion with an explicit unavailable label. Backfilled 21,821 event summaries from local bundles and cached card definitions; 1,785 have a known identity. Updated the index manifest timestamp so existing clients refresh.

Extended Account and the public profile with an explicit showcase: up to six catalog cards and three published community decks, chosen from public community favorites and the user's own published decks. Favorite order is selection order. Profile discovery includes people with a showcase even without their own published decks. Existing profile visibility applies. Public reads recheck featured deck visibility and moderation. Private collection, bookmarks, and match history are not published. The editor keeps failed-save drafts, protects dismissal, opens deck/card details in a new tab, and supports conflict reload. Single-statement persistence provides atomic writes, optimistic revisions, and identical retry recovery. Migration 0031 is required; schema health and account export include the new resource.

Verification: app, pipeline and account service typechecks; lint with existing warnings; focused placement, profile persistence/security tests. UI fixture at 360px and 1280px verified known/fallback event identity, card search, selection by keyboard, failed save with retained draft, successful retry, reopening saved choices, focus restoration, 48px editor controls, and no page overflow. Fixture is not a signed-in production round trip. Physical mobile keyboard, screen reader and deployed migration verification remain.

Follow-ups for the broader profile initiative: tournament favorite adapter, optional bio and preferred formats, and explicit showcase reorder controls. These are additional scope beyond the initial community showcase. No push or deployment performed.

### 2026-10-03: Tournament favorites on profiles

Profile showcases now support tournament favorites alongside community decks, with a combined limit of three. Only tournament hashes are saved. Public champion names and material previews resolve from published deck partitions, never private favorite snapshot text. Missing builds are omitted from public results; unavailable source data rejects saves without changing the existing showcase. Existing atomic revisions and identical retry recovery apply to both sources. No migration is needed. Deploy the account service before the frontend.

The editor preserves selections when filtering, shows independent tournament loading/failure feedback, and links previews to deck pages in a new tab. Community selections appear before tournament selections, with selection order preserved within each source. Explicit reorder controls remain a follow-up.

Verification: app/shared/account service typechecks and app lint (six existing warnings); account tests cover mixed-source limits, malformed/duplicate hashes, public resolution, missing sources, failed asset requests, unchanged persistence on failure, retry behavior, and profile discovery. A local fixture using real UI components passed 360px and 1280px checks for keyboard selection, search, retained failed-save draft, successful retry, saved selection reopening, public deck navigation, focus restoration, 48px buttons, and no horizontal overflow. Fixture uses mocked account responses; signed-in production saving, physical mobile keyboard, and screen-reader output remain unverified.

Tournament profile favorites: 100% of implementation scope, not yet deployed. Next recommended work: explicit showcase reordering. Bio and preferred formats remain optional additional scope.

### 2026-10-03: Showcase ordering

Favorite cards and featured decks now have Earlier and Later controls, visible positions, and live position announcements. Community and tournament decks share one saved order. Existing showcases retain their original order until edited. Keyboard focus follows a moved item, including at the list boundaries. Failed saves preserve the draft. The service validates order membership and saves it with existing atomic revision and retry handling. No migration is needed; deploy the account service before the frontend.

Verification: 37 focused persistence/security tests pass, including successful reorder/read/retry, stale revision rejection and injected rollback. App/shared/account typechecks pass. A local fixture checked keyboard reorder, boundary focus, retained failed-save draft, successful retry, reopening saved order and public mixed-source ordering. Layout checks used 360px and 1280px viewports, with 48px controls and no measured horizontal overflow. Unavailable-card fallbacks were used in this fixture; real artwork was covered by the preceding showcase work. Production authenticated saving, physical mobile keyboard, screen reader output and forced loading states remain unverified.

Showcase ordering: 100% implemented. Next recommended work: publish the profile enhancements and verify a signed-in production round trip when authorized. Bio and preferred formats remain optional additional scope.
