# Standard starter primers

Scope: all 14 standard starter products in the official-products catalog, including
separate Dawn of Ashes Prelude lists. Re:Collection and Pantheon are excluded.

Each product ID has its own guide in
`app/src/features/official-products/primers/guides.json`. The route is
`/official-decks/:deckId/primer`; the official product card links to it. Guides cover
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

Content tests cover all 14 products, highlight/example membership, differentiated
Diana mechanics, and unknown IDs. App typecheck, targeted lint and Vite production
build are the implementation checks; no production deployment or account writes.
