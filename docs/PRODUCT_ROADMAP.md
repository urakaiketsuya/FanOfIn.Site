# Fan of Insight Product Roadmap

This roadmap turns current product feedback into an ordered delivery plan. It favors shared foundations
over one-off calculator changes, keeps probability claims explicit, and separates features that can ship
with existing data from features that require new data, moderation, or account infrastructure.

## Product principles

1. **Explain the question before showing a number.** Every calculator should state what it measures,
   what the user must classify, and what it does not model.
2. **Ask once, reuse everywhere.** Card roles, matchup plans, and collection ownership should be saved
   with a deck and shared by all relevant tools.
3. **Prefer decisions over dashboards.** Results should answer “what should I change or test?” rather
   than expose several tables with no clear consequence.
4. **Do not imply simulation where there is only access probability.** Affordability, sequencing,
   opposing interaction, and board state must remain separate unless the model actually includes them.
5. **Build community features with moderation from day one.** Reporting, rate limits, visibility rules,
   and staff controls are part of the feature, not follow-up polish.
6. **Design mobile-first.** The smallest supported viewport defines information order, tap behavior, and
   the core workflow. Wider layouts enhance that workflow without creating desktop-only capabilities.
7. **Use progressive disclosure.** Show the next decision, its consequence, and the primary action first;
   keep advanced assumptions, exact tables, and secondary controls available without placing them in the
   default reading path.
8. **Apply Material interaction principles within the existing visual system.** Preserve Fan of Insight's
   typography and color identity while using clear surface hierarchy, familiar components, meaningful
   state changes, accessible touch targets, and restrained motion.
9. **Lead with the cards.** Cards are the primary objects users recognize and act on. Prefer card images,
   names, quantities, deck locations, and contextual status over abstract controls, detached metrics, or
   spreadsheet-like rows.

## Experience requirements

These requirements apply to every delivery slice and are part of feature acceptance, not a later visual
cleanup pass.

### Mobile-first behavior

- Design and implement the single-column experience first, beginning at a 320 CSS-pixel viewport.
- Keep every primary workflow complete without hover, a precision pointer, a hardware keyboard, or a
  landscape orientation.
- Use a minimum 44×44 CSS-pixel interactive target, with adequate separation between destructive,
  quantity, and move actions.
- Keep the primary action reachable near the current context. Use a sticky bottom action area only when
  it does not cover content, browser controls, validation messages, or the on-screen keyboard.
- Prefer a vertical reading and focus order. Wider viewports may introduce grids or side panels only when
  DOM and keyboard order remain logical.
- Put dense comparisons in responsive cards or horizontal regions with visible overflow cues; never make
  the entire page horizontally scroll.
- Preserve user input, expanded sections, and scroll context across responsive layout changes.

### Progressive disclosure

Use three consistent information layers:

1. **Summary:** the answer, confidence or limitation, and most relevant next action.
2. **Configure:** the minimum inputs needed to produce or alter that answer.
3. **Inspect:** assumptions, exact values, formulas, supporting evidence, and advanced overrides.

- Show required incomplete inputs before results and identify why each input matters.
- Place uncommon settings in an “Advanced” disclosure, not alongside the primary decision.
- Use expandable inline details for short supporting content, a bottom sheet or dialog for focused mobile
  choices, and a dedicated page for long multi-step work. Do not nest disclosures more than one level.
- Remember user disclosure preferences where useful, while making shared links open to a predictable
  default state.
- Empty, loading, error, disabled, and partial-data states must explain the next available action.
- Destructive actions require clear language and confirmation proportional to reversibility; provide undo
  for reversible deck and collection changes.

### Material interaction language

- Reuse a small component vocabulary: top app bars, cards, lists, chips, segmented controls, buttons,
  text fields, menus, dialogs, bottom sheets, snackbars, skeletons, and tooltips.
- Give each screen one visually dominant primary action. Secondary and tertiary actions must not compete
  through identical weight or color.
- Use elevation and tonal surfaces to communicate containment and temporary layers, not as decoration.
- Use state layers and visible focus styles for hover, focus, pressed, selected, dragged, and disabled
  states. Color must never be the only state indicator.
- Prefer labeled icons on first use and for ambiguous actions such as moving a card. Icon-only buttons
  require accessible names and tooltips where hover exists.
- Use chips for compact filters and classifications, segmented controls for a small set of peer views, and
  menus or bottom sheets for longer action/destination lists.
- Motion should explain continuity—moving between deck sections, expanding details, or applying a filter—
  and respect `prefers-reduced-motion`. Avoid motion that delays input or result visibility.
- Follow existing Catppuccin tokens through semantic roles for primary, error, warning, success, surface,
  outline, and on-surface text rather than introducing raw Material palette values.

### Card-first presentation

- Make the card—not the calculator field or database row—the smallest reusable unit across Deck Builder,
  Collection, Compare, Deck Analysis, Combo Lab, and Match Log.
- Lead detail and selection surfaces with recognizable card art or a stable thumbnail placeholder, card
  name, quantity, and current zone/section. Put edition, rules, ownership, role, and probability details
  behind that identity in descending relevance.
- Let users act directly from the card context: change quantity, move section, inspect the reverse face,
  mark ownership, assign analysis roles, compare, or open full details without losing their place.
- Use compact card rows on small screens and optional visual grids when space permits. A grid must not hide
  quantities, ownership shortages, selection state, or card names behind hover.
- Prefer card chips or thumbnail-backed selections over long text-only dropdowns. For large card sets, open
  a searchable bottom sheet/dialog with filters rather than expanding a select element beyond usability.
- Anchor calculator explanations to the selected cards: show which cards form each pool, how many copies
  contribute, why an inferred role or modifier applies, and which card change drives a result.
- Make aggregate metrics traceable back to cards. Selecting a chart segment, shortage total, matchup gap,
  or probability bottleneck should reveal the contributing cards.
- Keep card art supplemental to text: names and states remain readable when images are disabled, loading,
  missing, or unfamiliar to the user.
- Use the term “card” carefully in Material component discussions. A Material surface card groups related
  content; a Grand Archive card is the domain object. Do not wrap every domain card in nested decorative
  surfaces when a list row provides clearer hierarchy.

### Accessibility and responsive quality gate

- Meet WCAG 2.2 AA contrast, focus visibility, name/role/value, and keyboard requirements.
- Test at 320, 360, 390, 768, and 1280 CSS pixels, at 200% browser zoom, and with text enlargement.
- Test touch, keyboard-only use, reduced motion, and at least one screen-reader path for the primary flow.
- Keep cumulative layout shift low by reserving space for images, tab content, charts, and async results.
- Charts require a plain-language takeaway and an accessible exact-value representation.
- Feature review must include the loading, empty, error, offline/timeout where relevant, partial-data,
  success, and undo states—not only the populated desktop view.

## Priority overview

| Phase | Theme | Outcome |
| --- | --- | --- |
| 0 | Research and definitions | Resolve ambiguous calculator language and data requirements before more UI is built |
| 1 | Deck and card usability | Fix high-frequency friction in editing, card inspection, loading, and collection awareness |
| 2 | Shared deck annotations | Let users classify cards and plans once, review them up front, and reuse them across calculators |
| 3 | Calculator consolidation | Rework overlapping calculators into a smaller, clearer analysis workflow |
| 4 | Events, matches, and simulator evidence | Add true event discovery and a unified match log that can ingest Clarent data |
| 5 | Accounts and social publishing | Add deck favorites, comments, authored articles, and discussion spaces with moderation and discovery |
| 6 | Trading binder | Turn Looking For into a public, inventory-aware offer and trade-completion workflow |

## Phase 0 — Research and definitions

Complete these short design investigations before changing the underlying calculations.

### Cost modifiers

- Audit real card text for “costs X less to activate” and related wording, including whether reductions
  affect Reserve, Memory, action costs, activation costs, or only named abilities.
- Define a structured cost-modifier representation in shared card logic rather than applying regexes
  independently in calculators.
- Document stacking, floors, conditional reductions, once-per-turn limits, and zone requirements.
- Add fixtures from the card catalog for every supported wording and explicitly mark unsupported effects.

**Exit criterion:** resource and sequence tools can show the printed cost, applied modifiers, effective
cost, and the assumptions that made each modifier active.

### Calculator vocabulary study

- Replace unclear labels with questions users naturally answer while deckbuilding.
- Test the following candidate vocabulary with several real deck lists:
  - “Proactive Play” → “Early action” or remove it as a universal role.
  - “Liability” → stage-specific “unwanted early draw,” with an optional maximum.
  - “Willing to spend as threats” → remove; classify repeatable pressure by turn and affordability.
- Identify which classifications are universal deck facts and which are scenario-specific judgments.

**Exit criterion:** each role has a one-sentence definition, at least two card examples, a counterexample,
and a clear explanation of where the classification is reused.

### Transform/backside data audit

- Determine whether the catalog exposes relationships between front and back card editions.
- Verify whether “transform” text always identifies a backside and whether tokens or alternate forms are
  represented differently.
- Define a fallback for cards whose relationship cannot be resolved automatically.

**Exit criterion:** every known transforming card is either linked to its reverse face or appears in an
auditable unresolved list.

## Phase 1 — Deck and card usability

These are visible, bounded improvements that should ship before the larger analysis redesign.

### 1.1 Deck editor spacing and move controls

- Increase vertical separation between deck rows and create consistent space between quantity, edit,
  remove, and move controls.
- Keep controls usable at narrow widths without shrinking tap targets below 44×44 CSS pixels.
- Rename or redesign the card move action so its destination is explicit.
- Include **Main Deck**, **Material Deck**, **Sideboard**, and **Maybeboard** as valid destinations where
  format rules permit them; disable illegal destinations with a reason instead of hiding them.
  **Implemented for static Champion/Regalia section rules, including mixed-card bulk selections; full-deck
  copy, identity, Material-size, and Sideboard-point constraints remain in deck validation.**
- Preserve keyboard operation and announce moves to assistive technology.

**Acceptance criteria:** controls do not overlap at supported mobile widths; every card row exposes its
current section and legal destinations; moving a card is reversible without re-searching for it.

### 1.2 Card backsides and transform navigation

- Add a front/back toggle on card detail, card preview, deck-builder card details, and other shared card
  displays.
- Show a two-face affordance on the image itself rather than relying only on effect text.
- Keep the selected face when zooming; link each face to its own edition data where available.
- Provide a text-only face switch for accessibility and when images fail to load.

**Acceptance criteria:** a user can discover and inspect the reverse face anywhere the front face is
shown, without navigating away from their current deck workflow.

### 1.3 Card-tab loading placeholders

- Give each lazy card-detail tab a layout-matched skeleton for image, metrics, lists, and charts.
- Preserve the panel’s height during tab changes to reduce layout shift.
- Distinguish loading, empty, and failed states.

### 1.4 Card-detail cleanup

- Show the illustrator inline with the main edition information; remove the extra collapsed-section
  click while keeping the illustrator browse link.
- Loosen “Similar effects” from exact text-pattern matching into a layered similarity model:
  structured mechanic tags first, normalized effect concepts second, and text similarity last.
- Explain why a result is similar and let users filter by similarity dimension.

### 1.5 Collection-aware deck views

- Refresh the collection page with clearer owned/missing counts, set and edition grouping, compact/card
  display choices, useful filters, and completion summaries.
- Compute card usage across the user’s saved decks and show “used in N decks” plus expandable deck names.
- In every saved-deck and deck-analysis list, compare required copies with owned copies and visibly mark
  shortages without treating alternate editions as different gameplay cards unless the user chooses
  edition-specific inventory mode.
- Add a “missing cards only” filter and a shopping/export list that deduplicates shortages across decks.

**Acceptance criteria:** the same ownership calculation powers Collection, My Decks, Deck Builder, Deck
Review, and Deck Analysis; shared copies are not incorrectly allocated to every deck simultaneously.

### 1.6 Tournament deck completeness and card context

- Restore Sideboard sections on tournament deck pages, including older or partially imported lists such as
  `/decks/1r8hg2p`; grouped build pages show the newest recorded Sideboard intact with its player/event source
  rather than merging different registrations. **Implemented.**
- Audit ingestion, stored deck data, and page rendering separately so a display fix does not conceal missing
  upstream Sideboard records.
- In Card Stats deck lists, make the deck link a visually clear primary row action with a descriptive label,
  full keyboard focus treatment, and an adequately sized mobile target. **Implemented.**
- On card-detail “Recent decks,” mark whether the card appears in Main, Material, Sideboard, or more than one
  section. Keep Sideboard-only appearances visually distinct and accessible without relying on color alone.
  **Implemented.**

**Acceptance criteria:** tournament decks render every available section and disclose unavailable source
data; users can recognize and open a deck from Card Stats; recent-deck appearances state the card’s section.

## Phase 2 — Shared deck annotations

Several calculators currently ask the user to classify the same cards independently. Introduce a saved
**Deck Analysis Profile** before revising individual calculators.

### Profile contents

- Card roles with multi-role support where the math can handle overlap safely.
- Stage usefulness: wanted early, setup-dependent, flexible, payoff, and unwanted early.
- Game-plan groups: named plan, setup pieces, payoff pieces, protection, rebuild pieces.
- Pressure metadata: earliest useful turn, repeatable/single-use, effective cost assumptions.
- Matchup plans: opposing deck/archetype, cards out, cards in, and purpose of each swap.
- User overrides for inferred cost reductions and card relationships.

### Interaction design

- Add a **Prepare analysis** step above the calculator list that shows every required selection in one
  place, explains which calculators consume it, and highlights missing inputs.
- Seed selections with conservative suggestions from structured card data, but require users to review
  uncertain classifications.
- Make edits from any calculator update the shared profile immediately.
- Persist profiles with saved decks and version them when the deck list changes; carry forward assignments
  for unchanged card names.
- Offer presets for common archetypes only when backed by a real saved or tournament list, never as hidden
  defaults.

**Acceptance criteria:** opening Deck Analysis immediately shows which tools are ready, which need input,
and why; the same classification is never requested twice for one deck version.

## Phase 3 — Calculator consolidation and redesign

### 3.1 Game Plan Readiness as the primary workflow

Make Game Plan Readiness the main setup/payoff/protection analysis. It should combine access, stage quality,
and clearly bounded affordability information.

- Add named plans so a deck with competing strategies can analyze each plan separately.
- Let one card serve different roles in different named plans while keeping exact probability pools
  disjoint within a single calculation, or clearly use an overlap-aware state model.
- Integrate “Draw quality by game stage” as the plan’s stage view: setup cards matter before setup, payoff
  cards matter after setup, and flexible cards span both.
- Report plan readiness, payoff-before-setup, setup-without-payoff, protection access, and stage draw quality
  from the same profile.

### 3.2 Retire or reframe overlapping calculators

- **Engine-to-Payoff Balance:** fold into Game Plan Readiness as a “Balance” view. Its distinguishing value
  is stranded payoff, unused setup, ratios, and copy-change sensitivity—not a separate role-assignment
  workflow.
- **Functional Hand:** replace the fixed Proactive/Setup/Interaction/Liability recipe with user-defined
  hand recipes. Examples: “one early action plus one setup piece” or “either Plan A or Plan B, with at most
  one unwanted early card.” Do not describe cards from a competing plan as liabilities.
- **Draw Quality by Game Stage:** merge with named game plans as described above rather than maintaining a
  second independent classification.
- **Curve Affordability Check:** Deck Analysis now keeps a compact, card-first “Can I afford this curve?”
  view and sends flexible, branching, saved, or shared combo questions to Combo Lab.

### 3.3 Threat cadence

Rebuild this around the question “How often can this deck present meaningful pressure on schedule?”

- Remove “willing to spend as threats.”
- Let the user define one or more pressure packages and the earliest turn each is live.
- Account for effective costs, cost reducers, cards consumed by earlier plays, and repeatable threats.
- Separate **access cadence** from **affordable cadence** so the tool never implies it modeled resources
  when it did not.
- Visualize the chance of a threat on each turn, consecutive-pressure windows, and the most common gap.

### 3.4 Interaction coverage belongs in Compare

- Move the decision-oriented version to Compare, where a deck can be evaluated against another deck,
  champion, or archetype.
- Derive candidate opposing plans and timings from the selected comparison target; let the user confirm or
  edit them.
- Show which interaction cards cover which opposing packages, access by the critical turn, and coverage
  gained after sideboarding.
- Keep an optional generic checklist in Deck Analysis only for users who have not selected an opponent.

### 3.5 Post-sideboard planning belongs in Compare

- Treat a sideboard plan as a matchup-specific deck variant: baseline main deck versus postboard main deck.
- Add balanced in/out validation, copy/legality checks, named plan notes, and saved plans per archetype.
- Compare role counts, plan-readiness curves, resource curve, interaction coverage, and collection shortages
  before and after boarding.
- Allow exporting or opening the postboard configuration in Deck Builder.

### 3.6 Consistency and clumping presentation

- Replace repetitive probability tables with a compact curve or heat strip: copies on one axis, cards seen
  on the other, probability encoded consistently.
- Collapse identical values and call out only meaningful thresholds or changes.
- Keep an accessible table behind “View exact values” and provide copyable numbers.

### 3.7 Resource timing visualization

- Use a turn-by-turn readiness curve or timeline showing natural Reserve, effective cost, and the turn each
  selected card becomes affordable.
- Overlay cost reductions and identify which assumption changes the result.
- Show gaps between “drawn by turn” and “affordable by turn” rather than presenting resource access alone.

### 3.8 Sideboard impact without manual option picking

- Default to a visual summary of every registered sideboard card: affected roles, Reserve cost, overlapping
  functionality, and evidence-backed matchup signals when available. **Implemented.**
- Let users click a card to preview sensible one-for-one swaps; reserve manual selectors for advanced edits.
  **Implemented; evidence-backed matchups suggest the outgoing card, while manual selection stays disclosed.**
- Never label a swap “better” from access probability alone.

## Phase 4 — Events, match logging, and simulator evidence

### 4.1 Event browser

Replace the `/events` redirect with a real browse experience while preserving season pages as curated views.

- Search by event name, organizer, location, player, and champion.
- Filter by date range, season, region, event type, attendance, decklist availability, and data completeness.
- Sort by date, size, and relevance; support shareable query parameters.
- Offer calendar and dense-list views, followed later by a map only if location quality is sufficient.
- Link directly to event detail, standings, deck lists, and coverage-quality notes.

**Acceptance criteria:** a user can find an event without knowing its season and can share the filtered view.

### 4.2 Event player-to-deck navigation correctness

- Fix event detail so changing the selected player also updates the Open Deck destination, deck preview, and
  any player-derived actions in the same render.
- Use the selected player or deck identifier as the single source of truth rather than preserving a stale
  link from the initially selected player.
- Add regression coverage for keyboard, pointer, browser-history, and direct-link player changes.

**Acceptance criteria:** after any player selection change, Open Deck always opens that player’s deck and no
content or action from the previous player remains active.

### 4.3 Unified game log

- Replace the calculator-local test tracker with a standalone Match Log that is also embedded in saved decks.
- Support manual entry for result, opponent/deck or archetype, play/draw, mulligan, turns, sideboard plan,
  game-plan timing, notable cards, bottlenecks, and notes.
- Store provenance for every record: manual, Clarent import, or another future simulator.
- Build a versioned Clarent importer using the existing simulator API contract; retain raw source identifiers
  and import timestamps so imports are idempotent and debuggable.
- Map imported decks and cards through canonical identifiers, surface unresolved mappings, and never silently
  merge ambiguous players or deck versions.
- Show descriptive summaries with sample sizes and confidence warnings; keep self-recorded evidence separate
  from tournament statistics.

**Acceptance criteria:** importing the same Clarent session twice creates no duplicates; users can correct
unresolved mappings; deleting an import does not delete manually entered games.

### 4.4 Rules-aware Goldfish

- Model reservable cards as explicit choices, preserving card identity and zone changes rather than treating
  Reserve as an abstract counter.
- Create and track tokens produced by card effects, including their relevant characteristics, zones, and
  lifecycle when supported by the rules data.
- Add the Recollection Phase and its legal actions to the turn sequence.
- Make the Material Deck available to legal effects and actions, with visible Material-zone state.
- Support effects that banish cards randomly from Memory using a reproducible random seed, visible result,
  and replayable action history.
- Keep unsupported rules text explicit; never silently resolve an effect as if the full rule were modeled.
- Extend saved/replayable goldfish sessions so new zones, tokens, random outcomes, and rules-engine version
  round-trip without corrupting older sessions.

**Foundation implemented:** Goldfish now keeps card identity across Library, Hand, Memory, Banished,
Played, Material Deck, and Materialized zones; exposes Reservable moves and Recollection; supports manual
token lifecycle; and uses a visible deterministic seed for Glimpse and random Memory banishment. Versioned
local sessions preserve every modeled zone, tokens, history, and RNG state, with safe migration defaults for
older minimal snapshots. Broader effect-specific legality remains outstanding.

**Acceptance criteria:** representative fixtures cover reserving, token creation, Recollection, Material Deck
use, and seeded random Memory banishment; replaying a session produces the same state and random outcomes.

## Phase 5 — Social publishing

Ship incrementally. “Comments, a forum, and a blog” are three product surfaces sharing identity,
moderation, notifications, and authoring infrastructure.

### 5.1 Deck likes and favorites

- Let signed-in users like or favorite public tournament and community deck lists from deck cards and deck
  detail pages, with optimistic feedback and a recoverable error state.
- Treat favorites as a private library action unless a user explicitly opts into public likes; define whether
  a public like count is shown before shipping it.
- Add a dedicated **Favorites** section under My Decks, separate from decks the user owns or authored.
  **Implemented for published community decks and tournament builds; tournament favorites retain an account-side
  deck and source snapshot so they remain recognizable across pipeline refreshes.**
- Preserve the source deck identity and handle deleted, private, or superseded decks without silently removing
  the saved reference.
- Prevent duplicate favorites and keep favorite state synchronized across every deck-list surface.

**Acceptance criteria:** favorite/unfavorite is idempotent, appears consistently across devices, and the My
Decks Favorites section can filter and open saved tournament and community decks.

### 5.2 Social foundation

- Public profiles, display-name and visibility controls, blocks/mutes, reporting, moderation audit log,
  rate limits, spam controls, notification preferences, and community guidelines.
- Reusable reactions, subscriptions, mentions, safe rich text, link handling, edit history, and soft deletion.
- Staff roles and queues before public posting is enabled.

### 5.3 Comments

- Start with comments on public deck lists and authored articles.
- Use shallow threading, sorting, permalink/share support, author editing, reporting, and locked discussions.
- Make comments opt-in per deck/article owner initially.

### 5.4 Blog / articles

- Add authored strategy articles with drafts, preview, cover image, tags, deck embeds, card references,
  calculator-result embeds, scheduled publication, and revision history.
- Separate official/editorial posts from community articles visually and in permissions.
- Add feeds by tag, champion, archetype, and author plus search and RSS/Atom.

### 5.5 Forum / discussions

- Launch after moderation and comments have proven reliable.
- Prefer focused categories, searchable topics, accepted/featured replies, deck/card embeds, and duplicate-topic
  guidance over a large empty category tree.
- Evaluate whether article comments plus tagged discussions satisfy the need before building traditional
  forum-specific mechanics.

## Phase 6 — Trading binder

Replace Looking For with a card-first binder that separates owned inventory, items available to trade, and
cards wanted. Treat a trade as an explicit agreement between two accounts, not merely a direct message.

### 6.1 Public binder and discovery

- Let users publish selected card printings and quantities as available, and maintain a wanted list with
  preferred editions, condition, language, quantity, and acceptable substitutes.
- Keep collection quantities private by default; users choose exactly what and how many copies appear in
  their public binder.
- Add public binder profiles, search and filters, trade-location/shipping preferences, and freshness status.
- Show potential matches between one user’s available cards and another user’s wanted cards without exposing
  private collection data.

### 6.2 Offers and agreement

- Let a user compose an offer from both binders, propose quantities and printings, add a message, and revise,
  accept, decline, cancel, or counter the offer.
- Lock an accepted offer to immutable card snapshots while retaining a clear audit trail of revisions.
- Prevent either party from promising more publicly available copies than remain after other accepted or
  pending commitments, while allowing them to resolve conflicts explicitly.
- Add reporting, blocking, rate limits, privacy controls, and safety guidance before public offers launch.
- Do not add payments, escrow, shipping labels, or guarantees without a separate legal and operational review.

### 6.3 Completion and binder updates

- Let both parties mark a trade sent, received, disputed, cancelled, or complete; define which combinations
  constitute completion without implying platform-guaranteed fulfillment.
- On completion, show an explicit confirmation of collection and binder quantity changes for each user.
  Apply changes transactionally and provide a correction path rather than silently mutating inventory.
- Retain completed trade history and provenance for resulting collection adjustments.

**Acceptance criteria:** users can publish a limited binder, find reciprocal matches, negotiate an auditable
offer, confirm completion, and update both collection and public availability without overselling quantities.

## Suggested delivery slices

### Slice A — Usability release

Deck-row spacing and move destinations, illustrator visibility, card-tab skeletons, and backside support.

### Slice B — Collection release

Collection visual refresh, deck usage counts, shortage highlighting, and missing-card export.

### Slice C — Analysis profiles

Saved shared classifications, Prepare Analysis workflow, named plans, and readiness indicators.

### Slice D — Calculator cleanup

Merge Engine Balance and Stage Draw Quality into Game Plan Readiness; rebuild Functional Hand; redesign
consistency and resource timing; move sequence analysis into Combo Lab.

### Slice E — Matchup tools

Compare-based Interaction Coverage and Post-Sideboard Plan, with automatic sideboard-impact visualization.

### Slice F — Evidence tools

Event browser, standalone Match Log, and Clarent imports.

### Slice G — Community

Moderation foundation, comments, articles, then forum-style discussions.

### Slice H — Deck discovery and rules correctness

Tournament Sideboards, clearer Card Stats deck links, recent-deck section badges, event player-link regression,
deck favorites, and rules-aware Goldfish state.

### Slice I — Trading binder

Public binder and wants, reciprocal discovery, offers/counters, completion states, and confirmed inventory
updates after the account and moderation foundations exist.

## Measurement

Track product outcomes without treating engagement alone as success:

- Deck-edit completion rate and undo/error rate.
- Percentage of saved decks with reviewed analysis profiles.
- Calculator completion rate, repeated classifications avoided, and explanatory help opened.
- Collection shortage accuracy and missing-card exports.
- Event searches that reach an event detail page.
- Match-import resolution rate and duplicate-import rate.
- Reports per 1,000 social posts, moderation response time, and percentage of discussions receiving a reply.
- Favorite conversion and return-to-favorite rate without using public like totals as a quality proxy.
- Goldfish unsupported-action rate, replay determinism, and completion rate by rules-engine version.
- Binder match rate, offer acceptance/completion rate, stale-listing rate, disputes, and quantity conflicts.

## Deferred until foundations exist

- Predictive matchup win-rate claims from user calculator selections.
- Automatic strategic card-role classification presented as fact.
- A geographic event map before location data is normalized.
- Public social posting before reporting and moderation tools ship.
- Simulator-derived conclusions mixed with tournament or manual logs without visible provenance.
- Payments, escrow, shipping guarantees, or reputation scores before trading safety and support requirements
  receive separate legal, fraud, privacy, and operations review.
