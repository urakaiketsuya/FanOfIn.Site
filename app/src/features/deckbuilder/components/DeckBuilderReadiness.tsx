import { useDeckBuilder } from "../useDeckBuilder";

export function SeedCardPrompt() {
  const {
    addCard, builderIntent, cardInput, cardNameSet, cardNames, championName, gateHasData,
    gateLoading, lockedCards, removeCard, seedLockedCards, setCardInput, spiritFilter,
  } = useDeckBuilder();

  if (builderIntent !== "seed" || (championName && spiritFilter && !gateLoading && gateHasData && seedLockedCards.size > 0)) return null;

  return (
    <section className="mt-5 rounded-lg border border-ctp-green/40 bg-ctp-green/5 p-3" aria-labelledby="seed-cards">
      <h2 id="seed-cards" className="text-sm font-semibold text-ctp-text">Start with your cards</h2>
      <p className="mt-1 text-xs text-ctp-subtext1">Add one or more cards, then choose the Champion and Spirit that should support them. Your selected cards stay locked as the deck fills in.</p>
      <div className="mt-3 grid max-w-xl gap-2 sm:flex sm:flex-wrap">
        <input
          type="text"
          list="deck-builder-card-options"
          value={cardInput}
          onChange={(event) => setCardInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && cardNameSet.has(cardInput)) addCard(cardInput); }}
          placeholder="Type a card name…"
          className="w-full min-w-0 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-subtext0 focus:border-ctp-blue focus:outline-none sm:min-w-52 sm:flex-1"
        />
        <button type="button" disabled={!cardNameSet.has(cardInput) || lockedCards.has(cardInput)} onClick={() => addCard(cardInput)} className="rounded-md border border-ctp-green/60 px-3 py-1.5 text-sm text-ctp-green hover:bg-ctp-green/10 disabled:cursor-not-allowed disabled:opacity-50">Add card</button>
      </div>
      <datalist id="deck-builder-card-options">{cardNames.map((name) => <option key={name} value={name} />)}</datalist>
      {seedLockedCards.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from(seedLockedCards.keys()).map((name) => (
            <button key={name} type="button" onClick={() => removeCard(name, true)} className="rounded-full border border-ctp-green/40 px-2 py-0.5 text-xs text-ctp-green hover:border-ctp-red hover:text-ctp-red" title="Remove seed card">{name} ×</button>
          ))}
        </div>
      )}
    </section>
  );
}

export function BuilderReadinessMessage() {
  const { builderIntent, championName, gateHasData, gateLoading, seedLockedCards, spiritFilter } = useDeckBuilder();

  if (!championName) return <p className="mt-6 text-ctp-subtext1">Choose a Champion to see a suggested build.</p>;
  if (builderIntent === "seed" && spiritFilter && seedLockedCards.size === 0 && !gateLoading && gateHasData) {
    return <p className="mt-6 rounded-lg border border-ctp-green/40 bg-ctp-green/5 px-4 py-3 text-sm text-ctp-subtext1">Add at least one card you want to build around. We’ll use it with {championName} and {spiritFilter} to shape the suggested deck.</p>;
  }
  if (gateLoading) return <p className="mt-6 text-ctp-subtext1" role="status">Loading…</p>;
  if (!gateHasData) return <p className="mt-6 text-ctp-subtext1">No decks found for {championName}.</p>;
  if (!spiritFilter) {
    return (
      <p className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">
        Select an element and Spirit above to generate a coherent core. The builder will keep unsupported slots unresolved instead of mixing this Champion&apos;s different strategies.
      </p>
    );
  }
  return null;
}
