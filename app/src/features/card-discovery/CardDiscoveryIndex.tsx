import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Card } from "@gatcg/shared";
import CardHoverPreview from "../../components/CardHoverPreview";
import PageHeader from "../../components/ui/PageHeader";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { computeIdentityElements } from "../deckbuilder/useSuggestedBuild";
import { computeNewReleaseCards } from "../deckbuilder/newReleaseCards";
import { buildSpiritCanonicalNames } from "../deckbuilder/useDeckBuilderPopulation";
import PageLayout from "../../components/layout/PageLayout";

function identityName(card: Card): string {
  return card.name.split(",")[0].trim();
}

export default function CardDiscoveryIndex() {
  const catalog = useCardCatalog();
  const popularityIndex = useDeckPopularityIndexData();
  const [championName, setChampionName] = useState("");
  const [spiritName, setSpiritName] = useState("");
  const [cardInput, setCardInput] = useState("");
  const [focusCards, setFocusCards] = useState<string[]>([]);

  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const champions = useMemo(() => Array.from(new Set(popularityIndex?.entries.map((entry) => entry.championName).filter((name): name is string => name !== null) ?? [])).sort(), [popularityIndex]);
  const championCards = useMemo(() => catalog.filter((card) => card.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT") && identityName(card) === championName), [catalog, championName]);
  const championCard = championCards.sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];
  const spiritCards = useMemo(() => catalog.filter((card) => card.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT")), [catalog]);
  const spiritCanonicalNames = useMemo(() => buildSpiritCanonicalNames(catalog), [catalog]);
  const spiritOptionNames = useMemo(
    () => Array.from(new Set(spiritCards.map((card) => spiritCanonicalNames.get(card.name) ?? card.name))).sort(),
    [spiritCards, spiritCanonicalNames],
  );
  const spiritCard = cardsByName.get(spiritName);
  const identityElements = useMemo(() => computeIdentityElements(championCard, spiritCard), [championCard, spiritCard]);
  const cardNames = useMemo(() => catalog.map((card) => card.name).sort(), [catalog]);
  const contextCards = useMemo(() => [championCard, spiritCard, ...focusCards.map((name) => cardsByName.get(name))].filter((card): card is Card => card !== undefined), [championCard, spiritCard, focusCards, cardsByName]);
  const discoveries = useMemo(() => computeNewReleaseCards(catalog, contextCards, identityElements, new Set(contextCards.map((card) => card.name))), [catalog, contextCards, identityElements]);

  const addFocusCard = () => {
    if (cardsByName.has(cardInput) && !focusCards.includes(cardInput)) setFocusCards((cards) => [...cards, cardInput]);
    setCardInput("");
  };
  const builderLink = useMemo(() => {
    const params = new URLSearchParams({ intent: "seed" });
    if (championName) params.set("champion", championName);
    if (spiritName) params.set("spirit", spiritName);
    return `/deck-builder?${params.toString()}`;
  }, [championName, spiritName]);

  return <PageLayout>
    <PageHeader
      title="Find new cards"
      description="Browse cards from the newest release that connect to your Champion, optional Spirit, or cards you already play. These are structural matches, not invented performance scores."
      actions={<Link to="/deck-builder" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-semibold text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">Build a deck →</Link>}
    />

    <section className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4" aria-labelledby="discovery-context">
      <h2 id="discovery-context" className="font-semibold text-ctp-text">What should we match against?</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Choose a Champion, optionally narrow it to a Spirit, then add any key cards whose support you want to explore.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-ctp-subtext1">Champion
          <select value={championName} onChange={(event) => { setChampionName(event.target.value); setSpiritName(""); }} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-ctp-text">
            <option value="">Choose a Champion…</option>
            {champions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="text-sm text-ctp-subtext1">Spirit <span className="text-ctp-subtext0">(optional)</span>
          <select value={spiritName} onChange={(event) => setSpiritName(event.target.value)} disabled={!championName} className="mt-1 block w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-ctp-text disabled:opacity-50">
            <option value="">Any Spirit</option>
            {spiritOptionNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <label htmlFor="discovery-focus-card" className="text-sm text-ctp-subtext1">Cards to build around <span className="text-ctp-subtext0">(optional)</span></label>
        <div className="mt-1 flex gap-2">
          <input id="discovery-focus-card" list="discovery-card-options" value={cardInput} onChange={(event) => setCardInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addFocusCard(); }} placeholder="Type a card name…" className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" />
          <button type="button" onClick={addFocusCard} disabled={!cardsByName.has(cardInput) || focusCards.includes(cardInput)} className="rounded-md border border-ctp-blue/60 px-3 py-2 text-sm font-semibold text-ctp-blue hover:bg-ctp-blue/10 disabled:cursor-not-allowed disabled:opacity-50">Add</button>
        </div>
        <datalist id="discovery-card-options">{cardNames.map((name) => <option key={name} value={name} />)}</datalist>
        {focusCards.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{focusCards.map((name) => <button key={name} type="button" onClick={() => setFocusCards((cards) => cards.filter((card) => card !== name))} className="rounded-full border border-ctp-blue/40 px-2 py-0.5 text-xs text-ctp-blue hover:border-ctp-red hover:text-ctp-red" title="Remove card">{name} ×</button>)}</div>}
      </div>
    </section>

    {!championName && <p className="mt-6 text-ctp-subtext1">Choose a Champion to start discovering cards.</p>}
    {championName && <section className="mt-6" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold text-ctp-text">New cards worth a look</h2><Link to={builderLink} className="text-sm font-semibold text-ctp-blue hover:underline">Build around this Champion →</Link></div>
      <p className="mt-1 text-sm text-ctp-subtext1">Matches are limited to the newest released set and must connect through a shared token, subtype, Empower, or named reference.</p>
      {discoveries.length === 0 ? <p className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">No designed connections found yet. Add a card you already play to make this lens more specific.</p> : <div className="mt-4 space-y-3">{discoveries.map(({ card, combos, setName, releaseDate }) => <article key={card.uuid} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        <div className="flex flex-wrap items-center gap-2"><CardHoverPreview image={card.editions[0]?.image} alt={card.name}><Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-text hover:text-ctp-blue">{card.name}</Link></CardHoverPreview><span className="text-xs text-ctp-subtext0">{setName} · {releaseDate}</span></div>
        <ul className="mt-2 space-y-1 text-sm text-ctp-subtext1">{combos.map((combo) => <li key={`${combo.with.uuid}-${combo.via}`}>Connects with <Link to={`/cards/${combo.with.slug}`} className="text-ctp-blue hover:underline">{combo.with.name}</Link> via {combo.via}.</li>)}</ul>
      </article>)}</div>}
    </section>}
  </PageLayout>;
}
