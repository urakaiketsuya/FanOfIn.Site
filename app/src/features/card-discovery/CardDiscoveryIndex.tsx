import { isPreviewCard } from "../../lib/previewCards";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { availableDeckElements, buildSpiritCanonicalNames, type Card } from "@gatcg/shared";
import CardResult from "../../components/CardResult";
import CardSearchPicker from "../../components/CardSearchPicker";
import DialogSheet from "../../components/ui/DialogSheet";
import PageHeader from "../../components/ui/PageHeader";
import { useCardCatalog } from "../cards/useCardCatalog";
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
  const [pickerDirty, setPickerDirty] = useState(false);
  const activeReference = choosing ? loadActiveDeckWorkspace(sessionStorage) : null;
  const [addition, setAddition] = useState<Card | null>(null);
  function selectReference(value: Omit<DeckWorkspace, 'version' | 'updatedAt'>) {
    setReference({ ...value, version: 1, updatedAt: new Date().toISOString() });
    setAddition(null); setChoosing(false);
  }
  const catalog = useCardCatalog();
  const sync = useSyncProgress();
  const catalogReady = catalog.some(card => !isPreviewCard(card));
  const [championName, setChampionName] = useState("");
  const [spiritName, setSpiritName] = useState("");
  const [cardInput, setCardInput] = useState("");
  const [focusCards, setFocusCards] = useState<string[]>([]);

  const cardsByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const champions = useMemo(() => [...new Set(catalog.filter(card => card.types.includes("CHAMPION") && !card.subtypes.includes("SPIRIT") && !isPreviewCard(card)).map(identityName))].sort(), [catalog]);
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
  const cardNames = useMemo(() => [...new Set(catalog.map(card => card.name))].filter(name => !focusCards.includes(name)).sort(), [catalog, focusCards]);
  const hasContext = !!reference || !!championName;
  const contextCards = useMemo(() => reference ? [...reference.main, ...reference.material].filter(line => line.quantity > 0).map(line => cardsByName.get(line.name)).filter((card): card is Card => !!card) : [championCard, spiritCard, ...focusCards.map((name) => cardsByName.get(name))].filter((card): card is Card => card !== undefined), [reference, championCard, spiritCard, focusCards, cardsByName]);
  const discoveries = useMemo(() => computeNewReleaseCards(catalog, contextCards, reference ? availableDeckElements(reference.material.map(line => cardsByName.get(line.name))) : identityElements, new Set(contextCards.map((card) => card.name)), reference?.format ?? "STANDARD"), [catalog, contextCards, identityElements, reference, cardsByName]);

  const builderLink = useMemo(() => {
    const params = new URLSearchParams({ intent: "seed" });
    if (championName) params.set("champion", championName);
    if (spiritName) params.set("spirit", spiritName);
    return `/deck-builder?${params.toString()}`;
  }, [championName, spiritName]);

  return <PageLayout data-component="CardDiscoveryIndex">
    <PageHeader title="Find new cards" />

    {sync.phase === "error" && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3"><span>Card catalog refresh failed.</span><Button onClick={() => window.location.reload()}>Retry card data</Button></div>}
    <Panel as="section" aria-labelledby="discovery-context">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="discovery-context" className="font-semibold">{reference ? reference.title ?? reference.championName ?? "Reference deck" : "Discovery context"}</h2>
        <Button onClick={() => { setPickerDirty(false); setChoosing(true); }}>{reference ? "Change reference deck" : "Use a reference deck"}</Button>
      </div>
      {reference ? <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ctp-subtext1">{reference.main.reduce((sum, line) => sum + line.quantity, 0)} Main · {reference.format}</p>
        <Button onClick={() => { setReference(null); setAddition(null); }}>Use champion filters</Button>
      </div> : <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-ctp-subtext1">Champion
          <select value={championName} disabled={!catalogReady} onChange={(event) => { setChampionName(event.target.value); setSpiritName(""); }} className="mt-1 block min-h-control w-full rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-2 text-ctp-text">
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
        <p className="mb-1 text-sm text-ctp-subtext1">Cards to build around <span className="text-ctp-subtext0">(optional)</span></p>
        <CardSearchPicker options={cardNames} value={cardInput} onChange={setCardInput} ariaLabel="Find a card to build around" onSelect={name => setFocusCards(current => current.includes(name) ? current : [...current, name])} />
        {focusCards.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{focusCards.map(name =>
          <Button key={name} aria-label={`Remove ${name}`} onClick={() => setFocusCards(current => current.filter(card => card !== name))}>{name} ×</Button>
        )}</div>}
      </div>
      </>}
    </Panel>

    {choosing && <DialogSheet title="Choose reference deck" dirty={pickerDirty} onDismiss={() => setChoosing(false)}>
      {activeReference && <Button className="mb-3" onClick={() => selectReference(activeReference)}>Use active deck</Button>}
      {!catalogReady ? <p role="status">{sync.phase === "error" ? "Card data is unavailable." : "Loading card data…"}</p> : <div onInput={event => {
        if (event.target instanceof HTMLTextAreaElement) setPickerDirty(!!event.target.value.trim());
      }}><DeckWorkspacePicker catalogByName={cardsByName} source="analysis" onLoad={selectReference} confirmLabel="Use reference deck" /></div>}
    </DialogSheet>}

    {!hasContext && <InlineState className="mt-6">{catalogReady ? "Choose a champion or reference deck to see new cards." : "Loading card data…"}</InlineState>}
    {hasContext && <Section
      className="mt-6"
      aria-live="polite"
      title="New cards"
      actions={!reference && championName ? <Link to={builderLink} className="inline-flex min-h-control items-center rounded text-sm font-semibold text-ctp-blue hover:underline focus-visible:outline-2">Build around {championName}</Link> : undefined}
    >
      {!catalogReady ? <p role="status">Loading card data…</p> : discoveries.length === 0 ? <InlineState className="mt-4">No new cards match this context.</InlineState> : <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {discoveries.map(({ card, combos, setName }) => <CardResult key={card.uuid} card={card} name={card.name} compactOnMobile>
          <p className="text-xs text-ctp-subtext0">{setName}</p>
          <ul className="mt-2 text-sm text-ctp-subtext1">{combos.slice(0, 2).map(combo => <li key={`${combo.with.uuid}-${combo.via}`}><Link to={`/cards/${combo.with.slug}`} className="inline-flex min-h-control items-center text-ctp-blue hover:underline focus-visible:outline-2">{combo.with.name}</Link> · {combo.via}</li>)}</ul>
          {reference && <Button className="mt-2" onClick={() => setAddition(card)}>Compare swap</Button>}
        </CardResult>)}
      </div>}
    </Section>}
    {reference && addition && <ReferenceSwapSheet deck={reference} addition={addition} cards={cardsByName} onDismiss={() => setAddition(null)} />}
  </PageLayout>;
}
