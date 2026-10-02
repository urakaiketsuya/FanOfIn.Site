import GoldfishZoneCards from "./GoldfishZoneCards";
import GoldfishTurnControls from "./GoldfishTurnControls";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Card, DeckFormat, OmnidexDecklist } from "@gatcg/shared";
import { banishRandomFromMemory, beginRecollection, createTokens, drawCards, goldfishEffectSupport, isReplayableHistory, isReservable, materializeCard, newGame, nextTurn, parseGoldfishSession, playCard, recollectMemory, removeToken, replayGoldfishHistory, reserveCard, resolveGlimpse, serializeGoldfishSession, suggestedExtraDraws, suggestedGlimpse, type GoldfishCardInstance, type GoldfishSession, type GoldfishState } from "../../lib/goldfishSimulator";
import { DEFAULT_STARTING_HAND_SIZE } from "../../lib/turnToPlay";
import { decodeCustomDecks } from "../../lib/compareShareLink";
import { parseDecklist } from "../compare/parseDecklist";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import CardArtTile from "../../components/CardArtTile";
import DialogSheet from "../../components/ui/DialogSheet";
import Button from "../../components/ui/Button";
import DisclosureChevron from "../../components/DisclosureChevron";
import CardHoverPreview from "../../components/CardHoverPreview";
import PageHeader from "../../components/ui/PageHeader";
import PageLayout from "../../components/layout/PageLayout";
import Panel from "../../components/ui/Panel";
import { InlineState } from "../../components/ui/ContentState";
import { accountApi, AccountApiError } from "../../lib/accountApi";
import { loadDeckLibrary } from "../account/loadDeckLibrary";

interface PendingConfirm {
  name: string;
  extraDraws: number;
  confirmed: number;
}

interface PendingPayment {
  card: GoldfishCardInstance;
  reserveCost: number;
  variable: boolean;
  selectedIds: Set<string>;
}

interface GoldfishDeckOption {
  key: string;
  title: string;
  subtitle: string;
  format: DeckFormat;
  decklist: OmnidexDecklist;
}

const GOLD_FISH_SESSION_KEY = "fanofin:goldfish-session:v2";

function readSavedSession(): GoldfishSession | null {
  try { return parseGoldfishSession(localStorage.getItem(GOLD_FISH_SESSION_KEY)); }
  catch { return null; }
}

function HandCard({ card, resolved, disabled, onPlay, onReserve }: { card: GoldfishCardInstance; resolved: Card | undefined; disabled?: boolean; onPlay: () => void; onReserve?: () => void }) {
  const support = goldfishEffectSupport(resolved);
  const assistedLabels = support.assists.map((assist) => assist.type === "draw" ? `draw ${assist.count}` : assist.type === "glimpse" ? `Glimpse ${assist.count}` : assist.type === "create-tokens" ? `summon ${assist.count} ${assist.name}` : `randomly banish ${assist.count} from Memory`);
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle">
      <div className="p-2">
        <CardHoverPreview image={resolved?.editions[0]?.image} alt={card.name}>
          <CardArtTile card={resolved} name={card.name} />
        </CardHoverPreview>
        <p className="mt-2 break-words text-sm font-medium text-ctp-text">{resolved ? <Link to={`/cards/${resolved.slug}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center underline">{card.name}<span className="sr-only"> (opens in a new tab)</span></Link> : card.name}</p>
      </div>
      <div className="grid gap-2 border-t border-ctp-surface1 px-3 py-2">
        <button type="button" disabled={disabled} onClick={onPlay} className="min-h-12 w-full rounded-md border border-ctp-blue px-2.5 py-1 text-xs font-medium text-ctp-blue hover:bg-ctp-blue/10 disabled:cursor-not-allowed disabled:opacity-40">Play · Reserve {resolved?.cost_reserve === -1 ? "X" : Math.max(0, resolved?.cost_reserve ?? 0)}</button>
        {onReserve && <button type="button" disabled={disabled} onClick={onReserve} className="min-h-12 w-full rounded-md border border-ctp-yellow/60 px-2.5 py-1 text-xs font-medium text-ctp-yellow hover:bg-ctp-yellow/10 disabled:opacity-40">Reserve to Memory</button>}
      </div>
      {resolved?.effect && <details className="group px-3 pb-2"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-xs text-ctp-blue">Read effect<DisclosureChevron className="group-open:rotate-180" /></summary><p className="whitespace-pre-wrap text-xs leading-5 text-ctp-subtext1">{resolved.effect.replace(/\*\*/g, "")}</p><div className="mt-2 text-xs leading-5 text-ctp-subtext0">{assistedLabels.length > 0 && <p><span className="font-semibold text-ctp-green">Assisted:</span> {assistedLabels.join(" · ")}</p>}{support.hasUnsupportedText && <p><span className="font-semibold text-ctp-yellow">Player-resolved:</span> remaining costs, targets, conditions, timing, and effects.</p>}</div></details>}
    </div>
  );
}

/**
 * A very simple goldfish view – deal an opening hand, draw, play cards out of hand, read their
 * text. Deliberately not a rules engine: the only mechanic ever auto-suggested is "draw N cards"
 * (via `drawEffects.ts`'s own detector), and even that only as a stepper the viewer confirms
 * themselves – everything else (discard, reveal, combat, leveling) is resolved by eye. See
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
  const [deckLabel, setDeckLabel] = useState(() => searchParams.get("custom") ? decodeCustomDecks(searchParams.get("custom")!)[0]?.label ?? "Imported deck" : "Imported deck");
  const [pasteText, setPasteText] = useState("");
  const [importMode, setImportMode] = useState<"library" | "paste">("library");
  const [libraryState, setLibraryState] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [libraryDecks, setLibraryDecks] = useState<GoldfishDeckOption[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const directImportAttempted = useRef(false);
  const [handSize, setHandSize] = useState(DEFAULT_STARTING_HAND_SIZE);
  const [state, setState] = useState<GoldfishState | null>(() => initialDecklist ? newGame(initialDecklist, DEFAULT_STARTING_HAND_SIZE) : null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [glimpseSize, setGlimpseSize] = useState(3);
  const [activeGlimpse, setActiveGlimpse] = useState<{ name: string; count: number } | null>(null);
  const [keptGlimpseIds, setKeptGlimpseIds] = useState<Set<string>>(() => new Set());
  const [tokenName, setTokenName] = useState("");
  const [tokenCount, setTokenCount] = useState(1);
  const [savedSession, setSavedSession] = useState<GoldfishSession | null>(readSavedSession);
  const toolContentRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"menu" | "memory" | "material" | "tokens" | "glimpse" | "session" | "history" | null>(null);
  const [controlsHeight, setControlsHeight] = useState(220);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => { if (tool) toolContentRef.current?.focus(); }, [tool]);

  function startNewHand(list: OmnidexDecklist, label?: string) {
    setDecklist(list);
    if (label) setDeckLabel(label);
    setState(newGame(list, handSize));
    setPendingConfirm(null);
    setPendingPayment(null);
    setActiveGlimpse(null);
    setKeptGlimpseIds(new Set());
  }

  useEffect(() => {
    if (decklist || libraryState !== "loading" || importMode !== "library") return;
    let active = true;
    void loadDeckLibrary(accountApi).then((library) => {
      if (!active) return;
      setLibraryDecks([
        ...library.decks.map((deck) => ({ key: `owned:${deck.id}`, title: deck.title, subtitle: "My Deck", format: deck.format, decklist: deck.decklist })),
        ...library.bookmarks.map((deck) => ({ key: `community:${deck.publicSlug}`, title: deck.title, subtitle: `Favorite · ${deck.owner.displayName}`, format: deck.format, decklist: deck.decklist })),
        ...library.tournamentFavorites.map((deck) => ({ key: `tournament:${deck.deckHash}`, title: deck.title, subtitle: deck.sourceEventName ? `Tournament · ${deck.sourceEventName}` : "Tournament favorite", format: "STANDARD" as const, decklist: deck.decklist })),
      ]);
      setLibraryState("ready");
      if (library.optionalLoadFailed) setSessionNotice("Your decks loaded, but some favorites are temporarily unavailable.");
    }).catch((reason: unknown) => {
      if (!active) return;
      setLibraryState(reason instanceof AccountApiError && reason.status === 401 ? "signed-out" : "error");
    });
    return () => { active = false; };
  }, [decklist, importMode, libraryState]);

  useEffect(() => {
    if (initialDecklist || decklist || directImportAttempted.current) return;
    const savedDeckId = searchParams.get("deck");
    const publicDeckSlug = savedDeckId ? null : searchParams.get("publicDeck");
    if (!savedDeckId && !publicDeckSlug) return;
    directImportAttempted.current = true;
    const request = savedDeckId ? accountApi.deck(savedDeckId).then(({ deck }) => ({ decklist: deck.decklist, label: deck.title })) : accountApi.publicDeck(publicDeckSlug!).then(({ deck }) => ({ decklist: deck.decklist, label: deck.title }));
    void request.then((result) => { setDecklist(result.decklist); setDeckLabel(result.label); setState(newGame(result.decklist, DEFAULT_STARTING_HAND_SIZE)); }).catch((reason: unknown) => setSessionNotice(reason instanceof Error ? reason.message : "That deck could not be imported."));
  }, [decklist, initialDecklist, searchParams]);

  const visibleLibraryDecks = useMemo(() => {
    const query = libraryQuery.trim().toLocaleLowerCase();
    return libraryDecks.filter((deck) => !query || `${deck.title} ${deck.subtitle}`.toLocaleLowerCase().includes(query));
  }, [libraryDecks, libraryQuery]);

  function beginGlimpse(count: number, name = "Manual glimpse") {
    if (!state || state.library.length === 0) return;
    setTool(null);
    setActiveGlimpse({ name, count: Math.min(Math.max(1, Math.floor(count)), state.library.length) });
    setKeptGlimpseIds(new Set());
  }

  function finishGlimpse() {
    if (!activeGlimpse) return;
    setState((current) => current ? resolveGlimpse(current, activeGlimpse.count, keptGlimpseIds) : current);
    setActiveGlimpse(null);
    setKeptGlimpseIds(new Set());
  }

  function finishPlayedCard(card: GoldfishCardInstance) {
    const extraDraws = suggestedExtraDraws(cardsByName.get(card.name));
    setPendingConfirm(extraDraws > 0 ? { name: card.name, extraDraws, confirmed: 0 } : null);
    const glimpse = suggestedGlimpse(cardsByName.get(card.name));
    if (glimpse > 0) beginGlimpse(glimpse, card.name);
  }

  function handlePlay(card: GoldfishCardInstance) {
    const printedCost = cardsByName.get(card.name)?.cost_reserve;
    const variable = printedCost === -1;
    const reserveCost = variable ? 0 : Math.max(0, printedCost ?? 0);
    if (reserveCost === 0 && !variable) {
      setState((current) => (current ? playCard(current, card.id) : current));
      finishPlayedCard(card);
      return;
    }
    setPendingPayment({ card, reserveCost, variable, selectedIds: new Set() });
  }

  function confirmPayment() {
    if (!pendingPayment || pendingPayment.selectedIds.size !== pendingPayment.reserveCost) return;
    const { card, reserveCost, selectedIds } = pendingPayment;
    setState((current) => current ? playCard(current, card.id, [...selectedIds], reserveCost) : current);
    setPendingPayment(null);
    finishPlayedCard(card);
  }

  function confirmOneDraw() {
    setState((current) => (current ? drawCards(current, 1) : current));
    setPendingConfirm((current) => (current ? { ...current, confirmed: current.confirmed + 1 } : current));
  }

  function saveSession() {
    if (!decklist || !state) return;
    try {
      const raw = serializeGoldfishSession(decklist, handSize, state);
      localStorage.setItem(GOLD_FISH_SESSION_KEY, raw);
      setSavedSession(parseGoldfishSession(raw));
      setSessionNotice("Session saved on this device.");
    } catch {
      setSessionNotice("This browser could not save the session.");
    }
  }

  function resumeSession(session = savedSession) {
    if (!session) return;
    setDecklist(session.decklist);
    setDeckLabel("Saved session");
    setState(session.state);
    setHandSize(session.handSize);
    setPendingConfirm(null);
    setPendingPayment(null);
    setActiveGlimpse(null);
    setKeptGlimpseIds(new Set());
    setSessionNotice("Saved session restored.");
  }

  function forgetSession() {
    try { localStorage.removeItem(GOLD_FISH_SESSION_KEY); } catch { /* Best effort. */ }
    setSavedSession(null);
    setSessionNotice("Saved session removed.");
  }

  function replayFromStart() {
    if (!decklist || !state) return;
    const replayed = replayGoldfishHistory(decklist, state.seed, state.history);
    if (!replayed) return;
    setState(replayed);
    setPendingConfirm(null);
    setPendingPayment(null);
    setActiveGlimpse(null);
    setKeptGlimpseIds(new Set());
    setSessionNotice("Replay rebuilt the current game from its opening seed and action history.");
  }

  if (!decklist) {
    return (
      <PageLayout data-component="GoldfishIndex">
        <PageHeader title="Goldfish Test" description="Choose one of your decks or paste a list to deal an opening hand and play through draws." />
        <Panel className="mt-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Deck import source"><button type="button" role="tab" aria-selected={importMode === "library"} onClick={() => setImportMode("library")} className={`min-h-12 whitespace-nowrap rounded-lg px-4 text-sm font-medium ${importMode === "library" ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext1"}`}>My Decks &amp; Favorites</button><button type="button" role="tab" aria-selected={importMode === "paste"} onClick={() => setImportMode("paste")} className={`min-h-12 whitespace-nowrap rounded-lg px-4 text-sm font-medium ${importMode === "paste" ? "bg-ctp-blue text-ctp-base" : "border border-ctp-surface1 text-ctp-subtext1"}`}>Paste decklist</button></div>
          {importMode === "library" && <div className="mt-4">{libraryState === "loading" && <InlineState>Loading your deck library…</InlineState>}{libraryState === "signed-out" && <InlineState><Link to="/account" className="font-medium text-ctp-blue hover:underline">Sign in</Link> to choose from your decks and favorites, or use Paste decklist.</InlineState>}{libraryState === "error" && <InlineState tone="danger">Your deck library could not be loaded. <button type="button" onClick={() => setLibraryState("loading")} className="min-h-12 min-w-12 px-3 text-ctp-blue hover:underline">Try again</button></InlineState>}{libraryState === "ready" && <><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Search decks, owners, or events…" aria-label="Search deck library" className="min-h-12 w-full rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm sm:max-w-md" />{visibleLibraryDecks.length > 0 ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{visibleLibraryDecks.map((deck) => <button key={deck.key} type="button" onClick={() => startNewHand(deck.decklist, deck.title)} className="min-h-20 rounded-xl border border-ctp-surface1 bg-ctp-base p-3 text-left transition-colors hover:border-ctp-blue focus-visible:outline-2 focus-visible:outline-ctp-blue"><span className="block font-semibold text-ctp-text">{deck.title}</span><span className="mt-1 block text-xs text-ctp-subtext0">{deck.subtitle} · {deck.format === "PANTHEON" ? "Pantheon" : "Standard"}</span><span className="mt-2 block text-xs text-ctp-blue">Deal opening hand →</span></button>)}</div> : <InlineState className="mt-3">No decks match this search.</InlineState>}</>}</div>}
          {importMode === "paste" && <div className="mt-4"><textarea rows={12} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={"Main\n4x Card Name\n\nMaterial\n1x Champion Name"} className="w-full rounded-lg border border-ctp-surface1 bg-ctp-base p-3 font-mono text-sm text-ctp-text" /><button type="button" disabled={!pasteText.trim()} onClick={() => { const parsed = parseDecklist(pasteText).decklist; if (parsed.main.length > 0) startNewHand(parsed, "Pasted deck"); else setSessionNotice("No Main Deck cards were recognized."); }} className="mt-3 min-h-12 rounded-lg bg-ctp-blue px-4 text-sm font-semibold text-ctp-base disabled:opacity-50">Deal opening hand</button></div>}
          {savedSession && <div className="mt-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-3"><p className="text-sm font-medium text-ctp-text">Resume saved test</p><p className="mt-1 text-xs text-ctp-subtext0">Turn {savedSession.state.turn} · {savedSession.state.hand.length} in hand · saved {new Date(savedSession.savedAt).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => resumeSession()} className="min-h-12 rounded-lg bg-ctp-green px-3 text-sm font-semibold text-ctp-base">Resume session</button><button type="button" onClick={forgetSession} className="min-h-12 rounded-lg border border-ctp-red/50 px-3 text-sm text-ctp-red">Forget</button></div></div>}
          {sessionNotice && <p role="status" className="mt-3 text-xs text-ctp-subtext1">{sessionNotice}</p>}
        </Panel>
      </PageLayout>
    );
  }

  if (!state) return <PageLayout data-component="GoldfishIndex"><InlineState className="mt-10">Loading catalog…</InlineState></PageLayout>;

  return (
    <PageLayout data-component="GoldfishIndex" style={{ paddingBottom: controlsHeight + 24 }} className="[&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-ctp-blue">
      <PageHeader
        title="Goldfish Test"
        description={deckLabel}
      />
      <div className="identity-surface mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-ctp-surface1 p-3">
        {([['Library', state.library.length], ['Hand', state.hand.length], ['Memory', state.memory.length]] as const).map(([label, count]) => <div key={label} className="rounded-lg bg-ctp-base px-3 py-2"><div className="text-3xl font-semibold tabular-nums text-ctp-text">{count}</div><div className="text-xs text-ctp-subtext0">{label}</div></div>)}
      </div>

      {pendingPayment && <DialogSheet title={`Pay for ${pendingPayment.card.name}`} onDismiss={() => setPendingPayment(null)} dirty={pendingPayment.selectedIds.size > 0} footer={<Button variant="primary" disabled={pendingPayment.selectedIds.size !== pendingPayment.reserveCost} onClick={confirmPayment}>Confirm payment ({pendingPayment.selectedIds.size}/{pendingPayment.reserveCost})</Button>}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-ctp-text">Pay for {pendingPayment.card.name}</p><p className="mt-1 text-xs leading-5 text-ctp-subtext1">Select exactly {pendingPayment.reserveCost} other card{pendingPayment.reserveCost === 1 ? "" : "s"} from Hand. Confirming moves those cards to Memory and the played card to the played zone.</p></div>
          {pendingPayment.variable && <label className="text-xs text-ctp-subtext0">Reserve X<input type="number" min={0} max={Math.max(0, state.hand.length - 1)} value={pendingPayment.reserveCost} onChange={(event) => setPendingPayment((current) => current ? { ...current, reserveCost: Math.max(0, Math.min(state.hand.length - 1, Number(event.target.value) || 0)), selectedIds: new Set() } : current)} className="ml-2 min-h-12 w-16 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-sm text-ctp-text" /></label>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {state.hand.filter((candidate) => candidate.id !== pendingPayment.card.id).map((candidate) => {
            const selected = pendingPayment.selectedIds.has(candidate.id);
            const selectionFull = !selected && pendingPayment.selectedIds.size >= pendingPayment.reserveCost;
            return <button key={candidate.id} type="button" disabled={selectionFull} aria-pressed={selected} onClick={() => setPendingPayment((current) => { if (!current) return current; const selectedIds = new Set(current.selectedIds); if (selectedIds.has(candidate.id)) selectedIds.delete(candidate.id); else selectedIds.add(candidate.id); return { ...current, selectedIds }; })} className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm ${selected ? "border-ctp-yellow bg-ctp-yellow/10 text-ctp-yellow" : "border-ctp-surface1 text-ctp-subtext1"} disabled:cursor-not-allowed disabled:opacity-40`}><CardArtTile card={cardsByName.get(candidate.name)} name={candidate.name} /><span className="mt-2 block font-medium">{candidate.name}</span>{selected && <span className="ml-2 text-[10px] uppercase tracking-wide">to Memory</span>}</button>;
          })}
        </div>
        {state.hand.length - 1 < pendingPayment.reserveCost && <p role="alert" className="mt-3 text-xs text-ctp-red">Not enough other cards remain in Hand to pay this cost.</p>}
      </DialogSheet>}

      {pendingConfirm && !activeGlimpse && (
        <DialogSheet title="Confirm draw effect" onDismiss={() => setPendingConfirm(null)}>
          <p className="text-sm text-ctp-text">
            Played <strong>{pendingConfirm.name}</strong>. Its text mentions drawing {pendingConfirm.extraDraws} card{pendingConfirm.extraDraws > 1 ? "s" : ""}. Did that actually trigger? Confirm as many as really happened (a card's wording may be conditional, so this is never applied for you).
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" disabled={pendingConfirm.confirmed >= pendingConfirm.extraDraws || state.library.length === 0} onClick={confirmOneDraw} className="min-h-12 min-w-12 rounded-md border border-ctp-green/60 px-2.5 py-1 text-xs text-ctp-green hover:bg-ctp-green/10 disabled:cursor-not-allowed disabled:opacity-40">
              +1 card ({pendingConfirm.confirmed}/{pendingConfirm.extraDraws})
            </button>
            <button type="button" onClick={() => setPendingConfirm(null)} className="min-h-12 min-w-12 rounded-md border border-ctp-surface1 px-2.5 py-1 text-xs text-ctp-subtext1">Done</button>
          </div>
        </DialogSheet>
      )}

      <div className="identity-surface mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ctp-surface1 p-4"><div><h2 className="text-2xl font-semibold text-ctp-text">Your hand</h2><p className="mt-1 text-sm text-ctp-subtext1">{state.phase === "main" ? (state.library.length > 0 ? "Choose a card to play or draw to keep testing." : "Library is empty. Keep testing with the cards in your zones.") : "Recollection is active. Open Memory to manage your cards."}</p></div><p className="text-sm text-ctp-subtext0"><span className="text-3xl font-semibold tabular-nums text-ctp-text">{state.hand.length}</span> {state.hand.length === 1 ? "card" : "cards"}</p></div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {state.hand.map((card) => (
          <HandCard key={card.id} card={card} resolved={cardsByName.get(card.name)} disabled={activeGlimpse !== null || pendingPayment !== null || state.phase !== "main"} onPlay={() => handlePlay(card)} onReserve={isReservable(cardsByName.get(card.name)) ? () => setState((current) => current ? reserveCard(current, card.id) : current) : undefined} />
        ))}
        {state.hand.length === 0 && <InlineState className="col-span-full">{state.library.length > 0 ? "Hand is empty. Draw a card to continue." : "Hand and library are empty. Open Memory to check your cards, or start a new hand in Tools."}</InlineState>}
      </div>


      {activeGlimpse && (
        <DialogSheet title={`${activeGlimpse.name} · Glimpse ${activeGlimpse.count}`} onDismiss={() => { setActiveGlimpse(null); setKeptGlimpseIds(new Set()); }} dirty={keptGlimpseIds.size > 0} footer={<Button variant="primary" onClick={finishGlimpse}>Keep {keptGlimpseIds.size} · randomize rest</Button>}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-ctp-mauve">{activeGlimpse.name} · Glimpse {activeGlimpse.count}</p><p className="mt-1 text-sm text-ctp-subtext1">Select cards to keep on top. Unselected cards will be randomized and moved to the bottom.</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {state.library.slice(0, activeGlimpse.count).map((card) => { const resolved = cardsByName.get(card.name); const kept = keptGlimpseIds.has(card.id); return <button key={card.id} type="button" aria-pressed={kept} onClick={() => setKeptGlimpseIds((current) => { const next = new Set(current); if (next.has(card.id)) next.delete(card.id); else next.add(card.id); return next; })} className={`overflow-hidden rounded-lg border p-2 text-left ${kept ? "border-ctp-green bg-ctp-green/10 ring-2 ring-ctp-green/30" : "border-ctp-surface1 bg-ctp-base"}`}><div className="relative"><CardArtTile card={resolved} name={card.name} /><span className={`absolute right-1.5 top-1.5 rounded px-2 py-1 text-xs font-semibold ${kept ? "bg-ctp-green text-ctp-base" : "bg-ctp-crust/90 text-ctp-subtext1"}`}>{kept ? "Keep" : "Bottom"}</span></div><span className="mt-2 block break-words text-xs font-medium text-ctp-text">{card.name}</span></button>; })}
          </div>
        </DialogSheet>
      )}


      {tool && <DialogSheet title={tool === "menu" ? "Goldfish tools" : ({ memory: "Memory & recollection", material: "Material deck", tokens: "Tokens", glimpse: "Glimpse", session: "Session", history: "Played cards & replay" } as const)[tool]} onDismiss={() => setTool(null)} footer={tool !== "menu" ? <Button onClick={() => setTool("menu")}>All tools</Button> : undefined}>
        <div ref={toolContentRef} tabIndex={-1} className="outline-none">
        {tool === "menu" && <div className="grid gap-2">{([
          ["memory", `Memory & recollection · ${state.memory.length} ${state.memory.length === 1 ? "card" : "cards"}`], ["material", `Material deck · ${state.materialDeck.length} remaining`], ["tokens", `Tokens · ${state.tokens.length}`], ["glimpse", "Glimpse / look at top cards"], ["session", "Session / new hand / change deck"], ["history", `Played cards & replay · ${state.played.length} played`],
        ] as const).map(([key, label]) => <Button key={key} className="text-left" onClick={() => setTool(key)}>{label}</Button>)}</div>}
        {tool === "memory" && <><Panel padding="sm" className="mt-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-ctp-yellow">Turn {state.turn} · {state.phase === "recollection" ? "Recollection Phase" : "Main Phase"}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={state.phase === "recollection"} onClick={() => setState((current) => current ? beginRecollection(current) : current)} className="min-h-12 rounded-lg border border-ctp-yellow/60 px-3 text-xs font-medium text-ctp-yellow disabled:opacity-40">Begin Recollection</button><button type="button" disabled={state.phase !== "recollection" || state.memory.length === 0} onClick={() => setState((current) => current ? recollectMemory(current) : current)} className="min-h-12 rounded-lg bg-ctp-yellow px-3 text-xs font-semibold text-ctp-base disabled:opacity-40">Return Memory to hand</button><button type="button" disabled={state.memory.length === 0} onClick={() => setState((current) => current ? banishRandomFromMemory(current, 1) : current)} className="min-h-12 rounded-lg border border-ctp-red/60 px-3 text-xs font-medium text-ctp-red disabled:opacity-40">Randomly banish 1</button></div></div>
        <GoldfishZoneCards title="Memory" cards={state.memory} cardsByName={cardsByName} emptyText="No cards in Memory. Reserved cards will appear here." />
        {state.banished.length > 0 && <GoldfishZoneCards title="Banished" cards={state.banished} cardsByName={cardsByName} emptyText="No banished cards." />}
      </Panel>
        </>}
        {tool === "material" && <>{(state.materialDeck.length > 0 || state.materialized.length > 0) && <section className="space-y-3"><h3 className="text-sm font-semibold">Material Deck ({state.materialDeck.length} remaining · {state.materialized.length} in play)</h3><div className="mt-3 grid grid-cols-2 gap-3">{state.materialDeck.map((card) => <button key={card.id} type="button" disabled={state.phase !== "main"} onClick={() => setState((current) => current ? materializeCard(current, card.id) : current)} className="min-h-12 rounded-lg border border-ctp-mauve/50 p-3 text-left text-sm text-ctp-mauve hover:bg-ctp-mauve/10 disabled:cursor-not-allowed disabled:opacity-40"><CardArtTile card={cardsByName.get(card.name)} name={card.name} /><span className="mt-2 block">Materialize {card.name}</span></button>)}</div><GoldfishZoneCards title="Materialized" cards={state.materialized} cardsByName={cardsByName} emptyText="No cards materialized yet." /></section>}{state.materialDeck.length === 0 && state.materialized.length === 0 && <InlineState>No material cards in this deck.</InlineState>}</>}
        {tool === "tokens" && <>
      <section className="space-y-3"><h3 className="text-sm font-semibold">Tokens ({state.tokens.length})</h3><div className="mt-3 flex flex-wrap gap-2"><input value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder="Token name" aria-label="Token name" className="min-h-12 min-w-0 flex-1 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 text-sm"/><input type="number" min={1} max={20} value={tokenCount} onChange={(event) => setTokenCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} aria-label="Token quantity" className="min-h-12 w-16 rounded-lg border border-ctp-surface1 bg-ctp-base px-2 text-sm"/><button type="button" disabled={!tokenName.trim()} onClick={() => { setState((current) => current ? createTokens(current, tokenName, tokenCount) : current); setTokenName(""); }} className="min-h-12 rounded-lg border border-ctp-green/60 px-3 text-sm font-medium text-ctp-green disabled:opacity-40">Create</button></div>{state.tokens.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{state.tokens.map((token) => <button key={token.id} type="button" title="Remove token" onClick={() => setState((current) => current ? removeToken(current, token.id) : current)} className="min-h-12 rounded-full border border-ctp-green/50 px-3 text-xs text-ctp-green">{token.name}{token.rested ? " · rested" : ""} ×</button>)}</div>}</section></>}
        {tool === "glimpse" && <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-ctp-subtext1" htmlFor="goldfish-glimpse-size">Glimpse</label>
        <input id="goldfish-glimpse-size" type="number" min={1} max={Math.max(1, state.library.length)} value={glimpseSize} onChange={(event) => setGlimpseSize(Math.max(1, Number(event.target.value) || 1))} className="min-h-12 w-14 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1.5 text-xs text-ctp-text" />
        <button type="button" disabled={state.library.length === 0 || activeGlimpse !== null} onClick={() => beginGlimpse(glimpseSize)} className="min-h-12 min-w-12 rounded-md border border-ctp-mauve/60 px-3 py-1.5 text-xs font-medium text-ctp-mauve hover:bg-ctp-mauve/10 disabled:opacity-40">Look at top cards</button>
        <span className="text-xs text-ctp-subtext0">Use for variable or manually triggered Glimpse effects.</span>
      </div>

{state.library.length === 0 && <InlineState>The library is empty.</InlineState>}</>}
        {tool === "session" && <><div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-ctp-subtext1">Hand size
              <input type="number" min={1} max={12} value={handSize} onChange={(event) => setHandSize(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} className="ml-1.5 min-h-12 w-14 rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs text-ctp-text" />
            </label>
            <button type="button" onClick={() => startNewHand(decklist)} className="min-h-12 min-w-12 rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs font-medium text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">New hand</button>
            <button type="button" onClick={() => { setTool(null); setDecklist(null); setState(null); setPendingConfirm(null); setPendingPayment(null); setActiveGlimpse(null); }} className="min-h-12 min-w-12 rounded-md border border-ctp-surface1 px-2.5 py-1.5 text-xs text-ctp-subtext1 hover:border-ctp-blue hover:text-ctp-text">Change deck</button>
          </div>      <section className="space-y-3"><h3 className="text-sm font-semibold"><span>Session · </span><span className="text-xs font-normal text-ctp-subtext0">{savedSession ? `Turn ${savedSession.state.turn}` : "Not saved"}</span></h3><p className="mt-2 text-xs leading-5 text-ctp-subtext1">Save every modeled zone, token, random seed, and replay-log entry on this device. Saving replaces the previous Goldfish session.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={saveSession} className="min-h-12 rounded-lg bg-ctp-green px-3 text-sm font-semibold text-ctp-base">Save current session</button>{savedSession && <><button type="button" onClick={() => resumeSession()} className="min-h-12 rounded-lg border border-ctp-blue/60 px-3 text-sm text-ctp-blue">Restore saved</button><button type="button" onClick={forgetSession} className="min-h-12 rounded-lg border border-ctp-red/50 px-3 text-sm text-ctp-red">Forget saved session</button></>}</div>{sessionNotice && <p role="status" className="mt-3 text-xs text-ctp-subtext1">{sessionNotice}</p>}</section>
        </>}
        {tool === "history" && <>{state.played.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Played this hand ({state.played.length})</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{state.played.map((card, index) => { const resolved = cardsByName.get(card.name); return <div key={card.id} className="min-w-0"><div className="relative"><CardArtTile card={resolved} name={card.name} /><span className="absolute left-1 top-1 rounded bg-ctp-crust/90 px-1 text-[10px] text-ctp-text">{index + 1}</span></div><p className="mt-1 break-words text-sm text-ctp-subtext1" title={card.name}>{card.name}</p></div>; })}</div>
        </section>
      )}
      <section className="space-y-3"><h3 className="text-sm font-semibold"><span>Replay log · seed {state.seed} · </span><span>{state.history.length} actions</span></h3>{isReplayableHistory(state.history) && <div className="mt-3 rounded-lg border border-ctp-surface1 bg-ctp-base p-3"><p className="text-xs leading-5 text-ctp-subtext1">Rebuild this position from the original shuffled deck and every recorded action.</p><button type="button" onClick={replayFromStart} className="mt-2 min-h-12 w-full rounded-lg border border-ctp-blue/60 px-3 text-sm font-medium text-ctp-blue sm:w-auto">Replay from start</button></div>}<ol className="mt-3 space-y-1 text-xs text-ctp-subtext1">{state.history.map((action) => <li key={action.id}><span className="mr-2 text-ctp-subtext0">T{action.turn}</span>{action.label}</li>)}</ol></section></>}
      </div></DialogSheet>}
      <GoldfishTurnControls state={state} blocked={!!activeGlimpse || !!pendingPayment || !!pendingConfirm} onHeight={setControlsHeight}
        onDraw={() => setState(current => current ? drawCards(current, 1) : current)}
        onNextTurn={() => setState(current => current ? nextTurn(current) : current)}
        onMemory={() => setTool("memory")} onMaterial={() => setTool("material")} onTools={() => setTool("menu")} />

    </PageLayout>
  );
}
