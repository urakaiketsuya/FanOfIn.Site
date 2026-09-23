import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Card, CollectionEntry, OmnidexDecklist } from "@gatcg/shared";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";
import { useCardCatalog } from "../cards/useCardCatalog";
import InteractionCoverageMatrix from "../deckbuilder/InteractionCoverageMatrix";
import PostSideboardPlan from "../deckbuilder/PostSideboardPlan";
import { saveActiveDeckWorkspace } from "../deckbuilder/persistence/deckWorkspace";
import { shortDeckLabel, type ComparedDeck } from "./types";
import { accountApi } from "../../lib/accountApi";

interface Props { decks: ComparedDeck[]; decklists: Map<string, OmnidexDecklist | null>; baselineKey: string | null }

const lines = (entries: OmnidexDecklist["main"]) => entries.map((entry) => ({ name: entry.card, quantity: entry.quantity }));

export default function MatchupPlanning({ decks, decklists, baselineKey }: Props) {
  const navigate = useNavigate();
  const catalog = useCardCatalog();
  const catalogByName = useMemo(() => new Map(catalog.map((card) => [card.name, card])), [catalog]);
  const opponents = decks.filter((deck) => deck.key !== baselineKey);
  const [opponentKey, setOpponentKey] = useState<string | null>(opponents[0]?.key ?? null);
  const [collectionEntries, setCollectionEntries] = useState<CollectionEntry[] | null>(null);
  useEffect(() => { let active = true; void accountApi.collection().then((result) => { if (active) setCollectionEntries(result.entries); }).catch(() => undefined); return () => { active = false; }; }, []);
  const effectiveOpponentKey = opponents.some((deck) => deck.key === opponentKey) ? opponentKey : (opponents[0]?.key ?? null);
  const baseline = decks.find((deck) => deck.key === baselineKey);
  const opponent = decks.find((deck) => deck.key === effectiveOpponentKey);
  const baselineList = baseline ? decklists.get(baseline.key) : null;
  const opponentList = opponent ? decklists.get(opponent.key) : null;
  const opposingCards = useMemo(() => distinctiveCards(baselineList, opponentList, catalogByName), [baselineList, opponentList, catalogByName]);

  if (!baseline || !baselineList || opponents.length === 0) return <InlineState className="text-sm">Choose a baseline and at least one opposing deck to plan a matchup.</InlineState>;
  if (!opponent || !opponentList) return <InlineState className="text-sm">The opposing decklist is still loading or unavailable.</InlineState>;

  const main = lines(baselineList.main);
  const material = lines(baselineList.material);
  const sideboard = lines(baselineList.sideboard);
  const matchup = shortDeckLabel(opponent.label);
  const matchupKey = `${baseline.key}:${opponent.key}`;
  const championName = championFromMaterial(baselineList, catalogByName);

  function openPostboard(postboardMain: { name: string; quantity: number }[], postboardSideboard: { name: string; quantity: number }[]) {
    saveActiveDeckWorkspace(sessionStorage, { source: "builder", title: `${shortDeckLabel(baseline!.label)} — ${matchup} postboard`, sourceLabel: "Compare matchup plan", deckIdentity: null, format: baseline!.format ?? "STANDARD", championName, spiritName: null, main: postboardMain, material, sideboard: postboardSideboard, maybeboard: [] });
    navigate("/deck-builder");
  }

  return <div data-component="MatchupPlanning" className="space-y-4">
    <Panel>
      <p className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Plan from the baseline</p>
      <h2 className="mt-1 text-lg font-semibold text-ctp-text">{shortDeckLabel(baseline.label)}</h2>
      <label className="mt-4 block text-xs text-ctp-subtext0">Opposing deck<select value={effectiveOpponentKey ?? ""} onChange={(event) => setOpponentKey(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm text-ctp-text sm:max-w-xl">{opponents.map((deck) => <option key={deck.key} value={deck.key}>{deck.label}</option>)}</select></label>
      <div className="mt-4"><p className="text-xs font-semibold text-ctp-text">Likely opposing package</p><p className="mt-1 text-xs text-ctp-subtext0">Cards most distinctive from your baseline. Confirm which ones matter before choosing answers.</p><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{opposingCards.map(({ card, quantity }) => <div key={card.name} className="w-32 shrink-0 rounded-lg border border-ctp-surface1 bg-ctp-base/40 p-2"><p className="line-clamp-2 text-xs font-medium text-ctp-text">{card.name}</p><p className="mt-1 text-[10px] text-ctp-subtext0">{quantity}×{card.cost_reserve != null ? ` · Reserve ${card.cost_reserve}` : ""}</p></div>)}</div></div>
    </Panel>
    <details className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle" open><summary className="cursor-pointer list-none p-4 text-sm font-semibold text-ctp-text">Answer access</summary><div className="border-t border-ctp-surface1 px-3 pb-3"><InteractionCoverageMatrix key={`answers:${matchupKey}`} mainLines={main} materialLines={material} sideboardLines={sideboard} catalogByName={catalogByName} initialMatchup={matchup} /></div></details>
    <details className="group rounded-xl border border-ctp-surface1 bg-ctp-mantle"><summary className="cursor-pointer list-none p-4"><span className="block text-sm font-semibold text-ctp-text">Post-sideboard plan</span><span className="mt-1 block text-xs text-ctp-subtext0">Choose balanced swaps, compare role access, resource shape, legality, and collection coverage, then save the plan or continue in Deck Builder.</span></summary><div className="border-t border-ctp-surface1 px-3 pb-3">{sideboard.length > 0 ? <PostSideboardPlan key={`sideboard:${matchupKey}`} championName={championName} mainLines={main} materialLines={material} sideboardLines={sideboard} catalogByName={catalogByName} format={baseline.format ?? "STANDARD"} initialMatchup={matchup} onOpenPostboard={openPostboard} collectionEntries={collectionEntries} /> : <InlineState className="mt-3">The baseline has no Sideboard cards.</InlineState>}</div></details>
  </div>;
}

function distinctiveCards(baseline: OmnidexDecklist | null | undefined, opponent: OmnidexDecklist | null | undefined, catalog: Map<string, Card>) {
  if (!opponent) return [];
  const baselineNames = new Set(baseline?.main.map((line) => line.card) ?? []);
  return opponent.main.filter((line) => !baselineNames.has(line.card)).map((line) => ({ card: catalog.get(line.card), quantity: line.quantity })).filter((entry): entry is { card: Card; quantity: number } => Boolean(entry.card)).sort((a, b) => b.quantity - a.quantity || (b.card.cost_reserve ?? 0) - (a.card.cost_reserve ?? 0)).slice(0, 8);
}

function championFromMaterial(decklist: OmnidexDecklist, catalog: Map<string, Card>): string | null {
  return decklist.material.map((line) => catalog.get(line.card)).find((card) => card?.types?.some((type) => type.toLowerCase().includes("champion")))?.name ?? null;
}
