# Official deck primers

Scope: all 22 products in the official-products catalog: 14 standard starter lists,
four Re:Collection decks, and four Radiant Dawn of Pantheon decks. Separate Dawn of
Ashes Prelude lists retain their own guides.

Each product ID has its own guide in
`app/src/features/official-products/primers/guides.json`. The route is
`/official-decks/:deck-name/primer`; the official product card links to it. Guides cover
opening play, leveling, a visual synergy package, a visual win condition, mistakes,
and a product-filtered glossary. Highlighted cards describe interactions, not a
complete decklist or a guaranteed winning sequence. No account is required.

## Content evidence

Written against `app/src/features/official-products/decks.json` and the full card
text in `pipeline/.cache/cards.json` (catalog fetched 2026-11-12). Strategy is an
editorial interpretation of those exact lists, not tournament-performance advice.
Card names in highlights and glossary examples are validated against each product.

Rules reviewed 2026-11-15:

- https://rules.gatcg.com/glossary/keywords-and-abilities
- https://rules.gatcg.com/glossary/game-terms
- https://rules.gatcg.com/general-rules/general-rules-starting-the-game
- https://www.gatcg.com/article/starter-decks

Prefer comprehensive rules when older reminder text or the beginner article differs.
In particular, Pride does not stop retaliation; effective-level boosts do not enable
advanced elements; On Kill requires a combat-damage kill; Jin loses Immortality in
his end phase. Each guide links to the official rules and source product list.

## Maintenance

Edit glossary definitions and matching patterns in `primers/glossary.json`, then run
`node pipeline/scripts/build-starter-primer-glossary.mjs` to refresh references from
the cached catalog. Matches include terms mentioned by effects, not just abilities
a card possesses. All matching cards are searchable; the UI shows up to three
examples per term. Regeneration does not author or validate strategy prose.

When updating products, check card quantities, champion lines, tokens/masteries,
current text and rules before changing the guide. Review gameplay prose manually;
structural tests cannot prove a play sequence legal. Add a guide explicitly for a
new product rather than borrowing one based only on champion name.

Verification command:
`cd app && TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx --test test/starterPrimers.test.ts`

## Verification (2026-11-15)

Browser review at 360px, 390px and 1280px covered the official-deck entry link,
Lorraine and Dante primers, visible synergy/win-condition artwork and names,
glossary filtering by term/card, empty-result recovery, keyboard focus, and the
unknown-product recovery route. No horizontal overflow or browser errors in these
checks; inspected primer controls met the 48px height minimum. Initial route
loading was observed. Shared image/name fallbacks are retained, but forced catalog
failure, offline operation, native touch and on-screen keyboards were not tested.

Content tests cover all 22 products, highlight/example membership, differentiated
Diana mechanics, and unknown IDs. App typecheck, targeted lint and Vite production
build are the implementation checks; no production deployment or account writes.

## Re:Collection, Pantheon, readable URLs, and quotations

Added 2026-11-15. Authored slugs live with each guide; ID URLs redirect with their
query string and fragment intact. Existing product IDs remain the data join keys.
Pantheon first-game guidance covers multiplayer objectives, boons, barriers, and
first-turn differences. The supplied catalog does not enumerate Pantheon boons;
the guides explain their use without inventing product-specific boon choices.

New glossary coverage includes glimmer, wither, transformations, preparation,
Shadows, multiplayer abilities, and card-specific counters. Reverse-face effects
are recorded in `primers/transformFaces.json`, verified from the official API on
2026-11-15. They are matched against the front card so readers can find the card
in their product list; the reverse is not counted as an additional deck card.

References reviewed in addition to the sources above:

- https://pantheon.gatcg.com/
- https://rules.gatcg.com/general-rules/general-rules-card-characteristics/double-faced-cards
- https://rules.gatcg.com/game-mechanics/game-mechanics-playing-cards/playing-cards-bestowing-boons
- https://www.gatcg.com/article/radiant-origins-release-notes
- https://api.gatcg.com/cards/fabled-azurite-fatestone (and the six other Fatestone sources recorded in transformFaces.json)

Glossary quotations are short excerpts from the displayed card's catalog text,
with typographic Markdown removed, attributed and linked to that card's official
Index entry. They are labeled **Card wording**, distinct from editorial explanations
and the comprehensive rules. A trailing ellipsis indicates truncation. The generator
reuses at most one excerpt of at most 25 words per source card across all products.
Where no suitable excerpt is available, the explanation and illustrated examples
remain. Review reminders against current comprehensive rules: older card wording
can be abbreviated or outdated. Quotes do not replace the linked rules.

Tests additionally check unique readable URLs, legacy ID resolution, new-product
mechanics, source attribution, and excerpt limits. Generated references include all
matching cards; the UI continues to display up to three illustrations per entry.

Selected entries also carry exact, brief comprehensive-rule quotations, linked to
the relevant keyword anchor and labeled **Official keyword rule**. These take
precedence over a card excerpt in the display. The three excerpts (Hindered,
Efficiency, Retort) total 25 quoted words from the keyword reference; other entries
retain editorial explanations and card examples/excerpts.

Each primer also includes the catalog decklist with all nonempty sections,
quantities, card artwork, and detail links. `OfficialProductDecklist` is shared
with the official-product index so both views use the same section labels, order,
and counts. Generated cards/tokens remain separate from main and material cards.

Primer sections use the shared Tabs/TabPanel controls, with wrapping mobile tabs,
roving keyboard focus, and one visible panel. `?tab=game-plan|synergy|win|terms|decklist`
persists the selected section; existing fragment links still select their section.
Tab changes preserve unrelated query parameters, and the glossary search draft is
owned by the page so switching tabs does not erase it.

### Expanded-primer verification (2026-11-15)

Seven content/routing/source tests pass. Browser checks covered Re:Collection
product links, Tristan and Guo Jia content, Arisanna Pantheon content, decklist
counts (12 material + 60 main, with Guo Jia's generated Arcane Blast separate),
quoted card and keyword sources, empty search/recovery, retained searches across
tabs, keyboard arrow navigation, and ID redirects preserving queries/fragments.
At 360px and 390px mobile and 1280px desktop, inspected views had no horizontal
overflow; tabs and inspected links met 48px targets. One tab panel is visible at a
time. Browser error logs were empty. Shared art/name loading fallbacks were seen;
forced offline/catalog failures, native touch, and on-screen keyboards were not
tested. Production checks are app typecheck, targeted lint, and Vite build.
