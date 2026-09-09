import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { drawCards, newGame, playCard, suggestedExtraDraws, type GoldfishCardInstance, type GoldfishState } from "../../lib/goldfishSimulator";
import { DEFAULT_STARTING_HAND_SIZE } from "../../lib/turnToPlay";
import { decodeCustomDecks } from "../../lib/compareShareLink";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import CardImage from "../../components/CardImage";
import CardHoverPreview from "../../components/CardHoverPreview";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";

interface PendingConfirm {
  name: string;
  extraDraws: number;
  confirmed: number;
}

function HandCard({ card, resolved, onPlay }: { card: GoldfishCardInstance; resolved: Card | undefined; onPlay: () => void }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle">
      <div className="p-2">
        <CardHoverPreview image={resolved?.editions[0]?.image} alt={card.name}>
          {resolved?.editions[0] ? (
            <CardImage image={resolved.editions[0].image} alt={card.name} className="aspect-[5/7] w-full rounded-md object-cover object-top" />
          ) : (
            <div className="aspect-[5/7] w-full rounded-md bg-ctp-surface0" />
          )}
        </CardHoverPreview>
        <p className="mt-2 truncate text-sm font-medium text-ctp-text" title={card.name}>{card.name}</p>
        {resolved?.effect && <details className="mt-1"><summary className="cursor-pointer text-xs text-ctp-blue">Read effect</summary><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-ctp-subtext1">{resolved.effect.replace(/\*\*/g, "")}</p></details>}
      </div>
      <div className="border-t border-ctp-surface1 px-3 py-2">
        <button type="button" onClick={onPlay} className="min-h-10 w-full rounded-md border border-ctp-blue px-2.5 py-1 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10">Play card</button>
      </div>
    </div>
  );
}

/**
 * A very simple goldfish view — deal an opening hand, draw, play cards out of hand, read their
 * text. Deliberately not a rules engine: the only mechanic ever auto-suggested is "draw N cards"
 * (via `drawEffects.ts`'s own detector), and even that only as a stepper the viewer confirms
 * themselves — everything else (discard, reveal, combat, leveling) is resolved by eye. See
 * docs/CALCULATIONS.md's "Goldfish simulator" entry for why this scope, not a broader one.
 */
export default function GoldfishIndex() {
  useDocumentTitle("Goldfish Test", "Deal an opening hand and draw through a decklist, reading each card as you go.");
  const [searchParams] = useSearchParams();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((card) => [card.name, card])), [cardCatalog]);

  const initialDecklist = useMemo((): OmnidexDecklist | null => {
    const custom = searchParams.get("custom");
    if (!custom) return null;
    return decodeCustomDecks(custom)[0]?.decklist ?? null;
  }, [searchParams]);

  const [decklist, setDecklist] = useState<OmnidexDecklist | null>(initialDecklist);
  const [pasteText, setPasteText] = useState("");
  const [handSize, setHandSize] = useState(DEFAULT_STARTING_HAND_SIZE);
  const [state, setState] = useState<GoldfishState | null>(() => initialDecklist ? newGame(initialDecklist, DEFAULT_STARTING_HAND_SIZE) : null);
  const [turn, setTurn] = useState(1);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  function startNewHand(list: OmnidexDecklist) {
    setDecklist(list);
    setState(newGame(list, handSize));
    setTurn(1);
    setPendingConfirm(null);
  }

  function handlePlay(card: GoldfishCardInstance) {
    setState((current) => (current ? playCard(current, card.id) : current));
    const extraDraws = suggestedExtraDraws(cardsByName.get(card.name));
    setPendingConfirm(extraDraws > 0 ? { name: card.name, extraDraws, confirmed: 0 } : null);
  }

  function confirmOneDraw() {
    setState((current) => (current ? drawCards(current, 1) : current));
    setPendingConfirm((current) => (current ? { ...current, confirmed: current.confirmed + 1 } : current));
  }

  if (!decklist) {
    return (
      <PageLayout data-component="GoldfishIndex">
        <PageHeader title="Goldfish Test" description="Paste a decklist to deal an opening hand and draw through it, reading each card as you go." />
        <Panel className="mt-4">
          <textarea rows={16} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={"Main\n4x Card Name\n..."} className="w-full rounded-md border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm text-ctp-text" />
          <button
            type="button"
            disabled={!pasteText.trim()}
            onClick={() => {
              const parsed = parseDecklist(pasteText).decklist;
              if (parsed.main.length > 0) startNewHand(parsed);
            }}
            className="mt-3 rounded-md bg-ctp-blue px-3 py-2 text-sm font-medium text-ctp-base disabled:opacity-50"
          >
            Deal opening hand
          </button>
        </Panel>
      </PageLayout>
    );
  }

  if (!state) return <PageLayout data-component="GoldfishIndex"><InlineState className="mt-10">Loading catalog…</InlineState></PageLayout>;

  return (
    <PageLayout data-component="GoldfishIndex">
      <PageHeader
        title="Goldfish Test"
        description="This tracks your hand and suggests draw-effect triggers to confirm — everything else (discard, reveal, combat, leveling) is on you to resolve."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs text-ctp-subtext1">Hand size
              <input type="number" min={1} max={12} value={handSize} onChange={(event) => setHandSize(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} className="ml-1.5 w-14 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text" />
            </label>
            <button type="button" onClick={() => startNewHand(decklist)} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">New hand</button>
            <button type="button" onClick={() => { setDecklist(null); setState(null); setPendingConfirm(null); }} className="rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Change deck</button>
          </div>
        }
      />
      <div className="mt-4 grid gap-2 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
        {([['Library', state.library.length], ['Hand', state.hand.length], ['Played', state.played.length]] as const).map(([label, count]) => <div key={label} className="rounded-lg bg-ctp-base px-3 py-2"><div className="text-xl font-semibold tabular-nums text-ctp-text">{count}</div><div className="text-xs text-ctp-subtext0">{label}</div></div>)}
        <div className="flex gap-2 sm:block"><button type="button" disabled={state.library.length === 0} onClick={() => setState((current) => (current ? drawCards(current, 1) : current))} className="min-h-12 flex-1 rounded-md bg-ctp-blue px-4 py-2 text-sm font-medium text-ctp-base disabled:cursor-not-allowed disabled:opacity-40">Draw</button><button type="button" disabled={state.library.length === 0} onClick={() => { setTurn((value) => value + 1); setState((current) => current ? drawCards(current, 1) : current); }} className="min-h-12 flex-1 rounded-md border border-ctp-surface1 px-3 py-2 text-xs font-medium text-ctp-subtext1 sm:mt-2 sm:block">Next turn + draw</button></div>
      </div>

      {pendingConfirm && (
        <Panel tone="info" padding="sm" className="mt-4">
          <p className="text-sm text-ctp-text">
            Played <strong>{pendingConfirm.name}</strong> — its text mentions drawing {pendingConfirm.extraDraws} card{pendingConfirm.extraDraws > 1 ? "s" : ""}. Did that actually trigger? Confirm as many as really happened (a card's wording may be conditional, so this is never applied for you).
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" disabled={pendingConfirm.confirmed >= pendingConfirm.extraDraws || state.library.length === 0} onClick={confirmOneDraw} className="rounded-md border border-ctp-green/60 px-2.5 py-1 text-xs text-ctp-green hover:bg-ctp-green/10 disabled:cursor-not-allowed disabled:opacity-40">
              +1 card ({pendingConfirm.confirmed}/{pendingConfirm.extraDraws})
            </button>
            <button type="button" onClick={() => setPendingConfirm(null)} className="rounded-md border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext1">Done</button>
          </div>
        </Panel>
      )}

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Turn {turn} · Hand</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {state.hand.map((card) => (
          <HandCard key={card.id} card={card} resolved={cardsByName.get(card.name)} onPlay={() => handlePlay(card)} />
        ))}
        {state.hand.length === 0 && <InlineState>Hand is empty — draw a card to continue.</InlineState>}
      </div>

      {state.played.length > 0 && (
        <details className="mt-6 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Played this hand ({state.played.length})</summary>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{state.played.map((card, index) => { const resolved = cardsByName.get(card.name); return <div key={card.id} className="w-20 shrink-0"><div className="relative">{resolved?.editions[0] ? <CardImage image={resolved.editions[0].image} alt={card.name} className="aspect-[5/7] w-full rounded object-cover object-top" /> : <div className="aspect-[5/7] rounded bg-ctp-surface0" />}<span className="absolute left-1 top-1 rounded bg-ctp-crust/90 px-1 text-[10px] text-ctp-text">{index + 1}</span></div><p className="mt-1 truncate text-[10px] text-ctp-subtext1" title={card.name}>{card.name}</p></div>; })}</div>
        </details>
      )}
    </PageLayout>
  );
}
