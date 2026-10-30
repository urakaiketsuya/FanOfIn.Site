# Interface patterns

Use Material interaction principles with the existing Catppuccin theme. Organize each flow around the player's task and keep cards and decks recognizable across tools.

## Shared defaults

Use `Button`, `Tabs` with `TabPanel`, `Panel`, `DialogSheet`, and `DisclosureChevron` before adding custom controls. Card previews use `CardArtTile` or `VisualCardTile`; card management uses `CardResult`. Keep persistence in feature controllers.

The theme in `app/src/index.css` owns colors and typography. `--spacing-control` defines the 48px minimum control target through `min-h-control` and `min-w-control`. Keep compact button text separate from target size. Use Panel's padding, tone, and elevation variants for surfaces. Essential status always has text, not just color. Respect reduced motion.

## Choose an interaction

| User need | Pattern | Required behavior |
| --- | --- | --- |
| Identify a card or deck | Visible artwork and readable title | Name fallback; known cards link to details; do not hide identity behind expansion |
| Understand a result | Visual comparison and concise labels | No explanatory disclosures or disclaimer panels; keep methodology in calculation docs |
| Edit quantities, loans, or assignments | DialogSheet | Parent retains drafts; local drafts use dirty protection; persistent save action; failed saves keep work and show inline error |
| Move between peer views | Tabs and TabPanel | Roving keyboard focus, selected state, panel association; preserve drafts and existing URL state |
| Confirm successful action | Toast | Specific outcome; add Undo only when a real reversal exists; do not put essential status only in a toast |
| Recover from failed action | Inline error near the task | Explain what remains saved or unsaved, provide retry, keep entered values |
| Perform a sustained task such as goldfishing | Dedicated page | Keep frequent actions near the work area; sticky controls must not obscure content or keyboard focus |

Show one primary action per task region. Navigation uses links; mutations use buttons. Require explicit acceptance before recommendations change a deck. Keep the selected deck, format, and relevant scope visible when crossing tools.

## Concise recommendations and comparisons

Lead with the actual cards and the decision: savings, a few short tradeoff labels, and one explicit
accept action. Prefer sensible initial selections so results appear without an empty setup step.
Keep common controls compact and touch-friendly. A result should be understandable by scanning
its cards and labels, without reading paragraphs.

Do not repeat full card rules, introductory instructions, methodology, missing-evidence notices,
or cautionary prose across result cards. Use existing card/detail links for deeper reading. Do not
replace removed text with new disclosures or accordions. Qualify estimates in their labels; show
errors, unavailable prices and other blockers only when relevant. Preserve evidence and limitations
in calculation docs without presenting untested recommendations as demonstrated outcomes.

## Collection language

Use `CollectionCopyStatus` and `CollectionStatusHelp` for location summaries. Counts must come from `cardLocationState` or `collectionLocationIndex` in shared; never duplicate their arithmetic in presentation.

* **Owned:** recorded physical copies, including active loans and trade reservations. Proxies are separate.
* **Available to use:** owned copies excluding active loans and trade reservations. Includes copies assigned to other decks.
* **Assigned to decks:** copies recorded in deck locations. A deck recipe alone is not a location assignment.
* **Unassigned:** available copies without a deck assignment. This is not a verified binder location.
* **Lent to players:** copies on active loans, still owned until ownership changes.
* **Reserved for trades:** copies held for trades, unavailable to use. A trade listing alone is not a reservation.

These counts overlap; do not present them as slices of a total. Show reconciliation issues explicitly. Ownership coverage uses `OWNERSHIP_COVERAGE_NOTE` so a complete deck is not mistaken for one physically ready to play. Each deck's coverage is independent unless explicitly checking simultaneous assembly.

## Journey acceptance checks

Exercise the flow at 360–390px and desktop, with keyboard and touch targets checked. Verify loading, empty, unavailable data, failure/retry, and expanded states. Test text zoom and long titles where layout changes. Record checks that could not be run.

1. Find a deck → open its list → check ownership → edit quantities → save → confirm coverage updates. On failed save, retain the draft and retry without double adding.
2. Review missing cards → record an acquisition → return to the deck. Confirm missing counts and collection use the same saved quantities.
3. Locate a copy → assign it to a deck → review an explicit transfer to another deck. The total owned must remain unchanged.
4. Record a loan → verify owned stays constant and available decreases → record return → verify available recovers. Returned loans must not count as active.
5. Open analysis or playtesting with the selected deck → verify title, format, and card quantities survive the transition. Keep the original saved list unchanged until explicitly saved.

Use small representative fixtures for calculation and persistence boundaries. UI screenshots alone do not verify cross-feature data consistency.

## Expressive emphasis

Use larger deck titles and champion art to establish identity. Keep source badges subordinate to the title. `DeckVisualStrip` leads with the champion when known; immutable sources continue to use `DeckPreviewCard`. Editable builds retain their own controller and show their primary navigation action explicitly.

Use independent progress bars for owned and available copies, both against the selected deck scope. Never combine these overlapping counts into a chart. Collection readiness uses shared `deckLocationSummary`; catalog gaps, failed refreshes, and reconciliation issues must not imply a deck is ready. Expand blockers into named cards with direct location links. Sideboard inclusion must change both counts together.

Use the brief `state-arrive` opacity transition for transient feedback, not layout movement. Reduced motion overrides it. Persistent warnings stay visible and text labeled. Selected pill tabs include an outline as well as a tint.

Keep local motion brief (150–220ms). Shared sheets animate entry and user dismissal while preserving modal isolation, discard protection and focus restoration; parent-driven completion can unmount immediately. Tabs and evidence fade without changing draft ownership or remounting inputs. Use `useChangeMotion` for committed quantity and forecast changes; keep exact numbers immediately visible. Card artwork uses brightness feedback on its existing action target, with no grid movement or stagger. Reduced motion removes animation and transition delays as well as duration; programmatic tab scrolling must respect it too.

Import review uses the shared sheet, tabs, named card previews, draft protection, and a persistent confirmation action. Opening a card from an import review uses a new tab so the draft stays available. Library failures retain paste as an alternative; optional favorites failures do not hide owned builds.

Goldfish keeps Draw, Next turn, Memory, and Material within reach. Its footer measures its height and reserves content and focus scrolling space. Tool sheets isolate focus and sit above the footer. The latest action is inline live feedback, not a toast for every draw.

Use `identity-surface` and the controlled accent palette for decorative deck and folder identity. Champion accents are stable across saved deck cards and headers; they do not encode game elements or readiness. Keep status colors and labels separate. Folder cover selection uses `CardResult` inside the existing editor, with a live `DeckFolderPreview`; preserve appearance when changing membership. Keep error and recovery controls in the persistent footer when an expanded picker can scroll them out of view.

Advanced Analysis groups questions by task and gives each a single entry. Related detailed models
are peer tabs under the same question, with separate-input scope stated explicitly. Keep visited
models mounted while the deck workspace remains open so switching views cannot discard drafts.
Card handoffs update the requested scenario without remounting the whole workspace. Lead calculated
results with named card artwork and concise labels distinguishing calculated odds from estimates.
Keep supporting methodology in docs/CALCULATIONS.md. Large result panels should not become sticky overlays on narrow screens.

## Card printings

Use the shared `PrintingChoices` inside the existing sheet, with explicit edition artwork,
readable set/collector labels and a persistent Apply action. Phones use artwork-and-details
rows; desktop uses a wrapping grid. Selecting an edition never implies foil/nonfoil finish.
Keep unspecified copies valid, including legacy inventory and imported lists. Collection and
binder finish is independent of printing: Unspecified finish, Nonfoil, or Foil. Existing
records remain unspecified. Wants may use Any finish; available listings identify an exact
finish pool. Show finish beside quantities in collection review, listings, and offers.
Identify finishes redistributes copies within each printing without changing owned totals or
proxies. Printing identification operates within a selected finish and preserves other finishes.

Collection **Add copies** changes ownership. **Identify existing copies** redistributes the
existing total across printing pools and preserves proxies. Keep all pools for a card in one
atomic save batch and revert that card's pending pools together. Draft saves carry expected
quantities; conflicts retain the draft for review instead of overwriting newer inventory.

Deck printings are optional, section-aware allocations saved with each owner's version, outside
canonical gameplay identity. Deck views show each selected printing directly with its allocated copy count; unspecified
copies use the default artwork. Keep section totals and gameplay identity unchanged.
Quantity reductions and partial moves must explicitly resolve affected printed copies. Ownership
counts shown by the picker are recorded inventory, not exact-printing availability or reservations.
Printing choices survive undo, drafts, version history, public copies, bookmarks and supported
share/text round-trips. Standard external exports disclose that they omit printing choices.

Deck calculator entry points start with four player questions; All calculators retains
full topic navigation. Switching questions preserves the shared deadline, play order,
card selections, and mounted detailed-model drafts. Results lead with the saved plan's
named cards and prompt only for missing role pools. Draw outcomes use labeled bars. Sensitivity
previews use concise comparisons. Previews never alter deck quantities or saved
roles. Catalog gaps and inherited roles needing review remain visible beside plan results.

Deck analysis results use draw-count and Reserve-cost bars with visible values. Natural draws and estimated extra draws retain distinct labels. Saved access comparisons name the selected cards and play order; use “Save for comparison,” not “baseline.” Do not add methodology accordions or opening-size summaries.

Deck Analysis opens on Deck Report. Use peer tabs that retain visited calculators and drafts,
with results and named card artwork before configuration. Associated-card grids wrap and show
copy counts, card-detail links, and name fallbacks; never gate their membership behind “show all.”
Combat metric selection highlights the printed-power ally pool or supported boost sources with
an outline and a Contributes label. Keep attack power distinct from direct-damage access.
Unmodeled-only damage is unavailable, not zero. Package issues show their detected enabler/payoff
or producer/consumer pools explicitly; proposed additions remain separate from selected cards.

## Browse navigation and supporting evidence

Use shared pill Tabs for peer browse views (cards, decks, archetypes, and event results), with TabPanel associations for newly migrated views. Underline tabs remain appropriate inside a focused task such as choosing an import source. Wrap long browse tab sets on phones instead of compressing controls. Controls remain at least 48px tall.

Keep promotional messages outside sticky navigation and stable for the mounted visit. Use PageHeader for signed-out feature entry points. Import entry flows use one framing surface. Shared champion relationships show exact card variants and supported family summaries first, with one inline build-evidence disclosure per relationship; observed and zero-match details remain accessible inside it. Semantic danger, warning, and success colors are explicitly defined for the site's dark surfaces regardless of operating system theme.

## Homepage discovery

Keep the four task shortcuts directly below the introduction. Returning players get a
Continue your decks link before the introduction. Homepage discovery reads the bounded
`analysis/homepage.json` projection, regenerated with analysis: the latest sighting for
three distinct champions (event date descending, placement ascending to break ties), plus
three established families from different champions ordered by player count. Featured
identity cards are a preview of each family's pool, not an exact tested combo. Link to
the champion's Builds tab for full families and shared relationships. Show result dates,
visible loading/error/retry and empty states; retain navigation when data is unavailable.
Keep one interactive analysis example, with detailed assumptions in calculation docs.

## Deck editing reachability

Offer section-specific plus tiles as the first and last items inside populated card
grids, with one tile for empty sections. Use an image-free card silhouette with an
Add cards label and a section-specific accessible name; use a compact row in list mode. Open search with that exact destination selected; keep
section eligibility checks and never silently reroute an addition. Keep Undo/Redo
reachable while scrolling (Builder toolbar or My Decks save bar). Routine feedback
expires after six seconds, or eight seconds with an action; pause while hovered,
focused, hidden, or running an action. Errors and explicitly persistent notices remain
until dismissed. Editor history remains available after an Undo notification expires.

## Action menus

Use `MenuDetails` for floating navigation, display, and deck action menus. Open by
click or keyboard; selecting an action or display value closes the menu. Opening
another menu, clicking outside, moving focus out, navigating, or pressing Escape
also dismisses it. Escape and selections restore focus to the trigger. Keep menu
children mounted so launched tasks retain their state; `DialogSheet` renders in
the document body so closing a parent menu cannot hide its dialog. Keep ordinary
section disclosures separate from action menus.

Run child click actions before dismissing their menu. During pointer interaction,
blur must not hide menu contents: mobile browsers can clear focus or move it
outside before delivering the click. Outside-pointer dismissal and keyboard focus
moves to a known outside target still close the menu. Resume keyboard dismissal
on keydown, including when the menu was opened by touch.

Deck detail pages keep Edit or Save copy and Playtest in the identity header, with
secondary actions in one More menu. Export deck image is a direct item in that menu;
its portaled sheet must remain mounted after menu dismissal. Embedded decklists retain
a local More menu. Verify export opening by touch and keyboard after changing menus.
Deck image exports show a PNG preview with native touch-and-hold image actions
available, plus a named PNG download. Offer native file sharing only when the
browser reports support for that PNG file. Keep the preview available after a
share cancellation or failure; only report actual errors, and never claim that
opening the share sheet saved the image to Photos.
Include the saved deck title and, when known, its owner's display name or the
recorded tournament player's name in the PNG header. Wrap long names before the
card sections. Do not attribute grouped tournament builds to a single player.

## Collection shortcuts

Use the collection's existing Select mode for bulk playset completion. Stage only missing
physical copies and preserve printings, finishes, proxies, filters, and selected cards.
Keep Save quantities directly available; reviewing ordinary additions is optional.
Missing-card acquisition stays in its current view and keeps acquired cards visible with
an Owned or Added to draft label. Deck acquisitions save through the existing retryable
ownership operation; collection acquisitions join the parent quantity draft.
Saved deck cards expose Edit deck and Playtest before secondary details. Edit opens the
existing editor and retains its draft-resume behavior; Playtest carries the saved title,
format, deck identifier, and full list.

## Artist identity aliases

Curated spelling variants share one directory entry and combined card gallery while preserving every original printing credit. Former artist URLs continue to resolve through explicit slug aliases. Search matches all credited spellings. Merge case or spacing variants deliberately; ambiguous names require identity evidence or user confirmation.

Studio artist pages show a responsive grid of credited artists with portraits or initials and card counts when the catalog is available. Each artist links to their own gallery and back to the studio. Relationships are explicit curated catalog associations, not claims of current employment. Studio artwork counts continue to describe the studio’s own credited gallery.

Studio logos may use contained portrait images with padding to preserve their complete mark. Transparent portraits use the avatar surface behind the image so fallback initials do not show through.

User-selected champion avatars may frame an original card image within the portrait circle. Preserve the original file and record its card source and representative-image status in discovery notes. The avatar does not change artist credit attribution.

Wide artist images may specify an explicit portrait focal position to keep the subject visible within the circular avatar. Preserve the original downloaded image.

Supplied portrait screenshots may specify a CSS scale to exclude surrounding screenshot borders while preserving the original image file.

Artist names may use semantic ruby annotations in the directory, profile heading, and studio member list. Curate readings explicitly: prefer artist-confirmed pronunciation, then standard Mandarin pinyin for clearly Chinese names. Never infer a Japanese name reading from kanji or a romanized handle alone. Keep pronunciation separate from identity aliases and raw credits. Search accepts pronunciation with or without Latin tone marks.

Scope each artist pronunciation to an explicit nativeText substring. Latin studio prefixes, handles, and suffixes remain outside the ruby element, and reading text excludes those Latin portions. A display variant without that substring falls back to the plain name.

When the user authorizes tentative readings, retain estimated provenance in curated metadata and research records. Per user preference, pronunciation labels do not display question marks. Replace estimates with artist-confirmed readings when available. Tentative pronunciation does not establish an account identity or alias.

Artist pronunciation annotations target English speakers: display Japanese readings in romaji (ja-Latn), with macrons for long vowels, and Chinese fallbacks in pinyin. Preserve native-script-only ruby scope. Search ignores Latin diacritics.

## Collection category goals

Collection Progress offers Set, Rarity, Artist, Champion and Keyword groups with card previews,
readable names and separate progress bars. Multiple category goals can be pinned to the signed-in account.
Artist and rarity goals require matching catalog printings; set goals offer any-printing card
coverage or each matching printing. Champion groups include champion cards only. Show saved
ownership separately from draft changes, and Needs identification when unknown printing pools
might cover missing editions. Use the existing collection card sheet for acquisitions and
identification; preserve parent quantity drafts when switching Cards/Progress or goal filters.

Use Filter goal for optional category combinations, with one selection per additional category. Apply changes to the current view and preserve quantity drafts. Show selected filter names on details and pinned goals. Pinning a combination creates a separate goal; existing pins retain their scope. Empty combinations offer a clear no-match state.

Account goal saves preserve prior pins until confirmed and offer retry on failure. Offer an explicit import for legacy device goals, retaining the device data until the account save succeeds. Refresh account goals when the window regains focus.

### Profile favorite artists and sets

Edit profile offers up to six curated artist identities and six expansion set families. Search and removal controls edit the same protected draft as cards and decks; Save profile persists the complete showcase atomically with revision conflict and retry handling. Favorites are catalog references, not user-authored labels. Public profiles link selected artists to their galleries and sets to card browsing, omit empty sections, and retain existing profile visibility rules. First and Alter editions share a set-family choice. No database migration is needed.

The profile artist picker and directory share curated credit/reading search. Basic Latin
letters match tone marks and macrons; spaces and punctuation are optional. A save response
that drops artist or set favorites keeps the local draft and reports an error, retaining the
returned revision for retry instead of announcing success.

Merchandise collection uses individual verified items as the progress denominator. Manufacturer product photos must be distinct from bundle overviews, and sleeve quantities must show the pack size. Bundle overview images must be labeled as overviews; owning one component never implies a full bundle. Merchandise releases are distinct from card sets. Saved progress excludes drafts, and unknown product identities stay outside totals. Quantity drafts survive view changes and failed saves. An unconfirmed save must be retried before editing; a conflict retains edits while loading newer saved quantities for explicit review and resubmission.

## Printable deck proxies

Keep Print proxies beside Export deck image. Snapshot the deck when the sheet opens,
show named card previews and copy/page counts, and preserve selected printings. Include
main and material by default with opt-in sideboard; exclude maybeboard and other sections.
Offer Letter and A4 PDFs with nine 63 × 88 mm cards per page, one placement per copy,
external cutting guides and a 20 mm scale check. Keep Actual size / 100% printing guidance
beside Download PDF. Missing artwork blocks download with named errors and a retry that
refreshes both the PDF and preview. Cancel pending work and release object URLs on dismissal.

Deck Analysis Matchups uses a dedicated, always-open overview: a named historical archetype
summary followed by champion-art matchup cards with large win rates and recorded game counts.
Rates describe the matched archetype, not a prediction for the exact current list. No card-impact
bonuses are added together, and no current-list delta is displayed without a validated model.
Opponent archetype names remain visible because multiple builds can share a champion. Missing
art keeps the champion name. Loading, failed fetches with retry, and genuinely empty matchup
results are distinct. Detected card interactions appear openly as card-art groups; the Analysis
view does not inherit Builder disclosures, per-card impact tables, or empty nearest-deck controls.

## Store browsing

Lead with search and Near me; keep optional filters in DialogSheet with removable active
filters outside it. Published schedules use curated review dates, source links and
store-local time summaries; inferred recurrence remains labeled as expected dates.
Never create booked events from a published schedule. Preserve query filters and the
browsing position when returning from store details. Cluster map markers at wide zooms,
link selections to visible result cards, and keep unmapped matches in a separately
labeled group when distance filtering cannot place them. User location coordinates remain
transient page state and are never placed in URLs or persistent storage.

Store browse controls share a wrapping row with the mobile List/Map tabs. Show Clear all
next to active filter chips. Cards lead with name/distance, published schedule, address
and Directions/Website actions; the name opens details. Keep review dates and recorded
activity in details, and show the time-zone note once above results. Desktop uses a
40/60 list/map split with a viewport-height map; mobile uses a short map and a compact
selected-store summary with Directions below it. Preserve 48px controls while compacting.

Fixture analytics opens on automatic Deck report and Comparison report findings.
Show named cards, conditional checkpoints and access odds before optional inputs.
Version reports put changed findings first and retain unchanged findings below.
Keep Adjust scenario in the separate Calculators view using DialogSheet; retain parent-owned adjustments on dismissal.
Keep selected champions and scenario conditions visible with the results. Conditional
checkpoints are never labeled expected performance or an affordable play sequence.

## Statistical reports illustrated with cards

Deck reports lead with one statistical question, directly labeled results, then
associated card artwork and names. Show 7/10/15/20 cards-seen checkpoints together;
no card selection or scenario adjustment is required. Separate draw access from
conditional output. Use paired access dots for version changes and same-model
percentile intervals for damage. Keep a shared scale, text values, and visible
coverage status. Do not encode numerical magnitudes with card artwork size.

Acceptance tasks: identify the effect of a fourth copy; distinguish drawn potential
from resolved damage; identify included cards; compare a 60-card and larger library.
Validate against known-answer calculations, then assess player accuracy and time
against a plain table. Automated checks cannot establish player comprehension.

## Include and exclude filters

Shared facet controls offer explicit Include and Exclude buttons; selecting one replaces the opposite choice. Clicking the active choice removes it. Searchable facets find options without applying a choice merely from typing. Active chips use the word Exclude, remain visible outside the card filter sheet, and remove one selection at a time.

The query and visual picker edit the same state. Supported query fields are `class`, `type`, `subtype`, `element`, `set`, `edition`, `rarity`, and `tag` where that view has the corresponding data. Prefix a field with `-` to exclude it, such as `-subtype:harmony`; quote values containing spaces. Plain text retains name/rules phrase matching in card browsers. Search/Enter applies the query; malformed or conflicting terms leave the previous results intact and show an inline error. Deck-content queries use explicit fields; named deck cards are selected separately. This is a bounded grammar, not full Scryfall syntax (no OR, nested expressions or regular expressions).

Multiple positive choices in a facet match any; separate facets combine. Exclusions veto any matching value. Deck identity element filters retain their existing all-positive-values semantics. Deck-content exclusions apply to the entire main-plus-material card pool, and do not contribute to relevance scores. Edition/set/rarity restrictions in card browsers must match the same eligible printing; another eligible printing keeps the card visible. Community tags are card-level across printings, so excluding a tag removes any card with that tag.

Facet values serialize with a leading minus for exclusions. Cards, Collection, Quick Buy, and tournament deck-content filters retain their selections in the URL, preserve unrelated navigation parameters, and restore on Back/Forward. Collection and Quick Buy use separate parameter prefixes. Builder retains filters in its existing browser controller while mounted.

## Reports and calculators

Deck Report is the default automatic view; Calculators owns card selections, deadlines,
play order, board assumptions and scenario profiles. Reports receive deck and catalog
inputs only, never calculator state. Use fixed 7/10/15/20 cards-seen checkpoints; retain
conditional-output and coverage labels. Metric highlighting and composition navigation
inspect existing results without changing their assumptions. Ally-power checkpoints
use the existing deterministic model with Musicbox replay disabled; they show sampled
mean potential, not expected resolved combat damage.

Explore in calculator carries the deck and named card into the calculator. Keep visited
tools mounted so their drafts survive returning to the report. Scenario setup belongs
inside Calculators. Deck comparisons default to Comparison Report; Calculators retains
probability controls, adjustable opponent/version scenarios and the all-allies ceiling.
Report and calculator comparisons mount independently, preventing scenario changes from
altering automatic findings. Existing summary, table, forecasts and matchup URLs remain valid.


### Archetype reports

Archetype detail opens on Report: composition intervals, card-illustrated inclusion and copy
counts, then fixed draw checkpoints. No configuration is required. Main and Material remain
separate. Available-list and unresolved-card status stay visible; optional expansion reveals
more observed cards without changing the calculation. Overview, Decks, and Evolution remain
separate tabs. New-release candidates show their own edition prefix/date because the candidate
pool can include both the latest main set and newer Alter editions.

### Deck decision findings and opt-in suggestions

The automatic report leads with three numeric summary tiles and reviewed package
presence outcomes. Keep sections card-and-number led: short headings, compact status
labels, and no explanatory paragraphs. Testing priorities use short chips. Package art identifies the full reviewed pool, current Main/Material
copies, and missing members. Comparable exact lists and matchup evidence remain
inspectable without changing calculator assumptions. Reference differences expand
inline from six cards; historical candidates retain sample scope.

Suggestions begin only after “Suggest improvements”. Goal, required matchup context,
optional quantity locks and a package-access lock belong to that flow. Each candidate
shows exact cut/add art and opens a DialogSheet comparison. Apply is explicit and saves
a local draft; restore original remains available and survives reload. Account decks
are unchanged. Storage failure keeps the preview and reports the error. No generic
strength score or automatic deck mutation is permitted.

## Deck search

Deck searches share Champion and Cards controls. Champion selects a family;
requiring an exact champion card uses Includes cards. All selected names must occur
in the same list's Main + Material; Pantheon archives additionally include their
explicit Boon zone. Sideboards and referenced tokens do not qualify. Printings share
card identity. Preserve existing include/exclude URL filters and keep selected card
art and names outside advanced filter sheets. The picker uses CardResult and explicit
selection; typing never applies a card requirement. Unknown membership cannot qualify.

Browse Decks puts search first, then Cards and Filters. Use one bounded active-filter
summary with removable labels, card thumbnails, and an inline “+N more” expansion;
keep card names and include/exclude status visible. Browse has one Clear all action.
Category resets belong inside the picker. Selected cards remain available while searching
in that picker. Put sorting beside the result count; primary order, second choice, and
priority share a Sort sheet. Filtering and ordering apply immediately without a save step.
Preserve comparison selections and existing URL state when rearranging these controls.

Search applies before pagination and retains source, format, folder and selected decks.
Library and scoped searches use deck-search- URL parameters; Browse Decks retains its
existing champion and content-card parameters. Card-detail and champion-detail links
open scoped Browse Decks. Shared summaries expose only published Main + Material
membership, never private drafts. Loading and unavailable sources retain filters and
provide retry through source status.

## Banlist

Default to Standard and the reviewed official B&R list, including seasonal bans.
Catalog zero-copy limits alone do not identify balance bans: keep other unavailable
cards in a separate view without guessing their restriction reason. Preserve format,
view, and card-name search in the URL. Show only the selected format's status, retain
announced card names while artwork loads or fails, and link the dated official review.
The list-effective date describes the reviewed B&R, not each card's original ban date.
Maintain `features/cards/banlistData.ts` after official announcements; update names,
season labels, effective date, sources, and last-verified date together. Never advance
the verification date just because the catalog synced.

## Deck section headings

Shared read-only deck views use prominent sentence-case section headings, visible copy
counts (distinct types for Tokens), a divider, and the shared chevron. The full header
is a minimum-48px button with expanded state and a linked content region. Main and
Material start open; Sideboard and Tokens start closed. Sections toggle independently,
retain their mounted content, and preserve expansion while switching visual/detailed
views or display settings within the current viewer. Empty sections remain omitted.
Prices stay visible in the header when enabled. Collapse does not alter deck contents,
exports, ownership calculations, or editing drafts.

## Browse deck comparison

Browse results expose an independent Compare checkbox with a Selected label and outline.
One selection spans All Decks, source filters, and Most Played, and persists in this tab's
session storage across navigation and reloads. Filtering never removes selected decks.
The bottom tray shows removable deck labels and a Compare selected action, enabled at two
decks. Additional selections open the shared sheet so the tray stays compact. Reserve its
measured height and focus scroll padding; move it into document flow while the keyboard is open.

Resolve every selected list before navigating; a failed source retains the whole selection
with a named error and retry. Comparison opens Cards on differences and retains an explicit
return to Browse with its filters. Shared decks use the published list and format; tournament
lists keep their actual sections. Most Played selections represent exact Main + Material only,
explicitly labeled, and never borrow a sideboard from an arbitrary player.
Comparison handoffs use a tab-local session token in the URL as well as navigation state.
The token restores exact lists after static-host redirects on refresh; comparison edits update
that snapshot without changing the Browse selection. Share uses the existing portable share link,
not the tab-local token. Blocked storage keeps navigation available and shows a refresh warning.
The selected-decks summary on the comparison page scrolls normally with the page; it is not sticky.

### Baseline-free comparison report

Comparison Report treats every selected deck equally. Show absolute Main-library draw access
for named cards at 7/10/15/20 cards seen; a missing card is zero, but an unavailable list or
empty library is unknown. The single-outcome view sorts all decks by probability; the two-outcome
view uses the same 0–100% axes and stable numbered deck labels. Coincident points list all deck
numbers. Keep every deck available in the labeled selection rows, including on mobile.

Select at most two decks to inspect Shared core, Different quantities and Distinctive cards.
Keep Main and Material separate, show both deck names and actual copy counts, and exclude
sideboards. No before/after labels or baseline controls appear in the report. Existing Summary
and Calculators retain their baseline behavior. Report selections survive switching views.

## Deck display arrangement

Finished deck views share browser-persisted grouping, sorting, and visual sizing. Group by deck
location, set family, element, exact type combination, or no groups. Non-location groups retain
location labels; tokens remain separate. Set grouping uses allocated editions and the earliest
catalog release for unspecified copies, without changing saved quantities or printings.
Sort within each group by deck order, name, numeric cost, quantity, or cheapest available unit
price. Missing prices and nonnumeric costs sort last; zero is a known value. Price sorting loads
quotes and keeps pricing visible, including refresh status and retry. The one-card-per-row visual
layout places artwork beside a linked name and stats at both mobile and desktop widths.

## Deck presentation controls

Keep page navigation separate from the Deck tab's Grid / Rows / List selector and
Customize action. Customize uses DialogSheet with Arrange, Appearance (grid only),
and Show groups. Preferences apply immediately and persist; Done dismisses without
a save or discard step. Keep collection tasks outside display customization. Preserve
existing tab URL keys and mounted drafts when changing visible labels.

## Collected builds

Browse integrates anonymous collected builds with a Collected source filter. Only generated
catalog-based champion names, format, exact card quantities and earliest collection dates enter
the browse projection; never copy imported titles, authors, profile links or descriptions.
Merge Main + Material identities within a format and retain distinct exact section/sideboard
variants. Variant selection flows into saves, analysis, comparison and playtesting. Collection
dates describe discovery, not source publication. Keep verified tournament sightings separate;
builds with tournament sightings are excluded from collected browse results and represented
by tournament results in All Decks. Collection frequency is neither a player count nor a performance or Most Played signal.
Shared publications keep their owner credit; matching collected variants remain linked from
the shared result. Older account servers without quantity signatures leave those results
separate rather than guessing identity from a card-name set.

Basic deck Stats default to Main, with Material and Sideboard kept separate. Tapping a cost
or breakdown bar reveals its exact card pool inline, with artwork, readable names and quantities.
Clear restores focus to the originating bar. Section changes clear local drill-downs; quantity
edits recalculate membership. Keep unknown card data visible and printed conditional resources
separate from unconditional copies. Do not infer playability from printed cost bars.

Deck Basics card access groups names with identical quantities. Rows expose one-copy
access and two-or-more-copy exposure together; the row expands named, linked card art
and fixed-size copy-count scenarios. Cards-seen checkpoints update both measures and
scenario deltas. Native buttons/selects retain keyboard access and 48px targets; section
changes clear the local expansion. Main-only probabilities must not appear on Material
or Sideboard. This view has no deck mutation or automatic recommendation action.

Verification (2026-10-29): access report checked at 390×844 and 1280×900, including
collapsed/expanded rows, keyboard Space, checkpoint changes, Material isolation,
empty Sideboard, section-reset behavior, and 48px controls with no page overflow.
Nine calculation/section tests and app/shared type checks passed. Lint retained seven
existing Fast Refresh warnings. Network-failure injection and browser text zoom were
not exercised; this slice adds no network request.

Observed copy counts accompany Main stats. Card art and names precede exact quantity
bars, including the zero-copy bucket. Show the published build, historical date range,
unique-list and sighting counts, and missing-list status. Six cards appear initially;
Show all expands in place. Unmatched, ambiguous, sparse and unsupported cohorts retain
short explicit states. Fetch failures provide Retry; cached data remains labeled with
its historical coverage. No global quantity win-rate substitution is allowed.

Basic composition, costs and keyword counts now live in Stats. Analysis's Card traits
view retains additional rarity, power and damage characteristics. Analysis access uses
the same compact component and shared probabilities as Stats, preserving per-card
calculator actions. The standalone analysis report no longer repeats its access report
above Deck Stats, and forwards those calculator actions through Stats instead.

Quantity-evidence verification (2026-10-29): real Lorraine report reconciled to 416
unique other lists / 489 sightings. Mobile 390×844 and desktop 1280×900 showed no
horizontal overflow; links and expansion controls met 48px targets. Keyboard Show all
expanded 6→21 cards and collapsed again. Calculator handoff retained Fluffy Shopkeep
and two copies, and Card traits retained the additional charts. Browser loading,
partial coverage, unmatched and Pantheon states were checked. Sparse, ambiguous,
invalid and duplicate-cohort cases are covered by calculation tests; forced network
failure/retry, text zoom, and signed-in saved-deck flows were not browser-tested.

## Tournament player pages

Player profiles open on recent results: format-specific win percentages and match counts,
with champion artwork identifying builds and opponents. Use a common 0–100% bar scale;
card size does not encode performance. Keep the period and event scope visible once.
The compact identity header retains all-time rating and W–L–T; rating history and
milestones follow recent results. Cards, Opponents, Events, and Judged are peer views.
Preserve event filters and card expansions when switching tabs; link tabs through the URL.

The Cards view uses all-time public-deck inclusion within the selected champion and
format (decks containing a card divided by matching available public decks for that player),
split by Main, Material, and Sideboard. Show percentages, counts, artwork and names together.
Start with six cards per section and allow expansion.
Do not mix this denominator with recent match results. Rankings stay ordered by rating and
use wrapping rows on phones, with all-time record separate from recent Standard wins.
Use explicit provisional labels and loading, unavailable, retry and empty states.

Player event previews use compact result rows rather than the event-wide preview.
Join the public-deck index by player and event: show that player's champion, placement,
field size and W–L–T, never the event winner's identity. Keep unavailable results explicit;
an event having decklists does not prove this player's deck is public. Known public decks
expand inline with a shared disclosure indicator and retryable loading. The event title
opens the event focused on that player. Keep event field composition and venue detail on
the event page, and avoid fetching every event's full decklists to render collapsed rows.

## Metagame card usage

Competition → Metagame opens on the latest published 90 days of Standard. Show card
identities, inclusion percentages, registration counts and average copies together,
with a shared 0–100% scale. Main, Material and Sideboard stay separate; sideboard
figures describe registrations, not sideboarding actions. Format, period, champion and
section survive URL navigation/reload. Empty sideboards stay in the inclusion denominator.
Keep missing-list counts and retryable source status visible. Load more cards inline.
Calculation definitions are in `docs/METAGAME_CALCULATIONS.md`.

Player Cards now includes champion-specific Card patterns, defaulting automatically to
the most-played Standard champion. Most played and First seen share section tabs and
card identities; usage covers all available history, while First seen uses a labeled
90-day window. Each dated observation links to the player's event. Keep public-list
scope and missing-list counts visible. Persist champion, format and section in distinct
URL parameters; retain expanded card lists when switching profile tabs. Fetch the card
index only after Cards is visited. Preserve the all-time champion overview above it.

Player Cards adds Recent changes and Signature choices below usage and first appearances. Both show up to six named card images with paired percentage bars on a shared 0–100 scale and visible sample counts. Recent changes uses adjacent 90-day periods; signature choices uses other players on the same champion and format. Insufficient history shows available versus required deck counts. Existing format/champion/section controls scope every report together, without additional setup.

## Deck workbench

Lead with the editable deck: champion-led card artwork, a compact tap-to-rename title, format, save status and Save.
Keep Deck and Stats as peer views; preserve deck edits and visited statistics controls when
switching views. Show artwork, linked names and quantity controls on each card. On phones and in Rows, place controls beside the artwork; larger Card art grids keep quantities on one horizontal row. Use one
Actions sheet for moves, removal and printing choices. Keep one Add action per section;
empty optional sections use compact Add buttons. Suggestions opens optional card suggestions
or cheaper replacements, each requiring explicit acceptance. Do not repeat introductory
instructions, card-stat disclosures, methodology or missing-build notices in the editing flow.
Keep construction problems and save/recovery failures actionable and visible.

Workbench verification (2026-10-30): checked initial loading/empty browsing, imported draft,
rename, keyboard tab navigation, retained Stats section, card action sheets, partial moves,
quantity changes and Undo. Checked 360/390px mobile and 1280px desktop, both display layouts,
48px controls and no page overflow. Seven existing deck-editing tests pass. Signed-in saves,
forced network failures, text zoom and on-screen keyboard behavior were not exercised.

## Page width and collection views

Use PageLayout width="fluid" for card/deck browsing, deck details, comparison, building,
and analysis workspaces. Shared gutters are 16px on phones, 24px on tablets, and 32px
on desktop. Keep account forms and prose pages on bounded widths; constrain individual
reading blocks rather than the entire workspace. Loading, empty and error states use
the same page width as the loaded content.

Collections add columns using available container width rather than stretching a fixed
number of cards. Use CardLayoutControls for Grid / Rows / List. Compatible catalog and
deck surfaces share useDecklistDisplayPrefs so layout and grid density survive navigation.
Preserve catalog filtering and deck-specific grouping/sorting in their feature controllers.
Use fullScreen DialogSheet for expanded card/deck views, with controls outside the scrolling
results, readable names, keyboard dismissal and focus restoration. Small screens may scroll;
never shrink controls or names simply to fit everything into one screen.

Player card patterns offers All champions alongside individual champions. Main, Material,
and Sideboard remain peer sections; Sideboard shows how many public decks contain cards.
Champion-specific Unique choices leads with artwork and brief usage counts, compared with
other players' public decks for that champion. Show the peer sample and missing-list count;
keep the definition in calculation docs. Never claim uniqueness when no peer lists exist.

Player card scope verification (2026-10-30): checked 390px and 1280px layouts,
48px report controls, no horizontal overflow, keyboard section navigation, expanded
usage lists, all-champion sideboards, and empty format/unique-choice states. Six report
fixtures pass, including cross-section uniqueness and empty-sideboard denominators.
Forced source failures, text zoom, and populated unique-card UI were not exercised.

Player card follow-up verification (2026-10-30): populated unique choices checked on
player 1005 / Silvie at 390px and 1280px, with linked artwork, names, usage counts and
no page overflow. An isolated local harness using the production published-data hooks
and status component verified first-load failure → Retry → results, and cached results
surviving a failed refresh → Retry; the selected filter stayed intact. The harness used
its own cache key and temporary endpoints, without changing production datasets. Full
app typechecking now passes. Text zoom and live deployment remain unverified.
