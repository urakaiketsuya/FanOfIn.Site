# Page layout review — 25 September 2026

## Scope and evidence

Reviewed the routed page components and shared layout components for content order, secondary information, and control density. Mobile browser spot checks at 390 × 844 covered Cards, a card detail, Card Packages, Compare, and the signed-out Collection state. Collection/account API requests failed in the local preview; signed-in recommendations below are based on source inspection. This is a layout review, not an exhaustive interaction test of every route or data state. No application code was changed.

Aliases and redirects are covered by their destination. The homepage and API docs have concurrent local changes: observations describe the working tree and do not imply those changes are published.

## Highest-value changes

1. **Collection: inventory first.** `app/src/features/collection/CollectionIndex.tsx:138–147` renders exact-printing entry, quick add, catalog entry, CSV import, combined deck shortages, and sharing before the Cards section. Put the searchable inventory directly below the title/counts. Use an Add cards action for single card/deck/set entry, Import for CSV, and separate Deck coverage and Recent changes views. Keep price and shortages secondary to owned quantities.
2. **Deck Analysis: results first.** `app/src/features/deck-analysis/DeckAnalysisIndex.tsx:141–146` places an artwork preview, collection summary, and preparation UI above the analysis tabs. The missing-card details at line 177 are explicitly open by default. Put Summary/Calculators/Matchups immediately after compact deck identity; make collection an opt-in action and preparation a compact status/action. Keep the detailed preparation workflow accessible when required.
3. **Goldfish: hand and turn controls first.** `app/src/features/goldfish/GoldfishIndex.tsx:263–339` puts support information, saved-session controls, three counters, recollection controls, material, tokens, and Glimpse before the hand. Bring the hand below one compact turn/phase/control strip. Use a horizontal counter row on mobile, a Session menu, and contextual zone/tool controls. Preserve payment and card-selection prompts near the cards they affect.
4. **Card detail: compact pricing and mobile identity.** `app/src/features/cards/CardHero.tsx` renders market ranges and a history chart inside the hero, before `CardDetail.tsx:337` renders the card-data tabs. Show a compact price summary that expands to edition prices/history. On mobile place name and key rules beside/below a smaller thumbnail; let users enlarge artwork. Keep edition selection accessible. The browser confirmed the large artwork area pushes the title low on the first screen.
5. **Deck Review: recommendations before the full deck.** `app/src/features/deck-review/DeckReviewIndex.tsx:392–427` renders the full accepted deck before the Review/Matchups/Finish tabs. Put review results first with a collapsible deck summary on mobile and an adjacent deck pane on wide screens. Make its always-visible price total and collection shortage panel opt-in consistently with decklists.
6. **Card Packages: separate package categories.** `app/src/features/cards/PackagesIndex.tsx:105` puts locally approved packages ahead of registered packages and review candidates. In the tested browser there were 44 local approvals; this makes the next category far away. Add Registered / My approvals / Candidates views with counts, retain search, and collapse activation/evidence detail within compact package rows.
7. **My Decks: direct access to favorites.** `app/src/features/account/MyDecksIndex.tsx:105–133` stacks Favorites after every editable build. Use Builds / Favorites tabs sharing a compact search/filter toolbar. Reduce optional onboarding (`AccountChecklist.tsx`) to an expandable summary for returning users; retain the existing Add deck dialog.
8. **Reduce repeated introductory copy.** Teams has a full paragraph about identity limitations above search; simulator and timeline pages have prominent explanatory banners. Keep short data-source labels where useful, with explanatory material on Methodology. Remove repetitive disclaimer-style page introductions in line with the requested direction.

## Page-by-page checklist

“Keep” means no substantial content-hierarchy change recommended from this pass, not that every interaction was tested. “Polish” means a smaller improvement after the priority items.

| Page / route | Assessment | Recommended treatment |
|---|---|---|
| Home `/` | Polish; concurrent work | Prioritize task links and returning-user actions; keep examples below them. Review the current homepage separately before editing. |
| Cards `/cards` | Polish; mobile checked | Move artist search into Filters; combine result count and secondary links into a smaller toolbar. Preserve name/rules search and the grid. |
| Cards: By Set `/cards?tab=sets` | Keep | Set groups are the primary content; no new disclosure layer needed. |
| Card detail `/cards/:slug` | Priority | Smaller mobile hero; expandable price summary/history; rules and card-data navigation sooner. |
| Card Stats `/cards/stats` | Keep/polish | Existing minimum-sample and more-statistics disclosures are useful; consolidate top filter spacing. |
| Card Packages `/cards/packages` | Priority; mobile checked | Separate registered, approved, and candidate lists; compact evidence summaries. |
| Thema rankings `/thema` | Keep | Ranking rows and filters already lead. |
| Thema history `/thema/:editionUuid` | Keep | History is the primary task; keep the chart visible. |
| Events `/events` | Polish | Shorten introductory copy; preserve search, list/calendar choice, and existing Filter and sort disclosure. |
| Event detail `/events/:id` | Keep | Results and top decks lead; More event data is already collapsed. |
| Seasons `/seasons` | Keep | Compact navigation list. |
| Season detail `/seasons/:slug` | Keep | Date range and content tabs provide adequate hierarchy. |
| Players / Judges `/players` | Polish | Move rating reconstruction explanation to Methodology; keep search and rankings first. |
| Player profile `/players/:id` | Keep | More profile details and Competitive context already use disclosures. |
| Teams `/teams` | Polish | Replace lengthy header explanation with a short “Teams by event” label; preserve team/player search. |
| Achievements `/achievements` | Polish | Remove process-heavy introduction; show achievement browsing immediately. |
| Achievement detail `/achievements/:id` | Keep | Qualification and recipients are relevant primary information. |
| Archetypes `/archetypes` | Keep | Coverage, extra filters, and metagame map already collapse. |
| Archetype detail `/archetypes/:id` | Keep | Overview/Decks/More and build-family disclosure already separate secondary information. |
| Archetype comparison `/archetypes/compare` | Polish | Lead with card/progression differences; make extended separation rationale expandable. |
| Battle Chart `/battle-chart` | Keep | Preserve matchup data and tabs; keep match-record detail collapsed. |
| Champions `/champions` | Polish | Keep the compact ranking; shorten the named-Spirit section introduction. |
| Champion synergy `/champions/:name` | Keep | Print/type/package details already collapse; keep useful card recommendations prominent. |
| Champion statistics `/champions/:name/stats` | Keep/polish | Preserve Overview/Decks/More; shorten secondary section descriptions. |
| Compare `/compare` | Polish; empty mobile state checked | Reduce nested picker panels; once selected, use a compact selection strip. Validate sticky selected-deck height with several decks before changing it. |
| Browse Decks `/decks` | Keep | Preserve sightings/builds views; use shared compact filter conventions. |
| Tournament deck `/decks/:id` | Keep recent changes | Optional pricing/collection and compact toolbar now establish the pattern. |
| My saved deck `/decks/:id` | Keep recent changes | Preserve prominent Edit/Test; management and secondary tools remain separate. |
| Shared deck `/decks/:id` | Polish | Inherits compact card toolbar; consider consolidating the header More menu and deck-toolbar More menu. |
| Pantheon decks `/pantheon/decks` | Keep | Preserve browsing focus. |
| Pantheon deck detail `/pantheon/decks/:id` | Keep | Shared decklist improvements apply; secondary detail already collapses. |
| My Decks `/decks/edit` | Priority | Builds/Favorites tabs; compact onboarding and one search/filter row. |
| Shared Decks `/decks/shared` | Keep | Search and format filtering already lead the list. |
| Public user `/users/:profileSlug` | Keep | Identity, deck count, binder link, and decks are appropriately ordered. |
| Deck Builder `/deck-builder` | Polish | Shorten repeated setup instructions and make Find new cards a secondary link. Existing intent chooser already disappears when identity is complete. |
| Deck Analysis `/deck-analysis` | Priority | Results/tabs before artwork, collection, and preparation details. |
| Deck Review `/deck-review` | Priority | Review queue before the full deck; optional pricing/collection. |
| Combo Lab `/combo-lab` | Keep/polish | Preserve chosen pieces and odds; existing reasoning and route-detail disclosures are appropriate. |
| Public combo `/combos/:publicSlug` | Keep | Keep combo identity and its useful result prominent. |
| Goldfish `/goldfish` | Priority | Hand-first layout with compact counters and session/tool menus. |
| Match Log `/match-log` | Keep | Essential entry fields remain primary; extra context/import already collapse. |
| New Cards `/card-discovery` | Polish | Shorten structural-match explanations; compact Champion/Spirit/card context once chosen. |
| Regions `/regions` | Keep | Region choice and analysis surfaces have useful hierarchy. |
| Pack opener `/packs/:prefix` | Keep | Keep opening/revealed cards as the focus. |
| Community decks `/community-decks` | Keep | Popularity/price trends already collapse. |
| Pantheon community `/pantheon` | Keep | Same treatment as community decks. |
| Community deck search `/community-decks/search` | Keep | Search is the primary task. |
| Simulator data `/simulator` | Polish | Replace prominent explanatory banner with compact source metadata; consider tabs for long weapon/turn breakdowns. |
| Match timelines `/timelines` | Polish | Put the match list above lengthy commentary-source explanation. |
| Timeline detail `/timelines/:id` | Keep | Existing match-view tabs separate content. |
| Notable combos `/timelines/combos` | Polish | Compact source context; lead with combo browsing/results. |
| Official decks `/official-decks` | Keep/polish | Deck lists already disclose; shorten the introductory paragraph. |
| Products `/products` | Keep | Product art and release navigation are primary content. |
| Media kit `/media-kit` | Keep | Images are the task; avoid shrinking the gallery just for density. |
| Trading binder `/looking-for` | Keep | Quick share is already collapsed; retain cards/offers as primary tasks. |
| Diao review `/diao-review` | Polish | Keep migration results first; put extended evaluation explanations/checklist behind a disclosure. |
| Collection `/collection` | Priority; signed-in source review | Inventory first; Add/Import actions and separate deck-coverage tools. |
| Account `/account` | Keep | Profile, sign-in methods, and sessions are appropriate; retain clear destructive-action text. |
| Verify email / Reset password | Keep | Single-purpose forms/status; no extra compacting needed. |
| Settings `/settings` | Polish | Clarify the distinction between global Show prices and visual-card Price so the dependency is obvious. Group secondary evidence toggles. |
| Changelog `/changelog` | Polish | Shorten the original-commit-subjects explanation; search and history first. |
| Methodology `/methodology` | Keep | This is the correct home for detailed methodology. Preserve navigation and readable text. |
| API docs `/docs/api` | Keep; concurrent work | Documentation needs examples and explanatory text; current mobile contents disclosure is appropriate. |
| Not found | Keep | Recovery/navigation is the only necessary task. |

## Shared mobile follow-ups

- FilterPanel now has an independently scrollable body, dynamic viewport height, and a fixed result action. The mobile check confirmed the sheet and exit action render. Test expanded filter groups with enough options to overflow before calling scrolling fully verified.
- FilterPanel visually behaves like a modal on mobile but does not establish modal semantics or a focus trap. Add these so keyboard focus cannot move into the obscured page; preserve Escape and return focus to the trigger.
- The rotating promotion strip remains above every page. Consider limiting it to discovery/home pages so deck editing and other focused tasks reclaim that vertical space.
- Standardize one compact secondary-action menu and one display control per workspace, preserving primary actions and touch-target sizes.
- Avoid treating every piece of context as a bordered panel. Use an inline metadata row for counts/status; reserve prominent panels for actionable content.

## Suggested implementation order

1. Collection, Deck Analysis, and Card detail: directly repeat the secondary-information problem from decklists.
2. Goldfish and Deck Review: reorder primary interactions without changing underlying behavior.
3. My Decks and Card Packages: separate long parallel lists into views.
4. Shared toolbar/filter accessibility and copy cleanup across the remaining pages.

For each batch, check desktop and 390px mobile layouts, expanded menus, long names, empty/loading/error states, and signed-in states where available. Confirm the first useful action/result appears sooner without shrinking text or touch targets. Keep computational behavior and data definitions unchanged.
