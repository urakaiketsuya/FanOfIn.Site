import { cardImagePath, isPreviewCard } from "../../lib/previewCards";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { availableDeckElements, buildSpiritCanonicalNames, type Card } from "@gatcg/shared";
import CardArtTile from "../../components/CardArtTile";
import CardHoverPreview from "../../components/CardHoverPreview";
import ElementIcon from "../../components/ElementIcon";
import PageHeader from "../../components/ui/PageHeader";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { computeIdentityElements } from "../deckbuilder/useSuggestedBuild";
import { computeNewReleaseCards } from "../deckbuilder/newReleaseCards";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import Section from "../../components/ui/Section";
import { InlineState } from "../../components/ui/ContentState";

import Button from "../../components/ui/Button";
import DeckWorkspacePicker from "../deckbuilder/components/DeckWorkspacePicker";
import { loadActiveDeckWorkspace, type DeckWorkspace } from "../deckbuilder/persistence/deckWorkspace";
import { useSyncProgress } from "../../lib/sync/SyncProvider";
import ReferenceSwapSheet from "./ReferenceSwapSheet";

function identityName(card: Card): string {
  return card.name.split(",")[0].trim();
}

export default function CardDiscoveryIndex() {
  const [reference, setReference] = useState<DeckWorkspace | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [addition, setAddition] = useState<Card | null>(null);
  function selectReference(value: Omit<DeckWorkspace, 'version' | 'updatedAt'>) {
    setReference({ ...value, version: 1, updatedAt: new Date().toISOString() });
    setChampionName(value.championName ?? ''); setSpiritName(value.spiritName ?? '');
    setAddition(null); setChoosing(false);
  }
  const catalog = useCardCatalog();
  const sync = useSyncProgress();
  const catalogReady = catalog.some(card => !isPreviewCard(card));
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
  // Several distinct printings (e.g. draft-only "Nameless Champion" in every class pairing) share
  // the same literal card name, so dedupe or React sees duplicate datalist-option keys – same fix
  // DeckSearchByCards.tsx already applies to this identical hazard.
  const cardNames = useMemo(() => Array.from(new Set(catalog.map((card) => card.name))).sort(), [catalog]);
  const contextCards = useMemo(() => reference ? [...reference.main, ...reference.material].filter(line => line.quantity > 0).map(line => cardsByName.get(line.name)).filter((card): card is Card => !!card) : [championCard, spiritCard, ...focusCards.map((name) => cardsByName.get(name))].filter((card): card is Card => card !== undefined), [reference, championCard, spiritCard, focusCards, cardsByName]);
  const discoveries = useMemo(() => computeNewReleaseCards(catalog, contextCards, reference ? availableDeckElements(reference.material.map(line => cardsByName.get(line.name))) : identityElements, new Set(contextCards.map((card) => card.name)), reference?.format ?? "STANDARD"), [catalog, contextCards, identityElements, reference, cardsByName]);

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

  return <PageLayout data-component="CardDiscoveryIndex">
    <PageHeader
      title="Find new cards"
      description="New releases for your deck."
      actions={<Link to="/deck-builder" className="rounded-md border border-ctp-surface1 px-3 py-2 text-sm font-semibold text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-blue">Build a deck →</Link>}
    />

    {sync.phase === "error" && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3"><span>Card catalog refresh failed.</span><Button onClick={() => window.location.reload()}>Retry card data</Button></div>}
    <Panel className="mb-4">
      <h2 className="font-semibold">Reference deck</h2>
      {reference && <p className="mt-2 text-sm">{reference.title ?? reference.championName} · {reference.main.reduce((sum, line) => sum + line.quantity, 0)} Main · {reference.format}</p>}
      <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => setChoosing(!choosing)} aria-expanded={choosing}>{reference ? 'Change reference deck' : 'Choose reference deck'}</Button>
        {!reference && <Button onClick={() => { const active = loadActiveDeckWorkspace(sessionStorage); if (active) selectReference(active); else setChoosing(true); }}>Use active deck</Button>}
        {reference && <Button onClick={() => { setReference(null); setAddition(null); }}>Clear reference</Button>}
      </div>
      {choosing && <div className="mt-4">{!catalogReady ? <p role="status">Loading card data…</p> : <DeckWorkspacePicker catalogByName={cardsByName} source="analysis" onLoad={selectReference} confirmLabel="Use reference deck" />}</div>}
    </Panel>
    {!reference && <Panel as="section" aria-labelledby="discovery-context">
      <h2 id="discovery-context" className="font-semibold text-ctp-text">What should we match against?</h2>
      <p className="mt-1 text-sm text-ctp-subtext1">Choose a Champion, optionally narrow it to a Spirit, then add any key cards whose support you want to explore.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-ctp-subtext1">Champion
          <select value={championName} onChange={(event) => { setChampionName(event.target.value); setSpiritName(""); }} className="mt-1 block min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-ctp-text">
            <option value="">Choose a Champion…</option>
            {champions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="text-sm text-ctp-subtext1">Spirit <span className="text-ctp-subtext0">(optional)</span>
          <select value={spiritName} onChange={(event) => setSpiritName(event.target.value)} disabled={!championName} className="mt-1 block min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-ctp-text disabled:opacity-50">
            <option value="">Any Spirit</option>
            {spiritOptionNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <label htmlFor="discovery-focus-card" className="text-sm text-ctp-subtext1">Cards to build around <span className="text-ctp-subtext0">(optional)</span></label>
        <div className="mt-1 flex gap-2">
          <input id="discovery-focus-card" list="discovery-card-options" value={cardInput} onChange={(event) => setCardInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addFocusCard(); }} placeholder="Type a card name…" className="min-h-control min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-sm text-ctp-text" />
          <button type="button" onClick={addFocusCard} disabled={!cardsByName.has(cardInput) || focusCards.includes(cardInput)} className="min-h-control rounded-md border border-ctp-blue/60 px-3 py-2 text-sm font-semibold text-ctp-blue hover:bg-ctp-blue/10 disabled:cursor-not-allowed disabled:opacity-50">Add</button>
        </div>
        <datalist id="discovery-card-options">{cardNames.map((name) => <option key={name} value={name} />)}</datalist>
        {focusCards.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{focusCards.map((name) => <button key={name} type="button" onClick={() => setFocusCards((cards) => cards.filter((card) => card !== name))} className="min-h-control rounded-full border border-ctp-blue/40 px-2 py-0.5 text-xs text-ctp-blue hover:border-ctp-red hover:text-ctp-red" title="Remove card">{name} ×</button>)}</div>}
      </div>
    </Panel>}

    {!championName && <InlineState className="mt-6">Choose a Champion to start discovering cards.</InlineState>}
    {championName && <Section
      className="mt-6"
      aria-live="polite"
      title="New cards worth a look"
      actions={<Link to={builderLink} className="text-sm font-semibold text-ctp-blue hover:underline">Build around this Champion →</Link>}
      description="Latest set and newer Alter releases"
    >
      {!catalogReady ? <p role="status">Loading card data…</p> : discoveries.length === 0 ? <p className="mt-4 rounded-lg border border-ctp-surface1 bg-ctp-mantle px-4 py-3 text-sm text-ctp-subtext1">No designed connections found yet. Add a card you already play to make this lens more specific.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2">{discoveries.map(({ card, combos, setName, releaseDate }) => <article key={card.uuid} className="rounded-lg border border-ctp-surface1 bg-ctp-mantle p-4">
        <Link className="mb-3 block max-w-40 rounded focus-visible:outline-2 focus-visible:outline-ctp-blue" to={`/cards/${card.slug}`}><CardArtTile card={card} name={card.name} /></Link>
        <div className="flex flex-wrap items-center gap-2"><ElementIcon element={card.element} size={14} /><CardHoverPreview image={cardImagePath(card)} alt={card.name}><Link to={`/cards/${card.slug}`} className="font-semibold text-ctp-text hover:text-ctp-blue">{card.name}</Link></CardHoverPreview><span className="text-xs text-ctp-subtext0">{setName} · {releaseDate}</span></div>
        <ul className="mt-2 space-y-1 text-sm text-ctp-subtext1">{combos.slice(0, 3).map((combo) => <li key={`${combo.with.uuid}-${combo.via}`}><ElementIcon element={combo.with.element} size={14} className="inline-block align-text-bottom" /> <CardHoverPreview image={cardImagePath(combo.with)} alt={combo.with.name}><Link to={`/cards/${combo.with.slug}`} className="text-ctp-blue hover:underline">{combo.with.name}</Link></CardHoverPreview> · {combo.via}</li>)}</ul>
        {reference && <Button className="mt-3" onClick={() => setAddition(card)}>Compare swap</Button>}
      </article>)}</div>}
    </Section>}
    {reference && addition && <ReferenceSwapSheet deck={reference} addition={addition} cards={cardsByName} onDismiss={() => setAddition(null)} />}
  </PageLayout>;
}
