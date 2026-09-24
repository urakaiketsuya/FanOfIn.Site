import type { Card, OmnidexDecklist } from "@gatcg/shared";
import { drawnCardsPerCopy } from "../features/deckbuilder/drawEffects";

export interface GoldfishCardInstance {
  id: string;
  name: string;
}

export interface GoldfishToken {
  id: string;
  name: string;
  rested: boolean;
}

export type GoldfishCommand =
  | { type: "open"; handSize: number }
  | { type: "draw" }
  | { type: "glimpse"; count: number; keptIds: string[] }
  | { type: "play"; instanceId: string; paymentIds?: string[]; reserveCost?: number }
  | { type: "reserve"; instanceId: string }
  | { type: "begin-recollection" }
  | { type: "recollect" }
  | { type: "next-turn" }
  | { type: "materialize"; instanceId: string }
  | { type: "banish-random-memory"; count: number }
  | { type: "create-tokens"; name: string; count: number; rested: boolean }
  | { type: "remove-token"; tokenId: string };

export interface GoldfishAction {
  id: number;
  turn: number;
  label: string;
  command?: GoldfishCommand;
}

export interface GoldfishState {
  version: 2;
  seed: number;
  rngState: number;
  turn: number;
  phase: "main" | "recollection";
  library: GoldfishCardInstance[];
  hand: GoldfishCardInstance[];
  memory: GoldfishCardInstance[];
  banished: GoldfishCardInstance[];
  played: GoldfishCardInstance[];
  materialDeck: GoldfishCardInstance[];
  materialized: GoldfishCardInstance[];
  tokens: GoldfishToken[];
  history: GoldfishAction[];
}

export interface GoldfishSession {
  version: 2;
  engineVersion: 2;
  savedAt: string;
  handSize: number;
  decklist: OmnidexDecklist;
  state: GoldfishState;
}

export type GoldfishEffectAssist =
  | { type: "draw"; count: number }
  | { type: "glimpse"; count: number }
  | { type: "create-tokens"; name: string; count: number }
  | { type: "banish-random-memory"; count: number };

export interface GoldfishEffectSupport {
  assists: GoldfishEffectAssist[];
  /** True when the printed text includes game actions outside the deliberately small assisted set. */
  hasUnsupportedText: boolean;
}

const cardInstances = (value: unknown): GoldfishCardInstance[] => Array.isArray(value) ? value.filter((entry): entry is GoldfishCardInstance => Boolean(entry && typeof entry === "object" && typeof (entry as GoldfishCardInstance).id === "string" && typeof (entry as GoldfishCardInstance).name === "string")) : [];
const tokens = (value: unknown): GoldfishToken[] => Array.isArray(value) ? value.filter((entry): entry is GoldfishToken => Boolean(entry && typeof entry === "object" && typeof (entry as GoldfishToken).id === "string" && typeof (entry as GoldfishToken).name === "string" && typeof (entry as GoldfishToken).rested === "boolean")) : [];
const command = (value: unknown): GoldfishCommand | undefined => {
  if (!value || typeof value !== "object" || typeof (value as { type?: unknown }).type !== "string") return undefined;
  const candidate = value as GoldfishCommand;
  switch (candidate.type) {
    case "open": return Number.isInteger(candidate.handSize) && candidate.handSize >= 0 ? candidate : undefined;
    case "draw": case "begin-recollection": case "recollect": case "next-turn": return candidate;
    case "glimpse": return Number.isInteger(candidate.count) && Array.isArray(candidate.keptIds) && candidate.keptIds.every((id) => typeof id === "string") ? candidate : undefined;
    case "play": return typeof candidate.instanceId === "string"
      && (candidate.paymentIds === undefined || (Array.isArray(candidate.paymentIds) && candidate.paymentIds.every((id) => typeof id === "string")))
      && (candidate.reserveCost === undefined || (Number.isInteger(candidate.reserveCost) && candidate.reserveCost >= 0)) ? candidate : undefined;
    case "reserve": case "materialize": return typeof candidate.instanceId === "string" ? candidate : undefined;
    case "banish-random-memory": return Number.isInteger(candidate.count) ? candidate : undefined;
    case "create-tokens": return typeof candidate.name === "string" && Number.isInteger(candidate.count) && typeof candidate.rested === "boolean" ? candidate : undefined;
    case "remove-token": return typeof candidate.tokenId === "string" ? candidate : undefined;
    default: return undefined;
  }
};
const history = (value: unknown): GoldfishAction[] => Array.isArray(value) ? value.filter((entry): entry is GoldfishAction => Boolean(entry && typeof entry === "object" && Number.isInteger((entry as GoldfishAction).id) && Number.isInteger((entry as GoldfishAction).turn) && typeof (entry as GoldfishAction).label === "string")).map((entry) => ({ ...entry, command: command(entry.command) })) : [];
const deckLines = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is OmnidexDecklist["main"][number] => Boolean(entry && typeof entry === "object" && typeof (entry as { card?: unknown }).card === "string" && Number.isInteger((entry as { quantity?: unknown }).quantity) && Number((entry as { quantity?: unknown }).quantity) > 0)).map((entry) => ({ card: entry.card, quantity: entry.quantity })) : [];

/** Serializes the complete assisted-rules state rather than only the visible hand. RNG state is part
 * of the contract so continuing a restored session produces the same future random outcomes. */
export function serializeGoldfishSession(decklist: OmnidexDecklist, handSize: number, state: GoldfishState): string {
  const session: GoldfishSession = { version: 2, engineVersion: state.version, savedAt: new Date().toISOString(), handSize, decklist: structuredClone(decklist), state: structuredClone(state) };
  return JSON.stringify(session);
}

/** Reads current sessions and the earlier minimal v1 snapshot shape. Unknown or malformed data is
 * rejected; zones introduced in engine v2 receive empty defaults during migration. */
export function parseGoldfishSession(raw: string | null): GoldfishSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || !parsed.decklist || typeof parsed.decklist !== "object" || !parsed.state || typeof parsed.state !== "object") return null;
    const deck = parsed.decklist as Record<string, unknown>;
    const source = parsed.state as Record<string, unknown>;
    const seed = Number(source.seed);
    const rngState = Number(source.rngState ?? source.seed);
    const turn = Number(source.turn);
    if (!Number.isInteger(seed) || seed < 0 || !Number.isInteger(rngState) || rngState < 0 || !Number.isInteger(turn) || turn < 1) return null;
    const state: GoldfishState = {
      version: 2,
      seed: seed >>> 0,
      rngState: rngState >>> 0,
      turn,
      phase: source.phase === "recollection" ? "recollection" : "main",
      library: cardInstances(source.library),
      hand: cardInstances(source.hand),
      memory: cardInstances(source.memory),
      banished: cardInstances(source.banished),
      played: cardInstances(source.played),
      materialDeck: cardInstances(source.materialDeck),
      materialized: cardInstances(source.materialized),
      tokens: tokens(source.tokens),
      history: history(source.history),
    };
    const savedAt = typeof parsed.savedAt === "string" && !Number.isNaN(Date.parse(parsed.savedAt)) ? parsed.savedAt : new Date(0).toISOString();
    const handSize = Number(parsed.handSize);
    return {
      version: 2,
      engineVersion: 2,
      savedAt,
      handSize: Number.isInteger(handSize) && handSize >= 1 && handSize <= 12 ? handSize : Math.max(1, state.hand.length),
      decklist: { main: deckLines(deck.main), material: deckLines(deck.material), sideboard: deckLines(deck.sideboard) },
      state,
    };
  } catch {
    return null;
  }
}

/**
 * Expands a decklist's `{card, quantity}` Main Deck lines into individually-drawable instances —
 * Material Deck cards are materialized, not drawn, so they're excluded here, same Main-vs-Material
 * "deck identity" distinction `lib/deckIdentity.ts` already establishes for every other feature in
 * this codebase.
 */
export function expandMainDeck(decklist: OmnidexDecklist): GoldfishCardInstance[] {
  const instances: GoldfishCardInstance[] = [];
  let counter = 0;
  for (const line of decklist.main) {
    for (let i = 0; i < line.quantity; i++) instances.push({ id: `${line.card}#${counter++}`, name: line.card });
  }
  return instances;
}

function expandMaterialDeck(decklist: OmnidexDecklist): GoldfishCardInstance[] {
  const instances: GoldfishCardInstance[] = [];
  let counter = 0;
  for (const line of decklist.material) {
    for (let i = 0; i < line.quantity; i++) instances.push({ id: `material:${line.card}#${counter++}`, name: line.card });
  }
  return instances;
}

function nextRandom(rngState: number): [number, number] {
  let next = rngState | 0;
  next ^= next << 13; next ^= next >>> 17; next ^= next << 5;
  const normalized = (next >>> 0) / 4_294_967_296;
  return [normalized, next >>> 0];
}

function shuffle<T>(items: T[], seed: number): { items: T[]; rngState: number } {
  const result = [...items];
  let rngState = seed >>> 0 || 0x9e3779b9;
  for (let i = result.length - 1; i > 0; i--) {
    const [random, next] = nextRandom(rngState); rngState = next;
    const j = Math.floor(random * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { items: result, rngState };
}

function record(state: GoldfishState, label: string, actionCommand: GoldfishCommand): GoldfishState {
  return { ...state, history: [...state.history, { id: state.history.length + 1, turn: state.turn, label, command: actionCommand }] };
}

export function newGame(decklist: OmnidexDecklist, handSize: number, seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0): GoldfishState {
  const shuffled = shuffle(expandMainDeck(decklist), seed);
  return {
    version: 2, seed: seed >>> 0, rngState: shuffled.rngState, turn: 1, phase: "main",
    library: shuffled.items.slice(handSize), hand: shuffled.items.slice(0, handSize), memory: [], banished: [], played: [],
    materialDeck: expandMaterialDeck(decklist), materialized: [], tokens: [],
    history: [{ id: 1, turn: 1, label: `Opened ${Math.min(handSize, shuffled.items.length)} cards (seed ${seed >>> 0})`, command: { type: "open", handSize } }],
  };
}

export function drawCard(state: GoldfishState): GoldfishState {
  if (state.library.length === 0) return state;
  const [drawn, ...rest] = state.library;
  return record({ ...state, library: rest, hand: [...state.hand, drawn] }, `Drew ${drawn.name}`, { type: "draw" });
}

export function drawCards(state: GoldfishState, count: number): GoldfishState {
  let next = state;
  for (let i = 0; i < count && next.library.length > 0; i++) next = drawCard(next);
  return next;
}

/** Resolves a manual Glimpse choice. Selected cards stay on top in their revealed order; every
 * unselected revealed card is randomized and moved to the bottom of the library. This keeps the
 * simulator honest without asking the player to micromanage the order of cards they rejected. */
export function resolveGlimpse(state: GoldfishState, count: number, keptIds: ReadonlySet<string>): GoldfishState {
  const glimpseCount = Math.max(0, Math.min(Math.floor(count), state.library.length));
  const revealed = state.library.slice(0, glimpseCount);
  const unseen = state.library.slice(glimpseCount);
  const kept = revealed.filter((card) => keptIds.has(card.id));
  const bottomed = shuffle(revealed.filter((card) => !keptIds.has(card.id)), state.rngState);
  return record({ ...state, rngState: bottomed.rngState, library: [...kept, ...unseen, ...bottomed.items] }, `Resolved Glimpse ${glimpseCount}; kept ${kept.length} on top`, { type: "glimpse", count, keptIds: [...keptIds] });
}

/**
 * Moves one hand card into the played pile. Never draws on its own — a matched draw effect
 * (`suggestedExtraDraws`) is a suggestion for the viewer to confirm with their own separate
 * `drawCards` calls (see `GoldfishIndex.tsx`'s "+1 card?" stepper), never applied automatically,
 * since conditional wording ("If you do," "you may") can't be verified from text alone — same
 * reasoning `drawEffects.ts` already documents for its own probability-estimate context.
 */
export function playCard(state: GoldfishState, instanceId: string, paymentIds: readonly string[] = [], reserveCost = paymentIds.length): GoldfishState {
  if (state.phase !== "main") return state;
  const card = state.hand.find((c) => c.id === instanceId);
  const uniquePaymentIds = new Set(paymentIds);
  if (!card || !Number.isInteger(reserveCost) || reserveCost < 0 || uniquePaymentIds.size !== reserveCost || uniquePaymentIds.has(instanceId)) return state;
  const payments = state.hand.filter((entry) => uniquePaymentIds.has(entry.id));
  if (payments.length !== reserveCost) return state;
  const movedIds = new Set([instanceId, ...uniquePaymentIds]);
  const label = reserveCost > 0 ? `Played ${card.name}; paid Reserve ${reserveCost} with ${payments.map((entry) => entry.name).join(", ")}` : `Played ${card.name}`;
  return record({ ...state, hand: state.hand.filter((entry) => !movedIds.has(entry.id)), memory: [...state.memory, ...payments], played: [...state.played, card] }, label, { type: "play", instanceId, paymentIds: [...uniquePaymentIds], reserveCost });
}

export function reserveCard(state: GoldfishState, instanceId: string): GoldfishState {
  if (state.phase !== "main") return state;
  const card = state.hand.find((entry) => entry.id === instanceId);
  if (!card) return state;
  return record({ ...state, hand: state.hand.filter((entry) => entry.id !== instanceId), memory: [...state.memory, card] }, `Reserved ${card.name} to Memory`, { type: "reserve", instanceId });
}

export function beginRecollection(state: GoldfishState): GoldfishState {
  return state.phase === "recollection" ? state : record({ ...state, phase: "recollection" }, "Began Recollection Phase", { type: "begin-recollection" });
}

export function recollectMemory(state: GoldfishState): GoldfishState {
  if (state.phase !== "recollection" || state.memory.length === 0) return state;
  const count = state.memory.length;
  return record({ ...state, hand: [...state.hand, ...state.memory], memory: [] }, `Recollected ${count} card${count === 1 ? "" : "s"} from Memory`, { type: "recollect" });
}

export function nextTurn(state: GoldfishState, draw = true): GoldfishState {
  let next = record({ ...state, turn: state.turn + 1, phase: "main" }, `Started turn ${state.turn + 1}`, { type: "next-turn" });
  if (draw) next = drawCard(next);
  return next;
}

export function materializeCard(state: GoldfishState, instanceId: string): GoldfishState {
  if (state.phase !== "main") return state;
  const card = state.materialDeck.find((entry) => entry.id === instanceId);
  if (!card) return state;
  return record({ ...state, materialDeck: state.materialDeck.filter((entry) => entry.id !== instanceId), materialized: [...state.materialized, card] }, `Materialized ${card.name}`, { type: "materialize", instanceId });
}

export function banishRandomFromMemory(state: GoldfishState, count: number): GoldfishState {
  const total = Math.min(Math.max(0, Math.floor(count)), state.memory.length);
  if (total === 0) return state;
  const shuffled = shuffle(state.memory, state.rngState);
  const selected = shuffled.items.slice(0, total);
  const ids = new Set(selected.map((card) => card.id));
  return record({ ...state, rngState: shuffled.rngState, memory: state.memory.filter((card) => !ids.has(card.id)), banished: [...state.banished, ...selected] }, `Randomly banished ${selected.map((card) => card.name).join(", ")} from Memory`, { type: "banish-random-memory", count });
}

export function createTokens(state: GoldfishState, name: string, count: number, rested = false): GoldfishState {
  const normalized = name.trim();
  const total = Math.min(20, Math.max(0, Math.floor(count)));
  if (!normalized || total === 0) return state;
  const offset = state.tokens.length;
  const tokens = Array.from({ length: total }, (_, index) => ({ id: `token:${state.history.length + 1}:${offset + index}`, name: normalized, rested }));
  return record({ ...state, tokens: [...state.tokens, ...tokens] }, `Created ${total} ${normalized} token${total === 1 ? "" : "s"}${rested ? " rested" : ""}`, { type: "create-tokens", name: normalized, count, rested });
}

export function removeToken(state: GoldfishState, tokenId: string): GoldfishState {
  const token = state.tokens.find((entry) => entry.id === tokenId);
  return token ? record({ ...state, tokens: state.tokens.filter((entry) => entry.id !== tokenId) }, `Removed ${token.name} token`, { type: "remove-token", tokenId }) : state;
}

export function isReplayableHistory(actions: readonly GoldfishAction[]): boolean {
  return actions.length > 0 && actions[0].command?.type === "open" && actions.every((action) => action.command !== undefined);
}

/** Rebuilds a game from its seed and intent log. Legacy label-only logs deliberately return null. */
export function replayGoldfishHistory(decklist: OmnidexDecklist, seed: number, actions: readonly GoldfishAction[]): GoldfishState | null {
  if (!isReplayableHistory(actions)) return null;
  const opening = actions[0].command as Extract<GoldfishCommand, { type: "open" }>;
  let state = newGame(decklist, opening.handSize, seed);
  for (const action of actions.slice(1)) {
    const item = action.command!;
    switch (item.type) {
      case "open": return null;
      case "draw": state = drawCard(state); break;
      case "glimpse": state = resolveGlimpse(state, item.count, new Set(item.keptIds)); break;
      case "play": state = playCard(state, item.instanceId, item.paymentIds ?? [], item.reserveCost ?? 0); break;
      case "reserve": state = reserveCard(state, item.instanceId); break;
      case "begin-recollection": state = beginRecollection(state); break;
      case "recollect": state = recollectMemory(state); break;
      case "next-turn": state = nextTurn(state, false); break;
      case "materialize": state = materializeCard(state, item.instanceId); break;
      case "banish-random-memory": state = banishRandomFromMemory(state, item.count); break;
      case "create-tokens": state = createTokens(state, item.name, item.count, item.rested); break;
      case "remove-token": state = removeToken(state, item.tokenId); break;
    }
  }
  return state;
}

export function isReservable(card: Card | undefined): boolean {
  return /\breservable\b/i.test(card?.effect ?? "");
}

/** How many extra draws this card's own printed text suggests, reusing `drawEffects.ts`'s own
 * "draw N card(s)" detector rather than a second implementation of the same pattern. */
export function suggestedExtraDraws(card: Card | undefined): number {
  return card ? drawnCardsPerCopy(card) : 0;
}

/** Fixed numeric Glimpse clauses in a card's text. Variable amounts such as Glimpse X/LV and
 * Glimpse 1+X are left to the manual Glimpse control rather than guessed. */
export function suggestedGlimpse(card: Card | undefined): number {
  if (!card?.effect) return 0;
  let total = 0;
  for (const match of card.effect.matchAll(/\bglimpse\s+(\d+)\b(?!\s*\+)/gi)) total += Number(match[1]);
  return total;
}

const fixedAmount = (value: string): number | null => {
  if (/^(?:a|an|one)$/i.test(value)) return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Detects only effect clauses that the assisted simulator can represent without inferring targets,
 * costs, conditions, or timing. The result is advisory: the player still confirms that a printed
 * condition was met. Any other non-reminder effect text is explicitly reported as unsupported.
 */
export function goldfishEffectSupport(card: Card | undefined): GoldfishEffectSupport {
  const effect = (card?.effect ?? "").replace(/\*\*/g, " ").replace(/\s+/g, " ").trim();
  if (!effect) return { assists: [], hasUnsupportedText: false };

  const assists: GoldfishEffectAssist[] = [];
  const draws = suggestedExtraDraws(card);
  const glimpse = suggestedGlimpse(card);
  if (draws > 0) assists.push({ type: "draw", count: draws });
  if (glimpse > 0) assists.push({ type: "glimpse", count: glimpse });

  for (const match of effect.matchAll(/\bsummon\s+(a|an|one|\d+)\s+([a-z][a-z0-9 '-]{0,40}?)\s+tokens?\b/gi)) {
    const count = fixedAmount(match[1]);
    if (count) assists.push({ type: "create-tokens", name: match[2].trim(), count });
  }
  for (const match of effect.matchAll(/\bbanish\s+(a|one|\d+)\s+(?:card(?:s)?\s+)?(?:at\s+)?random\s+from\s+(?:your\s+)?memory\b/gi)) {
    const count = fixedAmount(match[1]);
    if (count) assists.push({ type: "banish-random-memory", count });
  }

  // Remove exactly the bounded templates above. Remaining rules text is intentionally player-run.
  const unsupported = effect
    .replace(/\bdraw\s+\d+\s+cards?\b/gi, "")
    .replace(/\bglimpse\s+\d+\b(?!\s*\+)/gi, "")
    .replace(/\bsummon\s+(?:a|an|one|\d+)\s+[a-z][a-z0-9 '-]{0,40}?\s+tokens?\b/gi, "")
    .replace(/\bbanish\s+(?:a|one|\d+)\s+(?:card(?:s)?\s+)?(?:at\s+)?random\s+from\s+(?:your\s+)?memory\b/gi, "")
    .replace(/\breservable\b/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return { assists, hasUnsupportedText: unsupported.length > 0 };
}
