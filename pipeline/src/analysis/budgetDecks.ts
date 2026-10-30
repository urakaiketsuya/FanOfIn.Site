import { BUDGET_HISTORY_DAYS, budgetCardPrices, budgetSectionPrice, budgetEntrySignature, budgetRegistrationEligible, type BudgetDeckData, type BudgetDeckEntry, type OmnidexDecklist, type PriceData } from '@gatcg/shared';
import type { OmnidexEventBundle } from '../omnidex/cache.js';
import type { AnalysisContext } from './context.js';
import { resolveCard } from '../cards/catalog.js';

// Published bundles contain both legacy numeric IDs and expanded stage/round objects.
function roundId(value: unknown): number | null {
  const id = typeof value === 'object' && value !== null && 'id' in value ? value.id : value;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

/** Standard-only v1. Never infer a result from standings, placement, or an archetype. */
export function computeBudgetDecks(bundles: OmnidexEventBundle[], ctx: AnalysisContext, prices: PriceData | null, generatedAt: string): BudgetDeckData {
  const now = Date.parse(generatedAt);
  const quotes = prices ? budgetCardPrices([...ctx.cardIndex.values()], prices, now) : new Map<string, number>();
  const data: BudgetDeckData = { generatedAt, pricesAsOf: prices?.generatedAt ?? null, historyDays: BUDGET_HISTORY_DAYS, audit: { publicLists: 0, eligibleLists: 0, incompletePrices: 0, excludedLists: 0 }, entries: [] };
  const seenEvents = new Set<number>();
  for (const bundle of bundles) {
    const date = Date.parse(bundle.event.date);
    if (seenEvents.has(bundle.id) || bundle.event.status !== 'complete' || bundle.event.format.toLowerCase() !== 'standard' || !Number.isFinite(date) || date > now || date < now - BUDGET_HISTORY_DAYS * 86_400_000 || 'error' in bundle.decklists) continue;
    seenEvents.add(bundle.id);
    const records = new Map<number, { wins: number; losses: number; ties: number }>();
    const seenMatches = new Set<string>();
    for (const round of bundle.pairingsByRound) {
      if ('error' in round) continue;
      const stageId = roundId(round.stage), roundNumber = roundId(round.round);
      if (stageId === null || roundNumber === null) continue;
      for (const pair of round.pairings) {
        // Pairing IDs restart in each round/stage. Team pairings have string IDs.
        const key = `${stageId}:${roundNumber}:${pair.id}`;
        if (typeof pair.id !== 'number' || pair.status !== 'complete' || pair.pairing.length !== 2 || seenMatches.has(key)) continue;
        const [a, b] = pair.pairing;
        if (!Number.isFinite(a.id) || !Number.isFinite(b.id) || a.id === b.id) continue;
        const tied = a.status === 'tied' && b.status === 'tied';
        const aWon = a.status === 'winner' && b.status === 'loser';
        const bWon = b.status === 'winner' && a.status === 'loser';
        if (!tied && !aWon && !bWon) continue;
        seenMatches.add(key);
        for (const [player, won] of [[a.id, aWon], [b.id, bWon]] as const) {
          const record = records.get(player) ?? { wins: 0, losses: 0, ties: 0 };
          if (tied) record.ties++; else if (won) record.wins++; else record.losses++;
          records.set(player, record);
        }
      }
    }
    const signatures = ctx.getEventSignatures(bundle);
    const seenPlayers = new Set<number>();
    for (const source of bundle.decklists) {
      if (seenPlayers.has(source.player)) continue;
      seenPlayers.add(source.player);
      data.audit.publicLists++;
      const record = records.get(source.player);
      const championName = signatures.get(source.player)?.championName;
      const decklist: OmnidexDecklist = { main: [], material: [], sideboard: [] };
      const counts = new Map<string, number>();
      let valid = !!record && !!championName;
      let sidePoints = 0;
      for (const section of ['main', 'material', 'sideboard'] as const) {
        for (const line of source.decklist[section]) {
          const card = resolveCard(ctx.cardIndex, line.card);
          if (!card || !Number.isInteger(line.quantity) || line.quantity <= 0 || card.legality === undefined || (card.legality !== null && !card.legality.STANDARD)) { valid = false; continue; }
          const limit = card.legality?.STANDARD?.limit ?? (card.types.includes('CHAMPION') || card.types.includes('REGALIA') ? 1 : 4);
          counts.set(card.name, (counts.get(card.name) ?? 0) + line.quantity);
          if (counts.get(card.name)! > limit) valid = false;
          if (section === 'sideboard') sidePoints += line.quantity * (card.types.includes('CHAMPION') || card.types.includes('REGALIA') ? 3 : 1);
          decklist[section].push({ card: card.name, quantity: line.quantity });
        }
      }
      if (decklist.main.reduce((n, l) => n + l.quantity, 0) < 60 || !decklist.material.length || decklist.material.reduce((n, l) => n + l.quantity, 0) > 12 || sidePoints > 15) valid = false;
      if (!valid || !record || !championName) { data.audit.excludedLists++; continue; }
      const entry: BudgetDeckEntry = { deckId: `${bundle.id}:${source.player}`, eventId: bundle.id, player: source.player, eventName: bundle.event.name, eventDate: bundle.event.date, championName, format: 'STANDARD', decklist, ...record,
        prices: { main: budgetSectionPrice(decklist.main, quotes), material: budgetSectionPrice(decklist.material, quotes), sideboard: budgetSectionPrice(decklist.sideboard, quotes) } };
      data.audit.eligibleLists++;
      if (Object.values(entry.prices).some(p => p.missingCards.length)) data.audit.incompletePrices++;
      data.entries.push(entry);
    }
  }
  // Publish only potentially recommendable builds, but retain ALL their eligible records,
  // including losing and unpriced registrations. Filtering only winning evidence biases rates.
  const candidates = new Set(data.entries.filter(budgetRegistrationEligible).map(budgetEntrySignature));
  data.entries = data.entries.filter(entry => candidates.has(budgetEntrySignature(entry)));
  data.entries.sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.deckId.localeCompare(b.deckId));
  return data;
}
